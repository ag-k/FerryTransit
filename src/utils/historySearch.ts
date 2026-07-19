import type { SearchHistoryItem } from '@/types/history'
import { DEFAULT_VEHICLE_LENGTH_METERS } from '@/utils/vehicleFare'

export type HistorySearchQuery = Record<string, string | undefined>

const formatLocalDate = (value: Date | string | number): string | undefined => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatLocalTime = (value?: Date | string | number): string | undefined => {
  if (value === undefined) return undefined
  if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) {
    const [hours = '0', minutes = '00'] = value.split(':')
    return `${hours.padStart(2, '0')}:${minutes}`
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export const buildHistorySearchQuery = (
  history: SearchHistoryItem
): HistorySearchQuery => ({
  departure: history.departure,
  arrival: history.arrival,
  date: formatLocalDate(history.date),
  time: formatLocalTime(history.time),
  isArrivalMode: history.isArrivalMode ? '1' : '0',
  ...(history.withCar ? {
    withCar: '1',
    vehicleLengthMeters: String(history.vehicleLengthMeters ?? DEFAULT_VEHICLE_LENGTH_METERS)
  } : {}),
  searchedAt: new Date(history.searchedAt).toISOString()
})
