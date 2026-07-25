import { describe, expect, it } from 'vitest'
import type { FareVersion } from '@/types/fare'
import { formatFareVersionLabel } from '@/utils/fareVersionLabel'

const version = {
  id: '2026-06-01',
  vesselType: 'ferry',
  name: '2026年6月1日改定',
  effectiveFrom: '2026-06-01',
  routes: []
} as FareVersion

const translate = (key: string, params?: Record<string, string>) => {
  if (key === 'FARE_VERSION_CURRENT') return 'Current version'
  return `Revised ${params?.date}`
}

describe('formatFareVersionLabel', () => {
  it('自動生成された改定日を英語表記へ変換する', () => {
    expect(formatFareVersionLabel(version, 'en', translate)).toBe('Revised June 1, 2026')
  })

  it('日本語の年月日表記を維持する', () => {
    const jaTranslate = (_key: string, params?: Record<string, string>) => `${params?.date}改定`
    expect(formatFareVersionLabel(version, 'ja', jaTranslate)).toBe('2026年6月1日改定')
  })

  it('管理画面で設定された任意の版名は変更しない', () => {
    expect(formatFareVersionLabel({ ...version, name: '夏季特別運賃' }, 'en', translate))
      .toBe('夏季特別運賃')
  })
})
