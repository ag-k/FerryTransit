import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Firebase Auth
const mockSignInWithEmailAndPassword = vi.fn()
const mockSignOut = vi.fn()
const mockOnAuthStateChanged = vi.fn()

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args)
}))

// Mock stores
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    currentUser: null,
    setCurrentUser: vi.fn(),
    clearCurrentUser: vi.fn()
  })
}))

// Mock useRouter
vi.mock('#vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

// Mock useNuxtApp
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $auth: {}
  }),
  useState: vi.fn((key, init) => {
    const state = init ? init() : null
    return {
      value: state
    }
  }),
  navigateTo: vi.fn()
}))

describe('useAdminAuth', () => {
  const mockUseAdminAuth = async () => {
    const mod = await import('@/composables/useAdminAuth')
    return mod.useAdminAuth()
  }
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('管理者権限を持つユーザーでログインできる', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'admin@example.com',
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { role: 'admin' }
        })
      }
      
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      })

      const { login } = await mockUseAdminAuth()
      const result = await login('admin@example.com', 'password123')

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'admin@example.com',
        'password123'
      )
      expect(result).toBe(true)
    })

    it('管理者権限を持たないユーザーでログイン失敗', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'user@example.com',
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: {}
        })
      }
      
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      })
      mockSignOut.mockResolvedValue(undefined)

      const { login } = await mockUseAdminAuth()
      const result = await login('user@example.com', 'password123')

      expect(result).toBe(false)
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('無効な認証情報でエラーを返す', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(
        new Error('auth/invalid-email')
      )

      const { login } = await mockUseAdminAuth()
      
      await expect(login('invalid', 'password')).rejects.toThrow('auth/invalid-email')
    })
  })

  describe('logout', () => {
    it('正常にログアウトできる', async () => {
      mockSignOut.mockResolvedValue(undefined)

      const { logout } = await mockUseAdminAuth()
      await logout()

      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe('checkAdminRole', () => {
    it('管理者権限を持つユーザーを検証できる', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'admin@example.com',
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { role: 'admin' }
        })
      }

      const { checkAdminRole } = await mockUseAdminAuth()
      const isAdmin = await checkAdminRole(mockUser)

      expect(isAdmin).toBe(true)
    })

    it('スーパー管理者権限を持つユーザーを検証できる', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'super@example.com',
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { role: 'super' }
        })
      }

      const { checkAdminRole } = await mockUseAdminAuth()
      const isAdmin = await checkAdminRole(mockUser)

      expect(isAdmin).toBe(true)
    })

    it('権限を持たないユーザーを検証できる', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'user@example.com',
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { role: 'user' }
        })
      }

      const { checkAdminRole } = await mockUseAdminAuth()
      const isAdmin = await checkAdminRole(mockUser)

      expect(isAdmin).toBe(false)
    })
  })
})