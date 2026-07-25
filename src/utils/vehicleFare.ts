import { SHIP_DETAILS, type ShipId } from '@/data/ships'
import type { FareMaster, FareRoute, InnerIslandVehicleFare, VehicleFare } from '@/types/fare'

export const DEFAULT_VEHICLE_LENGTH_METERS = 5

export const VEHICLE_LENGTH_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const

export type VehicleLengthMeters = typeof VEHICLE_LENGTH_OPTIONS[number]

const OKI_KISEN_FERRY_SHIPS = new Set<string>([
  'FERRY_OKI',
  'FERRY_SHIRASHIMA',
  'FERRY_KUNIGA'
])

const INNER_ISLAND_OVER_10M_EXTRA_PER_METER = 500

const isKnownShipId = (ship: string): ship is ShipId => ship in SHIP_DETAILS

export const canCarryVehicle = (ship: string | undefined | null): boolean => {
  if (!ship || !isKnownShipId(ship)) return false
  return SHIP_DETAILS[ship].carCarry === true
}

export const isOkiKisenVehicleFerry = (ship: string | undefined | null): boolean => {
  return !!ship && OKI_KISEN_FERRY_SHIPS.has(ship)
}

export const isVehicleSearchShip = (ship: string | undefined | null): boolean => {
  return canCarryVehicle(ship) && (isOkiKisenVehicleFerry(ship) || ship === 'FERRY_DOZEN')
}

export const normalizeVehicleLengthMeters = (
  value: number | string | null | undefined
): number => {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_VEHICLE_LENGTH_METERS
  }
  return parsed
}

export const getVehicleLengthLabelKey = (vehicleLengthMeters: number): string | null => {
  const normalized = normalizeVehicleLengthMeters(vehicleLengthMeters)
  if (normalized >= 3 && normalized <= 12 && Number.isInteger(normalized)) {
    return `VEHICLE_SIZE_UNDER_${normalized}M`
  }
  return null
}

type VehicleFareLike = Readonly<VehicleFare>
type InnerIslandVehicleFareLike = Readonly<InnerIslandVehicleFare>
type FareMasterVehicleFareLike = FareMaster | {
  readonly innerIslandVehicleFare?: InnerIslandVehicleFareLike
}
type FareRouteVehicleFareLike = Readonly<Omit<FareRoute, 'fares' | 'vehicle'>> & {
  readonly fares?: Readonly<Omit<NonNullable<FareRoute['fares']>, 'vehicle'>> & {
    readonly vehicle?: VehicleFareLike
  }
  readonly vehicle?: VehicleFareLike
}

export const getVehicleFareFromRoute = (
  route: FareRouteVehicleFareLike | undefined | null
): VehicleFareLike | undefined => {
  return route?.fares?.vehicle ?? route?.vehicle
}

export const calculateOkiKisenVehicleFare = (
  vehicleFare: VehicleFareLike | undefined | null,
  vehicleLengthMeters: number
): number | null => {
  if (!vehicleFare) return null

  const length = normalizeVehicleLengthMeters(vehicleLengthMeters)
  if (length <= 3) return vehicleFare.under3m ?? null
  if (length <= 4) return vehicleFare.under4m ?? null
  if (length <= 5) return vehicleFare.under5m ?? null
  if (length <= 6) return vehicleFare.under6m ?? null
  if (length <= 7) return vehicleFare.under7m ?? null
  if (length <= 8) return vehicleFare.under8m ?? null
  if (length <= 9) return vehicleFare.under9m ?? null
  if (length <= 10) return vehicleFare.under10m ?? null
  if (length <= 11) return vehicleFare.under11m ?? null
  if (length <= 12) return vehicleFare.under12m ?? null

  if (
    typeof vehicleFare.under12m !== 'number' ||
    typeof vehicleFare.over12mPer1m !== 'number'
  ) {
    return null
  }

  return vehicleFare.under12m + Math.ceil(length - 12) * vehicleFare.over12mPer1m
}

export const calculateInnerIslandVehicleFare = (
  innerIslandVehicleFare: InnerIslandVehicleFareLike | undefined | null,
  vehicleLengthMeters: number
): number | null => {
  if (!innerIslandVehicleFare) return null

  const length = normalizeVehicleLengthMeters(vehicleLengthMeters)
  if (length <= 5) return innerIslandVehicleFare.under5m ?? null
  if (length <= 7) return innerIslandVehicleFare.under7m ?? null
  if (length <= 10) return innerIslandVehicleFare.under10m ?? null

  if (typeof innerIslandVehicleFare.over10m !== 'number') {
    return null
  }

  return innerIslandVehicleFare.over10m + Math.ceil(length - 10) * INNER_ISLAND_OVER_10M_EXTRA_PER_METER
}

export const calculateVehicleFareForShip = (
  ship: string,
  route: FareRouteVehicleFareLike | undefined | null,
  fareMaster: FareMasterVehicleFareLike | null | undefined,
  vehicleLengthMeters: number
): number | null => {
  if (!isVehicleSearchShip(ship)) return null

  if (ship === 'FERRY_DOZEN') {
    return calculateInnerIslandVehicleFare(fareMaster?.innerIslandVehicleFare, vehicleLengthMeters)
  }

  return calculateOkiKisenVehicleFare(getVehicleFareFromRoute(route), vehicleLengthMeters)
}
