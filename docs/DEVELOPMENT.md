# Local Development with Firebase Emulators

This guide explains how to set up and use Firebase emulators for local development.

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Set up development environment
npm run dev:setup
```

### 2. Start Development Environment

**Option A: Start everything at once**
```bash
npm run dev:full
```

**Option B: Start services separately**
```bash
# Terminal 1: Start Firebase emulators
npm run firebase:emulators

# Terminal 2: Start Nuxt development server
npm run dev
```

### 3. Access Development Services
- **Application**: http://localhost:3030
- **Firebase Emulator UI**: http://localhost:4000
- **Firestore Emulator**: localhost:8080
- **Auth Emulator**: http://localhost:9099
- **Storage Emulator**: localhost:9199
- **Functions Emulator**: localhost:5001

## 📋 Configuration

### Environment Variables
The project uses `.env.local` for local development configuration. This file is automatically created from `.env.example` when you run `npm run dev:setup`.

Key emulator settings:
```env
NUXT_PUBLIC_FIREBASE_USE_EMULATORS=true
NUXT_PUBLIC_FIREBASE_EMULATOR_HOST=localhost
NUXT_PUBLIC_FIRESTORE_EMULATOR_PORT=8080
NUXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT=9099
NUXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT=9199
NUXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT=5001
```

### Firebase Emulator Configuration
The emulators are configured in `firebase.json`:
```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true },
    "singleProjectMode": true
  }
}
```

## 🔧 Development Features

### Automatic Emulator Detection
The Firebase client plugin automatically detects development mode and connects to emulators when `NUXT_PUBLIC_FIREBASE_USE_EMULATORS=true`.

### Cloud Functions Emulation
Cloud Functions also connect to the Firestore emulator when running in the emulator environment.

### Data Persistence
Emulator data is persisted in the `firebase-emulator-data` directory. You can reset data using:
```bash
firebase emulators:start --clear-data-on-start
```

## 🛠 Common Development Tasks

### Reset Emulator Data
```bash
# Clear all emulator data
firebase emulators:start --clear-data-on-start

# Or manually delete the data directory
rm -rf firebase-emulator-data
```

### Import/Export Data
```bash
# Export Firestore data
firebase emulators:export ./exported-data

# Import Firestore data
firebase emulators:start --import ./exported-data
```

### Test Authentication
Use the Firebase Emulator UI (http://localhost:4000) to:
- Create test users
- Test authentication flows
- View Firestore data
- Monitor function calls

## 🐛 Troubleshooting

### Port Conflicts
If ports are already in use, you can change them in `firebase.json` or update the environment variables in `.env.local`.

### Connection Issues
1. Ensure Firebase emulators are running before starting the Nuxt dev server
2. Check that the ports in `.env.local` match those in `firebase.json`
3. Look for console logs showing successful emulator connections

### Performance Tips
- Use SSD storage for better emulator performance
- Close unnecessary browser tabs when testing
- Restart emulators periodically to clear memory

## 📚 Additional Resources

- [Firebase Emulator Documentation](https://firebase.google.com/docs/emulator-suite)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Nuxt 3 Documentation](https://nuxt.com/docs)
