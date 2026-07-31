import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildBusTripsForRoute, type BusSearchFeed } from '@/utils/gtfsBusTimetable'

const feed = JSON.parse(readFileSync(resolve(
  process.cwd(),
  'gtfs/public-data/data/bus-search/hatsumi_bus_connection.json'
), 'utf8')) as BusSearchFeed

function departures(serviceId: string) {
  return feed.trips
    .filter(trip => trip.serviceId === serviceId)
    .map(trip => trip.stops[0][1])
    .sort()
}

describe('はつみ交通・隠岐汽船連絡バスGTFS', () => {
  it.each([
    ['service_hatsumi_20260608_20260807', ['08:24', '10:05', '13:25', '16:07', '18:10']],
    ['service_hatsumi_20260808_20260816', ['08:24', '10:00', '13:25', '14:04', '14:25', '15:14', '16:07', '18:30', '20:05']],
    ['service_hatsumi_20260817_20260831', ['08:24', '10:05', '13:25', '16:07', '18:10']],
    ['service_hatsumi_20260901_20261031', ['08:24', '10:05', '13:25', '15:02', '18:10']],
    ['service_hatsumi_20261101_20261130', ['08:24', '10:19', '13:25', '18:10']],
    ['service_hatsumi_20261201_20261231', ['08:24', '13:25', '18:10']]
  ])('%s は2026年6月8日版公式PDFと一致する', (serviceId, expected) => {
    expect(departures(serviceId)).toEqual(expected)
  })

  it('6期間31便を500円のはつみ交通便として収録する', () => {
    expect(Object.keys(feed.services)).toHaveLength(6)
    expect(feed.trips).toHaveLength(31)
    expect(feed.operatorId).toBe('HATSUMI_BUS')
    expect(feed.tripName).toBe('HATSUMI_BUS_CONNECTION')
    expect(feed.fare).toBe(500)
  })

  it('通常期の七類港―境港駅直行便を両方向で検索できる', () => {
    const sakaiminato = 'BUS_HATSUMI_CONNECTION_sakaiminato_station'
    const shichirui = 'BUS_HATSUMI_CONNECTION_shichirui_port'

    const toShichirui = buildBusTripsForRoute(feed, sakaiminato, shichirui, '2026-07-31')
    const toSakaiminato = buildBusTripsForRoute(feed, shichirui, sakaiminato, '2026-07-31')

    expect(toShichirui.map(trip => [trip.departureTime, trip.arrivalTime])).toEqual([
      ['08:24', '08:39'],
      ['16:07', '16:22'],
      ['13:25', '13:40']
    ])
    expect(toSakaiminato.map(trip => [trip.departureTime, trip.arrivalTime])).toEqual([
      ['10:05', '10:20'],
      ['18:10', '18:25']
    ])
    expect([...toShichirui, ...toSakaiminato]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'HATSUMI_BUS_CONNECTION',
          operatorId: 'HATSUMI_BUS',
          price: 500
        })
      ])
    )
  })

  it('適用開始日前には便を返さない', () => {
    expect(buildBusTripsForRoute(
      feed,
      'BUS_HATSUMI_CONNECTION_sakaiminato_station',
      'BUS_HATSUMI_CONNECTION_shichirui_port',
      '2026-06-07'
    )).toEqual([])
  })

  it.each([
    ['2026-06-08', 5],
    ['2026-08-07', 5],
    ['2026-08-08', 9],
    ['2026-08-16', 9],
    ['2026-08-17', 5],
    ['2026-08-31', 5],
    ['2026-09-01', 5],
    ['2026-10-31', 5],
    ['2026-11-01', 4],
    ['2026-11-30', 4],
    ['2026-12-01', 3],
    ['2026-12-31', 3],
    ['2027-01-01', 0]
  ])('%s は適用期間どおりの便数を返す', (date, expected) => {
    const sakaiminato = 'BUS_HATSUMI_CONNECTION_sakaiminato_station'
    const shichirui = 'BUS_HATSUMI_CONNECTION_shichirui_port'
    const trips = [
      ...buildBusTripsForRoute(feed, sakaiminato, shichirui, date),
      ...buildBusTripsForRoute(feed, shichirui, sakaiminato, date)
    ]

    expect(trips).toHaveLength(expected)
  })
})
