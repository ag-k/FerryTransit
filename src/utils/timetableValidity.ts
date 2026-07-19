import type { TransportMode } from '@/types'

export type TimetableValiditySource = {
  mode: TransportMode
  operatorKey: string
  operatorLabel: string
  transportKey: string
  transportLabel: string
  startDate?: string
  endDate?: string
}

export type TimetableValidityStatus = 'active' | 'expired' | 'upcoming'

export type TimetableValidityRow = {
  key: string
  mode: TransportMode
  operatorKey: string
  operatorLabel: string
  transportLabel: string
  startDate: string
  endDate: string
  status: TimetableValidityStatus
  startsOperatorGroup: boolean
}

const MODE_ORDER: Record<TransportMode, number> = {
  FERRY: 0,
  AIR: 1,
  BUS: 2,
  WALK: 3
}

export const normalizeTimetableValidityDate = (value?: string): string | null => {
  const normalized = String(value ?? '').trim().replace(/\//g, '-').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null
}

export const getCurrentTimetableDate = (date = new Date()): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export const resolveTimetableValidityStatus = (
  startDate: string,
  endDate: string,
  currentDate: string
): TimetableValidityStatus => {
  if (currentDate < startDate) return 'upcoming'
  if (currentDate > endDate) return 'expired'
  return 'active'
}

export const buildTransportTimetableValidityRows = (
  sources: TimetableValiditySource[],
  locale = 'ja',
  currentDate = getCurrentTimetableDate()
): TimetableValidityRow[] => {
  const rowsByKey = new Map<string, TimetableValidityRow>()

  for (const source of sources) {
    const startDate = normalizeTimetableValidityDate(source.startDate)
    const endDate = normalizeTimetableValidityDate(source.endDate)
    const operatorKey = source.operatorKey.trim()
    const transportKey = source.transportKey.trim()

    if (!startDate || !endDate || !operatorKey || !transportKey) continue

    const key = [operatorKey, source.mode, transportKey].join('|')
    const existing = rowsByKey.get(key)

    if (existing) {
      if (startDate < existing.startDate) existing.startDate = startDate
      if (endDate > existing.endDate) existing.endDate = endDate
      existing.status = resolveTimetableValidityStatus(existing.startDate, existing.endDate, currentDate)
      continue
    }

    rowsByKey.set(key, {
      key,
      mode: source.mode,
      operatorKey,
      operatorLabel: source.operatorLabel,
      transportLabel: source.transportLabel,
      startDate,
      endDate,
      status: resolveTimetableValidityStatus(startDate, endDate, currentDate),
      startsOperatorGroup: false
    })
  }

  const rows = Array.from(rowsByKey.values()).sort((left, right) => {
    const operatorDiff = left.operatorLabel.localeCompare(right.operatorLabel, locale)
    if (operatorDiff !== 0) return operatorDiff
    const modeDiff = MODE_ORDER[left.mode] - MODE_ORDER[right.mode]
    if (modeDiff !== 0) return modeDiff
    return left.transportLabel.localeCompare(right.transportLabel, locale)
  })

  rows.forEach((row, index) => {
    row.startsOperatorGroup = index === 0 || row.operatorKey !== rows[index - 1]?.operatorKey
  })

  return rows
}

export const buildAvailableTransportTimetableValidityRows = (
  sources: TimetableValiditySource[],
  locale = 'ja',
  currentDate = getCurrentTimetableDate()
): TimetableValidityRow[] => {
  const rows = buildTransportTimetableValidityRows(sources, locale, currentDate)
    .filter(row => row.status !== 'expired')

  rows.forEach((row, index) => {
    row.startsOperatorGroup = index === 0 || row.operatorKey !== rows[index - 1]?.operatorKey
  })

  return rows
}
