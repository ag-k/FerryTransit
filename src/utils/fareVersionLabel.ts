import type { FareVersion } from '@/types/fare'

type Translate = (key: string, params?: Record<string, string>) => string

export const formatFareVersionLabel = (
  version: FareVersion | null,
  locale: string,
  translate: Translate
): string => {
  if (!version) return ''

  const label = version.name?.trim() || translate('FARE_VERSION_CURRENT')
  if (version.effectiveFrom === '1970-01-01') return label

  const isGeneratedJapaneseLabel = /^\d{4}年\d{1,2}月\d{1,2}日改定$/.test(label)
  if (!isGeneratedJapaneseLabel) return label

  const [year, month, day] = version.effectiveFrom.split('-').map(Number)
  if (!year || !month || !day) return label

  const date = locale.startsWith('ja')
    ? `${year}年${month}月${day}日`
    : new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      }).format(new Date(Date.UTC(year, month - 1, day)))

  return translate('FARE_VERSION_REVISED', { date })
}
