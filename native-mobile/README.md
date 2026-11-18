# Flat Out Built-Up Roofing mobile builds

These draft iPhone and Android projects open https://flatoutbuiltuproofing.co.uk/ as their home screen. They use the site's own brand artwork and approved animation. They need an internet connection, and updates to the homepage appear without an app rebuild.

## iPhone

On a Mac with Xcode and XcodeGen installed, run `xcodegen generate` from `ios/` and open `FlatOutRoofing.xcodeproj`. Select your signing team in Xcode and run the app on a paired iPhone. Use your own final bundle identifier if the proposed identifier is unavailable.

## Android

Open `android/` in Android Studio with JDK 17, Android SDK 36 and Gradle 8.11.1, select the `app` run configuration and run on a connected device or emulator. Use your own final application ID if necessary. For a command-line debug build with Gradle installed, run `gradle :app:assembleDebug` in `android/`.

## Distribution status

These are source projects for device review. Device builds, signing, store listings and submission have not been completed. Before planning store submission, review the platforms’ functionality and digital purchase requirements with the actual in-app course and checkout flows.
