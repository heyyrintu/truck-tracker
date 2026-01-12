# Production Build Guide for Driver Tracker Android App

## Prerequisites

1. **Android Studio** installed
2. **JDK 17 or 21** installed
3. **Android SDK 34** installed
4. Production **signing keystore** created

---

## Step 1: Generate Release Keystore

If you don't have a keystore, create one:

```bash
keytool -genkey -v -keystore driver-tracker.keystore -alias driver-tracker -keyalg RSA -keysize 2048 -validity 10000
```

**Important**: Keep your keystore and passwords secure! You'll need them for all future updates.

---

## Step 2: Configure Signing

### Option A: Using gradle.properties (recommended for local builds)

Create or edit `android/gradle.properties`:

```properties
RELEASE_STORE_FILE=/path/to/driver-tracker.keystore
RELEASE_STORE_PASSWORD=your_store_password
RELEASE_KEY_ALIAS=driver-tracker
RELEASE_KEY_PASSWORD=your_key_password
```

### Option B: Using Environment Variables (recommended for CI/CD)

Set these environment variables:
- `KEYSTORE_PATH`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`

---

## Step 3: Update Production API URL

Edit `android-app/.env`:

```
VITE_API_URL=https://your-production-api.com/api
VITE_APP_NAME="Driver Tracker"
```

---

## Step 4: Build Release APK

```bash
# Navigate to android-app directory
cd android-app

# Build web assets
npm run build

# Sync with Android
npx cap sync android

# Navigate to android folder
cd android

# Build release APK
./gradlew assembleRelease

# Or build release AAB (Android App Bundle) for Play Store
./gradlew bundleRelease
```

### Output locations:
- **APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **AAB**: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Step 5: Verify the APK

```bash
# Check APK info
aapt dump badging app/build/outputs/apk/release/app-release.apk

# Verify signing
jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk
```

---

## Step 6: Test Release Build

Install on a device:

```bash
adb install app/build/outputs/apk/release/app-release.apk
```

---

## Play Store Submission

### Required Assets:
1. **App Icon**: 512x512 PNG (in `res/mipmap-xxxhdpi/ic_launcher.png`)
2. **Feature Graphic**: 1024x500 PNG
3. **Screenshots**: At least 2 phone screenshots
4. **Privacy Policy URL**: Required for location permissions

### Play Console Settings:

1. **Target API Level**: Android 14 (API 34) ✓
2. **App Category**: Business or Productivity
3. **Content Rating**: Complete questionnaire
4. **Data Safety**: Declare location data collection

### Permissions Justification:

The app requires these permissions with justifications:

| Permission | Justification |
|------------|---------------|
| `ACCESS_FINE_LOCATION` | Required to track driver location for fleet management |
| `ACCESS_COARSE_LOCATION` | Fallback when precise location unavailable |
| `ACCESS_BACKGROUND_LOCATION` | Essential for tracking while app is minimized during delivery routes |
| `FOREGROUND_SERVICE` | Required to show persistent notification during tracking |
| `POST_NOTIFICATIONS` | To display tracking status notification |

---

## Version Management

Update version in `android/app/build.gradle`:

```groovy
defaultConfig {
    versionCode 2        // Increment for each release
    versionName "1.1.0"  // Semantic versioning
}
```

---

## Quick Commands

```bash
# Full production build
npm run build && npx cap sync android && cd android && ./gradlew bundleRelease

# Clean build
cd android && ./gradlew clean && ./gradlew bundleRelease

# Install release on device
adb install -r app/build/outputs/apk/release/app-release.apk
```

---

## Troubleshooting

### Build fails with signing error
- Verify keystore path is correct
- Check passwords are correct
- Ensure keystore file exists

### APK not installing
- Enable "Install from unknown sources" on device
- Uninstall debug version first: `adb uninstall com.drivertracker.app`

### Location not working in release
- Check permissions are granted in device settings
- Verify ProGuard rules aren't stripping required classes
- Check logcat for errors: `adb logcat | grep -i location`
