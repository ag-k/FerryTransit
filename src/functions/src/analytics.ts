/* eslint-disable no-console */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { adminServiceAccountJson } from './secrets'
import { ensureAdminApp } from './utils/adminApp'

const TIMEZONE = 'Asia/Tokyo'
const MAX_LOCATION_ID_LENGTH = 200
const MAX_SEARCH_DATE_OFFSET_MS = 5 * 365 * 24 * 60 * 60 * 1000

export type AnalyticsEvent =
  | { type: 'page_view' }
  | { type: 'search'; depId: string; arrId: string; datetime: string }

export interface AnalyticsDateKeys {
  dateKey: string
  monthKey: string
  hourKey: string
  hour: string
}

const getDatePart = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) => {
  return parts.find(part => part.type === type)?.value
}

export const getAnalyticsDateKeys = (date: Date): AnalyticsDateKeys => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)

  const year = getDatePart(parts, 'year')
  const month = getDatePart(parts, 'month')
  const day = getDatePart(parts, 'day')
  const hour = getDatePart(parts, 'hour')

  if (!year || !month || !day || !hour) {
    throw new HttpsError('internal', 'Failed to calculate analytics date keys')
  }

  const dateKey = `${year}-${month}-${day}`
  return {
    dateKey,
    monthKey: `${year}-${month}`,
    hourKey: `${dateKey}-${hour}`,
    hour
  }
}

const parseLocationId = (value: unknown, fieldName: string) => {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${fieldName} must be a string`)
  }

  const normalized = value.trim()
  if (!normalized || normalized.length > MAX_LOCATION_ID_LENGTH) {
    throw new HttpsError('invalid-argument', `${fieldName} is invalid`)
  }

  return normalized
}

export const parseAnalyticsEvent = (data: unknown, now: Date = new Date()): AnalyticsEvent => {
  if (!data || typeof data !== 'object') {
    throw new HttpsError('invalid-argument', 'Analytics event is required')
  }

  const input = data as Record<string, unknown>
  if (input.type === 'page_view') {
    return { type: 'page_view' }
  }

  if (input.type !== 'search') {
    throw new HttpsError('invalid-argument', 'Unsupported analytics event')
  }

  const depId = parseLocationId(input.depId, 'depId')
  const arrId = parseLocationId(input.arrId, 'arrId')
  if (depId === arrId) {
    throw new HttpsError('invalid-argument', 'depId and arrId must be different')
  }

  if (typeof input.datetime !== 'string') {
    throw new HttpsError('invalid-argument', 'datetime must be an ISO date string')
  }

  const searchDate = new Date(input.datetime)
  if (Number.isNaN(searchDate.getTime())) {
    throw new HttpsError('invalid-argument', 'datetime is invalid')
  }

  if (Math.abs(searchDate.getTime() - now.getTime()) > MAX_SEARCH_DATE_OFFSET_MS) {
    throw new HttpsError('invalid-argument', 'datetime is outside the supported range')
  }

  return {
    type: 'search',
    depId,
    arrId,
    datetime: searchDate.toISOString()
  }
}

export const buildAggregateData = (
  event: AnalyticsEvent,
  keyField: 'dateKey' | 'monthKey' | 'hourKey',
  keyValue: string,
  hour: string
) => {
  const data: Record<string, unknown> = {
    [keyField]: keyValue,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }

  if (event.type === 'page_view') {
    data.pvTotal = admin.firestore.FieldValue.increment(1)
    return data
  }

  const routeKey = `${event.depId}-${event.arrId}`
  data.searchTotal = admin.firestore.FieldValue.increment(1)
  data.routeCounts = {
    [routeKey]: admin.firestore.FieldValue.increment(1)
  }
  data.departureCounts = {
    [event.depId]: admin.firestore.FieldValue.increment(1)
  }
  data.arrivalCounts = {
    [event.arrId]: admin.firestore.FieldValue.increment(1)
  }
  if (keyField !== 'hourKey') {
    data.hourCounts = {
      [hour]: admin.firestore.FieldValue.increment(1)
    }
  }

  return data
}

export const trackAnalytics = onCall(
  {
    region: 'asia-northeast1',
    secrets: [adminServiceAccountJson]
  },
  async (request) => {
    ensureAdminApp()

    const now = new Date()
    const event = parseAnalyticsEvent(request.data, now)
    const eventDate = event.type === 'search' ? new Date(event.datetime) : now
    const keys = getAnalyticsDateKeys(eventDate)
    const db = admin.firestore()
    const batch = db.batch()

    batch.set(
      db.collection('analytics_daily').doc(keys.dateKey),
      buildAggregateData(event, 'dateKey', keys.dateKey, keys.hour),
      { merge: true }
    )
    batch.set(
      db.collection('analytics_monthly').doc(keys.monthKey),
      buildAggregateData(event, 'monthKey', keys.monthKey, keys.hour),
      { merge: true }
    )
    batch.set(
      db.collection('analytics_hourly').doc(keys.hourKey),
      buildAggregateData(event, 'hourKey', keys.hourKey, keys.hour),
      { merge: true }
    )

    try {
      await batch.commit()
      return { success: true }
    } catch (error) {
      console.error('Failed to track analytics event:', error)
      throw new HttpsError('internal', 'Failed to track analytics event')
    }
  }
)
