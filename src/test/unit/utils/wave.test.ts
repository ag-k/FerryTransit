import { describe, it, expect } from 'vitest'
import { splitWaveValue, parseWaveHeights } from '@/utils/wave'

describe('splitWaveValue', () => {
  it('空やハイフンはプレースホルダを返す', () => {
    expect(splitWaveValue(null)).toEqual({ value: '-', unit: '', note: '' })
    expect(splitWaveValue('')).toEqual({ value: '-', unit: '', note: '' })
    expect(splitWaveValue('-')).toEqual({ value: '-', unit: '', note: '' })
  })

  it('単一値の波高を分解する', () => {
    expect(splitWaveValue('1.0m')).toEqual({ value: '1.0', unit: 'm', note: '' })
    expect(splitWaveValue('2m')).toEqual({ value: '2', unit: 'm', note: '' })
    expect(splitWaveValue('2.5 m')).toEqual({ value: '2.5', unit: 'm', note: '' })
  })

  it('全角の単位を正規化する', () => {
    expect(splitWaveValue('2.0ｍ')).toEqual({ value: '2.0', unit: 'm', note: '' })
    expect(splitWaveValue('2.0 ｍ（うねり）')).toEqual({
      value: '2.0',
      unit: 'm',
      note: '（うねり）'
    })
  })

  it('括弧書きの注記を分離する', () => {
    expect(splitWaveValue('1.5m（波浪・うねりあり）')).toEqual({
      value: '1.5',
      unit: 'm',
      note: '（波浪・うねりあり）'
    })
  })

  it('午前/午後など2値の波高（ハイフン区切り）を分解する', () => {
    expect(splitWaveValue('2.5m-2.0m')).toEqual({ value: '2.5 → 2.0', unit: 'm', note: '' })
    expect(splitWaveValue('2.5 m - 2.0m')).toEqual({ value: '2.5 → 2.0', unit: 'm', note: '' })
    expect(splitWaveValue('2.5m-2.0m（うねり）')).toEqual({
      value: '2.5 → 2.0',
      unit: 'm',
      note: '（うねり）'
    })
  })
})

describe('parseWaveHeights', () => {
  it('空やハイフンはnullを返す', () => {
    expect(parseWaveHeights(null)).toEqual({ m1: null, m2: null })
    expect(parseWaveHeights('-')).toEqual({ m1: null, m2: null })
  })

  it('単一値はm1/m2に同値を入れる', () => {
    expect(parseWaveHeights('2.0m')).toEqual({ m1: 2, m2: 2 })
  })

  it('午前/午後の2値を抽出する', () => {
    expect(parseWaveHeights('2.5m-2.0m')).toEqual({ m1: 2.5, m2: 2 })
  })
})
