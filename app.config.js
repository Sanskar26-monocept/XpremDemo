export default ({ config }) => ({
  ...config,
  runtimeVersion: "1.0.0",
  extra: {
    ...config.extra,
    // Bump before every `eoas publish` so the running OTA release is identifiable in the app.
    otaVersion: 3,
  },
  plugins: [
    ...(config.plugins ?? []),
    // Update server is plain http; release builds block cleartext by default.
    ["expo-build-properties", { android: { usesCleartextTraffic: true } }],
  ],
  updates: {
    url: "http://13.207.184.23:3000/manifest",
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
      "expo-app-id": "6675c329-1085-458f-8ed5-3e3ee3791681",
      "xprem-branch": "",
    },
  },
});
