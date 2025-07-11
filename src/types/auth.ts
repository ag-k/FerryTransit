export interface AdminUser {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  customClaims?: {
    admin: boolean
    role?: 'super' | 'general'
  }
  createdAt: Date
  lastLoginAt: Date
}

export interface AuthState {
  user: AdminUser | null
  isLoading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthError {
  code: string
  message: string
}