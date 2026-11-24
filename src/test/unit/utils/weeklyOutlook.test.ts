import { describe, expect, it } from 'vitest'
import { buildWeeklyOutlook, scheduleForDate } from '@/utils/weeklyOutlook'
import type { ForecastSnapshot, WeeklyOutlookInput } from '@/utils/weeklyOutlook'

type TestLocation = {
  latitude: number
  longitude: number
  hourly_units: Record<string, string>
  hourly: Record<string, (number | null)[]>
  location_id?: number
}

function location(kind: 'marine' | 'wind', value = 2): TestLocation {
  const start = Date.parse('2026-11-24T00:00:00+09:00') / 1000
  const fill = (number: number) => Array<number | null>(192).fill(number)
  return {
    latitude: 35.75,
    longitude: 133.0,
    hourly_units: kind === 'marine'
      ? { time: 'unixtime', wave_height: 'm', wave_direction: '°', wave_period: 's' }
      : { time: 'unixtime', wind_speed_10m: 'm/s', wind_direction_10m: '°', wind_gusts_10m: 'm/s' },
    hourly: {
      time: Array.from({ length: 192 }, (_, index) => start + index * 3600),
      ...(kind === 'marine'
        ? { wave_height: fill(value), wave_direction: fill(350), wave_period: fill(7) }
        : { wind_speed_10m: fill(value * 3), wind_direction_10m: fill(10), wind_gusts_10m: fill(value * 4) })
    }
  }
}

function input(): WeeklyOutlookInput {
  const snapshot = (model: string, kind: 'marine' | 'wind', value = 2): ForecastSnapshot => ({
    model,
    fetchedAt: '2026-11-24T09:00:00Z',
    modelRunAt: null,
    sourceUrl: 'https://example.test/forecast',
    data: location(kind, value)
  })
  return {
    collectedAt: '2026-11-24T09:30:00Z',
    points: [{ id: 'offshore', name: '試験点', latitude: 35.75, longitude: 133.1 }],
    marine: [snapshot('ecmwf_wam', 'marine'), snapshot('ncep_gfswave025', 'marine', 3)],
    wind: [snapshot('ecmwf_ifs025', 'wind'), snapshot('gfs_seamless', 'wind', 3)],
    official: {
      fetchedAt: '2026-11-24T09:00:00Z',
      sourceUrl: 'https://example.test/status',
      data: [
        { status: '全便欠航' }, { status: '全便欠航' },
        { date: '2026-11-24 11:30 更新', ferry_state: '一部変更', ferry_comment: '来居港に接岸できない可能性', fast_ferry_state: '欠航', fast_ferry_comment: '海上しけのため' }
      ]
    },
    calendar: {
      coverageStart: '2026-06-01',
      coverageEnd: '2027-02-28',
      schedules: [
        { id: 'ferry-regular', name: 'FERRY_OKI', start_date: '2026/06/01', end_date: '2027/02/28', legs: [['HONDO_SHICHIRUI', '09:00', 'SAIGO', '11:25']] },
        { id: 'jet-november', name: 'RAINBOWJET', start_date: '2026/11/01', end_date: '2026/11/30', legs: [['SAIGO', '08:00', 'HONDO_SAKAIMINATO', '09:23']] }
      ],
      suspensions: [{ mode: 'rainbowjet', startDate: '2026-12-01', endDate: '2027-02-28', reason: 'ドック整備', sourceUrl: 'https://example.test/timetable.pdf' }]
    }
  }
}

