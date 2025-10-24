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
