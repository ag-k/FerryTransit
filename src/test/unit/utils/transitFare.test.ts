import type { FareStatus, TransitRoute, TransitSegment } from '@/types'
import {
  getRouteFareSortRank,
  resolveSegmentFareStatus,
  summarizeTransitRouteFare
} from '@/utils/transitFare'

const makeSegment = (
  overrides: Partial<TransitSegment> = {}
): TransitSegment => ({
  tripId: 'trip-1',
  ship: 'FERRY_OKI',
  mode: 'FERRY',
  departure: 'HONDO_SHICHIRUI',
  arrival: 'SAIGO',
  departureTime: new Date('2026-07-31T09:00:00+09:00'),
  arrivalTime: new Date('2026-07-31T11:25:00+09:00'),
  status: 0,
  fare: 3520,
  ...overrides
})

const makeRoute = (
  segments: TransitSegment[],
  fareStatus?: FareStatus
): TransitRoute => ({
  segments,
  departureTime: segments[0]!.departureTime,
  arrivalTime: segments.at(-1)!.arrivalTime,
  totalFare: segments.reduce((sum, segment) => sum + segment.fare, 0),
  fareStatus,
  transferCount: Math.max(0, segments.length - 1)
})

describe('transitFare', () => {
  it.each([
    [makeSegment({ fare: 100 }), 'KNOWN'],
    [makeSegment({ fare: 0, fareStatus: 'FREE' }), 'FREE'],
    [makeSegment({ fare: 0, mode: 'WALK', ship: 'WALK' }), 'WALK'],
    [makeSegment({ fare: 0, fareStatus: 'UNAVAILABLE' }), 'UNAVAILABLE'],
    [makeSegment({ fare: 0, mode: 'AIR', ship: 'JAL_OKI_ITAMI' }), 'VARIABLE']
  ] as const)('区間運賃状態を区別する', (segment, expected) => {
    expect(resolveSegmentFareStatus(segment)).toBe(expected)
  })

  it('JALと空港連絡バスでは既知額520円と変動航空運賃を分離する', () => {
    const route = summarizeTransitRouteFare(makeRoute([
      makeSegment({
        tripId: 'bus',
        ship: 'OKI_AIRPORT_BUS',
        mode: 'BUS',
        fare: 520,
        fareStatus: 'KNOWN'
      }),
      makeSegment({
        tripId: 'jal',
        ship: 'JAL_OKI_ITAMI',
        mode: 'AIR',
        fare: 0,
        fareStatus: 'VARIABLE'
      })
    ]))

    expect(route.totalFare).toBe(520)
    expect(route.knownFareTotal).toBe(520)
    expect(route.fareStatus).toBe('VARIABLE')
  })

  it('料金順では変動・取得不能運賃を確定額より後にする', () => {
    const known = makeRoute([makeSegment({ fare: 1000, fareStatus: 'KNOWN' })])
    const variable = makeRoute([makeSegment({
      fare: 0,
      ship: 'JAL_OKI_IZUMO',
      mode: 'AIR',
      fareStatus: 'VARIABLE'
    })])
    const unavailable = makeRoute([makeSegment({
      fare: 0,
      fareStatus: 'UNAVAILABLE'
    })])

    expect(getRouteFareSortRank(known)).toBeLessThan(getRouteFareSortRank(variable))
    expect(getRouteFareSortRank(variable)).toBeLessThan(getRouteFareSortRank(unavailable))
  })
})
