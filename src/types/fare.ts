export interface VehicleFare {
  under3m: number
  under4m: number
  under5m: number
  under6m: number
  under7m: number
  under8m: number
  under9m: number
  under10m: number
  under11m: number
  under12m: number
  over12mPer1m: number // 12m以上1m増すごとに
}

export interface SeatClassFare {
  class2: number        // 2等
  class2Special: number // 特2等
  class1: number        // 1等
  classSpecial: number  // 特等
  specialRoom: number   // 特別室
}

export interface RouteFare {
  adult: number
  child: number
  vehicle: VehicleFare
  seatClass?: SeatClassFare
}

export interface InnerIslandFare {
  adult: number
  child: number
}

export interface InnerIslandVehicleFare {
  under5m: number
  under7m: number
  under10m: number
  over10m: number
}

export interface FareRoute {
  id: string
  departure: string
  arrival: string
  fares?: RouteFare
  vehicle?: VehicleFare
}

export interface Discount {
  nameKey: string
  rate: number
  minPeople?: number
  descriptionKey: string
}

export interface FareMaster {
  innerIslandFare?: InnerIslandFare
  innerIslandVehicleFare?: InnerIslandVehicleFare
  rainbowJetFares?: Record<string, { adult: number | null; child: number | null }>
  routes: FareRoute[]
  discounts: Record<string, Discount>
  notes: string[]
}