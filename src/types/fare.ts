export interface VehicleFare {
  under3m: number
  under4m: number
  under5m: number
  under6m: number
  over6m: number
}

export interface RouteFare {
  adult: number
  child: number
  vehicle: VehicleFare
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
  routes: FareRoute[]
  discounts: Record<string, Discount>
  notes: string[]
}