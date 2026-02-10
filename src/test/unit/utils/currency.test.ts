import { describe, it, expect } from 'vitest'
import { roundUpToTen } from '@/utils/currency'

describe('roundUpToTen', () => {
  it('既に10円単位の金額はそのまま返す', () => {
    expect(roundUpToTen(500)).toBe(500)
    expect(roundUpToTen(1230)).toBe(1230)
  })

  it('1桁目に端数がある場合は10円単位に切り上げる', () => {
    expect(roundUpToTen(505)).toBe(510)
    expect(roundUpToTen(1755)).toBe(1760)
  })

  it('小数点以下を含む金額も切り上げる', () => {
    expect(roundUpToTen(649.5)).toBe(650)
  })

  it('0や負の値でも安全に扱う', () => {
    expect(roundUpToTen(0)).toBe(0)
    expect(roundUpToTen(-15)).toBe(-10)
  })
})
