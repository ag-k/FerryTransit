// Port definitions
export interface Port {
  id: string
  name: string
  nameEn: string
  location: {
    lat: number
    lng: number
  }
  type: 'mainland' | 'dozen' | 'dogo'
  mapIframe?: string
}

// Ship definitions
export interface Ship {
  id: string
  name: string
  nameEn: string
  type: 'ferry' | 'highspeed' | 'local'
  imageUrl?: string
  color?: string
}

// Trip status enum
export enum TripStatus {
  Hidden = -1,
  Normal = 0,
  Delay = 1,
  Cancel = 2,
  Change = 3,
  Extra = 4
}

// Trip interface
export interface Trip {
  tripId: number
  startDate: string
  endDate: string
  name: string
  departure: string
  departureTime: Date | string
  arrival: string
  arrivalTime: Date | string
  nextId?: number
  status: TripStatus
  price?: number
  via?: string
}

// Ship status interfaces
export interface ShipStatus {
  hasAlert: boolean
  status: number
  date: string | null
  updated: string | null
  summary: string | null
  comment: string | null
  reason?: string
  departure?: string
  arrival?: string
  startTime?: string
  lastShips?: Trip[]
  extraShips?: Trip[]
}

export interface FerryStatus {
  hasAlert: boolean
  date: string | null
  ferryState: string
  ferryComment: string
  fastFerryState: string
  fastFerryComment: string
  todayWave: string
  tomorrowWave: string
}

export interface SightseeingStatus {
  hasAlert: boolean
  success: boolean
  lastUpdate: string | null
  courseA: SightseeingTrip[]
  courseB: SightseeingTrip[]
}

export interface SightseeingTrip {
  departureTime: string
  sightseeingStatus: number
  comment: string
}

// Search result interfaces
export interface RouteSearchParams {
  departure: string
  arrival: string
  date: Date
  time: Date
  mode: 'departureTime' | 'arrivalTime'
  withCar?: boolean
  exceptFastFerry?: boolean
}

export interface RouteSegment {
  time: string
  port: string
  price?: string
  status?: TripStatus
}

export interface SearchResult {
  routes: Trip[]
  departureTime: Date
  arrivalTime: Date
  segments?: RouteSegment[]
}

// API response types
export interface TimetableResponse extends Array<Trip> {}

export interface StatusApiResponse {
  isokaze: ShipStatus | null
  dozen: ShipStatus | null
  ferry: FerryStatus | null
  kunigaKankou?: SightseeingStatus | null
}

// Port and ship constants
export const PORTS = {
  HONDO_SHICHIRUI: 'HONDO_SHICHIRUI',
  HONDO_SAKAIMINATO: 'HONDO_SAKAIMINATO',
  KURI: 'KURI',
  BEPPU: 'BEPPU',
  HISHIURA: 'HISHIURA',
  SAIGO: 'SAIGO'
} as const

export const SHIPS = {
  FERRY_OKI: 'FERRY_OKI',
  FERRY_SHIRASHIMA: 'FERRY_SHIRASHIMA',
  FERRY_KUNIGA: 'FERRY_KUNIGA',
  FERRY_DOZEN: 'FERRY_DOZEN',
  ISOKAZE: 'ISOKAZE',
  RAINBOWJET: 'RAINBOWJET'
} as const

export type PortId = typeof PORTS[keyof typeof PORTS]
export type ShipId = typeof SHIPS[keyof typeof SHIPS]

// Utility types
export type Locale = 'ja' | 'en'

// Timetable interface  
export interface Timetable {
  tripId: string
  name: string
  departure: string
  arrival: string
  departureTime: Date | string
  arrivalTime: Date | string
  status?: number
  next_id?: string
}

// Transit route types
export interface TransitSegment {
  tripId: string
  ship: string
  departure: string
  arrival: string
  departureTime: Date
  arrivalTime: Date
  status: number
  fare: number
}

export interface TransitRoute {
  segments: TransitSegment[]
  departureTime: Date
  arrivalTime: Date
  totalFare: number
  transferCount: number
}