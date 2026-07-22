type FirebaseEmulatorRuntimeConfigOptions = {
  isProductionBuild: boolean;
  env: Record<string, string | undefined>;
}

type FirebaseEmulatorPorts = {
  firestore: number;
  auth: number;
  storage: number;
  functions: number;
}

type FirebaseEmulatorRuntimeConfig = {
  emulatorHost?: string;
  ports?: FirebaseEmulatorPorts;
}

export const resolveFirebaseEmulatorRuntimeConfig = ({
  isProductionBuild,
  env
}: FirebaseEmulatorRuntimeConfigOptions): FirebaseEmulatorRuntimeConfig => {
  if (isProductionBuild) {
    return {}
  }

  return {
    emulatorHost: env.NUXT_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost',
    ports: {
      firestore: parseInt(env.NUXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8751'),
      auth: parseInt(env.NUXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || '9099'),
      storage: parseInt(env.NUXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT || '9199'),
      functions: parseInt(env.NUXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT || '55002')
    }
  }
}
