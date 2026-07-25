import { describe, expect, it } from 'vitest'
import { buildHistorySearchQuery } from '@/utils/historySearch'

describe('buildHistorySearchQuery', () => {
  it('バス停の発着地と到着指定時刻を復元する', () => {
    const query = buildHistorySearchQuery({
      id: 'bus-history',
      type: 'route',
      departure: 'BUS_AMA_100_01',
      arrival: 'BUS_AMA_126_01',
      date: new Date(2026, 6, 16),
      time: new Date(2026, 6, 16, 9, 5),
      isArrivalMode: true,
      searchedAt: new Date('2026-07-16T00:00:00.000Z')
    })

    expect(query).toMatchObject({
      departure: 'BUS_AMA_100_01',
      arrival: 'BUS_AMA_126_01',
      date: '2026-07-16',
      time: '09:05',
      isArrivalMode: '1'
    })
  })

  it('空港の発着地をそのまま復元する', () => {
    const query = buildHistorySearchQuery({
      id: 'air-history',
      type: 'route',
      departure: 'AIRPORT_OKI',
      arrival: 'AIRPORT_ITAMI',
      date: new Date(2026, 9, 24),
      searchedAt: new Date('2026-07-16T00:00:00.000Z')
    })

    expect(query.departure).toBe('AIRPORT_OKI')
    expect(query.arrival).toBe('AIRPORT_ITAMI')
    expect(query.date).toBe('2026-10-24')
  })

  it('車両乗船と車両長を復元する', () => {
    const query = buildHistorySearchQuery({
      id: 'vehicle-history',
      type: 'route',
      departure: 'HONDO_SHICHIRUI',
      arrival: 'SAIGO',
      date: new Date(2026, 6, 16),
      withCar: true,
      vehicleLengthMeters: 7,
      searchedAt: new Date('2026-07-16T00:00:00.000Z')
    })

    expect(query.withCar).toBe('1')
    expect(query.vehicleLengthMeters).toBe('7')
  })

  it('車両長がない旧履歴は既定値で復元する', () => {
    const query = buildHistorySearchQuery({
      id: 'legacy-vehicle-history',
      type: 'route',
      departure: 'HONDO_SHICHIRUI',
      arrival: 'SAIGO',
      date: new Date(2026, 6, 16),
      withCar: true,
      searchedAt: new Date('2026-07-16T00:00:00.000Z')
    })

    expect(query.vehicleLengthMeters).toBe('5')
  })
})
