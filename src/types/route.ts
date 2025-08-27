// 航路データの型定義

export interface RoutePoint {
  lat: number
  lng: number
}

export interface RouteData {
  id: string
  from: string           // 出発港ID
  to: string            // 到着港ID
  fromName: string      // 出発港名
  toName: string        // 到着港名
  path: RoutePoint[]    // 航路の経路点
  distance?: number     // 距離（メートル）
  duration?: number     // 所要時間（秒）
  source: 'manual' | 'google_transit' | 'google_driving' | 'custom'
  geodesic: boolean     // 測地線を使用するか
  createdAt: string
  updatedAt: string
}

export interface RoutesMetadata {
  version: number
  lastFetchedAt: string
  totalRoutes: number
  fetchedBy: string
}

export interface RoutesDataFile {
  metadata: RoutesMetadata
  routes: RouteData[]
}