const SERVER_URL = "http://13.207.184.23:3000";
// The app's id on the xprem server, which expo-observe also sends as its project id.
const APP_ID = "6675c329-1085-458f-8ed5-3e3ee3791681";

export default ({ config }) => ({
  ...config,
  // 1.1.0: expo-observe added native code, so updates built from here on
  // must never reach a 1.0.0 binary, which lacks it and would crash on launch.
  runtimeVersion: "1.1.0",
  extra: {
    ...config.extra,
    // Bump before every `eoas publish` so the running OTA release is identifiable in the app.
    otaVersion: 14,
    eas: {
      ...config.extra?.eas,
      projectId: APP_ID,
      // expo-observe posts to {endpointUrl}/{projectId}/v1/{metrics,logs}.
      observe: { endpointUrl: `${SERVER_URL}/observe/${APP_ID}` },
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    // Update server is plain http; release builds block cleartext by default.
    ["expo-build-properties", { android: { usesCleartextTraffic: true } }],
  ],
  updates: {
    url: `${SERVER_URL}/manifest`,
    // Check on every launch and wait up to 10 s for the latest update before
    // showing anything, so a fresh install from a shared APK opens on the
    // current UI instead of the one bundled when the APK was built. Past the
    // wait (slow or no network) the bundled UI starts and App.js reloads into
    // the update once it has downloaded.
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 10000,
    codeSigningMetadata: process.env.DISABLE_CODE_SIGNING
      ? undefined
      : { keyid: "main", alg: "rsa-v1_5-sha256" },
    // Must be relative to the project root; Expo resolves it against the project dir.
    codeSigningCertificate: process.env.DISABLE_CODE_SIGNING
      ? undefined
      : "./certs/certificate.pem",
    enabled: true,
    requestHeaders: {
      "expo-channel-name": process.env.RELEASE_CHANNEL,
      "expo-app-id": APP_ID,
      "xprem-branch": "",
    },
  },
});
