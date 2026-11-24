// @vitest-environment node

import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildCalendar,
  buildForecastUrl,
  fetchJsonSnapshot,
  main,
  parseArgs,
  redactSecrets,
  validatePoints
} from '../../../../scripts/forecast/collect-weekly-outlook.mjs'

const pointConfig = JSON.parse(readFileSync(resolve('scripts/forecast/forecast-points.json'), 'utf8'))
const timetable = JSON.parse(readFileSync(resolve('gtfs/raw/ferry/oki-kisen-2026.json'), 'utf8'))
const points = validatePoints(pointConfig)
const temporaryDirectories: string[] = []
const testUrl = 'https://marine-api.open-meteo.com/v1/marine?models=ecmwf_wam'

afterEach(async () => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('週間見通しのデータ取得CLI', () => {
  it('海上代表点の重複・範囲外と矛盾するCLI指定を拒否する', () => {
    expect(pointConfig.routeValidated).toBe(false)
    expect(points).toHaveLength(3)
    expect(() => validatePoints([points[0], points[0], points[2]])).toThrow('一意')
    expect(() => validatePoints([{ ...points[0], latitude: 91 }, ...points.slice(1)])).toThrow('緯度・経度')
    expect(parseArgs(['--evaluation']).evaluation).toBe(true)
    expect(() => parseArgs(['--input'])).toThrow('パス')
    expect(() => parseArgs(['--input', 'saved.json', '--evaluation'])).toThrow('同時')
  })

  it('一つのモデルに3点をまとめ、7日先を含む期間と時刻・風速の単位を固定する', () => {
    const marine = buildForecastUrl({ kind: 'marine', model: 'ecmwf_wam', points })
    const wind = buildForecastUrl({ kind: 'wind', model: 'ecmwf_ifs025', points })
    for (const url of [marine, wind]) {
      expect(url.searchParams.get('latitude')).toBe('35.75,35.9,36.05')
      expect(url.searchParams.get('longitude')).toBe('133.1,133.05,133.05')
      expect(url.searchParams.get('forecast_days')).toBe('8')
      expect(url.searchParams.get('timezone')).toBe('Asia/Tokyo')
      expect(url.searchParams.get('timeformat')).toBe('unixtime')
      expect(url.searchParams.get('cell_selection')).toBe('sea')
      expect(url.searchParams.get('models')?.split(',')).toHaveLength(1)
    }
    expect(wind.searchParams.get('wind_speed_unit')).toBe('ms')
    expect(marine.searchParams.get('hourly')).toBe('wave_height,wave_direction,wave_period')
    expect(() => buildForecastUrl({ kind: 'marine', model: 'gfs_wave', points })).toThrow('未対応')
    expect(() => buildForecastUrl({ kind: 'wind', model: 'ecmwf_wam', points })).toThrow('未対応')
  })

  it('無料・契約エンドポイントの誤設定は通信前に拒否する', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Unexpected network request'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(main([], {})).rejects.toThrow('--evaluation')
    await expect(main([], { OPEN_METEO_API_KEY: 'fake-key' })).rejects.toThrow('両エンドポイント')
    await expect(main(['--evaluation'], { OPEN_METEO_API_KEY: 'fake-key' })).rejects.toThrow('環境変数を外して')
    await expect(main(['--evaluation'], { OPEN_METEO_WEATHER_URL: 'https://customer-api.open-meteo.com/v1/forecast' })).rejects.toThrow('環境変数を外して')
    await expect(main([], {
      OPEN_METEO_API_KEY: 'fake-key',
      OPEN_METEO_MARINE_URL: 'http://example.invalid/v1/marine',
      OPEN_METEO_WEATHER_URL: 'https://example.invalid/v1/forecast'
    })).rejects.toThrow('HTTPS')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('キーのURL・応答本文への反映を伏せ、欠測のnullをゼロと区別して保持する', async () => {
    const fakeKey = 'fixture-secret+with space'
    const url = buildForecastUrl({ kind: 'marine', model: 'ecmwf_wam', points, apiKey: fakeKey })
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      hourly: { wave_height: [null, 0, 1.5] },
      apikey: fakeKey,
      nested: { authorization: 'another-fake-secret' }
    }), { status: 200 }))
    const result = await fetchJsonSnapshot(url, { fetchImpl: fetchMock, secrets: [fakeKey] })
    expect(result.data.hourly.wave_height).toEqual([null, 0, 1.5])
    expect(result.sourceUrl).not.toContain('apikey=')
    expect(result.transport.parameters).not.toHaveProperty('apikey')
    expect(JSON.stringify(result)).not.toContain(fakeKey)
    expect(JSON.stringify(result)).not.toContain('another-fake-secret')
    expect(result.transport.responseBody.apikey).toBe('[REDACTED]')
    const echoed = redactSecrets({
      error: `Request failed: ${url}`,
      encoded: encodeURIComponent(fakeKey),
      rawText: JSON.stringify({ api_key: 'unknown-key-from-provider' })
    }, [fakeKey])
    expect(JSON.stringify(echoed)).not.toContain(encodeURIComponent(fakeKey))
    expect(JSON.stringify(echoed)).not.toContain('unknown-key-from-provider')
    expect(echoed.error).toContain('[REDACTED]')
  })

  it('一時障害は再試行し、成功前の失敗も取得記録に残す', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{"temporary":true}', { status: 503 }))
      .mockResolvedValueOnce(new Response('{"hourly":{"wave_height":[null]}}', { status: 200 }))
    const sleep = vi.fn().mockResolvedValue(undefined)
    const result = await fetchJsonSnapshot(testUrl, { fetchImpl: fetchMock, sleep })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(500)
    expect(result.error).toBeUndefined()
    expect(result.transport.attemptHistory.map(attempt => attempt.httpStatus)).toEqual([503, 200])
    expect(result.data.hourly.wave_height).toEqual([null])
  })

  it('プロバイダーがAPIキーをオブジェクトのプロパティ名に含めても保存しない', () => {
    const fakeKey = 'fixture-secret+with space'
    const result = redactSecrets({
      [fakeKey]: { [encodeURIComponent(fakeKey)]: 'ordinary data' }
    }, [fakeKey])
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain(fakeKey)
    expect(serialized).not.toContain(encodeURIComponent(fakeKey))
    expect(serialized).toContain('ordinary data')
  })

  it('HTTP 400と公式statusの失敗は再試行せず、原応答とnullを保存対象に残す', async () => {
    const badRequest = vi.fn().mockResolvedValue(new Response('{"error":true,"reason":"invalid model"}', { status: 400 }))
    const officialFailure = vi.fn().mockResolvedValue(new Response('temporary failure', { status: 503 }))
    const sleep = vi.fn().mockResolvedValue(undefined)
    const invalid = await fetchJsonSnapshot(testUrl, { fetchImpl: badRequest, sleep })
    const official = await fetchJsonSnapshot('https://ship.nkk-oki.com/api/status', { fetchImpl: officialFailure, retries: 0, sleep })
    expect(badRequest).toHaveBeenCalledTimes(1)
    expect(officialFailure).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
    expect(invalid).toMatchObject({ data: null, error: 'HTTP 400' })
    expect(invalid.transport.responseBody.reason).toBe('invalid model')
    expect(official).toMatchObject({ data: null, error: 'HTTP 503' })
    expect(official.transport.responseBody).toBe('temporary failure')
  })

  it('タイムアウトは初回と最大2回の再試行で打ち切る', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn((_url: URL, { signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    }))
    const pending = fetchJsonSnapshot(testUrl, { fetchImpl: fetchMock, timeoutMs: 50, sleep: async () => {} })
    await vi.advanceTimersByTimeAsync(150)
    const result = await pending
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(result).toMatchObject({ data: null, error: 'タイムアウト（50ms）' })
    expect(result.transport.attempts).toBe(3)
    expect(result.transport.attemptHistory).toHaveLength(3)
    await expect(fetchJsonSnapshot(testUrl, { retries: 3 })).rejects.toThrow('0〜2回')
  })

  it('時刻表の実際の収録期間と冬季休航を保存し、不正な日付を拒否する', () => {
    const calendar = buildCalendar(timetable)
    expect(calendar.coverageStart).toBe('2026-04-01')
    expect(calendar.coverageEnd).toBe('2027-02-28')
    expect(calendar.schedules).toEqual(timetable.schedules)
    expect(calendar.suspensions[0]).toMatchObject({ mode: 'rainbowjet', startDate: '2026-12-01', endDate: '2027-02-28' })
    expect(() => buildCalendar({ schedules: [{ start_date: '2026/02/30', end_date: '2026/03/31' }] })).toThrow('日付')
    expect(() => buildCalendar({ schedules: [{ start_date: '2026/04/01', end_date: '2026/03/31' }] })).toThrow('開始日')
  })

  it('--inputは外部通信なしで元の取得日時から再計算し、入力・結果・manifestを保存する', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'weekly-outlook-collector-'))
    temporaryDirectories.push(temporaryDirectory)
    const inputPath = join(temporaryDirectory, 'snapshot-input.json')
    const collectedAt = '2026-11-24T03:00:00.000Z'
    await writeFile(inputPath, JSON.stringify({
      collectedAt,
      points,
      marine: [{ model: 'ecmwf_wam', fetchedAt: collectedAt, modelRunAt: null, sourceUrl: `${testUrl}&apikey=fake-replay-secret`, data: null }],
      wind: [],
      official: { fetchedAt: collectedAt, sourceUrl: 'https://ship.nkk-oki.com/api/status', data: null },
      calendar: buildCalendar(timetable)
    }), 'utf8')
    const fetchMock = vi.fn().mockRejectedValue(new Error('Unexpected network request'))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = await main(['--input', inputPath, '--output', join(temporaryDirectory, 'out')], {})
    expect(fetchMock).not.toHaveBeenCalled()
    const inputText = await readFile(join(result.snapshotDirectory, 'snapshot-input.json'), 'utf8')
    const outlook = JSON.parse(await readFile(join(result.snapshotDirectory, 'outlook.json'), 'utf8'))
    const manifest = JSON.parse(await readFile(join(result.snapshotDirectory, 'manifest.json'), 'utf8'))
    expect(inputText).not.toContain('fake-replay-secret')
    expect(JSON.parse(inputText).collectedAt).toBe(collectedAt)
    expect(outlook.collectedAt).toBe(collectedAt)
    expect(outlook.days).toHaveLength(7)
    expect(manifest).toMatchObject({ mode: 'replay', collectedAt, requests: [] })
  })
})
