import { describe, expect, it } from 'vitest'
import { resolveFirebaseAnalyticsMeasurementId } from '@/utils/firebaseAnalytics'

describe('resolveFirebaseAnalyticsMeasurementId', () => {
  it('本番プロジェクトでは設定されたMeasurement IDを返す', () => {
    expect(resolveFirebaseAnalyticsMeasurementId({
      projectId: 'oki-ferryguide',
      measurementId: 'G-PRODUCTION',
      useEmulators: false
    })).toBe('G-PRODUCTION')
  })

  it('devプロジェクトでは本番用Measurement IDをFirebaseへ渡さない', () => {
    expect(resolveFirebaseAnalyticsMeasurementId({
      projectId: 'oki-ferryguide-dev',
      measurementId: 'G-PRODUCTION',
      useEmulators: false
    })).toBe('')
  })

  it('エミュレータ利用時はAnalyticsを無効化する', () => {
    expect(resolveFirebaseAnalyticsMeasurementId({
      projectId: 'oki-ferryguide',
      measurementId: 'G-PRODUCTION',
      useEmulators: true
    })).toBe('')
  })

  it('Capacitorアプリでは端末識別子を収集するFirebase Analyticsを無効化する', () => {
    expect(resolveFirebaseAnalyticsMeasurementId({
      projectId: 'oki-ferryguide',
      measurementId: 'G-PRODUCTION',
      useEmulators: false,
      isCapacitorBuild: true
    })).toBe('')
  })
})
