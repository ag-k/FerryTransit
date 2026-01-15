// ========================================
// アクセス統計機能用インターフェース
// ========================================

/**
 * 日次統計ドキュメント
 * コレクション: analytics_daily/{dateKey}
 * dateKey: YYYY-MM-DD (Asia/Tokyo)
 */
export interface AnalyticsDaily {
  dateKey: string                        // YYYY-MM-DD
  pvTotal: number                        // 日次PV合計
  searchTotal: number                    // 日次検索回数合計
  routeCounts: Record<string, number>    // "depId-arrId" -> count
  departureCounts: Record<string, number> // depId -> count
  arrivalCounts: Record<string, number>   // arrId -> count
  hourCounts: Record<string, number>     // "00".."23" -> count
  updatedAt: { seconds: number; nanoseconds: number }
}

/**
 * 月次統計ドキュメント
 * コレクション: analytics_monthly/{monthKey}
 * monthKey: YYYY-MM (Asia/Tokyo)
 */
export interface AnalyticsMonthly {
  monthKey: string                       // YYYY-MM
  pvTotal: number                        // 月次PV合計
  searchTotal: number                    // 月次検索回数合計
  routeCounts: Record<string, number>    // "depId-arrId" -> count
  departureCounts: Record<string, number> // depId -> count
  arrivalCounts: Record<string, number>   // arrId -> count
  hourCounts: Record<string, number>     // "00".."23" -> count
  updatedAt: { seconds: number; nanoseconds: number }
}

/**
 * 時間別統計ドキュメント
 * コレクション: analytics_hourly/{hourKey}
 * hourKey: YYYY-MM-DD-HH (Asia/Tokyo)
 */
export interface AnalyticsHourly {
  hourKey: string                        // YYYY-MM-DD-HH
  pvTotal: number                        // 時間別PV合計
  searchTotal: number                    // 時間別検索回数合計
  routeCounts: Record<string, number>    // "depId-arrId" -> count
  departureCounts: Record<string, number> // depId -> count
  arrivalCounts: Record<string, number>   // arrId -> count
  updatedAt: { seconds: number; nanoseconds: number }
}

/**
 * PVトラッキング引数
 */
export interface TrackPageViewParams {
  pagePath: string  // ページのパス（例: /transit）
}

/**
 * 検索トラッキング引数
 */
export interface TrackSearchParams {
  depId: string     // 出発地ID
  arrId: string     // 到着地ID
  datetime?: string // 検索日時（ISO8601形式、省略時は現在時刻）
}

/**
 * 期間プリセット
 */
export type PeriodPreset = 
  | 'today'      // 今日
  | 'yesterday'  // 昨日
  | 'last7days'  // 直近7日
  | 'last30days' // 直近30日
  | 'thisMonth'  // 今月
  | 'lastMonth'  // 先月
  | 'last3Months' // 3ヶ月
  | 'lastYear'   // 1年
  | 'custom'     // カスタム期間

/**
 * カスタム期間
 */
export interface CustomPeriod {
  startDate: Date
  endDate: Date
}

/**
 * 人気航路
 */
export interface PopularRoute {
  routeKey: string  // "depId-arrId"
  depId: string
  arrId: string
  count: number
}

/**
 * ルート情報付き人気航路
 */
export interface PopularRouteWithNames extends PopularRoute {
  depName: string
  arrName: string
}

/**
 * グラフデータ
 */
export interface ChartData {
  label: string
  value: number
}

/**
 * PVと検索の複系列グラフデータ
 */
export interface MultiSeriesChartData {
  label: string
  pv: number
  search: number
}

/**
 * アクセス統計サマリー
 */
export interface AnalyticsSummary {
  pvTotal: number
  searchTotal: number
  popularRoutes: PopularRoute[]
}

/**
 * 時間帯別分布
 */
export interface HourlyDistribution {
  hour: number     // 0-23
  pv: number
  search: number
}

/**
 * 出発地/到着地別分布
 */
export interface PortDistribution {
  id: string
  name: string
  count: number
  percentage: number
}

// ========================================
// レガシーインターフェース（互換性のため維持）
// ========================================

export interface PageViewStats {
  date: string
  views: number
  uniqueUsers: number
  averageDuration: number
}

export interface UserStats {
  totalUsers: number
  newUsers: number
  returningUsers: number
  averageSessionDuration: number
}

export interface DeviceStats {
  desktop: number
  mobile: number
  tablet: number
  ios: number
  android: number
}

export interface LocationStats {
  prefecture: string
  city?: string
  count: number
  percentage: number
}

export interface SearchStats {
  fromPort: string
  toPort: string
  searchCount: number
  conversionRate: number
  lastSearched: Date
}

export interface Analytics {
  pageViews: PageViewStats[]
  userStats: UserStats
  deviceStats: DeviceStats
  locationStats: LocationStats[]
  searchStats: SearchStats[]
}
