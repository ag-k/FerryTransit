/**
 * Seven-day weather evidence for Oki Kisen. This module deliberately does not
 * turn uncalibrated weather values into a cancellation probability.
 * Keep it dependency-free so both Nuxt and the Node 22 collector can import it.
 */
export type OutlookMode = 'ferry' | 'rainbowjet'
export type ForecastQuality = 'complete' | 'incomplete' | 'unavailable' | 'stale'

export interface ForecastPoint {
  id: string
  name: string
  latitude: number
  longitude: number
}

export interface ForecastSnapshot {
  model: string
  fetchedAt: string
  modelRunAt: string | null
  sourceUrl: string
  data: unknown
  error?: string
}

export interface OutlookCalendar {
  coverageStart: string | null
  coverageEnd: string | null
  schedules: unknown[]
  suspensions: {
    mode: OutlookMode
    startDate: string
    endDate: string
    reason: string
    sourceUrl: string
  }[]
}

export interface WeeklyOutlookInput {
  collectedAt: string
  points: ForecastPoint[]
  marine: ForecastSnapshot[]
  wind: ForecastSnapshot[]
  official: {
    fetchedAt: string
    sourceUrl: string
    data: unknown
    error?: string
  }
  calendar: OutlookCalendar
}

const HOUR_MS = 3_600_000
const DAY_MS = HOUR_MS * 24
const JST_OFFSET_MS = HOUR_MS * 9
const MAX_SNAPSHOT_AGE_HOURS = 12
// A generous integrity check for mixed-up regional responses, not a claim about
// forecast accuracy or how closely these trial points represent sailing routes.
const MAX_GRID_DISTANCE_KM = 100
const OKI_KISEN_PORTS = new Set(['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO', 'KURI', 'BEPPU', 'HISHIURA', 'SAIGO'])
const MARINE_MODELS = ['ecmwf_wam', 'ncep_gfswave025'] as const
const WIND_MODELS = ['ecmwf_ifs025', 'gfs_seamless'] as const
const VARIABLES = {
  marine: ['wave_height', 'wave_direction', 'wave_period'],
  wind: ['wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m']
} as const
const UNITS: Record<string, string> = {
  wave_height: 'm',
  wave_direction: '°',
  wave_period: 's',
  wind_speed_10m: 'm/s',
  wind_direction_10m: '°',
  wind_gusts_10m: 'm/s'
}

