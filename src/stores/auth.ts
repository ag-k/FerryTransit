import { defineStore } from 'pinia'
import type { AdminUser, AuthState, LoginCredentials } from '~/types/auth'

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isLoading: false,
    error: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.customClaims?.admin === true,
    isSuperAdmin: (state) => state.user?.customClaims?.role === 'super',
    userRole: (state) => state.user?.customClaims?.role || null
  },

  actions: {
    async login(credentials: LoginCredentials) {
      this.isLoading = true
      this.error = null
      
      try {
        const { $adminAuth } = useNuxtApp()
        const userCredential = await $adminAuth.login(credentials)
        const user = userCredential
        
        if (!user) throw new Error('ログインに失敗しました')
        
        // カスタムクレームを取得
        const idTokenResult = await user.getIdTokenResult()
        
        // 管理者権限を確認
        if (!idTokenResult.claims.admin) {
          await $adminAuth.logout()
          throw new Error('管理者権限がありません')
        }
        
        this.user = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
          customClaims: idTokenResult.claims as any,
          createdAt: new Date(user.metadata.creationTime || Date.now()),
          lastLoginAt: new Date(user.metadata.lastSignInTime || Date.now())
        }
        
        return this.user
      } catch (error: any) {
        this.error = this.getErrorMessage(error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async logout() {
      try {
        const { $adminAuth } = useNuxtApp()
        await $adminAuth.logout()
        this.user = null
        await navigateTo('/admin/login')
      } catch (error: any) {
        this.error = this.getErrorMessage(error)
        throw error
      }
    },

    async checkAuth() {
      const { $adminAuth } = useNuxtApp()
      
      return new Promise<AdminUser | null>((resolve) => {
        const { auth } = $adminAuth
        auth.onAuthStateChanged(async (user) => {
          if (user) {
            try {
              const idTokenResult = await user.getIdTokenResult()
              
              if (idTokenResult.claims.admin) {
                this.user = {
                  uid: user.uid,
                  email: user.email || '',
                  displayName: user.displayName || undefined,
                  photoURL: user.photoURL || undefined,
                  customClaims: idTokenResult.claims as any,
                  createdAt: new Date(user.metadata.creationTime || Date.now()),
                  lastLoginAt: new Date(user.metadata.lastSignInTime || Date.now())
                }
                resolve(this.user)
              } else {
                this.user = null
                resolve(null)
              }
            } catch (error) {
              this.user = null
              resolve(null)
            }
          } else {
            this.user = null
            resolve(null)
          }
        })
      })
    },

    getErrorMessage(error: any): string {
      const errorMessages: Record<string, string> = {
        'auth/invalid-email': 'メールアドレスの形式が正しくありません',
        'auth/user-disabled': 'このアカウントは無効化されています',
        'auth/user-not-found': 'アカウントが見つかりません',
        'auth/wrong-password': 'パスワードが正しくありません',
        'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません',
        'auth/too-many-requests': 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください',
        'auth/network-request-failed': 'ネットワークエラーが発生しました'
      }
      
      return errorMessages[error.code] || error.message || '認証エラーが発生しました'
    }
  }
})