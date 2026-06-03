# PhoneGate 🔐
**Unlock your Windows PC with your phone's fingerprint or face.**

---

## How it works

```
OnePlus Nord 5
  → BiometricPrompt (fingerprint/face)
    → HMAC-signed HTTP POST over LAN
      → Windows Service (validates token)
        → Named Pipe → Credential Provider DLL
          → Windows logs you in
```

---

## Setup

### 1. Android App (this repo)

```bash
# Install dependencies
npm install

# Run on your phone (make sure Expo Go is installed)
npx expo start --android

# Or build an APK
npx eas build --platform android --profile preview
```

Go to **Settings** in the app:
- Enter your **PC's local IP** (run `ipconfig` on PC → Wi-Fi IPv4)
- Set **port** to `7779` (or whatever you configure the Windows service to use)
- Tap **Generate random secret** → copy it → paste into the Windows service config

---

### 2. Windows Service (coming next)

- A .NET 8 background service (`PhoneGateService`)
- Listens on `http://localhost:7779`
- Validates HMAC token (same secret as app)
- Sends signal via Named Pipe to the Credential Provider

Config file: `appsettings.json`
```json
{
  "PhoneGate": {
    "Port": 7779,
    "Secret": "PASTE_SECRET_HERE",
    "ReplayWindowMs": 10000
  }
}
```

---

### 3. Windows Credential Provider (coming next)

- A COM DLL registered in `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\Credential Providers`
- Polls Named Pipe for unlock signal
- Auto-submits your stored (DPAPI-encrypted) password at the login screen

---

## Security notes

| Threat | Mitigation |
|--------|-----------|
| LAN eavesdropping | HMAC-signed payload (can't forge without secret) |
| Replay attack | Timestamp checked (±10s window) + nonce tracked |
| Secret storage | Android Keystore via `expo-secure-store` |
| Password storage | Windows DPAPI (tied to your Windows user) |
| Remote attack | Service only binds to local subnet |

---

## Project structure

```
phonegate/
├── App.tsx                    # Root, manual nav
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx     # Main unlock UI
│   │   └── SettingsScreen.tsx # PC IP + secret config
│   └── lib/
│       ├── hmac.ts            # HMAC-SHA256 packet signing
│       ├── sender.ts          # HTTP POST to Windows service
│       └── useSettings.ts     # SecureStore persistence
```
