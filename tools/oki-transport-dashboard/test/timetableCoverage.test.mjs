import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  buildTimetableCoverage,
  isTripActiveOnDate,
  loadPublishedTimetableCoverage
} from '../src/timetableCoverage.mjs'

test('同じ交通機関の複数区間をまとめて年間カバレッジを作成できる', () => {
  const trips = [
    timetableTrip({ trip_id: '1', name: 'FERRY_OKI', start_date: '2026/01/01', end_date: '2026/01/03' }),
    timetableTrip({ trip_id: '2', name: 'FERRY_OKI', departure: 'HONDO_SHICHIRUI', arrival: 'SAIGO', start_date: '2026-01-04', end_date: '2026-01-05' }),
    timetableTrip({
      trip_id: '3',
      name: 'JAL_OKI_IZUMO',
      operator_id: 'JAL',
      departure: 'AIRPORT_OKI',
      arrival: 'AIRPORT_IZUMO',
      start_date: '2026-01-01',
      end_date: '2026-01-07',
      active_days: [1]
    })
  ]

  const result = buildTimetableCoverage(trips, {
    year: 2026,
    now: new Date('2026-01-02T00:00:00.000Z')
  })

  assert.equal(result.dates.length, 365)
  assert.equal(result.summary.operatorCount, 2)
  assert.equal(result.summary.serviceCount, 2)
  assert.equal(result.dates[1].today, true)
  const ferry = result.rows.find((row) => row.serviceId === 'FERRY_OKI')
  assert.equal(ferry.availableDays, 5)
  assert.equal(ferry.coverage.slice(0, 7), '1111100')
  assert.equal(ferry.serviceName, 'フェリーおき')
  assert.equal(ferry.routes.length, 2)
  const jal = result.rows.find((row) => row.serviceId === 'JAL_OKI_IZUMO')
  assert.equal(jal.availableDays, 1)
  assert.equal(jal.coverage.slice(0, 7), '0000100')
})

test('曜日・追加日・除外日をアプリと同じ優先順で判定する', () => {
  const trip = timetableTrip({
    start_date: '20260101',
    end_date: '20260107',
    active_days: [1],
    added_dates: ['2026/01/02', '2026-01-05'],
    removed_dates: ['2026-01-05']
  })

  assert.equal(isTripActiveOnDate(trip, '2026-01-01'), false)
  assert.equal(isTripActiveOnDate(trip, '2026-01-02'), true)
  assert.equal(isTripActiveOnDate(trip, '2026-01-05'), false)
  assert.equal(isTripActiveOnDate(trip, '2026-01-08'), false)
})

test('うるう年は1月1日から12月31日まで366日を返す', () => {
  const result = buildTimetableCoverage([
    timetableTrip({ start_date: '2024-01-01', end_date: '2024-12-31' })
  ], { year: 2024, now: new Date('2024-02-29T03:00:00.000Z') })

  assert.equal(result.dates.length, 366)
  assert.equal(result.dates[59].ymd, '2024-02-29')
  assert.equal(result.rows[0].coverageRate, 100)
})

test('内航船は利用者に分かる交通機関名で表示する', () => {
  const result = buildTimetableCoverage([
    timetableTrip({ name: 'ISOKAZE' }),
    timetableTrip({ name: 'FERRY_DOZEN' })
  ], { year: 2026 })

  assert.deepEqual(result.rows.map((row) => row.serviceName), [
    '内航船いそかぜ',
    '内航船フェリーどうぜん'
  ])
})

test('アプリ配信中のバスを交通機関単位で年間カバレッジへ統合する', () => {
  const busFeeds = [
    busFeed('ama', 'AMA_TOWN', {
      route_ama: { agencyId: 'AMA_TOWN', longName: '海士島線' }
    }),
    busFeed('okinoshima', 'OKINOSHIMA', {
      route_ichibata: { agencyId: 'OKI_ICHIBATA', longName: '隠岐一畑交通 都万線' },
      route_town: { agencyId: 'OKINOSHIMA_TOWN', longName: '隠岐の島町営バス 津戸線' }
    })
  ]
  busFeeds[1].trips[0].routeId = 'route_ichibata'
  busFeeds[1].trips.push({ ...busFeeds[1].trips[0], tripId: 'trip-town', routeId: 'route_town' })

  const result = buildTimetableCoverage([], { year: 2026, busFeeds })

  assert.deepEqual(result.rows.map((row) => row.serviceName), [
    '隠岐一畑交通 路線バス',
    '隠岐の島町営バス',
    '海士町島内巡回バス'
  ])
  assert.equal(result.summary.serviceCount, 3)
  assert.equal(result.rows[0].coverage.slice(0, 4), '0111')
})

test('本番Storageのmanifestと一致する時刻表をカバレッジに使用する', async () => {
  const trips = [timetableTrip({ start_date: '2026-01-01', end_date: '2026-12-31' })]
  const timetableBuffer = Buffer.from(JSON.stringify(trips))
  const hash = createHash('sha256').update(timetableBuffer).digest('hex')
  const manifest = {
    version: 1,
    gitSha: 'manifest-sha',
    objects: [{ path: 'data/timetable.json', sha256: hash, bytes: timetableBuffer.byteLength }]
  }
  const fetchImpl = async (url) => {
    if (String(url).includes('manifests')) return new Response(JSON.stringify(manifest))
    return new Response(timetableBuffer, {
      headers: {
        'x-goog-meta-gitsha': 'published-sha',
        'x-goog-meta-publishedat': '2026-07-31T11:52:54.056Z'
      }
    })
  }

  const result = await loadPublishedTimetableCoverage({
    year: 2026,
    now: new Date('2026-08-03T00:00:00.000Z'),
    fetchImpl
  })

  assert.equal(result.source.kind, 'firebase-production')
  assert.equal(result.source.gitSha, 'published-sha')
  assert.equal(result.source.sha256, hash)
  assert.equal(result.source.tripCount, 1)
})

test('本番Storageを取得できない場合はローカル生成物へフォールバックする', async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'ferry-coverage-'))
  const localPath = join(temporaryDirectory, 'timetable.json')
  await writeFile(localPath, JSON.stringify([
    timetableTrip({ start_date: '2026-01-01', end_date: '2026-01-01' })
  ]))
  try {
    const result = await loadPublishedTimetableCoverage({
      year: 2026,
      localPath,
      fetchImpl: async () => { throw new Error('network unavailable') }
    })
    assert.equal(result.source.kind, 'local-fallback')
    assert.equal(result.source.fallback, true)
    assert.match(result.source.warning, /network unavailable/)
    assert.equal(result.rows[0].availableDays, 1)
  } finally {
    await rm(temporaryDirectory, { recursive: true })
  }
})

function timetableTrip(overrides = {}) {
  return {
    trip_id: 'trip-1',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    name: 'FERRY_OKI',
    departure: 'SAIGO',
    departure_time: '08:00',
    arrival: 'HONDO_SHICHIRUI',
    arrival_time: '10:00',
    ...overrides
  }
}

function busFeed(feedId, operatorId, routes) {
  return {
    version: 1,
    feedId,
    operatorId,
    routes,
    services: {
      daily: {
        startDate: '2026-01-02',
        endDate: '2026-01-04',
        activeDays: [0, 1, 2, 3, 4, 5, 6],
        addedDates: [],
        removedDates: []
      }
    },
    trips: [{ tripId: 'trip-1', routeId: Object.keys(routes)[0], serviceId: 'daily' }]
  }
}
