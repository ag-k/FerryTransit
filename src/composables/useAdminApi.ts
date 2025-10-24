/**
 * 管理画面用APIクライアント
 * サーバーサイドAPIへのリクエストを管理
 */
export const useAdminApi = () => {
  const { token } = useAdminAuth()

  /**
   * APIリクエストの共通処理
   */
  const apiRequest = async (
    url: string,
    options: RequestInit = {}
  ) => {
    if (!token.value) {
      throw new Error('認証トークンがありません')
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || `API Error: ${response.status}`)
    }

    return response.json()
  }

  // ========================================
  // 認証API
  // ========================================

  /**
   * 管理者認証の確認
   */
  const verifyAuth = () => {
    return apiRequest('/api/admin/auth', { method: 'POST' })
  }

  // ========================================
  // ユーザー管理API
  // ========================================

  /**
   * ユーザー一覧の取得
   */
  const getUsers = (params?: {
    page?: number
    limit?: number
    role?: string
    pageToken?: string
  }) => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.role) query.append('role', params.role)
    if (params?.pageToken) query.append('pageToken', params.pageToken)

    return apiRequest(`/api/admin/users?${query}`)
  }

  /**
   * ユーザー情報の更新
   */
  const updateUser = (
    uid: string,
    data: {
      disabled?: boolean
      admin?: boolean
      superAdmin?: boolean
      displayName?: string
      email?: string
      password?: string
    }
  ) => {
    return apiRequest(`/api/admin/users/${uid}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  // ========================================
  // 時刻表管理API
  // ========================================

  /**
   * 時刻表一覧の取得
   */
  const getTimetables = (params?: {
    limit?: number
    offset?: number
    route?: string
    status?: string
  }) => {
    const query = new URLSearchParams()
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.offset) query.append('offset', params.offset.toString())
    if (params?.route) query.append('route', params.route)
    if (params?.status) query.append('status', params.status)

    return apiRequest(`/api/admin/timetables?${query}`)
  }

  /**
   * 時刻表の作成
   */
  const createTimetable = (data: {
    name: string
    departure: string
    arrival: string
    departureTime: string
    arrivalTime: string
    status?: number
    price?: number
    startDate?: string
    endDate?: string
    via?: string
  }) => {
    return apiRequest('/api/admin/timetables', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * 時刻表の更新
   */
  const updateTimetable = (id: string, data: any) => {
    return apiRequest(`/api/admin/timetables/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  /**
   * 時刻表の削除
   */
  const deleteTimetable = (id: string) => {
    return apiRequest(`/api/admin/timetables/${id}`, {
      method: 'DELETE'
    })
  }

  // ========================================
  // アナリティクスAPI
  // ========================================

  /**
   * アナリティクス概要の取得
   */
  const getAnalyticsOverview = (period?: 'day' | 'week' | 'month') => {
    const query = new URLSearchParams()
    if (period) query.append('period', period)

    return apiRequest(`/api/admin/analytics/overview?${query}`)
  }

  // ========================================
  // データ公開API
  // ========================================

  /**
   * データのプレビュー
   */
  const previewPublish = (dataType: 'timetable' | 'fare' | 'holidays') => {
    return apiRequest('/api/admin/publish/preview', {
      method: 'POST',
      body: JSON.stringify({ dataType })
    })
  }

  /**
   * データの公開
   */
  const publishData = (dataType: 'timetable' | 'fare' | 'holidays') => {
    return apiRequest('/api/admin/publish', {
      method: 'POST',
      body: JSON.stringify({ dataType })
    })
  }

  // ========================================
  // 操作ログAPI
  // ========================================

  /**
   * 管理操作ログの取得
   */
  const getAdminLogs = (params?: {
    limit?: number
    action?: string
    target?: string
    adminId?: string
    startDate?: string
    endDate?: string
  }) => {
    const query = new URLSearchParams()
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.action) query.append('action', params.action)
    if (params?.target) query.append('target', params.target)
    if (params?.adminId) query.append('adminId', params.adminId)
    if (params?.startDate) query.append('startDate', params.startDate)
    if (params?.endDate) query.append('endDate', params.endDate)

    return apiRequest(`/api/admin/logs?${query}`)
  }

  return {
    // 認証
    verifyAuth,

    // ユーザー管理
    getUsers,
    updateUser,

    // 時刻表管理
    getTimetables,
    createTimetable,
    updateTimetable,
    deleteTimetable,

    // アナリティクス
    getAnalyticsOverview,

    // データ公開
    previewPublish,
    publishData,

    // 操作ログ
    getAdminLogs
  }
}
