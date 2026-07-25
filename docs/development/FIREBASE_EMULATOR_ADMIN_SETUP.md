# Firebase Emulator Super Admin Setup

This document explains how the super admin registration works in the development environment.

## Overview

`npm run dev` starts only the Nuxt development server through Portless. To start fresh Firebase emulators and automatically register a development super administrator, run `npm run firebase:emulators:with-admin` in a separate terminal.

## Automatic Registration

### Development Setup Script

The `scripts/dev-setup.mjs` script prepares `.env.local` and verifies development tooling when you run:

```bash
npm run dev:setup
```

This script does not start emulators or register users. Automatic registration is performed by:

```bash
npm run firebase:emulators:with-admin
```

That script:

1. Starts the Firebase emulators
2. Registers a super admin account with the following credentials:
   - **Email**: admin@ferry-dev.local
   - **Password**: Admin123!
   - **Role**: Super Admin

### Full Development Environment

For the persistent emulator data workflow and Portless app server, use:

```bash
npm run dev:full
```

This command:

1. Starts Firebase emulators with import/export persistence
2. Starts the Nuxt development server through portless at `https://ferry-transit.localhost`
3. Runs both services concurrently

On a fresh persistent-data directory, register the admin manually after the emulators are ready, or use `firebase:emulators:with-admin` instead when persistence is not needed.

## Manual Registration

If you need to register a different admin account manually, you can use:

```bash
# Default super admin
node src/scripts/setup-admin.js admin@ferry-dev.local Admin123! super

# Custom admin
node src/scripts/setup-admin.js your-email@example.com YourPassword123! super

# Regular admin (not super)
node src/scripts/setup-admin.js admin@example.com Admin123! general
```

## Environment Variables

The setup script automatically configures the following environment variables for emulator mode:

- `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`
- `FIRESTORE_EMULATOR_HOST=127.0.0.1:8751`
- `GOOGLE_APPLICATION_CREDENTIALS=""` (empty for emulator mode)

## Firebase Emulator UI

After starting the emulators, you can access the Firebase Emulator UI at:

- **URL**: http://localhost:4000
- **Authentication**: Check the Auth tab to see the registered super admin
- **Firestore**: Check the Firestore tab to see the admin user document

## Available Scripts

| Script                                  | Description                                             |
| --------------------------------------- | ------------------------------------------------------- |
| `npm run dev`                           | Runs setup and starts Nuxt through Portless HTTPS        |
| `npm run dev:local`                     | Runs setup and starts the raw Nuxt dev server            |
| `npm run dev:setup`                     | Prepares `.env.local` and verifies local tooling         |
| `npm run dev:full`                      | Starts persistent emulators and Portless concurrently    |
| `npm run dev:full:local`                | Starts emulators with the raw Nuxt dev server URL       |
| `npm run firebase:emulators`            | Starts Firebase emulators only                          |
| `npm run firebase:emulators:with-admin` | Starts emulators with automatic admin registration      |

## Testing Admin Registration

You can test if the admin registration was successful by running:

```bash
node scripts/test-admin-registration.mjs
```

This script will check:

1. If the user exists in Firebase Authentication
2. If the user document exists in Firestore users collection
3. If the admin document exists in Firestore admins collection

## Production vs Development

- **Development**: Uses Firebase emulators; the `firebase:emulators:with-admin` workflow also registers the development admin
- **Production**: Requires `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to a service account key

## Troubleshooting

### Common Issues and Solutions

#### 1. Project ID Mismatch Warning

```
auth: Multiple projectIds are not recommended in single project mode
```

**Solution**: This warning occurs when the setup script uses a different project ID than the one configured in `.firebaserc`. The setup has been updated to use `oki-ferryguide` to match the configuration.

#### 2. Storage Rules Not Loaded

```
storage: Permission denied because no Storage ruleset is currently loaded
```

**Solution**: The storage rules configuration has been fixed in `firebase.json`. The storage target now correctly points to `oki-ferryguide`.

#### 3. Java Version Warning

```
firebase-tools will drop support for Java version < 21 soon
```

**Solution**: This is a warning for future compatibility. For current development, Java 11+ works fine. To fix this, install JDK 21 or later.

#### 4. Authentication Error

```
Authentication Error: Your credentials are no longer valid
```

**Solution**: This error is for production deployment and doesn't affect emulator usage. For emulator development, no authentication is required.

#### 5. Port Already in Use

```
Error: Could not start Authentication Emulator, port taken.
```

**Solution**: The emulators are already running. You can either:

- Stop the existing emulator process (Ctrl+C in the terminal where it's running)
- Use the existing running emulators
- Restart your terminal/computer if the process is stuck

### Admin Registration Fails

If the automatic admin registration fails, you can run it manually:

```bash
node src/scripts/setup-admin.js admin@ferry-dev.local Admin123! super
```

Make sure the Firebase emulators are running before executing this command.

### Emulator Connection Issues

Ensure the following ports are available:

- Auth Emulator: 9099
- Firestore Emulator: 8751
- Storage Emulator: 9199
- Functions Emulator: 55002
- Emulator UI: 4000

### Permission Errors

If you encounter permission errors, ensure that:

1. Firebase emulators are running
2. The setup script is executed from the project root
3. No firewall is blocking the emulator ports

## Verification

To verify that everything is working correctly:

1. Start the emulators: `npm run firebase:emulators`
2. Run the test: `node scripts/test-admin-registration.mjs`
3. Check the Firebase Emulator UI: http://localhost:4000
4. Try logging into the admin panel with the registered credentials

## Admin Credentials Summary

**Development Super Admin Account:**

- **Email**: admin@ferry-dev.local
- **Password**: Admin123!
- **Role**: Super Admin
- **Custom Claims**: `{"admin": true, "role": "super"}`

This account has full access to all admin features in the development environment.
