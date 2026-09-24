# XpremDemo

Expo app that receives over-the-air updates from the self-hosted xprem server
(`updates.url` in `app.config.js`).

## Sharing a release APK

`npm run build:apk` builds a release APK, uploads it to the xprem server and
prints an install link to send to testers. Every upload is also listed in the
xprem dashboard under **Builds** (prod-ota app).

### Once

Copy `.env.xprem.example` to `.env.xprem` and set `EOO_TOKEN` to an API token of
the app (dashboard → API tokens). `.env.xprem` is git-ignored; never commit it.

### Every build

```bash
npm run build:apk                          # channel: production
npm run build:apk -- --channel staging     # APK that polls another channel
npm run build:apk -- --prebuild            # regenerate android/ first
npm run build:apk -- --skip-build          # upload the APK already built
npm run build:apk -- -m "QA build for #42" # note shown on the install page
npm run build:apk -- --dry-run             # show what would happen, change nothing
```

The script sets `RELEASE_CHANNEL` for the build, so the APK polls the channel
you picked. It prints two links:

- `…/install/<token>`: the install page. Open it on an Android phone and tap
  **Download APK**.
- `…/install/<token>/download`: the APK itself, e.g. for `adb install`.

Anyone with the link can download the APK. Deleting the build in the dashboard
revokes its link immediately.
