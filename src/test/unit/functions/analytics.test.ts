import { describe, expect, it } from 'vitest'
import {
  buildAggregateData,
  getAnalyticsDateKeys,
  parseAnalyticsEvent
} from '../../../functions/src/analytics'

describe('analytics Cloud Function', () => {
  it('Asia/Tokyo基準の日次・月次・時間キーを生成する', () => {
    expect(getAnalyticsDateKeys(new Date('2026-07-30T15:30:00.000Z'))).toEqual({
      dateKey: '2026-07-31',
      monthKey: '2026-07',
      hourKey: '2026-07-31-00',
      hour: '00'
    })
  })

  it('検索イベントを検証して正規化する', () => {
    const now = new Date('2026-07-30T00:00:00.000Z')
    expect(parseAnalyticsEvent({
      type: 'search',
      depId: ' SAIGO ',
      arrId: 'HISHIURA',
      datetime: '2026-07-31T09:30:00+09:00'
    }, now)).toEqual({
      type: 'search',
      depId: 'SAIGO',
      arrId: 'HISHIURA',
      datetime: '2026-07-31T00:30:00.000Z'
    })
  })

  it('不正なイベントを拒否する', () => {
    const now = new Date('2026-07-30T00:00:00.000Z')
    expect(() => parseAnalyticsEvent({
      type: 'search',
      depId: 'SAIGO',
      arrId: 'SAIGO',
      datetime: now.toISOString()
    }, now)).toThrow()
    expect(() => parseAnalyticsEvent({
      type: 'unknown'
    }, now)).toThrow()
  })

  it('検索内訳をドット付きフィールドではなくネストしたマップで構築する', () => {
    const data = buildAggregateData({
      type: 'search',
      depId: 'SAIGO',
      arrId: 'HISHIURA',
      datetime: '2026-07-30T00:00:00.000Z'
    }, 'dateKey', '2026-07-30', '09')

    expect(data).toHaveProperty('routeCounts')
    expect(data).toHaveProperty('departureCounts')
    expect(data).toHaveProperty('arrivalCounts')
    expect(data).toHaveProperty('hourCounts')
    expect(Object.keys(data)).not.toContain('routeCounts.SAIGO-HISHIURA')
    expect(Object.keys(data.routeCounts as Record<string, unknown>)).toEqual([
      'SAIGO-HISHIURA'
    ])
  })
})
