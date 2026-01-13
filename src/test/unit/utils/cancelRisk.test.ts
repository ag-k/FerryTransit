import { describe, expect, it } from 'vitest'

import { classifyCancelRisk } from '@/utils/cancelRisk'

describe('classifyCancelRisk', () => {
  it('clamps probability into 0..1', () => {
    expect(classifyCancelRisk(-0.5, 'ferry').prob).toBe(0)
    expect(classifyCancelRisk(1.2, 'ferry').prob).toBe(1)
  })

  it('classifies ferry thresholds', () => {
    expect(classifyCancelRisk(0.00, 'ferry').level).toBe('low')
    expect(classifyCancelRisk(0.10, 'ferry').level).toBe('lowish')
    expect(classifyCancelRisk(0.30, 'ferry').level).toBe('caution')
    expect(classifyCancelRisk(0.60, 'ferry').level).toBe('high')
    expect(classifyCancelRisk(0.85, 'ferry').level).toBe('very_high')
  })

  it('uses stricter thresholds for rainbowjet', () => {
    expect(classifyCancelRisk(0.08, 'rainbowjet').level).toBe('lowish')
    expect(classifyCancelRisk(0.45, 'rainbowjet').level).toBe('high')
    expect(classifyCancelRisk(0.70, 'rainbowjet').level).toBe('very_high')
  })
})
