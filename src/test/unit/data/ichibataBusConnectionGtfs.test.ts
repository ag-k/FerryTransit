import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface CompactTrip {
  serviceId: string
  stops: [string, string, string][]
}

interface CompactFeed {
  services: Record<string, { startDate: string, endDate: string }>
  trips: CompactTrip[]
}

const feed = JSON.parse(readFileSync(resolve(
  process.cwd(),
  'gtfs/public-data/data/bus-search/ichibata_bus_connection.json'
), 'utf8')) as CompactFeed

function departures(serviceId: string) {
  return feed.trips
    .filter(trip => trip.serviceId === serviceId)
    .map(trip => trip.stops[0][1])
    .sort()
}

describe('一畑バス隠岐汽船接続バスGTFS', () => {
  it.each([
    ['service_shichirui_20260718_20260807', ['07:50', '10:03', '15:40', '18:10']],
    ['service_shichirui_20260808_20260816', ['07:50', '13:35', '14:25', '15:12', '15:40', '18:35', '20:05']],
    ['service_shichirui_20260817_20260831', ['07:50', '10:03', '15:40', '18:10']],
    ['service_shichirui_20260901_20261031', ['07:50', '10:03', '14:35', '18:10']],
    ['service_shichirui_20261101_20261231', ['07:50', '18:10']],
    ['service_sakaiminato_20260718_20260807', ['13:00', '13:25']],
    ['service_sakaiminato_20260808_20260816', ['09:58', '10:50', '13:15', '13:25']],
    ['service_sakaiminato_20260817_20261031', ['13:00', '13:25']],
    ['service_sakaiminato_20261101_20261130', ['10:17', '13:00', '13:25', '14:00']],
    ['service_sakaiminato_20261201_20261231', ['13:00', '13:25']]
  ])('%s は2026年7月18日版公式PDFと一致する', (serviceId, expected) => {
    expect(departures(serviceId)).toEqual(expected)
  })

  it('旧版にだけ存在した7月18日以降の七類港17:45・18:00発を含まない', () => {
    const currentTrips = feed.trips.filter(trip => (
      feed.services[trip.serviceId].startDate >= '2026-07-18'
      && trip.serviceId.startsWith('service_shichirui_')
    ))
    expect(currentTrips.flatMap(trip => trip.stops.map(stop => stop[1])))
      .not.toEqual(expect.arrayContaining(['17:45', '18:00']))
  })
})