type RecordValue = Record<string, unknown>
type WeatherKind = keyof typeof VARIABLES
type Hour = { at: number, values: Record<string, number | null> }

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue
    : null
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function instant(value: unknown): number | null {
  // A timezone is required; never interpret a timestamp in the host's timezone.
  if (typeof value !== 'string' || !calendarDate(value.slice(0, 10)) || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}

function dateKey(time: number): string {
  return new Date(time + JST_OFFSET_MS).toISOString().slice(0, 10)
}

function calendarDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(value)) return null
  const normalized = value.replaceAll('/', '-')
  const time = Date.parse(`${normalized}T00:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === normalized
    ? normalized
    : null
}

function validValue(variable: string, value: unknown): number | null {
  if (!finite(value) || value < 0) return null
  if (variable.includes('direction') && value > 360) return null
  return value
}

function ageHours(fetchedAt: string, collectedAt: number): number | null {
  const fetched = instant(fetchedAt)
  return fetched === null || fetched > collectedAt ? null : (collectedAt - fetched) / HOUR_MS
}

function distanceKm(first: { latitude: number, longitude: number }, second: { latitude: number, longitude: number }): number {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDifference = radians(second.latitude - first.latitude)
  const longitudeDifference = radians(second.longitude - first.longitude)
  const value = Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(longitudeDifference / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, value)))
}

function parsePointForecast(
  kind: WeatherKind,
  snapshot: ForecastSnapshot | undefined,
  point: ForecastPoint,
  pointIndex: number,
  pointCount: number,
  collectedAt: number
) {
  const issues: string[] = []
  const hours = new Map<number, Hour>()
  const duplicateTimes = new Set<number>()
  const age = snapshot ? ageHours(snapshot.fetchedAt, collectedAt) : null
  const empty = { hours, duplicateTimes, issues, ageHours: age, gridPosition: null, usable: false }
  if (!snapshot || snapshot.error || snapshot.data === null) {
    issues.push(snapshot?.error ? 'provider_error' : 'provider_missing')
    return empty
  }
  if (age === null) issues.push('invalid_fetch_time')
  if (age !== null && age > MAX_SNAPSHOT_AGE_HOURS) issues.push('snapshot_stale')
  const locations = Array.isArray(snapshot.data) ? snapshot.data : [snapshot.data]
  if (locations.length !== pointCount) {
    issues.push('location_count_mismatch')
    return empty
  }
  const location = record(locations[pointIndex])
  const hourly = record(location?.hourly)
  const units = record(location?.hourly_units)
  if (!location || !hourly || !units || !Array.isArray(hourly.time)) {
    issues.push('invalid_hourly_response')
    return empty
  }
  if (location.location_id !== undefined && location.location_id !== pointIndex) {
    issues.push('location_order_mismatch')
    return empty
  }
  if (!finite(location.latitude) || !finite(location.longitude) ||
      Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
    issues.push('grid_position_missing')
    return empty
  }
  const gridPosition = { latitude: location.latitude, longitude: location.longitude }
  if (distanceKm(point, gridPosition) > MAX_GRID_DISTANCE_KM) {
    issues.push('grid_position_too_far_from_requested_point')
    return { ...empty, gridPosition }
  }
  if (units.time !== 'unixtime') {
    issues.push('time_unit_must_be_unixtime')
    return { ...empty, gridPosition }
  }
  const arrays: Record<string, unknown[]> = {}
  for (const variable of VARIABLES[kind]) {
    // Single-model requests use bare keys. A matching suffix is also supported.
    const key = hourly[variable] !== undefined ? variable : `${variable}_${snapshot.model}`
    const values = hourly[key]
    if (units[key] !== UNITS[variable]) issues.push(`invalid_unit:${variable}`)
    if (!Array.isArray(values) || values.length !== hourly.time.length) {
      issues.push(`invalid_array:${variable}`)
    }
    arrays[variable] = units[key] === UNITS[variable] && Array.isArray(values) &&
      values.length === hourly.time.length ? values : []
  }
  for (let index = 0; index < hourly.time.length; index++) {
    const timestamp: unknown = hourly.time[index]
    // Reject milliseconds, fractional/non-hour timestamps and unzoned strings.
    if (!finite(timestamp) || !Number.isInteger(timestamp) || timestamp % 3600 !== 0 ||
        timestamp < 946_684_800 || timestamp > 4_102_444_800) {
      issues.push('invalid_hour_timestamp')
      continue
    }
    const at = timestamp * 1000
    if (hours.has(at) || duplicateTimes.has(at)) {
      duplicateTimes.add(at)
      hours.delete(at)
      continue
    }
    const values: Record<string, number | null> = {}
    for (const variable of VARIABLES[kind]) values[variable] = validValue(variable, arrays[variable][index])
    hours.set(at, { at, values })
  }
  return { hours, duplicateTimes, issues: [...new Set(issues)], ageHours: age, gridPosition, usable: true }
}

function maxHour(hours: Hour[], variable: string): Hour | null {
  let result: Hour | null = null
  for (const hour of hours) {
    const value = hour.values[variable]
    if (finite(value) && (result === null || value > (result.values[variable] ?? -Infinity))) result = hour
  }
  return result
}

function summarizeDay(
  kind: WeatherKind,
  model: string,
  point: ForecastPoint,
  parsed: ReturnType<typeof parsePointForecast>,
  date: string
) {
  const start = Date.parse(`${date}T00:00:00+09:00`)
  const hours = [...parsed.hours.values()].filter(hour => hour.at >= start && hour.at < start + DAY_MS)
  const variables = VARIABLES[kind]
  const availableHours = Object.fromEntries(variables.map(variable => [
    variable, hours.filter(hour => hour.values[variable] !== null).length
  ]))
  const validHours = hours.filter(hour => variables.every(variable => hour.values[variable] !== null)).length
  const duplicateHours = [...parsed.duplicateTimes].filter(at => at >= start && at < start + DAY_MS).length
  let quality: ForecastQuality
  if (!parsed.usable || Object.values(availableHours).every(count => count === 0)) quality = 'unavailable'
  else if (parsed.ageHours !== null && parsed.ageHours > MAX_SNAPSHOT_AGE_HOURS) quality = 'stale'
  else if (validHours !== 24 || duplicateHours > 0 || parsed.issues.length > 0) quality = 'incomplete'
  else quality = 'complete'
  const wave = maxHour(hours, 'wave_height')
  const wind = maxHour(hours, 'wind_speed_10m')
  const gust = maxHour(hours, 'wind_gusts_10m')
  return {
    model,
    pointId: point.id,
    requestedPosition: { latitude: point.latitude, longitude: point.longitude },
    gridPosition: parsed.gridPosition,
    quality,
    coverage: { expectedHours: 24, validHours, availableHours, duplicateHours },
    snapshotAgeHours: parsed.ageHours,
    issues: [...parsed.issues, ...(duplicateHours > 0 ? ['duplicate_hour'] : [])],
    maxWaveHeightM: wave?.values.wave_height ?? null,
    waveAtMaximum: wave ? {
      validAt: new Date(wave.at).toISOString(),
      directionFromDegrees: wave.values.wave_direction,
      periodSeconds: wave.values.wave_period
    } : null,
    maxWindSpeedMs: wind?.values.wind_speed_10m ?? null,
    windAtMaximum: wind ? {
      validAt: new Date(wind.at).toISOString(),
      directionFromDegrees: wind.values.wind_direction_10m
    } : null,
    maxWindGustMs: gust?.values.wind_gusts_10m ?? null
  }
}

type WeatherSummary = ReturnType<typeof summarizeDay>

function comparison(rows: WeatherSummary[], pointId: string, field: 'maxWaveHeightM' | 'maxWindSpeedMs' | 'maxWindGustMs') {
  const values = rows.filter(row => row.pointId === pointId && row.quality === 'complete')
    .map(row => ({ model: row.model, value: row[field] }))
    .filter((value): value is { model: string, value: number } => value.value !== null)
  const comparable = values.length === 2
  const minimum = comparable ? Math.min(...values.map(item => item.value)) : null
  const maximum = comparable ? Math.max(...values.map(item => item.value)) : null
  return {
    values,
    minimum,
    maximum,
    spread: minimum === null || maximum === null ? null : maximum - minimum,
    interpretation: 'deterministic_model_difference_not_probability' as const
  }
}

export function scheduleForDate(calendar: OutlookCalendar, mode: OutlookMode, date: string) {
  const unknown = { status: 'unknown' as const, reason: 'timetable_unavailable_or_outside_coverage', serviceIds: [] as string[] }
  const targetDate = calendarDate(date)
  if (!targetDate) return unknown
  const suspension = calendar.suspensions.find(rule => {
    const start = calendarDate(rule.startDate)
    const end = calendarDate(rule.endDate)
    return rule.mode === mode && start !== null && end !== null && start <= targetDate && targetDate <= end
  })
  if (suspension) return {
    status: 'planned_suspension' as const,
    reason: suspension.reason,
    sourceUrl: suspension.sourceUrl,
    serviceIds: [] as string[]
  }
  const coverageStart = calendarDate(calendar.coverageStart)
  const coverageEnd = calendarDate(calendar.coverageEnd)
  if (!coverageStart || !coverageEnd || targetDate < coverageStart || targetDate > coverageEnd || calendar.schedules.length === 0) return unknown
  const shipNames = mode === 'rainbowjet' ? ['RAINBOWJET'] : ['FERRY_OKI', 'FERRY_KUNIGA', 'FERRY_SHIRASHIMA']
  const matches = calendar.schedules.map(record).filter((schedule): schedule is RecordValue => {
    if (!schedule || !shipNames.includes(String(schedule.name))) return false
    const start = calendarDate(schedule.start_date)
    const end = calendarDate(schedule.end_date)
    return start !== null && end !== null && start <= targetDate && targetDate <= end
  })
  // The source format is daily period schedules. Do not silently ignore richer calendars.
  const unsupportedCalendar = matches.some(schedule => ['activeDays', 'addedDates', 'removedDates'].some(key => key in schedule))
  if (unsupportedCalendar) return { ...unknown, reason: 'unsupported_service_calendar' }
  const valid = matches.filter(schedule => typeof schedule.id === 'string' && Array.isArray(schedule.legs) &&
    schedule.legs.length > 0 && schedule.legs.every(leg => Array.isArray(leg) && leg.length === 4 &&
      OKI_KISEN_PORTS.has(leg[0]) && OKI_KISEN_PORTS.has(leg[2]) && leg[0] !== leg[2] &&
      [leg[1], leg[3]].every(value => typeof value === 'string' && /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(value))))
  if (valid.length === 0 || valid.length !== matches.length) return { ...unknown, reason: 'no_verified_service_schedule' }
  return { status: 'scheduled' as const, reason: 'published_timetable', serviceIds: valid.map(schedule => String(schedule.id)) }
}

function currentOfficialNotice(input: WeeklyOutlookInput, collectionDate: string) {
  const data = Array.isArray(input.official.data) ? input.official.data : []
  // The first two entries belong to the Dozen inter-island operator, not Oki Kisen.
  const notice = record(data[2])
  const updatedLabel = typeof notice?.date === 'string' ? notice.date : null
  const announcedDate = updatedLabel ? calendarDate(updatedLabel.slice(0, 10)) : null
  return {
    scope: 'current_day_announcement_only' as const,
    sourceUrl: input.official.sourceUrl,
    fetchedAt: input.official.fetchedAt,
    error: input.official.error ?? null,
    announcedDate,
    updatedLabel,
    isForCollectionDay: announcedDate === collectionDate && !input.official.error,
    ferry: {
      statusText: typeof notice?.ferry_state === 'string' ? notice.ferry_state : null,
      comment: typeof notice?.ferry_comment === 'string' ? notice.ferry_comment : null
    },
    rainbowjet: {
      statusText: typeof notice?.fast_ferry_state === 'string' ? notice.fast_ferry_state : null,
      comment: typeof notice?.fast_ferry_comment === 'string' ? notice.fast_ferry_comment : null
    }
  }
}

/** Input is a frozen collection snapshot; rebuilding it never consults the clock/network. */
export function buildWeeklyOutlook(input: WeeklyOutlookInput) {
  const collectedAt = instant(input.collectedAt)
  if (collectedAt === null) throw new Error('collectedAt must be an ISO timestamp with timezone')
  if (!Array.isArray(input.points) || input.points.length === 0 || input.points.some(point =>
    !point.id || !point.name || !finite(point.latitude) || !finite(point.longitude) ||
    Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) ||
    new Set(input.points.map(point => point.id)).size !== input.points.length) {
    throw new Error('Forecast points must have unique IDs and valid coordinates')
  }
  const prepare = (kind: WeatherKind, models: readonly string[], snapshots: ForecastSnapshot[]) => models.flatMap(model => {
    const matching = snapshots.filter(snapshot => snapshot.model === model)
    const snapshot = matching.length === 1 ? matching[0] : undefined
    return input.points.map((point, index) => {
      const parsed = parsePointForecast(kind, snapshot, point, index, input.points.length, collectedAt)
      if (matching.length > 1) parsed.issues.push('duplicate_model_snapshot')
      return { model, point, parsed }
    })
  })
  const marine = prepare('marine', MARINE_MODELS, input.marine)
  const wind = prepare('wind', WIND_MODELS, input.wind)
  const collectionDate = dateKey(collectedAt)
  const firstDay = Date.parse(`${collectionDate}T00:00:00+09:00`) + DAY_MS
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = dateKey(firstDay + index * DAY_MS)
    const marineRows = marine.map(row => summarizeDay('marine', row.model, row.point, row.parsed, date))
    const windRows = wind.map(row => summarizeDay('wind', row.model, row.point, row.parsed, date))
    const weatherComplete = [...marineRows, ...windRows].every(row => row.quality === 'complete')
    const vessel = (mode: OutlookMode) => {
      const schedule = scheduleForDate(input.calendar, mode, date)
      const predictionStatus = schedule.status === 'planned_suspension' ? 'planned_suspension'
        : schedule.status === 'unknown' ? 'schedule_unknown'
          : weatherComplete ? 'awaiting_calibration' : 'insufficient_data'
      return {
        schedule,
        predictionStatus,
        cancellationProbability: null,
        calibrationStatus: 'uncalibrated' as const
      }
    }
    return {
      date,
      daysAhead: index + 1,
      weatherStatus: weatherComplete ? 'complete' : 'insufficient_data',
      marine: marineRows,
      wind: windRows,
      modelComparison: input.points.map(point => ({
        pointId: point.id,
        waveHeightM: comparison(marineRows, point.id, 'maxWaveHeightM'),
        windSpeedMs: comparison(windRows, point.id, 'maxWindSpeedMs'),
        windGustMs: comparison(windRows, point.id, 'maxWindGustMs')
      })),
      vessels: { ferry: vessel('ferry'), rainbowjet: vessel('rainbowjet') }
    }
  })
  return {
    schemaVersion: 1,
    collectedAt: input.collectedAt,
    timezone: 'Asia/Tokyo',
    collectionDate,
    forecastStartDate: days[0].date,
    forecastEndDate: days[6].date,
    calibrationStatus: 'uncalibrated',
    scope: 'daily_weather_at_representative_offshore_points_not_individual_sailings',
    points: input.points,
    sources: [...input.marine, ...input.wind].map(snapshot => ({
      model: snapshot.model,
      sourceUrl: snapshot.sourceUrl,
      fetchedAt: snapshot.fetchedAt,
      modelRunAt: snapshot.modelRunAt,
      error: snapshot.error ?? null
    })),
    currentOfficialNotice: currentOfficialNotice(input, collectionDate),
    attribution: ['Weather data by Open-Meteo.com (CC BY 4.0)', 'Forecast models: ECMWF and NOAA/NCEP'],
    limitations: [
      'No cancellation probabilities until calibrated against historical operational outcomes.',
      'Model differences are not a confidence interval or an ensemble probability.',
      'Offshore grid values do not resolve harbor shelter, headlands or individual routes.',
      'Fetched-at is retrieval time; model-run time is unknown unless independently supplied.',
      'Current official announcements are preserved separately and never extended to future days.'
    ],
    days
  }
}
