import { describe, expect, it } from 'vitest'
import { validateJalFarePolicy } from '../../../../scripts/timetable/validate-jal-fares.mjs'

describe('validateJalFarePolicy', () => {
  it('未設定を変動運賃、正の数を登録済み運賃として受け付ける', () => {
    expect(validateJalFarePolicy([
      { trip_id: 'jal-variable', name: 'JAL_OKI_ITAMI' },
      { trip_id: 'jal-known', name: 'JAL_OKI_IZUMO', price: 12340 },
      { trip_id: 'ferry', name: 'FERRY_OKI', price: 3520 }
    ])).toEqual({
      total: 2,
      variableFareCount: 1,
      knownFareCount: 1
    })
  })

  it.each([0, -1, Number.NaN, '12340'])('不正なJAL運賃 %s を拒否する', (price) => {
    expect(() => validateJalFarePolicy([
      { trip_id: 'invalid', name: 'JAL_OKI_ITAMI', price }
    ])).toThrow('JAL運賃ポリシー違反')
  })

  it('JAL便が存在しないデータを拒否する', () => {
    expect(() => validateJalFarePolicy([
      { trip_id: 'ferry', name: 'FERRY_OKI', price: 3520 }
    ])).toThrow('JAL便が1件も見つかりません')
  })
})