describe('buildWeeklyOutlook', () => {
  it('returns tomorrow through day seven in JST, preserves provenance and never invents a probability', () => {
    const result = buildWeeklyOutlook(input())
    expect(result.days.map(day => day.date)).toEqual([
      '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01'
    ])
    expect(result.days.map(day => day.daysAhead)).toEqual([1, 2, 3, 4, 5, 6, 7])
    const day = result.days[0]
    expect(day.weatherStatus).toBe('complete')
    expect(day.marine[0]).toMatchObject({ quality: 'complete', maxWaveHeightM: 2, gridPosition: { longitude: 133 }, requestedPosition: { longitude: 133.1 } })
    expect(day.marine[0].maxWindSpeedMs).toBeNull()
    expect(day.wind[0].waveAtMaximum).toBeNull()
    expect(day.modelComparison[0].waveHeightM).toMatchObject({ minimum: 2, maximum: 3, spread: 1, interpretation: 'deterministic_model_difference_not_probability' })
    expect(day.vessels.ferry).toMatchObject({ predictionStatus: 'awaiting_calibration', cancellationProbability: null })
    expect(result.sources.every(source => source.modelRunAt === null)).toBe(true)
    expect(result.days.every(day => day.vessels.ferry.cancellationProbability === null && day.vessels.rainbowjet.cancellationProbability === null)).toBe(true)
  })

  it('switches the seven target days at Japan midnight, independently of the host timezone', () => {
    const snapshot = input()
    snapshot.collectedAt = '2026-11-24T14:59:59Z'
    expect(buildWeeklyOutlook(snapshot).forecastStartDate).toBe('2026-11-25')
    snapshot.collectedAt = '2026-11-24T15:00:00Z'
    const result = buildWeeklyOutlook(snapshot)
    expect(result.forecastStartDate).toBe('2026-11-26')
    expect(result.forecastEndDate).toBe('2026-12-02')
    // Requesting only eight days before midnight cannot manufacture the new last day.
    expect(result.days[6].weatherStatus).toBe('insufficient_data')
  })

  it('keeps zero waves valid, but missing/null/negative values unavailable instead of calm', () => {
    const snapshot = input()
    const data = snapshot.marine[0].data as TestLocation
    data.hourly.wave_height.fill(0)
    expect(buildWeeklyOutlook(snapshot).days[0].marine[0]).toMatchObject({ maxWaveHeightM: 0, quality: 'complete' })
    data.hourly.wave_height.fill(null)
    const missing = buildWeeklyOutlook(snapshot).days[0]
    expect(missing.marine[0].maxWaveHeightM).toBeNull()
    expect(missing.vessels.ferry.predictionStatus).toBe('insufficient_data')
    expect(missing.modelComparison[0].waveHeightM.spread).toBeNull()
    data.hourly.wave_height.fill(-1)
    expect(buildWeeklyOutlook(snapshot).days[0].marine[0].maxWaveHeightM).toBeNull()
  })

  it('does not use a duplicated hour to make sparse data appear complete', () => {
    const snapshot = input()
    const data = snapshot.marine[0].data as TestLocation
    data.hourly.time[25] = data.hourly.time[24]
    const row = buildWeeklyOutlook(snapshot).days[0].marine[0]
    expect(row.quality).toBe('incomplete')
    expect(row.coverage).toMatchObject({ validHours: 22, duplicateHours: 1 })
    expect(row.issues).toContain('duplicate_hour')
  })

  it('rejects wrong units, non-finite values and unzoned or millisecond timestamps', () => {
    const snapshot = input()
    const wind = snapshot.wind[0].data as TestLocation
    wind.hourly_units.wind_speed_10m = 'km/h'
    wind.hourly.wind_gusts_10m[24] = Infinity
    wind.hourly.wind_direction_10m[24] = 361
    const row = buildWeeklyOutlook(snapshot).days[0].wind[0]
    expect(row.maxWindSpeedMs).toBeNull()
    expect(row.issues).toContain('invalid_unit:wind_speed_10m')
    expect(row.coverage.availableHours.wind_gusts_10m).toBe(23)
    const marine = snapshot.marine[0].data as TestLocation
    marine.hourly.time = marine.hourly.time.map(value => Number(value) * 1000)
    expect(buildWeeklyOutlook(snapshot).days[0].marine[0].quality).toBe('unavailable')
    marine.hourly_units.time = 'iso8601'
    expect(buildWeeklyOutlook(snapshot).days[0].marine[0].issues).toContain('time_unit_must_be_unixtime')
  })

  it('retains the direction and period at peak wave height without averaging circular directions', () => {
    const snapshot = input()
    const marine = snapshot.marine[0].data as TestLocation
    marine.hourly.wave_height[31] = 4.5
    marine.hourly.wave_direction[31] = 5
    marine.hourly.wave_period[31] = 11
    const row = buildWeeklyOutlook(snapshot).days[0].marine[0]
    expect(row).toMatchObject({ maxWaveHeightM: 4.5, waveAtMaximum: { directionFromDegrees: 5, periodSeconds: 11, validAt: '2026-11-24T22:00:00.000Z' } })
  })

  it('accepts matching model suffixes but does not silently swap a different model into the series', () => {
    const snapshot = input()
    const marine = snapshot.marine[0].data as TestLocation
    for (const variable of ['wave_height', 'wave_direction', 'wave_period']) {
      marine.hourly[`${variable}_ecmwf_wam`] = marine.hourly[variable]
      marine.hourly_units[`${variable}_ecmwf_wam`] = marine.hourly_units[variable]
      delete marine.hourly[variable]
      delete marine.hourly_units[variable]
    }
    expect(buildWeeklyOutlook(snapshot).days[0].marine[0].quality).toBe('complete')
    snapshot.marine[0].model = 'ncep_gfswave025'
    const result = buildWeeklyOutlook(snapshot).days[0]
    expect(result.marine.every(row => row.quality === 'unavailable')).toBe(true)
    expect(result.marine[1].issues).toContain('duplicate_model_snapshot')
  })

  it('keeps failed, old or future-dated snapshots out of complete weather evidence', () => {
    const snapshot = input()
    snapshot.marine[0].error = 'HTTP 503'
    const failed = buildWeeklyOutlook(snapshot)
    expect(failed.sources[0].error).toBe('HTTP 503')
    expect(failed.days[0].marine[0].quality).toBe('unavailable')
    delete snapshot.marine[0].error
    snapshot.marine[0].fetchedAt = '2026-11-23T21:29:59Z'
    expect(buildWeeklyOutlook(snapshot).days[0].marine[0].quality).toBe('stale')
    snapshot.marine[0].fetchedAt = '2026-11-24T09:31:00Z'
    expect(buildWeeklyOutlook(snapshot).days[0].marine[0].issues).toContain('invalid_fetch_time')
  })

  it('preserves today’s official announcement separately without cancelling future services', () => {
    const result = buildWeeklyOutlook(input())
    expect(result.currentOfficialNotice).toMatchObject({
      announcedDate: '2026-11-24', isForCollectionDay: true,
      ferry: { statusText: '一部変更' }, rainbowjet: { statusText: '欠航' }
    })
    expect(result.days[0].vessels.rainbowjet.predictionStatus).toBe('awaiting_calibration')
    const snapshot = input()
    snapshot.official.data = [{ status: '欠航' }, { status: '欠航' }, null]
    expect(buildWeeklyOutlook(snapshot).currentOfficialNotice.ferry.statusText).toBeNull()
  })

  it('marks the jet’s dated winter suspension independently of weather and of the ferry schedule', () => {
    const snapshot = input()
    snapshot.marine = []
    snapshot.wind = []
    const result = buildWeeklyOutlook(snapshot)
    expect(result.days[5].vessels.rainbowjet.predictionStatus).toBe('insufficient_data')
    expect(result.days[6].vessels.rainbowjet).toMatchObject({ predictionStatus: 'planned_suspension', cancellationProbability: null })
    expect(result.days[6].vessels.ferry.predictionStatus).toBe('insufficient_data')
  })

  it('fails explicitly on invalid snapshot dates or ambiguous point IDs', () => {
    const snapshot = input()
    snapshot.collectedAt = '2026-11-24T09:30:00'
    expect(() => buildWeeklyOutlook(snapshot)).toThrow('timezone')
    snapshot.collectedAt = '2026-02-30T09:30:00Z'
    expect(() => buildWeeklyOutlook(snapshot)).toThrow('timezone')
    snapshot.collectedAt = '2026-11-24T09:30:00Z'
    snapshot.points.push(snapshot.points[0])
    expect(() => buildWeeklyOutlook(snapshot)).toThrow('unique IDs')
  })

  it('rejects mismatched location counts and reordered provider results', () => {
    const snapshot = input()
    snapshot.marine[0].data = [location('marine'), location('marine')]
    expect(buildWeeklyOutlook(snapshot).days[0].marine[0].issues).toContain('location_count_mismatch')
    snapshot.marine[0].data = { ...location('marine'), location_id: 1 }
    expect(buildWeeklyOutlook(snapshot).days[0].marine[0].issues).toContain('location_order_mismatch')
  })

  it('rejects a response from a completely different region even with complete hourly values', () => {
    const snapshot = input()
    snapshot.marine[0].data = { ...location('marine'), latitude: 0, longitude: 0 }
    const row = buildWeeklyOutlook(snapshot).days[0].marine[0]
    expect(row.quality).toBe('unavailable')
    expect(row.issues).toContain('grid_position_too_far_from_requested_point')
    expect(row.gridPosition).toEqual({ latitude: 0, longitude: 0 })
  })
})

