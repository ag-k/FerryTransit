export interface PortFacilities {
  parking?: boolean;
  restaurant?: boolean;
  shop?: boolean;
  waitingRoom?: boolean;
  toilet?: boolean;
  busStop?: boolean;
  taxiStand?: boolean;
}

export interface PortAccess {
  byBus?: string;
  byBusEn?: string;
  byCar?: string;
  byCarEn?: string;
  walking?: string;
  walkingEn?: string;
}

export interface PortBoardingInfo {
  /**
   * 対象船舶（例: ["ISOKAZE"], ["FERRY_OKI","FERRY_SHIRASHIMA","FERRY_KUNIGA"]）
   * UI側で $t(shipId) で表示する前提
   */
  shipIds: string[];
  /** 見出し（例: "内航船いそかぜ"） */
  labelJa: string;
  labelEn?: string;
  /** 乗り場の場所/導線（例: "ターミナルビルから徒歩約2分（いそかぜ乗り場）"） */
  placeJa: string;
  placeEn?: string;
  /** 補足（例: "案内表示に従ってください。"） */
  noteJa?: string;
  noteEn?: string;
  /** 参照URL（公式/観光サイト等） */
  sourceUrl?: string;
  /** 乗り場ピン座標（OpenStreetMap等の緯度経度） */
  location?: {
    lat: number;
    lng: number;
  };
}

// Port definitions
export interface Port {
  id: string;
  name: string;
  nameEn: string;
  location: {
    lat: number;
    lng: number;
  };
  type: "mainland" | "dozen" | "dogo";
  mapIframe?: string;
  facilities?: PortFacilities;
  access?: PortAccess;
  boarding?: PortBoardingInfo[];
}

// Ship definitions
export interface Ship {
  id: string;
  name: string;
  nameEn: string;
  type: "ferry" | "highspeed" | "local";
  imageUrl?: string;
  color?: string;
}

// Trip status enum
export enum TripStatus {
  Hidden = -1,
  Normal = 0,
  Delay = 1,
  Cancel = 2,
  Change = 3,
  Extra = 4,
}

// Trip interface
export interface Trip {
  tripId: number;
  startDate: string;
  endDate: string;
  name: string;
  departure: string;
  departureTime: Date | string;
  arrival: string;
  arrivalTime: Date | string;
  nextId?: number;
  status: TripStatus;
  price?: number;
  via?: string;
  departureLabel?: string;
  arrivalLabel?: string;
}

// Ship status interfaces
export interface ShipStatus {
  id?: number;
  ship_id?: number;
  hasAlert: boolean;
  status: number;
  date: string | null;
  updated: string | null;
  updated_at?: string;
  created_at?: string;
  summary: string | null;
  comment: string | null;
  reason?: string;
  reason_id?: number | null;
  departure?: string;
  arrival?: string;
  startTime?: string;
  start_time?: string | null;
  last_departure_port_id?: number | null;
  last_arrival_port_id?: number | null;
  lastShips?: any[];
  extraShips?: any[];
  ship_name?: string;
  prev_status?: number;
}

export interface FerryStatus {
  id?: number;
  hasAlert: boolean;
  date: string | null;
  ferry_state?: string;
  ferryState?: string;
  ferry_comment?: string;
  ferryComment?: string;
  fast_ferry_state?: string;
  fastFerryState?: string;
  fast_ferry_comment?: string;
  fastFerryComment?: string;
  today_wave?: string;
  todayWave?: string;
  tomorrow_wave?: string;
  tomorrowWave?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SightseeingTrip {
  departureTime: string;
  sightseeingStatus: number;
  comment: string;
}

export interface SightseeingStatus {
  hasAlert: boolean;
  success: boolean;
  lastUpdate: string | null;
  courseA: SightseeingTrip[];
  courseB: SightseeingTrip[];
}

/**
 * Store上で保持する shipStatus（運航状況）全体の形
 * - APIレスポンスは kunigaKankou が無い場合もあるため `StatusApiResponse` は optional のまま
 * - UI/Store では常にキーを持つ形（null許容）に揃える
 */
export interface ShipStatusStoreState {
  isokaze: ShipStatus | null;
  dozen: ShipStatus | null;
  ferry: FerryStatus | null;
  kunigaKankou: SightseeingStatus | null;
}

// Search result interfaces
export interface RouteSearchParams {
  departure: string;
  arrival: string;
  date: Date;
  time: Date;
  mode: "departureTime" | "arrivalTime";
  withCar?: boolean;
  exceptFastFerry?: boolean;
}

export interface RouteSegment {
  time: string;
  port: string;
  price?: string;
  status?: TripStatus;
}

export interface SearchResult {
  routes: Trip[];
  departureTime: Date;
  arrivalTime: Date;
  segments?: RouteSegment[];
}

// API response types
export interface TimetableResponse extends Array<Trip> {}

export interface StatusApiResponse {
  isokaze: ShipStatus | null;
  dozen: ShipStatus | null;
  ferry: FerryStatus | null;
  kunigaKankou?: SightseeingStatus | null;
}

// Port and ship constants
export const PORTS = {
  HONDO_SHICHIRUI: "HONDO_SHICHIRUI",
  HONDO_SAKAIMINATO: "HONDO_SAKAIMINATO",
  KURI: "KURI",
  BEPPU: "BEPPU",
  HISHIURA: "HISHIURA",
  SAIGO: "SAIGO",
} as const;

export const SHIPS = {
  FERRY_OKI: "FERRY_OKI",
  FERRY_SHIRASHIMA: "FERRY_SHIRASHIMA",
  FERRY_KUNIGA: "FERRY_KUNIGA",
  FERRY_DOZEN: "FERRY_DOZEN",
  ISOKAZE: "ISOKAZE",
  RAINBOWJET: "RAINBOWJET",
} as const;

export type PortId = (typeof PORTS)[keyof typeof PORTS];
export type ShipId = (typeof SHIPS)[keyof typeof SHIPS];

// Utility types
export type Locale = "ja" | "en";

// Timetable interface
export interface Timetable {
  tripId: string;
  name: string;
  departure: string;
  arrival: string;
  departureTime: Date | string;
  arrivalTime: Date | string;
  status?: number;
  next_id?: string;
}

// Transit route types
export interface TransitSegment {
  tripId: string;
  ship: string;
  departure: string;
  arrival: string;
  departureTime: Date;
  arrivalTime: Date;
  status: number;
  fare: number;
}

export interface TransitRoute {
  segments: TransitSegment[];
  departureTime: Date;
  arrivalTime: Date;
  totalFare: number;
  transferCount: number;
}

// News interface
export interface News {
  id?: string;
  category: "announcement" | "maintenance" | "feature" | "campaign";
  title: string;
  titleEn?: string;
  content: string;
  contentEn?: string;
  status: "draft" | "published" | "scheduled" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  publishDate: Date | string;
  isPinned: boolean;
  author?: string;
  viewCount?: number;
  hasDetail?: boolean; // 詳細ページの有無
  detailContent?: string; // 詳細ページのコンテンツ（Markdown形式）
  detailContentEn?: string; // 詳細ページのコンテンツ（英語版）
}
