export type SplitWaveValueResult = {
  value: string
  unit: string
  note: string
}

export type ParsedWaveHeights = {
  m1: number | null
  m2: number | null
}

/**
 * 波高の文字列をUI表示用に分解する。
 *
 * 例:
 * - "2.5m" => { value: "2.5", unit: "m", note: "" }
 * - "2.5m-2.0m" => { value: "2.5 / 2.0", unit: "m", note: "" } (午前/午後などの2値想定)
 * - "1.5m（波浪・うねりあり）" => { value: "1.5", unit: "m", note: "（波浪・うねりあり）" }
 */
export function splitWaveValue(wave?: string | null): SplitWaveValueResult {
  const raw = (wave ?? '').trim()
  if (!raw || raw === '-') {
    return { value: '-', unit: '', note: '' }
  }

  const normalizeUnit = (value: string) => value.replace(/ｍ/g, 'm')

  // 末尾の括弧書き（注記）を分離
  const parenMatch = raw.match(/^(.*?)(（.*）|\(.*\))\s*$/)
  const core = (parenMatch?.[1] ?? raw).trim()
  const noteFromParens = (parenMatch?.[2] ?? '').trim()

  // "2.5 m - 2.0m" のようなケースを想定して空白を除去して判定
  const compact = core.replace(/\s+/g, '')

  // "2.5m-2.0m" のような午前/午後想定の2値
  const rangeMatch = compact.match(/^([0-9]+(?:\.[0-9]+)?)([a-zA-Zｍ]+)?-([0-9]+(?:\.[0-9]+)?)([a-zA-Zｍ]+)?(.*)$/)
  if (rangeMatch) {
    const value1 = rangeMatch[1]
    const unit1 = normalizeUnit(rangeMatch[2] ?? '')
    const value2 = rangeMatch[3]
    const unit2 = normalizeUnit(rangeMatch[4] ?? '')
    const tail = (rangeMatch[5] ?? '').trim()
    const unit = unit1 || unit2
    const note = [tail, noteFromParens].filter(Boolean).join(' ')
    return {
      value: `${value1} → ${value2}`,
      unit,
      note
    }
  }

  // 通常の "1.5m（注記）" / "1.5m" / "1.5 m うねり" など
  const match = core.match(/^([0-9]+(?:\.[0-9]+)?)[\s]*([a-zA-Zｍ]+)?(.*)$/)
  if (!match) {
    return { value: raw, unit: '', note: noteFromParens }
  }

  const value = match[1]
  const unit = normalizeUnit(match[2] ?? '')
  const tail = (match[3] ?? '').trim()
  const note = [tail, noteFromParens].filter(Boolean).join(' ')
  return { value, unit, note }
}

export function parseWaveHeights(wave?: string | null): ParsedWaveHeights {
  const raw = (wave ?? '').trim()
  if (!raw || raw === '-') {
    return { m1: null, m2: null }
  }

  const normalized = raw.replace(/ｍ/g, 'm')
  const matches = normalized.match(/[0-9]+(?:\.[0-9]+)?/g)
  if (!matches || matches.length === 0) {
    return { m1: null, m2: null }
  }

  const first = Number(matches[0])
  const second = Number(matches[1] ?? matches[0])

  return {
    m1: Number.isFinite(first) ? first : null,
    m2: Number.isFinite(second) ? second : null
  }
}
