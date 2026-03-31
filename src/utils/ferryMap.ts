import type { RouteData, RoutePoint } from '~/types/route'

export type RouteSegmentSelection = { from: string; to: string }

export interface MatchedRoute {
  route: RouteData
  path: RoutePoint[]
  reversed: boolean
}

export interface FerryRouteStyle {
  color: string
  opacity: number
  weight: number
  dashArray?: string
}

export type PortLabelVariant =
  | 'nishinoshima'
  | 'ama'
  | 'chibu'
  | 'okinoshima'
  | 'mainland'
  | 'default'

const MAINLAND_PORT_IDS = ['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'] as const

export const expandMainlandPortId = (id: string): string[] => {
  return id === 'HONDO' ? [...MAINLAND_PORT_IDS] : [id]
}

export const findRoutesForSelection = (
  routes: RouteData[],
  selectedRoute?: RouteSegmentSelection
): RouteData[] => {
  if (!selectedRoute) return []

  const fromCandidates = expandMainlandPortId(selectedRoute.from)
  const toCandidates = expandMainlandPortId(selectedRoute.to)

  return routes.filter(route => {
    return fromCandidates.includes(route.from) && toCandidates.includes(route.to)
  })
}

export const findMatchingRouteForSegment = (
  routes: RouteData[],
  segment: RouteSegmentSelection
): MatchedRoute | null => {
  const fromCandidates = expandMainlandPortId(segment.from)
  const toCandidates = expandMainlandPortId(segment.to)

  const directMatch = routes.find(route => {
    return fromCandidates.includes(route.from) && toCandidates.includes(route.to)
  })
  if (directMatch) {
    return {
      route: directMatch,
      path: directMatch.path,
      reversed: false
    }
  }

  const reverseMatch = routes.find(route => {
    return fromCandidates.includes(route.to) && toCandidates.includes(route.from)
  })
  if (!reverseMatch) return null

  return {
    route: reverseMatch,
    path: [...reverseMatch.path].reverse(),
    reversed: true
  }
}

export const getFerryRouteStyle = (source: RouteData['source'] | string): FerryRouteStyle => {
  switch (source) {
    case 'google_transit':
      return { color: '#2E7D32', opacity: 0.8, weight: 4 }
    case 'google_driving':
      return { color: '#FF8C00', opacity: 0.65, weight: 3, dashArray: '10 6' }
    case 'manual':
      return { color: '#4682B4', opacity: 0.78, weight: 3 }
    case 'overpass_osm':
      return { color: '#2563EB', opacity: 0.82, weight: 4 }
    case 'custom':
      return { color: '#6366F1', opacity: 0.72, weight: 3, dashArray: '12 5' }
    default:
      return { color: '#64748B', opacity: 0.58, weight: 3, dashArray: '6 6' }
  }
}

export const getRouteSourceLabel = (source: string) => {
  switch (source) {
    case 'overpass_osm':
      return 'OpenStreetMap'
    case 'google_transit':
      return 'Google Transit API'
    case 'google_driving':
      return 'Google Driving API'
    case 'manual':
      return '手動定義'
    case 'custom':
      return 'カスタム'
    default:
      return source
  }
}

export const getPortLabelVariant = (badgeLabel: string): PortLabelVariant => {
  switch (badgeLabel) {
    case '西ノ島町':
    case 'Nishinoshima':
      return 'nishinoshima'
    case '海士町':
    case 'Ama':
      return 'ama'
    case '知夫村':
    case 'Chibu':
      return 'chibu'
    case '隠岐の島町':
    case 'Okinoshima':
    case 'Okinoshima Town':
      return 'okinoshima'
    case '松江市':
    case 'Matsue':
    case '境港市':
    case 'Sakaiminato':
      return 'mainland'
    default:
      return 'default'
  }
}

export const buildPortLabelA11yLabel = (portTitle: string, portDetailsLabel: string) => {
  return `${portTitle} ${portDetailsLabel}`.trim()
}
