import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import type { AdminUser, LoginCredentials } from '@/types/auth'

type TokenClaims = {
  admin?: boolean
  role?: 'super' | 'general'
  [claim: string]: unknown
}

type MockIdTokenResult = {
  claims: TokenClaims
}

type MockFirebaseUser = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  metadata: {
    creationTime?: string
    lastSignInTime?: string
  }
  getIdTokenResult: MockInstance<[], Promise<MockIdTokenResult>>
}

type AuthStateCallback = (user: MockFirebaseUser | null) => void | Promise<void>

type AdminAuthDouble = {
  login: MockInstance<[LoginCredentials], Promise<MockFirebaseUser | null>>
  logout: MockInstance<[], Promise<void>>
  auth: {
    onAuthStateChanged: MockInstance<[AuthStateCallback], void>
  }
}

const credentials: LoginCredentials = {
  email: 'admin@example.com',
  password: 'password123'
}

const mockLogin = vi.fn<[LoginCredentials], Promise<MockFirebaseUser | null>>()
const mockLogout = vi.fn<[], Promise<void>>()
const mockOnAuthStateChanged = vi.fn<[AuthStateCallback], void>()
const mockNavigateTo = vi.fn<[string], Promise<void>>()

let adminAuthDouble: AdminAuthDouble

const createStoreUser = (customClaims?: AdminUser['customClaims']): AdminUser => {
  const user = {
    uid: 'store-user',
    email: 'admin@example.com',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    lastLoginAt: new Date('2024-01-02T00:00:00.000Z')
  }

  return customClaims ? { ...user, customClaims } : user
}

const createFirebaseUser = (claims: TokenClaims = { admin: true }): MockFirebaseUser => ({
  uid: 'firebase-user',
  email: 'admin@example.com',
  displayName: 'Admin User',
  photoURL: 'https://example.com/avatar.png',
  metadata: {
    creationTime: '2024-01-01T00:00:00.000Z',
    lastSignInTime: '2024-01-02T00:00:00.000Z'
  },
  getIdTokenResult: vi.fn<[], Promise<MockIdTokenResult>>().mockResolvedValue({ claims })
})

