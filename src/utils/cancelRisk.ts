import cancelModels from '@/assets/models/cancel_models.json'

export type RiskLevel = 'low' | 'lowish' | 'caution' | 'high' | 'very_high'
export type RiskMode = 'ferry' | 'rainbowjet'

export type CancelRiskResult = {
  prob: number
  level: RiskLevel
  messageKey: string
}

const FERRY_THRESHOLDS = [0.10, 0.30, 0.60, 0.85]
const RAINBOWJET_THRESHOLDS = [0.08, 0.20, 0.45, 0.70]

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const levelByThresholds = (prob: number, thresholds: number[]): RiskLevel => {
  if (prob < thresholds[0]) return 'low'
  if (prob < thresholds[1]) return 'lowish'
  if (prob < thresholds[2]) return 'caution'
  if (prob < thresholds[3]) return 'high'
  return 'very_high'
}

export function classifyCancelRisk(probability: number, mode: RiskMode): CancelRiskResult {
  const prob = clamp01(probability)
  const thresholds = mode === 'rainbowjet' ? RAINBOWJET_THRESHOLDS : FERRY_THRESHOLDS
  const level = levelByThresholds(prob, thresholds)

  return {
    prob,
    level,
    messageKey: `cancelRisk.message.${level}`
  }
}

type CancelRiskModel = {
  weights: {
    w0: number
    w1: number
    w2: number
  }
  scaler: {
    m1: number
    s1: number
    m2: number
    s2: number
  }
}

const MODEL_MAP = cancelModels as Record<RiskMode, CancelRiskModel>

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value))

export function predictCancelProbability(m1: number, m2: number, mode: RiskMode): number {
  const model = MODEL_MAP[mode]
  const x1 = (m1 - model.scaler.m1) / model.scaler.s1
  const x2 = (m2 - model.scaler.m2) / model.scaler.s2
  const z = model.weights.w0 + model.weights.w1 * x1 + model.weights.w2 * x2
  return sigmoid(z)
}
