export type AdIslandId = 'common' | 'nakanoshima' | 'nishinoshima' | 'chiburijima' | 'dogo'
export type AdPlacement =
  | 'primary'
  | 'secondary'
  | 'timetable-image'
  | 'transit-results-lead'
  | 'transit-results-lead-secondary'
  | 'transit-results-image'

const LOCATION_ISLANDS: Readonly<Record<string, Exclude<AdIslandId, 'common'>>> = {
  HISHIURA: 'nakanoshima',
  BEPPU: 'nishinoshima',
  KURI: 'chiburijima',
  SAIGO: 'dogo',
  AIRPORT_OKI: 'dogo'
}

const BUS_STOP_PREFIX_ISLANDS = [
  ['BUS_AMA_', 'nakanoshima'],
  ['BUS_NISHINOSHIMA_', 'nishinoshima'],
  ['BUS_CHIBU_', 'chiburijima'],
  ['BUS_OKINOSHIMA_', 'dogo']
] as const

export const getAdIslandForLocation = (locationId?: string): AdIslandId => {
  if (!locationId) return 'common'
  const direct = LOCATION_ISLANDS[locationId]
  if (direct) return direct

  return BUS_STOP_PREFIX_ISLANDS.find(([prefix]) => locationId.startsWith(prefix))?.[1] ?? 'common'
}

/**
 * 検索の到着地に対応する島を優先する。
 * 到着地が本土側なら出発地の島を使い、両方とも島に属さない場合は共通枠にする。
 */
export const resolveAdIslandId = (locationIds: readonly (string | undefined)[]): AdIslandId => {
  for (let index = locationIds.length - 1; index >= 0; index -= 1) {
    const island = getAdIslandForLocation(locationIds[index])
    if (island !== 'common') return island
  }
  return 'common'
}

export const getFerryAdSlotId = (placement: AdPlacement, islandId: AdIslandId): string => {
  if (islandId === 'common') {
    if (placement === 'primary') return 'oki-ferry-transit-common'
    if (placement === 'secondary') return 'oki-ferry-transit-common-secondary'
    if (placement === 'timetable-image') return 'oki-ferry-transit-timetable-image'
    if (placement === 'transit-results-lead') return 'oki-ferry-transit-transit-results-lead'
    if (placement === 'transit-results-lead-secondary') {
      return 'oki-ferry-transit-transit-results-lead-secondary'
    }
    return 'oki-ferry-transit-transit-results-image'
  }

  if (placement === 'primary') return `oki-ferry-transit-${islandId}`
  return `oki-ferry-transit-${islandId}-${placement}`
}
