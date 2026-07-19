/* eslint-disable no-console */
import * as admin from 'firebase-admin'

let initialized = false

export const ensureAdminApp = () => {
  if (initialized || admin.apps.length > 0) return

  const rawSecret = process.env.ADMIN_SERVICE_ACCOUNT_JSON

  if (rawSecret) {
    try {
      const serviceAccount = JSON.parse(rawSecret)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      })
    } catch (error) {
      console.error('Failed to initialize Firebase Admin from Secret Manager:', error)
      throw error
    }
  } else {
    admin.initializeApp()
  }

  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    try {
      const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST ||
        `127.0.0.1:${process.env.NUXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8751'}`
      process.env.FIRESTORE_EMULATOR_HOST = firestoreEmulatorHost
      admin.firestore().settings({
        host: firestoreEmulatorHost,
        ssl: false
      })
      console.info(`🔥 Functions: Connected to Firestore emulator on ${firestoreEmulatorHost}`)
    } catch (error) {
      console.warn('⚠️ Functions: Firestore emulator connection failed:', error)
    }
  }

  initialized = true
}