const emitAuthState = (user: MockFirebaseUser | null): void => {
  mockOnAuthStateChanged.mockImplementation((callback: AuthStateCallback): void => {
    void callback(user)
  })
}

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockLogin.mockReset()
    mockLogout.mockReset()
    mockOnAuthStateChanged.mockReset()
    mockNavigateTo.mockReset()
    mockNavigateTo.mockResolvedValue(undefined)

    adminAuthDouble = {
      login: mockLogin,
      logout: mockLogout,
      auth: {
        onAuthStateChanged: mockOnAuthStateChanged
      }
    }

    vi.stubGlobal('useNuxtApp', () => ({
      $adminAuth: adminAuthDouble
    }))
    vi.stubGlobal('navigateTo', mockNavigateTo)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('getters', () => {
    it.each([
      {
        name: 'user が null',
        user: null,
        expected: {
          isAuthenticated: false,
          isAdmin: false,
          isSuperAdmin: false,
          userRole: null
        }
      },
      {
        name: 'customClaims が無い',
        user: createStoreUser(),
        expected: {
          isAuthenticated: true,
          isAdmin: false,
          isSuperAdmin: false,
          userRole: null
        }
      },
      {
        name: '一般管理者',
        user: createStoreUser({ admin: true, role: 'general' }),
        expected: {
          isAuthenticated: true,
          isAdmin: true,
          isSuperAdmin: false,
          userRole: 'general'
        }
      },
      {
        name: 'スーパー管理者',
        user: createStoreUser({ admin: true, role: 'super' }),
        expected: {
          isAuthenticated: true,
          isAdmin: true,
          isSuperAdmin: true,
          userRole: 'super'
        }
      },
      {
        name: 'admin クレームが false',
        user: createStoreUser({ admin: false, role: 'general' }),
        expected: {
          isAuthenticated: true,
          isAdmin: false,
          isSuperAdmin: false,
          userRole: 'general'
        }
      },
      {
        name: 'role が無い管理者',
        user: createStoreUser({ admin: true }),
        expected: {
          isAuthenticated: true,
          isAdmin: true,
          isSuperAdmin: false,
          userRole: null
        }
      }
    ])('$name の状態を返す', ({ user, expected }) => {
      const store = useAuthStore()
      store.user = user

      expect(store.isAuthenticated).toBe(expected.isAuthenticated)
      expect(store.isAdmin).toBe(expected.isAdmin)
      expect(store.isSuperAdmin).toBe(expected.isSuperAdmin)
      expect(store.userRole).toBe(expected.userRole)
    })
  })

  describe('login', () => {
    it('成功時に user をセットする', async () => {
      const firebaseUser = createFirebaseUser({ admin: true, role: 'super' })
      mockLogin.mockResolvedValue(firebaseUser)

      const store = useAuthStore()
      const result = await store.login(credentials)

      expect(mockLogin).toHaveBeenCalledWith(credentials)
      expect(firebaseUser.getIdTokenResult).toHaveBeenCalledTimes(1)
      expect(result).toEqual(store.user)
      expect(store.user).toMatchObject({
        uid: 'firebase-user',
        email: 'admin@example.com',
        displayName: 'Admin User',
        photoURL: 'https://example.com/avatar.png',
        customClaims: { admin: true, role: 'super' }
      })
      expect(store.user?.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z')
      expect(store.user?.lastLoginAt.toISOString()).toBe('2024-01-02T00:00:00.000Z')
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('admin クレームが無い場合は logout を呼んでエラーにする', async () => {
      mockLogin.mockResolvedValue(createFirebaseUser({ role: 'general' }))
      mockLogout.mockResolvedValue(undefined)

      const store = useAuthStore()

      await expect(store.login(credentials)).rejects.toThrow('管理者権限がありません')
      expect(mockLogout).toHaveBeenCalledTimes(1)
      expect(store.user).toBeNull()
      expect(store.error).toBe('管理者権限がありません')
      expect(store.isLoading).toBe(false)
    })

    it('失敗時に error をセットし isLoading を false に戻す', async () => {
      const authError = Object.assign(new Error('Firebase rejected'), {
        code: 'auth/invalid-email'
      })
      mockLogin.mockRejectedValue(authError)

      const store = useAuthStore()

      await expect(store.login(credentials)).rejects.toBe(authError)
      expect(store.error).toBe('メールアドレスの形式が正しくありません')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('logout', () => {
    it('$adminAuth.logout を呼び user を null にして /admin/login へ遷移する', async () => {
      mockLogout.mockResolvedValue(undefined)

      const store = useAuthStore()
      store.user = createStoreUser({ admin: true, role: 'general' })

      await store.logout()

      expect(mockLogout).toHaveBeenCalledTimes(1)
      expect(store.user).toBeNull()
      expect(mockNavigateTo).toHaveBeenCalledWith('/admin/login')
    })

    it('失敗時に error をセットする', async () => {
      const authError = Object.assign(new Error('logout failed'), {
        code: 'auth/network-request-failed'
      })
      mockLogout.mockRejectedValue(authError)

      const store = useAuthStore()
      store.user = createStoreUser({ admin: true, role: 'general' })

      await expect(store.logout()).rejects.toBe(authError)
      expect(store.error).toBe('ネットワークエラーが発生しました')
      expect(store.user).not.toBeNull()
      expect(mockNavigateTo).not.toHaveBeenCalled()
    })
  })

  describe('checkAuth', () => {
    it('admin クレームありなら user をセットする', async () => {
      const firebaseUser = createFirebaseUser({ admin: true, role: 'general' })
      emitAuthState(firebaseUser)

      const store = useAuthStore()
      const result = await store.checkAuth()

      expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1)
      expect(firebaseUser.getIdTokenResult).toHaveBeenCalledTimes(1)
      expect(result).toEqual(store.user)
      expect(store.user).toMatchObject({
        uid: 'firebase-user',
        email: 'admin@example.com',
        customClaims: { admin: true, role: 'general' }
      })
    })

    it('admin クレームなしなら null にする', async () => {
      emitAuthState(createFirebaseUser({ role: 'general' }))

      const store = useAuthStore()
      store.user = createStoreUser({ admin: true, role: 'general' })

      await expect(store.checkAuth()).resolves.toBeNull()
      expect(store.user).toBeNull()
    })

    it('getIdTokenResult の例外時は null にする', async () => {
      const firebaseUser = createFirebaseUser({ admin: true })
      firebaseUser.getIdTokenResult.mockRejectedValue(new Error('token failed'))
      emitAuthState(firebaseUser)

      const store = useAuthStore()
      store.user = createStoreUser({ admin: true, role: 'general' })

      await expect(store.checkAuth()).resolves.toBeNull()
      expect(store.user).toBeNull()
    })

    it('user が無い場合は null にする', async () => {
      emitAuthState(null)

      const store = useAuthStore()
      store.user = createStoreUser({ admin: true, role: 'general' })

      await expect(store.checkAuth()).resolves.toBeNull()
      expect(store.user).toBeNull()
    })
  })

  describe('getErrorMessage', () => {
    it.each([
      ['auth/invalid-email', 'メールアドレスの形式が正しくありません'],
      ['auth/user-disabled', 'このアカウントは無効化されています'],
      ['auth/user-not-found', 'アカウントが見つかりません'],
      ['auth/wrong-password', 'パスワードが正しくありません'],
      ['auth/invalid-credential', 'メールアドレスまたはパスワードが正しくありません'],
      ['auth/too-many-requests', 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください'],
      ['auth/network-request-failed', 'ネットワークエラーが発生しました']
    ])('既知の Firebase エラーコード %s を日本語メッセージに変換する', (code, message) => {
      const store = useAuthStore()

      expect(store.getErrorMessage({ code, message: 'unused' })).toBe(message)
    })

    it('未知コードでは error.message を返す', () => {
      const store = useAuthStore()

      expect(store.getErrorMessage({
        code: 'auth/unknown',
        message: '不明な認証エラー'
      })).toBe('不明な認証エラー')
    })

    it('コードも message も無い場合はデフォルトメッセージを返す', () => {
      const store = useAuthStore()

      expect(store.getErrorMessage({})).toBe('認証エラーが発生しました')
    })
  })
})
