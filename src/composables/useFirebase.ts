import type { Firestore, Auth, Storage, Functions, Analytics } from 'firebase/app'

export interface FirebaseServices {
  app: any
  db: Firestore
  auth: Auth
  storage: Storage
  functions: Functions
  analytics: Analytics | null
}

export const useFirebase = (): FirebaseServices => {
  const { $firebase } = useNuxtApp()
  
  if (!$firebase) {
    throw new Error('Firebase plugin not initialized')
  }
  
  return $firebase as FirebaseServices
}