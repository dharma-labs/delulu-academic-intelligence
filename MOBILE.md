# Mobile app (Android)

The mobile app wraps the static export of the app in a Capacitor WebView.

## What it is

- A static (`output: "export"`) build of the app, loaded in a native Android
  WebView via Capacitor. All 18 views work; data persists in localStorage.
- The AI Tutor API route is **not** available in the static build (it needs a
  server), so that one view degrades gracefully to an error message.

## Rebuild from source

Requirements: JDK 17+ (JDK 21 recommended), Android SDK (platform 34+),
Node 18+.

```bash
# from the repo root
npm install

# 1. temporary static export (route handlers are not allowed in static export)
mv src/app/api /tmp/api.bak
#    edit next.config.ts: output: "export"  (+ images.unoptimized: true)
npx next build              # produces out/
#    restore next.config.ts and src/app/api

# 2. copy the export into the Capacitor webdir
rm -rf mobile/www && cp -r out mobile/www

# 3. add the Android platform + build
cd mobile
npm install
npx cap add android
#    (optional) set Gradle wrapper to a Java-21-compatible version, e.g. 8.7:
#    edit android/gradle/wrapper/gradle-wrapper.properties
cd android
./gradlew assembleDebug
```

Artifact:

- `mobile/android/app/build/outputs/apk/debug/app-debug.apk`

## Notes

- The debug APK is signed with the Android debug keystore and installs
  directly. For Play Store distribution you must sign with your own release
  keystore.
- The app is also a PWA: opening the deployed web build on a phone and tapping
  "Add to Home Screen" installs it as a standalone app.
