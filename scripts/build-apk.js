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
    if (prebuild) {
      // SDK 57 prebuild recreates android/ from app.json and the config plugins.
      run('npx expo prebuild --platform android --no-install', projectRoot, env);
    }
    run(`${process.platform === 'win32' ? 'gradlew.bat' : './gradlew'} assembleRelease`, androidDir, env);
  }

  const apkPath = findApk();
  if (!apkPath) {
    fail(`No APK in ${path.relative(projectRoot, apkDir)}. Run without --skip-build.`);
  }
  params.set('fileName', path.basename(apkPath));

  const uploadUrl = `${serverUrl}/${appId}/uploadBuild/${encodeURIComponent(channel)}?${params}`;
  const build = await upload(uploadUrl, apkPath, env.EOO_TOKEN);

  console.log('\n✅ Build uploaded');
  console.log(`📱 Install link (share it with testers): ${build.shareUrl}`);
  console.log(`⬇️  Direct APK download:                 ${build.downloadUrl}`);
  console.log('   Anyone with the link can install it. Delete the build in the dashboard (Builds) to revoke the link.');
}

main();
