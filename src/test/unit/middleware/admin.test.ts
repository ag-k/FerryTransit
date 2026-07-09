import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { AdminUser } from '@/types/auth'

type RouteLike = {
  path: string
}

type NavigationResult = {
  path: string
}

type NuxtErrorInput = {
  statusCode: number
  statusMessage: string
}

type RouteMiddleware = (to: RouteLike, from: RouteLike) => Promise<unknown> | unknown

type AuthStoreDouble = {
  user: AdminUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  checkAuth: ReturnType<typeof vi.fn<[], Promise<AdminUser | null>>>
}

const { mockIsNativePlatform } = vi.hoisted(() => ({
  mockIsNativePlatform: vi.fn<[], boolean>(() => false)
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mockIsNativePlatform
  }
}))

const mockNavigateTo = vi.fn<[string], NavigationResult>()
const mockCreateError = vi.fn<[NuxtErrorInput], NuxtErrorInput>()
const mockCanAccess = vi.fn<[string], boolean>()
const mockCheckAuth = vi.fn<[], Promise<AdminUser | null>>()

let authStoreDouble: AuthStoreDouble

const createAdminUser = (customClaims: AdminUser['customClaims'] = { admin: true, role: 'general' }): AdminUser => ({
  uid: 'admin-user',
  email: 'admin@example.com',
  customClaims,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  lastLoginAt: new Date('2024-01-02T00:00:00.000Z')
})

const route = (path: string): RouteLike => ({ path })

const loadMiddleware = async (): Promise<RouteMiddleware> => {
  vi.resetModules()
  const mod = await import('@/middleware/admin')
  return mod.default as RouteMiddleware
}

describe('admin middleware', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()

    mockIsNativePlatform.mockReset()
    mockIsNativePlatform.mockReturnValue(false)
    mockNavigateTo.mockReset()
    mockNavigateTo.mockImplementation((path: string): NavigationResult => ({ path }))
    mockCreateError.mockReset()
    mockCreateError.mockImplementation((error: NuxtErrorInput): NuxtErrorInput => error)
    mockCanAccess.mockReset()
    mockCanAccess.mockReturnValue(true)
    mockCheckAuth.mockReset()
    mockCheckAuth.mockResolvedValue(null)

    authStoreDouble = {
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      checkAuth: mockCheckAuth
    }

    vi.stubGlobal('defineNuxtRouteMiddleware', (middleware: RouteMiddleware): RouteMiddleware => middleware)
    vi.stubGlobal('createError', mockCreateError)
    vi.stubGlobal('navigateTo', mockNavigateTo)
    vi.stubGlobal('useAuthStore', () => authStoreDouble)
    vi.stubGlobal('useAdminPermissions', () => ({
      canAccess: mockCanAccess
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('Capacitor.isNativePlatform() が true の場合は 403 createError を投げる', async () => {
    mockIsNativePlatform.mockReturnValue(true)

    const middleware = await loadMiddleware()

    await expect(middleware(route('/admin'), route('/'))).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: '管理画面にはWebブラウザからのみアクセスできます'
    })
    expect(mockCreateError).toHaveBeenCalledWith({
      statusCode: 403,
      statusMessage: '管理画面にはWebブラウザからのみアクセスできます'
    })
    expect(mockNavigateTo).not.toHaveBeenCalled()
    expect(mockCanAccess).not.toHaveBeenCalled()
  })

  it('/admin/login で認証済み管理者なら /admin へリダイレクトする', async () => {
    authStoreDouble.user = createAdminUser()
    authStoreDouble.isAuthenticated = true
    authStoreDouble.isAdmin = true

    const middleware = await loadMiddleware()
    const result = await middleware(route('/admin/login'), route('/admin'))

    expect(result).toEqual({ path: '/admin' })
    expect(mockNavigateTo).toHaveBeenCalledWith('/admin')
    expect(mockCheckAuth).not.toHaveBeenCalled()
    expect(mockCanAccess).not.toHaveBeenCalled()
  })

  it('/admin/login で未認証ならそのまま通過する', async () => {
    const middleware = await loadMiddleware()
    const result = await middleware(route('/admin/login'), route('/admin'))

    expect(result).toBeUndefined()
    expect(mockNavigateTo).not.toHaveBeenCalled()
    expect(mockCheckAuth).not.toHaveBeenCalled()
    expect(mockCanAccess).not.toHaveBeenCalled()
  })

  it('user が null なら checkAuth を呼ぶ', async () => {
    const adminUser = createAdminUser()
    mockCheckAuth.mockImplementation(async (): Promise<AdminUser> => {
      authStoreDouble.user = adminUser
      authStoreDouble.isAuthenticated = true
      authStoreDouble.isAdmin = true
      return adminUser
    })

    const middleware = await loadMiddleware()
    const result = await middleware(route('/admin/timetable'), route('/admin/login'))

    expect(result).toBeUndefined()
    expect(mockCheckAuth).toHaveBeenCalledTimes(1)
    expect(mockCanAccess).toHaveBeenCalledWith('/admin/timetable')
  })

  it('未認証なら /admin/login へ navigateTo する', async () => {
    const middleware = await loadMiddleware()
    const result = await middleware(route('/admin/timetable'), route('/admin/login'))

    expect(result).toEqual({ path: '/admin/login' })
    expect(mockCheckAuth).toHaveBeenCalledTimes(1)
    expect(mockNavigateTo).toHaveBeenCalledWith('/admin/login')
    expect(mockCanAccess).not.toHaveBeenCalled()
  })

  it('非管理者なら /admin/login へ navigateTo する', async () => {
    authStoreDouble.user = createAdminUser({ admin: false, role: 'general' })
    authStoreDouble.isAuthenticated = true
    authStoreDouble.isAdmin = false

    const middleware = await loadMiddleware()
    const result = await middleware(route('/admin/timetable'), route('/admin/login'))

    expect(result).toEqual({ path: '/admin/login' })
    expect(mockCheckAuth).not.toHaveBeenCalled()
    expect(mockNavigateTo).toHaveBeenCalledWith('/admin/login')
    expect(mockCanAccess).not.toHaveBeenCalled()
  })

  it('canAccess が false なら 403 createError を投げる', async () => {
    authStoreDouble.user = createAdminUser()
    authStoreDouble.isAuthenticated = true
    authStoreDouble.isAdmin = true
    mockCanAccess.mockReturnValue(false)

    const middleware = await loadMiddleware()

    await expect(middleware(route('/admin/users'), route('/admin'))).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'このページへのアクセス権限がありません'
    })
    expect(mockCanAccess).toHaveBeenCalledWith('/admin/users')
    expect(mockCreateError).toHaveBeenCalledWith({
      statusCode: 403,
      statusMessage: 'このページへのアクセス権限がありません'
    })
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('すべて満たす場合は素通りする', async () => {
    authStoreDouble.user = createAdminUser({ admin: true, role: 'super' })
    authStoreDouble.isAuthenticated = true
    authStoreDouble.isAdmin = true

    const middleware = await loadMiddleware()
    const result = await middleware(route('/admin/users'), route('/admin'))

    expect(result).toBeUndefined()
    expect(mockCheckAuth).not.toHaveBeenCalled()
    expect(mockCanAccess).toHaveBeenCalledWith('/admin/users')
    expect(mockNavigateTo).not.toHaveBeenCalled()
    expect(mockCreateError).not.toHaveBeenCalled()
  })
})
