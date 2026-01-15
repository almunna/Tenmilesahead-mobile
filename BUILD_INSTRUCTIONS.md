# EAS Build Instructions for Ten Miles Ahead

## Project Configuration
- **Project ID**: f8d07344-7d5c-4681-be52-68a3ea29935d
- **Project Name**: @almunna/ten-miles-ahead
- **Package**: com.tenmilesahead.app

## Build Commands

### Production Build (APK)
```bash
eas build --platform android --profile production
```

### Preview Build (APK)
```bash
eas build --platform android --profile preview
```

### Development Build (APK with dev client)
```bash
eas build --platform android --profile development
```

## First Time Setup

When running your first build, you'll be prompted to:
1. Generate a new Android Keystore → Select **Yes**
2. The keystore will be stored securely on Expo's servers
3. Future builds will use the same keystore automatically

## Build via Web Dashboard

Alternative to CLI: https://expo.dev/accounts/almunna/projects/ten-miles-ahead/builds

1. Click "Create a build"
2. Select Platform: Android
3. Select Profile: production
4. Click "Build"

## After Build Completes

- Download the APK from the provided link
- Install on Android device or emulator
- APK files can be shared and installed directly without Play Store

## Build Profiles

### Production
- Release build with full optimizations
- Suitable for distribution

### Preview
- Internal distribution build
- Good for testing before production

### Development
- Includes Expo dev client
- Useful for development and debugging
