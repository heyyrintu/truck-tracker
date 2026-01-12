# Android App Setup Guide

This guide explains how to set up the Android app with background location tracking.

## Prerequisites

- Node.js 18+
- Android Studio (latest)
- JDK 17+
- An Android device or emulator (min API 26 / Android 8.0)

## Initial Setup

### 1. Install Dependencies

```bash
cd android-app
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and set your API URL:
- For Android emulator: `VITE_API_URL=http://10.0.2.2:3001/api`
- For physical device: `VITE_API_URL=http://YOUR_LOCAL_IP:3001/api`

### 3. Build Web Assets

```bash
npm run build
```

### 4. Add Android Platform

```bash
npx cap add android
```

### 5. Sync with Capacitor

```bash
npx cap sync android
```

## Android Configuration

### Required Permissions

The app requires these permissions which are configured in `AndroidManifest.xml`:

```xml
<!-- Location Permissions -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Foreground Service -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Network -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Notifications -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### AndroidManifest.xml Changes

After running `npx cap add android`, update `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Background Geolocation Service -->
        <service
            android:name="com.equimaps.capacitor_background_geolocation.BackgroundGeolocationService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="location" />

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
```

### Notification Icon

Create a notification icon at:
- `android/app/src/main/res/drawable/ic_stat_location.png`

You can use Android Studio's Asset Studio to create this icon.

### build.gradle Configuration

In `android/app/build.gradle`, ensure you have:

```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.drivertracker.app"
        minSdkVersion 26
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
}
```

## Building the App

### Development

```bash
# Build and sync
npm run build
npx cap sync android

# Open in Android Studio
npx cap open android

# Or run directly
npx cap run android
```

### Production Build

1. Open Android Studio
2. Build > Generate Signed Bundle / APK
3. Select APK or Android App Bundle
4. Configure signing key
5. Build

## Runtime Permissions

The app requests permissions at runtime:

1. **Location Permission**: When user starts tracking
   - "Allow only while using the app" - Basic tracking
   - "Allow all the time" - Background tracking (required)

2. **Notification Permission**: For foreground service notification

### Permission Request Flow

```
1. User taps "Start Shift"
2. App requests FINE_LOCATION permission
3. If granted, app requests BACKGROUND_LOCATION (Android 10+)
4. If granted, app starts foreground service
5. Notification appears: "Driver Tracker is recording your location"
```

## Background Location on OEM ROMs

Some manufacturers aggressively kill background apps. Users may need to:

### Xiaomi (MIUI)
- Settings > Battery & performance > App battery saver > Driver Tracker > No restrictions
- Settings > Permissions > Autostart > Enable for Driver Tracker

### Samsung
- Settings > Apps > Driver Tracker > Battery > Allow background activity

### Huawei (EMUI)
- Settings > Battery > App launch > Driver Tracker > Manage manually > All switches on

### OnePlus (OxygenOS)
- Settings > Apps > Driver Tracker > Battery > Don't optimize

## Troubleshooting

### Location Not Updating
1. Check permissions in device settings
2. Ensure GPS is enabled
3. Check if battery optimization is disabled
4. Try restarting the app

### Foreground Notification Not Showing
1. Check notification permissions
2. Ensure notification channel is created
3. Check if "Show notifications" is enabled in app settings

### Sync Not Working
1. Check internet connection
2. Verify API URL in environment
3. Check backend server is running
4. Look at console logs for errors

## Testing

### Mock Location (for testing)
1. Enable Developer Options
2. Select "Mock location app"
3. Use an app like "Fake GPS location" to simulate movement

### Verifying Background Tracking
1. Start tracking
2. Lock screen and wait 5 minutes
3. Unlock and check if new points were captured
4. Verify points uploaded to server

## Console Logging

To view logs from the app:

```bash
# Connect device/emulator
adb logcat | grep -E "(Location|Sync|Tracking)"
```

Or in Android Studio > Logcat, filter by "Location" or "Sync".
