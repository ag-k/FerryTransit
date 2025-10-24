import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import type { LoginCredentials } from '~/types/auth'

export const useAdminAuth = () => {
  const auth = getAuth()
  const router = useRouter()
  const authStore = useAuthStore()

  const login = async (credentials: LoginCredentials) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    )
    return userCredential.user
  }

  const logout = async () => {
    try {
      await signOut(auth)
      await router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const getCurrentUser = (): Promise<User | null> => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user)
      })
    })
  }

  const isAdmin = async (user: User): Promise<boolean> => {
    try {
      const idTokenResult = await user.getIdTokenResult()
      return idTokenResult.claims.admin === true
    } catch (error) {
      console.error('Error checking admin status:', error)
      return false
    }
  }

  const getAdminRole = async (user: User): Promise<string | null> => {
    try {
      const idTokenResult = await user.getIdTokenResult()
      return idTokenResult.claims.role as string || null
    } catch (error) {
      console.error('Error getting admin role:', error)
      return null
    }
  }

  const refreshToken = async () => {
    const user = auth.currentUser
    if (user) {
      try {
        await user.getIdToken(true)
      } catch (error) {
        console.error('Error refreshing token:', error)
        throw error
      }
    }
  }

  return {
    user: computed(() => authStore.user),
    login,
    logout,
    getCurrentUser,
    isAdmin,
    getAdminRole,
    refreshToken,
    auth
  }
}
