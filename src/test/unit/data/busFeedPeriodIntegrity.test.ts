import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { BusFeedId, BusSearchFeed } from '@/utils/gtfsBusTimetable'

const FEED_IDS: BusFeedId[] = [
  'ama',
  'nishinoshima',
  'chibu',
  'okinoshima',
  'ichibata_bus_connection',
  'hatsumi_bus_connection'
]

const CHIBU_WEEKDAY_SUSPENSIONS = new Set([
  '2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20',
  '2026-04-29', '2026-05-04', '2026-05-05', '2026-05-06', '2026-07-20',
  '2026-08-11', '2026-08-13', '2026-08-14', '2026-09-21', '2026-09-22',
  '2026-09-23', '2026-10-12', '2026-11-03', '2026-11-23', '2026-12-29',
  '2026-12-30', '2026-12-31'
])

const feeds = new Map(FEED_IDS.map(feedId => [feedId, JSON.parse(readFileSync(resolve(
  'gtfs', 'public-data', 'data', 'bus-search', `${feedId}.json`
), 'utf8')) as BusSearchFeed]))

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function listDates(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) dates.push(date)
  return dates
}

function isServiceActive(service: BusSearchFeed['services'][string], date: string): boolean {
  if (date < service.startDate || date > service.endDate) return false
  if (service.addedDates?.includes(date)) return true
  if (service.removedDates?.includes(date)) return false
  const [year, month, day] = date.split('-').map(Number)
  return service.activeDays.includes(new Date(Date.UTC(year!, month! - 1, day)).getUTCDay())
}

function activeTrips(feed: BusSearchFeed, date: string) {
  const activeServiceIds = new Set(Object.entries(feed.services)
    .filter(([, service]) => isServiceActive(service, date))
    .map(([serviceId]) => serviceId))
  return feed.trips.filter(trip => activeServiceIds.has(trip.serviceId))
}

function signature(trip: BusSearchFeed['trips'][number]): string {
  return JSON.stringify([trip.routeId, trip.stops])
}

function expectedNoService(feedId: BusFeedId, date: string): boolean {
  if (feedId === 'okinoshima') return ['2026-01-01', '2026-01-02', '2026-01-03'].includes(date)
  if (feedId !== 'chibu') return false
  const [year, month, day] = date.split('-').map(Number)
  const weekday = new Date(Date.UTC(year!, month! - 1, day)).getUTCDay()
  return weekday === 0 || weekday === 6 || CHIBU_WEEKDAY_SUSPENSIONS.has(date)
}

describe('全バスフィードの適用期間整合性', () => {
  it.each(FEED_IDS)('%s は全有効日で同一便が重複しない', feedId => {
    const feed = feeds.get(feedId)!
    const services = Object.values(feed.services)
    const startDate = services.map(service => service.startDate).sort()[0]!
    const endDate = services.map(service => service.endDate).sort().at(-1)!

    for (const date of listDates(startDate, endDate)) {
      const signatures = activeTrips(feed, date).map(signature)
      expect(new Set(signatures).size, `${feedId} ${date}`).toBe(signatures.length)
    }
  })

  it.each(FEED_IDS)('%s は参照される全サービス・便に実運行日がある', feedId => {
    const feed = feeds.get(feedId)!
    const tripCountByService = new Map<string, number>()
    for (const trip of feed.trips) {
      expect(feed.services[trip.serviceId], `${feedId} ${trip.tripId}`).toBeDefined()
      tripCountByService.set(trip.serviceId, (tripCountByService.get(trip.serviceId) || 0) + 1)
    }

    for (const [serviceId, service] of Object.entries(feed.services)) {
      expect(tripCountByService.get(serviceId), `${feedId} ${serviceId}`).toBeGreaterThan(0)
      expect(
        listDates(service.startDate, service.endDate).some(date => isServiceActive(service, date)),
        `${feedId} ${serviceId}`
      ).toBe(true)
    }
  })

  it.each(FEED_IDS)('%s は想定外の全便欠落日を作らない', feedId => {
    const feed = feeds.get(feedId)!
    const services = Object.values(feed.services)
    const startDate = services.map(service => service.startDate).sort()[0]!
    const endDate = services.map(service => service.endDate).sort().at(-1)!

    for (const date of listDates(startDate, endDate)) {
      expect(activeTrips(feed, date).length === 0, `${feedId} ${date}`)
        .toBe(expectedNoService(feedId, date))
    }
  })
})
