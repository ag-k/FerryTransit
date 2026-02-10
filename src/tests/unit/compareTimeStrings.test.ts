import { describe, it, expect } from 'vitest'

describe('compareTimeStrings', () => {
  // useFerryData内のcompareTimeStrings関数と同じロジック
  const compareTimeStrings = (time1: string, time2: string): number => {
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }
    
    const minutes1 = toMinutes(time1)
    const minutes2 = toMinutes(time2)
    
    return minutes1 - minutes2
  }

  it('should correctly compare time strings', () => {
    // 通常のケース
    expect(compareTimeStrings('10:00', '9:00')).toBeGreaterThan(0)
    expect(compareTimeStrings('9:00', '10:00')).toBeLessThan(0)
    expect(compareTimeStrings('10:00', '10:00')).toBe(0)
    
    // 問題となっていたケース
    expect(compareTimeStrings('7:50', '21:05')).toBeLessThan(0) // 7:50 < 21:05
    expect(compareTimeStrings('21:05', '7:50')).toBeGreaterThan(0) // 21:05 > 7:50
    
    // 分も含めた比較
    expect(compareTimeStrings('10:30', '10:15')).toBeGreaterThan(0)
    expect(compareTimeStrings('10:15', '10:30')).toBeLessThan(0)
    
    // 時間が同じで分が異なる場合
    expect(compareTimeStrings('10:45', '10:30')).toBeGreaterThan(0)
    expect(compareTimeStrings('10:30', '10:45')).toBeLessThan(0)
    
    // 境界値
    expect(compareTimeStrings('0:00', '23:59')).toBeLessThan(0)
    expect(compareTimeStrings('23:59', '0:00')).toBeGreaterThan(0)
  })

  it('should correctly determine if time is equal or after', () => {
    const isEqualOrAfter = (time1: string, time2: string): boolean => {
      return compareTimeStrings(time1, time2) >= 0
    }
    
    // 7:50 は 21:05 より前なので、false
    expect(isEqualOrAfter('7:50', '21:05')).toBe(false)
    
    // 21:05 は 7:50 より後なので、true
    expect(isEqualOrAfter('21:05', '7:50')).toBe(true)
    
    // 同じ時刻なので、true
    expect(isEqualOrAfter('10:00', '10:00')).toBe(true)
    
    // 10:30 は 10:00 より後なので、true
    expect(isEqualOrAfter('10:30', '10:00')).toBe(true)
  })
})