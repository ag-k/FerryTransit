import { describe, expect, it } from 'vitest'
import type { TransitRoute, TransitSegment } from '@/types'
import { isTransferRouteDominated } from '@/utils/transitRouteDominance'

const time = (hhmm: string) => new Date(`2026-11-17T${hhmm}:00+09:00`)
const segment = (ship: string, departure: string, arrival: string, dep: string, arr: string, fare: number): TransitSegment => ({
  tripId: `${ship}-${departure}`, ship, departure, arrival,
  departureTime: time(dep), arrivalTime: time(arr), fare, fareStatus: 'KNOWN', status: 0
})
const route = (...segments: TransitSegment[]): TransitRoute => ({
  segments, departureTime: segments[0]!.departureTime,
  arrivalTime: segments[segments.length - 1]!.arrivalTime,
  totalFare: segments.reduce((sum, s) => sum + s.fare, 0), transferCount: segments.length - 1
})
const alternatives = () => ({
  transfer: route(segment('FERRY_SHIRASHIMA', 'HONDO_SAKAIMINATO', 'BEPPU', '14:10', '17:10', 3000), segment('FERRY_KUNIGA', 'BEPPU', 'HISHIURA', '17:20', '17:27', 300)),
  direct: route(segment('FERRY_OKI', 'HONDO_SAKAIMINATO', 'HISHIURA', '15:10', '17:10', 3000))
})

describe('isTransferRouteDominated', () => {
  it('removes a slower, no-cheaper route of the same transport category and ports', () => {
    const { transfer, direct } = alternatives()
    expect(isTransferRouteDominated(transfer, direct)).toBe(true)
    direct.segments[0]!.fare = 3300
    expect(isTransferRouteDominated(transfer, direct)).toBe(true)
  })
  it('keeps Shirashima + Isokaze even when a faster Rainbow Jet has the same fare', () => {
    const { transfer, direct } = alternatives()
    transfer.segments[1]!.ship = 'ISOKAZE'
    direct.segments[0]!.ship = 'RAINBOWJET'
    expect(isTransferRouteDominated(transfer, direct)).toBe(false)
  })
  it('keeps a cheaper transfer in the same category', () => {
    const { transfer, direct } = alternatives()
    direct.segments[0]!.fare = 4000
    expect(isTransferRouteDominated(transfer, direct)).toBe(false)
  })
  it.each(['UNAVAILABLE', 'VARIABLE'] as const)('keeps alternatives with %s fare on either side', status => {
    for (const side of ['transfer', 'direct'] as const) {
      const pair = alternatives()
      pair[side].segments[0]!.fareStatus = status
      pair[side].segments[0]!.fare = 0
      expect(isTransferRouteDominated(pair.transfer, pair.direct)).toBe(false)
    }
  })
  it('does not compare different mainland ports', () => {
    const { transfer, direct } = alternatives()
    direct.segments[0]!.departure = 'HONDO_SHICHIRUI'
    expect(isTransferRouteDominated(transfer, direct)).toBe(false)
  })
  it('keeps earlier-arriving transfers and identical-time alternatives', () => {
    const { transfer, direct } = alternatives()
    transfer.arrivalTime = time('17:00')
    expect(isTransferRouteDominated(transfer, direct)).toBe(false)
    transfer.arrivalTime = direct.arrivalTime
    transfer.departureTime = direct.departureTime
    expect(isTransferRouteDominated(transfer, direct)).toBe(false)
  })
  it('does not use a cancelled direct route or hide a cancelled transfer', () => {
    for (const side of ['transfer', 'direct'] as const) {
      const pair = alternatives()
      pair[side].segments[0]!.status = 2
      expect(isTransferRouteDominated(pair.transfer, pair.direct)).toBe(false)
    }
  })
  it('keeps different non-ferry transport modes', () => {
    const { transfer, direct } = alternatives()
    direct.segments[0]!.mode = 'AIR'
    expect(isTransferRouteDominated(transfer, direct)).toBe(false)
  })
})
