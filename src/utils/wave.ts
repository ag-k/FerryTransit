export type SplitWaveValueResult = {
  value: string
  unit: string
  note: string
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

  // 末尾の括弧書き（注記）を分離
  const parenMatch = raw.match(/^(.*?)(（.*）|\(.*\))\s*$/)
  const core = (parenMatch?.[1] ?? raw).trim()
  const noteFromParens = (parenMatch?.[2] ?? '').trim()

  // "2.5 m - 2.0m" のようなケースを想定して空白を除去して判定
  const compact = core.replace(/\s+/g, '')

  // "2.5m-2.0m" のような午前/午後想定の2値
  const rangeMatch = compact.match(/^([0-9]+(?:\.[0-9]+)?)([a-zA-Z]+)?-([0-9]+(?:\.[0-9]+)?)([a-zA-Z]+)?(.*)$/)
  if (rangeMatch) {
    const value1 = rangeMatch[1]
    const unit1 = rangeMatch[2] ?? ''
    const value2 = rangeMatch[3]
    const unit2 = rangeMatch[4] ?? ''
    const tail = (rangeMatch[5] ?? '').trim()
    const unit = unit1 || unit2
    const note = [tail, noteFromParens].filter(Boolean).join(' ')
    return {
      value: `${value1} / ${value2}`,
      unit,
      note
    }
  }

  // 通常の "1.5m（注記）" / "1.5m" / "1.5 m うねり" など
  const match = core.match(/^([0-9]+(?:\.[0-9]+)?)[\s]*([a-zA-Z]+)?(.*)$/)
  if (!match) {
    return { value: raw, unit: '', note: noteFromParens }
  }

  const value = match[1]
  const unit = match[2] ?? ''
  const tail = (match[3] ?? '').trim()
  const note = [tail, noteFromParens].filter(Boolean).join(' ')
  return { value, unit, note }
}
