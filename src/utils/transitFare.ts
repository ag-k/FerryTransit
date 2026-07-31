import type { FareStatus, TransitRoute, TransitSegment } from '@/types'

const JAL_SHIPS = new Set(['JAL_OKI_ITAMI', 'JAL_OKI_IZUMO'])

export const resolveSegmentFareStatus = (segment: TransitSegment): FareStatus => {
  if (segment.fareStatus) return segment.fareStatus
  if (segment.mode === 'WALK' || segment.ship === 'WALK') return 'WALK'
  if (JAL_SHIPS.has(segment.ship) && !(segment.fare > 0)) return 'VARIABLE'
  if (segment.fare > 0) return 'KNOWN'
  return 'UNAVAILABLE'
}

export const summarizeTransitRouteFare = (
  route: TransitRoute
): TransitRoute => {
  const segments = route.segments.map(segment => ({
    ...segment,
    fareStatus: resolveSegmentFareStatus(segment)
  }))
  const statuses = segments.map(segment => segment.fareStatus!)
  const knownFareTotal = segments.reduce(
    (sum, segment) => sum + (Number.isFinite(segment.fare) && segment.fare > 0 ? segment.fare : 0),
    0
  )

  let fareStatus: FareStatus
  if (statuses.includes('VARIABLE')) {
    fareStatus = 'VARIABLE'
  } else if (statuses.includes('UNAVAILABLE')) {
    fareStatus = 'UNAVAILABLE'
  } else if (statuses.length > 0 && statuses.every(status => status === 'WALK')) {
    fareStatus = 'WALK'
  } else if (
    statuses.length > 0 &&
    statuses.every(status => status === 'FREE' || status === 'WALK')
  ) {
    fareStatus = 'FREE'
  } else {
    fareStatus = 'KNOWN'
  }

  return {
    ...route,
    segments,
    totalFare: knownFareTotal,
    knownFareTotal,
    fareStatus
  }
}

export const getRouteFareSortRank = (route: TransitRoute): number => {
  const status = route.fareStatus ?? summarizeTransitRouteFare(route).fareStatus
  if (status === 'KNOWN' || status === 'FREE' || status === 'WALK') return 0
  if (status === 'VARIABLE') return 1
  return 2
}
