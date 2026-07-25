import { describe, expect, it } from 'vitest'
import fares from '@/data/okiKisenFares20260601.json'

describe('隠岐汽船 2026年6月1日改定運賃', () => {
  it('一次情報の旅客運賃5区間・5等級を保持する', () => {
    expect(fares.effectiveFrom).toBe('2026-06-01')
    expect(fares.sourceUrl).toBe('https://www.oki-kisen.co.jp/fare/')
    expect(Object.fromEntries(
      Object.entries(fares.categories).map(([id, category]) => [id, category.seatClass])
    )).toEqual({
      'hondo-oki': { class2: 3870, class2Special: 4990, class1: 7000, classSpecial: 8730, specialRoom: 9790 },
      'dozen-dogo': { class2: 1760, class2Special: 2340, class1: 3210, classSpecial: 4000, specialRoom: 4540 },
      'beppu-hishiura': { class2: 440, class2Special: 680, class1: 690, classSpecial: 880, specialRoom: 1220 },
      'hishiura-kuri': { class2: 860, class2Special: 1150, class1: 1530, classSpecial: 1910, specialRoom: 2260 },
      'kuri-beppu': { class2: 860, class2Special: 1150, class1: 1530, classSpecial: 1910, specialRoom: 2260 }
    })
  })

  it('菱浦〜来居・来居〜別府に区間固有の車両運賃を保持する', () => {
    const expected = {
      under3m: 1520,
      under4m: 2040,
      under5m: 2540,
      under6m: 3040,
      under7m: 3700,
      under8m: 4240,
      under9m: 4750,
      under10m: 5280,
      under11m: 5820,
      under12m: 6340,
      over12mPer1m: 520
    }

    expect(fares.categories['hishiura-kuri'].vehicle).toEqual(expected)
    expect(fares.categories['kuri-beppu'].vehicle).toEqual(expected)
    expect(fares.categories['hishiura-kuri'].vehicle)
      .not.toEqual(fares.categories['beppu-hishiura'].vehicle)
  })
})
