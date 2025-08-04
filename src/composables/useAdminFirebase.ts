export const useAdminFirebase = () => {
  const { $firebase } = useNuxtApp()
  
  if (!$firebase) {
    throw new Error('Firebase plugin not found')
  }
  
  return {
    db: $firebase.db,
    auth: $firebase.auth,
    storage: $firebase.storage,
    functions: $firebase.functions,
    analytics: $firebase.analytics
  }
}