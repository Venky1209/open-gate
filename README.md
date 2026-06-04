# OpenGate
Unlock your Windows PC with your phone's fingerprint or face.

## Mobile app

This repository includes a standalone Android APK:

- [`opengate.apk`](/d:\phonegate-app\phonegate\opengate.apk)

Install it on any Android phone and point it at your Windows PC in the app settings.

### Mobile setup

1. Open the APK on your Android device and install it.
2. In the app, enter:
   - your PC's local IPv4 address
   - the port your Windows service listens on
   - the shared secret
3. Save the settings.
4. Tap the unlock button and authenticate with biometrics.

## How it works

1. Android app authenticates with biometrics.
2. App sends an HMAC-signed HTTP request over LAN.
3. Windows service validates the request.
4. Windows service triggers the login flow.

## Windows side

The Windows side is the next piece to package for real users.

For production, the goal should be:

- a simple installer
- service startup on boot
- a small configuration UI for IP, port, and shared secret
- a tray app or service UI that looks polished enough for non-developers

## Security notes

- The app uses a shared secret plus HMAC signing.
- The service should reject bad timestamps and nonce replays.
- The APK and Expo Go do not share app storage.

## Repository structure

- `opengate.apk` - standalone Android build
- `src/` - React Native app source
- `plugins/` - Expo config plugins
