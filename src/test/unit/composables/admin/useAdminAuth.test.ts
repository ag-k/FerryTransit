import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockSignInWithEmailAndPassword = vi.fn()
const mockSignOut = vi.fn()
const mockOnAuthStateChanged = vi.fn()
const mockAuth = { currentUser: null as null | { getIdToken: (force?: boolean) => Promise<void> } }
const mockRouterPush = vi.fn()
const mockAuthStore = { user: null }

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args)
}))

describe('useAdminAuth', () => {
  const loadComposable = async () => {
    vi.resetModules()
    const mod = await import('@/composables/useAdminAuth')
    return mod.useAdminAuth()
  }

  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal('useRouter', () => ({
      push: mockRouterPush
    }))
    vi.stubGlobal('useAuthStore', () => mockAuthStore)
    mockSignInWithEmailAndPassword.mockReset()
    mockSignOut.mockReset()
    mockOnAuthStateChanged.mockReset()
    mockRouterPush.mockReset()
    mockAuth.currentUser = null
    mockAuthStore.user = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('管理者ユーザーのログインに成功するとユーザー情報を返す', async () => {
    const mockUser = {
      uid: 'admin-uid',
      email: 'admin@example.com'
    }
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser })

    const { login } = await loadComposable()
    const result = await login({ email: 'admin@example.com', password: 'password123' })

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      'admin@example.com',
      'password123'
    )
    expect(result).toBe(mockUser)
  })

  it('認証情報が無効な場合はエラーを送出する', async () => {
    const authError = new Error('auth/invalid-email')
    mockSignInWithEmailAndPassword.mockRejectedValue(authError)

    const { login } = await loadComposable()

    await expect(
      login({ email: 'invalid', password: 'password' })
    ).rejects.toThrow('auth/invalid-email')
  })

  it('ログアウト時にFirebaseとルーターが呼び出される', async () => {
    mockSignOut.mockResolvedValue(undefined)

    const { logout } = await loadComposable()
    await logout()

    expect(mockSignOut).toHaveBeenCalledWith(mockAuth)
    expect(mockRouterPush).toHaveBeenCalledWith('/admin/login')
  })

  it('onAuthStateChangedで現在のユーザーを取得できる', async () => {
    const mockUser = { uid: 'current-user' }
    mockAuth.currentUser = mockUser as any
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      const unsubscribe = vi.fn()
      queueMicrotask(() => {
        callback(mockUser)
      })
      return unsubscribe
    })

    const { getCurrentUser } = await loadComposable()
    await expect(getCurrentUser()).resolves.toEqual(mockUser)
  })

  it('管理者権限を持つユーザーを判定できる', async () => {
    const mockAdminUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { admin: true } })
    }

    const { isAdmin } = await loadComposable()
    await expect(isAdmin(mockAdminUser as any)).resolves.toBe(true)
  })

  it('管理者権限を持たないユーザーはfalseを返す', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockRejectedValue(new Error('token-error'))
    }

    const { isAdmin } = await loadComposable()
    await expect(isAdmin(mockUser as any)).resolves.toBe(false)
  })

  it('ユーザーの管理者ロールを取得できる', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'super' } })
    }

    const { getAdminRole } = await loadComposable()
    await expect(getAdminRole(mockUser as any)).resolves.toBe('super')
  })

  it('現在のユーザーが存在する場合はトークンを更新する', async () => {
    const mockCurrentUser = { getIdToken: vi.fn().mockResolvedValue(undefined) }
    mockAuth.currentUser = mockCurrentUser

    const { refreshToken } = await loadComposable()
    await refreshToken()

    expect(mockCurrentUser.getIdToken).toHaveBeenCalledWith(true)
  })
})
