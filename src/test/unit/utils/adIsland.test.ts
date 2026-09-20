import { describe, expect, it } from 'vitest'
import {
  getAdIslandForLocation,
  getFerryAdSlotId,
  resolveAdIslandId
} from '@/utils/adIsland'

describe('広告配信用の島判定', () => {
  it.each([
    ['HISHIURA', 'nakanoshima'],
    ['BEPPU', 'nishinoshima'],
    ['KURI', 'chiburijima'],
    ['SAIGO', 'dogo'],
    ['AIRPORT_OKI', 'dogo'],
    ['HONDO_SHICHIRUI', 'common'],
    ['AIRPORT_IZUMO', 'common']
  ])('%s を %s と判定する', (locationId, expected) => {
    expect(getAdIslandForLocation(locationId)).toBe(expected)
  })

  it.each([
    ['BUS_AMA_126_01', 'nakanoshima'],
    ['BUS_NISHINOSHIMA_1', 'nishinoshima'],
    ['BUS_CHIBU_1', 'chiburijima'],
    ['BUS_OKINOSHIMA_1', 'dogo']
  ])('バス停 %s を %s と判定する', (locationId, expected) => {
    expect(getAdIslandForLocation(locationId)).toBe(expected)
  })

  it('本土と1島の検索では隠岐側の島を採用する', () => {
    expect(resolveAdIslandId(['HONDO_SHICHIRUI', 'HISHIURA'])).toBe('nakanoshima')
  })

  it('島間の検索では到着地の島を採用する', () => {
    expect(resolveAdIslandId(['BEPPU', 'KURI'])).toBe('chiburijima')
    expect(resolveAdIslandId(['KURI', 'BEPPU'])).toBe('nishinoshima')
    expect(resolveAdIslandId(['HISHIURA', 'SAIGO'])).toBe('dogo')
  })

  it('到着地が本土の場合は出発地の島を採用する', () => {
    expect(resolveAdIslandId(['KURI', 'HONDO_SHICHIRUI'])).toBe('chiburijima')
  })

  it('隠岐側の島を含まない場合は共通を採用する', () => {
    expect(resolveAdIslandId(['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'])).toBe('common')
  })

  it('配置と島に対応する広告枠IDを返す', () => {
    expect(getFerryAdSlotId('primary', 'dogo')).toBe('oki-ferry-transit-dogo')
    expect(getFerryAdSlotId('secondary', 'nakanoshima'))
      .toBe('oki-ferry-transit-nakanoshima-secondary')
    expect(getFerryAdSlotId('timetable-image', 'common'))
      .toBe('oki-ferry-transit-timetable-image')
    expect(getFerryAdSlotId('transit-results-lead', 'chiburijima'))
      .toBe('oki-ferry-transit-chiburijima-transit-results-lead')
    expect(getFerryAdSlotId('transit-results-lead-secondary', 'dogo'))
      .toBe('oki-ferry-transit-dogo-transit-results-lead-secondary')
  })
})
