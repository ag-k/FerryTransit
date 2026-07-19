import { describe, expect, it } from 'vitest'
import source from '../../../data/okiKisenFares20260601.json'
import { validatePublishedFerryFares } from '../../../../scripts/fare/lib/published-fare-validation.mjs'

const categories = {
  'hondo-oki': [['HONDO_SHICHIRUI', 'SAIGO'], ['HONDO_SHICHIRUI', 'BEPPU'], ['HONDO_SHICHIRUI', 'HISHIURA'], ['HONDO_SHICHIRUI', 'KURI']],
  'dozen-dogo': [['SAIGO', 'BEPPU'], ['SAIGO', 'HISHIURA'], ['SAIGO', 'KURI']],
  'beppu-hishiura': [['BEPPU', 'HISHIURA']],
  'hishiura-kuri': [['HISHIURA', 'KURI']],
  'kuri-beppu': [['KURI', 'BEPPU']]
} as const

const validFares = Object.entries(categories).flatMap(([categoryId, pairs]) => pairs.flatMap(([left, right]) => {
  const values = source.categories[categoryId as keyof typeof source.categories]
  return [[left, right], [right, left]].map(([departure, arrival]) => ({
    route: `${departure.toLowerCase()}-${arrival.toLowerCase()}`,
    departure, arrival,
    adult: values.seatClass.class2,
    child: Math.ceil(values.seatClass.class2 / 2 / 10) * 10,
    seatClass: values.seatClass,
    vehicle: values.vehicle
  }))
}))

describe('validatePublishedFerryFares', () => {
  it('公式値と20方向が揃う公開運賃を受理する', () => {
    expect(validatePublishedFerryFares(validFares, source).errors).toEqual([])
  })
  it('重複と旧運賃を拒否する', () => {
    const invalid = [...validFares, { ...validFares[0], adult: 3510 }]
    const errors = validatePublishedFerryFares(invalid, source).errors.join('\n')
    expect(errors).toContain('20件ではありません')
    expect(errors).toContain('route重複')
    expect(errors).toContain('adult=3510')
  })
})
