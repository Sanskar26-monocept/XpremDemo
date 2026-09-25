#!/usr/bin/env node
/**
 * Builds a release APK, uploads it to the xprem server and prints a shareable
 * install link. The build also appears in the xprem dashboard under Builds.
 *
 *   npm run build:apk                          # channel: production
 *   npm run build:apk -- --channel staging     # APK that polls another channel
 *   npm run build:apk -- --prebuild            # regenerate android/ first
 *   npm run build:apk -- --skip-build          # upload the APK already built
 *   npm run build:apk -- -m "QA build for #42" # note shown on the install page
 *   npm run build:apk -- --dry-run             # show what would happen, change nothing
 *
 * Needs EOO_TOKEN (an API token of the app, from the dashboard's API tokens
 * page) in .env.xprem or in the environment.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const androidDir = path.join(projectRoot, 'android');
const apkDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release');
const envFile = path.join(projectRoot, '.env.xprem');

const argv = process.argv.slice(2);
const hasFlag = name => argv.includes(name);
const flagValue = (...names) => {
  for (const name of names) {
    const index = argv.indexOf(name);
    if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      return argv[index + 1];
    }
  }
  return undefined;
};

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

// .env.xprem fills in what the environment does not already set, so a CI job
// can pass EOO_TOKEN directly.
function loadEnv() {
  const env = { ...process.env };
  if (fs.existsSync(envFile)) {
    for (const rawLine of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const index = line.indexOf('=');
      if (index === -1) continue;
      const key = line.slice(0, index).trim();
      if (!env[key]) env[key] = line.slice(index + 1).trim();
    }
  }
  return env;
}

// Commands run through a shell (npx and gradlew.bat cannot be spawned directly
// on Windows), as one string: every command here is a fixed literal.
function run(command, cwd, env) {
  console.log(`\n> ${command}`);
  const result = spawnSync(command, { cwd, env, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    fail(`${command} exited with code ${result.status}`);
  }
}

// app.config.js is an ES module that reads RELEASE_CHANNEL, so the Expo CLI
// resolves it: that is exactly the config the build bakes into the APK.
function resolveConfig(env) {
  const result = spawnSync('npx expo config --json --type public', {
    cwd: projectRoot,
    env,
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    fail(`Could not resolve the Expo config:\n${result.stderr || result.stdout}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    fail(`Unexpected output from "expo config":\n${result.stdout}`);
  }
}

// With ABI splits Gradle writes one APK per ABI; the universal one installs
// on every device, so it wins.
function findApk() {
  if (!fs.existsSync(apkDir)) return null;
  const apks = fs.readdirSync(apkDir).filter(name => name.toLowerCase().endsWith('.apk'));
  const pick =
    apks.find(name => /universal/i.test(name)) ||
    apks.find(name => name === 'app-release.apk') ||
    apks[0];
  return pick ? path.join(apkDir, pick) : null;
}

function git(args) {
  const result = spawnSync('git', args, { cwd: projectRoot, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

// The Expo SDK the app builds against, from the installed expo package.
function expoSdkVersion() {
  try {
    return require(path.join(projectRoot, 'node_modules', 'expo', 'package.json')).version;
  } catch {
    return undefined;
  }
}

// The machine that ran the build, as the dashboard shows it ("Windows x64").
function buildHost() {
  const names = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' };
  return `${names[process.platform] || process.platform} ${os.arch()}`;
}

// Whether the working tree has uncommitted changes, so the dashboard can mark
// the commit the way EAS does (5e10bf1*). Unknown outside a git checkout.
function gitDirty() {
  const status = git(['status', '--porcelain']);
  return status === undefined ? undefined : String(status !== '');
}

// The files of the project the build was made from, the way git sees it:
// tracked files plus untracked ones that are not ignored, so node_modules and
// build output stay out. Paths only; the dashboard lists them on the build's
// page. Undefined outside a git checkout.
function projectFiles() {
  const result = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 64 << 20,
  });
  if (result.status !== 0) return undefined;
  // --cached still names files deleted from the working tree.
  const files = [...new Set(result.stdout.split('\0').filter(Boolean))].filter(file =>
    fs.existsSync(path.join(projectRoot, file))
  );
  return files.slice(0, 50000);
}

// Sent after the upload, so a failure here never costs the build itself.
async function sendProjectFiles(serverUrl, appId, channel, buildId, token) {
  const files = projectFiles();
  if (!files) {
    console.log('   Project files not listed: this is not a git checkout.');
    return;
  }
  try {
    const response = await fetch(
      `${serverUrl}/${appId}/uploadBuild/${encodeURIComponent(channel)}/${buildId}/projectFiles`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      }
    );
    if (response.status === 404 || response.status === 405) {
      console.log('   Project files not listed: the server does not support it yet.');
    } else if (!response.ok) {
      console.log(`   Project files not listed: the server answered ${response.status}.`);
    } else {
      console.log(`📂 Project files listed on the build's page: ${files.length}`);
    }
  } catch (error) {
    console.log(`   Project files not listed: ${error.cause?.message || error.message}`);
  }
}

async function upload(uploadUrl, apkPath, token) {
  const apk = fs.readFileSync(apkPath);
  console.log(`\n📤 Uploading ${path.basename(apkPath)} (${(apk.length / 1048576).toFixed(1)} MB)...`);
  let response;
  try {
    response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/vnd.android.package-archive',
      },
      body: apk,
    });
  } catch (error) {
    fail(`Could not reach the server: ${error.cause?.message || error.message}`);
  }
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try {
      detail = JSON.parse(text).detail || text;
    } catch {
      // Auth refusals come back as plain text.
    }
    const hint =
      response.status === 401
        ? '\n  Check EOO_TOKEN: it must be an API token of this app (dashboard → API tokens).'
        : response.status === 404
          ? '\n  The server may not have the Builds feature, or the app id is wrong.'
          : '';
    fail(`Upload failed (${response.status}): ${detail.trim()}${hint}`);
  }
  return JSON.parse(text);
}

async function main() {
  const env = loadEnv();
  const channel = flagValue('--channel') || 'production';
  const dryRun = hasFlag('--dry-run');
  // app.config.js puts RELEASE_CHANNEL into the expo-channel-name header; an
  // APK built without it polls no channel and never receives OTA updates.
  env.RELEASE_CHANNEL = channel;

  if (!env.EOO_TOKEN && !dryRun) {
    fail('EOO_TOKEN is not set. Put it in .env.xprem (see .env.xprem.example).');
  }

  const config = resolveConfig(env);
  const appId = config.updates?.requestHeaders?.['expo-app-id'];
  const updateUrl = config.updates?.url;
  if (!appId || !updateUrl) {
    fail("app.config.js must define updates.url and updates.requestHeaders['expo-app-id'].");
  }
  const serverUrl = updateUrl.replace(/\/+$/, '').replace(/\/manifest$/, '');

  const message = flagValue('-m', '--message') || git(['log', '-1', '--pretty=%s']);
  const params = new URLSearchParams({ platform: 'android' });
  const metadata = {
    runtimeVersion: typeof config.runtimeVersion === 'string' ? config.runtimeVersion : undefined,
    appVersion: config.version,
    versionCode: config.android?.versionCode?.toString(),
    message: message?.slice(0, 255),
    commitHash: git(['rev-parse', 'HEAD']),
    // Everything below is shown on the build's page in the dashboard.
    buildProfile: 'release',
    gitBranch: (b => (b === 'HEAD' ? undefined : b))(git(['rev-parse', '--abbrev-ref', 'HEAD'])),
    gitDirty: gitDirty(),
    sdkVersion: expoSdkVersion(),
    cliVersion: `build-apk.js (Node ${process.versions.node})`,
    buildHost: buildHost(),
  };
  for (const [key, value] of Object.entries(metadata)) {
    if (value) params.set(key, value);
  }

  const prebuild = hasFlag('--prebuild') || !fs.existsSync(androidDir);
  const skipBuild = hasFlag('--skip-build');

  if (dryRun) {
    console.log('Dry run, nothing is built or uploaded.\n');
    console.log(`  server:          ${serverUrl}`);
    console.log(`  app id:          ${appId}`);
    console.log(`  channel:         ${channel} (baked into the APK as "${config.updates.requestHeaders['expo-channel-name']}")`);
    for (const [key, value] of Object.entries(metadata)) {
      console.log(`  ${(key + ':').padEnd(17)}${value ?? '—'}`);
    }
    console.log(`  token:           ${env.EOO_TOKEN ? 'found' : 'MISSING (add it to .env.xprem)'}`);
    console.log(`  steps:           ${skipBuild ? 'upload the existing APK' : `${prebuild ? 'expo prebuild → ' : ''}gradlew assembleRelease → upload`}`);
    const apk = findApk();
    console.log(`  last APK:        ${apk ? path.relative(projectRoot, apk) : 'none built yet'}`);
    console.log(`  upload:          POST ${serverUrl}/${appId}/uploadBuild/${encodeURIComponent(channel)}`);
    return;
  }

  if (!skipBuild) {
    const buildStart = Date.now();
    if (prebuild) {
      // SDK 57 prebuild recreates android/ from app.json and the config plugins.
      run('npx expo prebuild --platform android --no-install', projectRoot, env);
    }
    run(`${process.platform === 'win32' ? 'gradlew.bat' : './gradlew'} assembleRelease`, androidDir, env);
    // With --skip-build nothing was built here, so no build time is sent.
    params.set('buildDurationMs', String(Date.now() - buildStart));
  }

  const apkPath = findApk();
  if (!apkPath) {
    fail(`No APK in ${path.relative(projectRoot, apkDir)}. Run without --skip-build.`);
  }
  params.set('fileName', path.basename(apkPath));

  const uploadUrl = `${serverUrl}/${appId}/uploadBuild/${encodeURIComponent(channel)}?${params}`;
  const build = await upload(uploadUrl, apkPath, env.EOO_TOKEN);
  await sendProjectFiles(serverUrl, appId, channel, build.id, env.EOO_TOKEN);

  console.log('\n✅ Build uploaded');
  console.log(`📱 Install link (share it with testers): ${build.shareUrl}`);
  console.log(`⬇️  Direct APK download:                 ${build.downloadUrl}`);
  // Servers from before build expiry send no expiresAt.
  if (build.expiresAt) {
    console.log(`⏳ Link expires:                        ${new Date(build.expiresAt).toLocaleString()}`);
  }
  console.log('   Anyone with the link can install it until it expires. Delete the build in the dashboard (Builds) to revoke the link sooner.');
}

main();
