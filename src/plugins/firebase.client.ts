import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from 'firebase/analytics'
import { getFunctions } from 'firebase/functions'

export default defineNuxtPlugin(() => {
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
  const db = getFirestore(app)
  const auth = getAuth(app)
  const storage = getStorage(app)
  const functions = getFunctions(app, 'asia-northeast1') // Tokyo region
  
  // Initialize Analytics only in browser
  let analytics = null
  if (process.client && config.public.firebase.measurementId) {
    analytics = getAnalytics(app)
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
      }
    }
  }
})