describe('scheduleForDate', () => {
  it('respects coverage limits and does not repeat one winter’s closure every year', () => {
    const { calendar } = input()
    expect(scheduleForDate(calendar, 'ferry', '2027-02-28').status).toBe('scheduled')
    expect(scheduleForDate(calendar, 'ferry', '2027-03-01').status).toBe('unknown')
    expect(scheduleForDate(calendar, 'rainbowjet', '2027-02-28').status).toBe('planned_suspension')
    expect(scheduleForDate(calendar, 'rainbowjet', '2027-12-01').status).toBe('unknown')
    expect(scheduleForDate(calendar, 'ferry', '2027-02-30').status).toBe('unknown')
  })

  it('treats empty data, schedule gaps and other operators as unknown rather than a closure', () => {
    const { calendar } = input()
    calendar.schedules = []
    expect(scheduleForDate(calendar, 'ferry', '2026-11-25').status).toBe('unknown')
    calendar.schedules = [{ id: 'inner-island', name: 'ISOKAZE', start_date: '2026/01/01', end_date: '2026/12/31', legs: [['BEPPU', '09:00', 'HISHIURA', '09:15']] }]
    expect(scheduleForDate(calendar, 'ferry', '2026-11-25').status).toBe('unknown')
    expect(scheduleForDate(calendar, 'rainbowjet', '2026-11-25').status).toBe('unknown')
  })

  it('refuses calendar formats whose weekday/exception rules it cannot evaluate', () => {
    const { calendar } = input()
    calendar.schedules = [{ id: 'not-daily', name: 'FERRY_OKI', start_date: '2026/01/01', end_date: '2026/12/31', activeDays: [1], legs: [['BEPPU', '09:00', 'SAIGO', '10:15']] }]
    expect(scheduleForDate(calendar, 'ferry', '2026-11-25')).toMatchObject({ status: 'unknown', reason: 'unsupported_service_calendar' })
  })

  it('rejects malformed ports or sailing times instead of declaring the service scheduled', () => {
    const { calendar } = input()
    calendar.schedules = [{ id: 'invalid-leg', name: 'FERRY_OKI', start_date: '2026/01/01', end_date: '2026/12/31', legs: [['UNKNOWN_PORT', '09:00', 'SAIGO', '99:99']] }]
    expect(scheduleForDate(calendar, 'ferry', '2026-11-25').status).toBe('unknown')
  })
})
