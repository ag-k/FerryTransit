import type { TransitRoute, TransitSegment } from '@/types'
import { resolveSegmentFareStatus } from '@/utils/transitFare'

const getTransportCategory = (segment: TransitSegment): string => {
  const mode = segment.mode ?? 'FERRY'
  if (mode !== 'FERRY') return `${mode}:${segment.operatorId ?? segment.ship}`
  if (segment.ship === 'RAINBOWJET') return 'highspeed'
  if (['ISOKAZE', 'ISOKAZE_EX', 'FERRY_DOZEN'].includes(segment.ship)) return 'local'
  if (['FERRY_OKI', 'FERRY_KUNIGA', 'FERRY_SHIRASHIMA'].includes(segment.ship)) return 'ferry'
  return `unknown:${segment.ship}`
}

const getCategories = (route: TransitRoute): string =>
  [...new Set(route.segments.map(getTransportCategory))].sort().join('|')

const getComparableFare = (route: TransitRoute): number | null => {
  let total = 0
  for (const segment of route.segments) {
    const status = resolveSegmentFareStatus(segment)
    if (!['KNOWN', 'FREE', 'WALK'].includes(status)) return null
    if (!Number.isFinite(segment.fare) || segment.fare < 0) return null
    total += segment.fare
  }
  return total
}

/** Keep different transport choices, cheaper routes and routes with unconfirmed fares. */
export const isTransferRouteDominated = (
  route: TransitRoute,
  directRoute: TransitRoute
): boolean => {
  if (route.segments.length < 2 || directRoute.segments.length !== 1) return false
  if ([...route.segments, ...directRoute.segments].some(segment => segment.status === 2)) return false
  const first = route.segments[0]
  const last = route.segments[route.segments.length - 1]
  const direct = directRoute.segments[0]
  if (!first || !last || !direct) return false
  // HONDO includes two separate ports; a departure at a different port is not a replacement.
  if (first.departure !== direct.departure || last.arrival !== direct.arrival) return false
  if (getCategories(route) !== getCategories(directRoute)) return false
  const routeFare = getComparableFare(route)
  const directFare = getComparableFare(directRoute)
  if (routeFare === null || directFare === null || directFare > routeFare) return false
  const departure = route.departureTime.getTime()
  const arrival = route.arrivalTime.getTime()
  const directDeparture = directRoute.departureTime.getTime()
  const directArrival = directRoute.arrivalTime.getTime()
  return directDeparture >= departure && directArrival <= arrival &&
    (directDeparture > departure || directArrival < arrival)
}
