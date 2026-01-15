import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword, signOut, connectAuthEmulator } from 'firebase/auth'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getAnalytics } from 'firebase/analytics'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

let db: ReturnType<typeof getFirestore>

export default defineNuxtPlugin({
  name: 'firebase',
  setup: () => {
  const config = useRuntimeConfig()
  
  const firebaseConfig = {
    apiKey: config.public.firebase.apiKey,
    authDomain: config.public.firebase.authDomain,
    projectId: config.public.firebase.projectId,
    storageBucket: config.public.firebase.storageBucket,
    messagingSenderId: config.public.firebase.messagingSenderId,
    appId: config.public.firebase.appId,
    measurementId: config.public.firebase.measurementId
  }

  // Initialize Firebase
  const app = initializeApp(firebaseConfig)
  
  // Initialize services
  db = getFirestore(app)
  const auth = getAuth(app)
  const storage = getStorage(app)
  const functions = getFunctions(app, 'asia-northeast1') // Tokyo region
  
  // Connect to emulators in development mode
  if (process.dev && config.public.firebase.useEmulators) {
    try {
      const host = config.public.firebase.emulatorHost
      const ports = config.public.firebase.ports
      
      // Connect to Firestore emulator
      connectFirestoreEmulator(db, host, ports.firestore)
      console.log(`🔥 Connected to Firestore emulator on ${host}:${ports.firestore}`)
      
      // Connect to Auth emulator
      connectAuthEmulator(auth, `http://${host}:${ports.auth}`)
      console.log(`🔥 Connected to Auth emulator on ${host}:${ports.auth}`)
      
      // Connect to Storage emulator
      connectStorageEmulator(storage, host, ports.storage)
      console.log(`🔥 Connected to Storage emulator on ${host}:${ports.storage}`)
      
      // Connect to Functions emulator
      connectFunctionsEmulator(functions, host, ports.functions)
      console.log(`🔥 Connected to Functions emulator on ${host}:${ports.functions}`)
    } catch (error) {
      console.warn('⚠️ Firebase emulator connection failed:', error)
    }
  }
  
  // Initialize Analytics only in browser
  let analytics = null
  if (process.client && config.public.firebase.measurementId) {
    analytics = getAnalytics(app)
  }

  // Admin auth helper
  const adminAuth = {
    auth,
    login: async (credentials: { email: string; password: string }) => {
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password)
      return userCredential.user
    },
    logout: async () => {
      await signOut(auth)
    }
  }

    return {
      provide: {
        firebase: {
          app,
          db,
          auth,
          storage,
          functions,
          analytics
        },
        auth, // 認証用のショートカット
        adminAuth // 管理者認証用のヘルパー
      }
    }
  }
})
