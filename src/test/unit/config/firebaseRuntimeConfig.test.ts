import { describe, expect, it } from 'vitest'
import { resolveFirebaseEmulatorRuntimeConfig } from '../../../config/firebaseRuntimeConfig'

describe('Firebase runtime emulator configuration', () => {
  it('omits development endpoints from production runtime config', () => {
    expect(resolveFirebaseEmulatorRuntimeConfig({
      isProductionBuild: true,
      env: {
        NUXT_PUBLIC_FIREBASE_EMULATOR_HOST: 'localhost',
        NUXT_PUBLIC_FIRESTORE_EMULATOR_PORT: '8751'
      }
    })).toEqual({})
  })

  it('keeps emulator defaults available for development builds', () => {
    expect(resolveFirebaseEmulatorRuntimeConfig({
      isProductionBuild: false,
      env: {}
    })).toEqual({
      emulatorHost: 'localhost',
      ports: {
        firestore: 8751,
        auth: 9099,
        storage: 9199,
        functions: 55002
      }
    })
  })

  it('uses explicitly configured development endpoints', () => {
    expect(resolveFirebaseEmulatorRuntimeConfig({
      isProductionBuild: false,
      env: {
        NUXT_PUBLIC_FIREBASE_EMULATOR_HOST: '127.0.0.1',
        NUXT_PUBLIC_FIRESTORE_EMULATOR_PORT: '18751',
        NUXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT: '19099',
        NUXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT: '19199',
        NUXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT: '15502'
      }
    })).toEqual({
      emulatorHost: '127.0.0.1',
      ports: {
        firestore: 18751,
        auth: 19099,
        storage: 19199,
        functions: 15502
      }
    })
  })
})
