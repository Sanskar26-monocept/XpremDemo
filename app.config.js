export default ({ config }) => ({
                                ...config,
                                ...{
  "updates": {
    "url": "http://13.207.184.23:3000/manifest",
    "codeSigningMetadata": process.env.DISABLE_CODE_SIGNING ? undefined : { keyid: 'main', alg: 'rsa-v1_5-sha256' },
    "codeSigningCertificate": process.env.DISABLE_CODE_SIGNING ? undefined : 'D:\\Xprem-Project\\XpremDemo\\certs\\certificate.pem',
    "enabled": true,
    "requestHeaders": {
      "expo-channel-name": process.env.RELEASE_CHANNEL,
      "expo-app-id": "6675c329-1085-458f-8ed5-3e3ee3791681",
      "xprem-branch": ""
    }
  }
}
                              });