import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildGtfsDraftFromSnapshot, buildGtfsFiles, buildGtfsViewFromFiles, normalizeDraft } from '../src/gtfs.mjs'

test('収集資料からGTFS下書きのagency/routesを作成できる', () => {
  const snapshot = {
    summary: { collectedAt: '2026-06-06T00:00:00.000Z' },
    collectedAt: '2026-06-06T00:00:00.000Z',
    sources: [
      {
        id: 'oki-ichibata',
        name: '隠岐一畑交通',
        group: '島後バス',
        operator: '隠岐一畑交通株式会社',
        officialUrl: 'https://oki.ichibata.co.jp/'
      },
      {
        id: 'oki-kisen',
        name: '隠岐汽船',
        group: '船舶',
        operator: '隠岐汽船株式会社',
        officialUrl: 'https://www.oki-kisen.co.jp/'
      }
    ],
    documents: [
      {
        sourceId: 'oki-ichibata',
        sourceName: '隠岐一畑交通',
        type: 'timetable',
        reviewStatus: 'required',
        title: '路線バス時刻表',
        pageLabel: '路線バス',
        url: 'https://example.test/bus.html',
        pageUrl: 'https://example.test/',
        shortHash: 'bus123'
      },
      {
        sourceId: 'oki-ichibata',
        sourceName: '隠岐一畑交通',
        type: 'timetable',
        reviewStatus: 'unnecessary',
        title: '古い時刻表',
        pageLabel: '古い資料',
        url: 'https://example.test/old.pdf',
        pageUrl: 'https://example.test/',
        shortHash: 'old123'
      },
      {
        sourceId: 'oki-ichibata',
        sourceName: '隠岐一畑交通',
        type: 'fare',
        reviewStatus: 'required',
        title: '運賃表',
        pageLabel: '運賃',
        url: 'https://example.test/fare.pdf',
        pageUrl: 'https://example.test/',
        shortHash: 'fare123'
      },
      {
        sourceId: 'oki-kisen',
        sourceName: '隠岐汽船',
        type: 'timetable',
        reviewStatus: 'unreviewed',
        title: 'フェリー時刻表',
        pageLabel: 'フェリー',
        url: 'https://example.test/ferry.pdf',
        pageUrl: 'https://example.test/',
        shortHash: 'ferry123'
      }
    ]
  }

  const draft = buildGtfsDraftFromSnapshot(snapshot, { scope: 'active', feedStartDate: '2026-01-01', feedEndDate: '2026-12-31' })

  assert.equal(draft.summary.agencyCount, 2)
  assert.equal(draft.summary.routeCount, 2)
  assert.deepEqual(draft.routes.map((route) => route.route_type).sort(), ['3', '4'])
  assert.deepEqual(draft.routes.map((route) => route.status).sort(), ['draft', 'needs-review'])
  assert.equal(draft.feedInfo.feed_start_date, '20260101')
  assert.equal(draft.feedInfo.feed_end_date, '20261231')
  assert.equal(draft.validation.ok, true)
  assert.ok(draft.validation.warnings.some((warning) => warning.code === 'no_trips'))
})

test('GTFS下書きからtxtファイル一式を生成できる', () => {
  const draft = normalizeDraft({
    feedInfo: {
      feed_publisher_name: 'FerryTransit',
      feed_publisher_url: 'https://example.test/',
      feed_lang: 'ja',
      feed_start_date: '20260101',
      feed_end_date: '20261231',
      feed_version: 'test'
    },
    agencies: [
      {
        agency_id: 'agency_a',
        agency_name: '事業者A',
        agency_url: 'https://example.test/',
        agency_timezone: 'Asia/Tokyo',
        agency_lang: 'ja'
      }
    ],
    routes: [
      {
        route_id: 'route_a',
        agency_id: 'agency_a',
        route_short_name: 'A',
        route_long_name: 'A線',
        route_type: '3',
        route_url: 'https://example.test/a',
        route_desc: '説明',
        status: 'ready'
      },
      {
        route_id: 'route_b',
        agency_id: 'agency_a',
        route_short_name: 'B',
        route_long_name: 'B線',
        route_type: '3',
        route_url: 'https://example.test/b',
        route_desc: '除外',
        status: 'excluded'
      }
    ],
    calendar: [
      {
        service_id: 'daily',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '1',
        sunday: '1',
        start_date: '20260101',
        end_date: '20261231'
      }
    ]
  })

  const files = buildGtfsFiles(draft)

  assert.deepEqual(Object.keys(files).sort(), [
    'agency.txt',
    'calendar.txt',
    'calendar_dates.txt',
    'feed_info.txt',
    'routes.txt',
    'stop_times.txt',
    'stops.txt',
    'trips.txt'
  ])
  assert.match(files['agency.txt'], /^agency_id,agency_name,agency_url,agency_timezone,agency_lang\n/)
  assert.match(files['routes.txt'], /route_a,agency_a,A,A線,3/)
  assert.doesNotMatch(files['routes.txt'], /route_b/)
})

test('GTFS txt からビューア用のroute/stop/trip集計を作成できる', () => {
  const view = buildGtfsViewFromFiles({
    title: 'テストGTFS',
    files: {
      'agency.txt': 'agency_id,agency_name,agency_url,agency_timezone,agency_lang\na,事業者A,https://example.test,Asia/Tokyo,ja\n',
      'routes.txt': 'route_id,agency_id,route_short_name,route_long_name,route_type,route_url,route_desc\nr1,a,A,A線,3,https://example.test/a,\n',
      'stops.txt': 'stop_id,stop_name,stop_lat,stop_lon,location_type\ns1,港,36.1,133.1,\ns2,役場,36.2,133.2,\n',
      'trips.txt': 'route_id,service_id,trip_id,trip_headsign,direction_id\nr1,daily,t1,役場行き,0\n',
      'stop_times.txt': 'trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type\nt1,08:00:00,08:00:00,s1,1,,\nt1,08:10:00,08:10:00,s2,2,,\n',
      'calendar.txt': 'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\ndaily,1,1,1,1,1,1,1,20260101,20261231\n',
      'feed_info.txt': 'feed_publisher_name,feed_publisher_url,feed_lang,feed_start_date,feed_end_date,feed_version\nFerryTransit,https://example.test,ja,20260101,20261231,test\n'
    }
  })

  assert.equal(view.summary.routeCount, 1)
  assert.equal(view.summary.stopCount, 2)
  assert.equal(view.summary.tripCount, 1)
  assert.equal(view.routeStats[0].tripCount, 1)
  assert.equal(view.routeStats[0].stopCount, 2)
  assert.equal(view.routeStats[0].firstTime, '08:00:00')
  assert.equal(view.routeStats[0].lastTime, '08:10:00')
  assert.deepEqual(view.routeStats[0].sampleStops, ['港', '役場'])
  assert.equal(view.stopStats[0].routeCount, 1)
  assert.equal(view.tripStats[0].firstStopName, '港')
  assert.equal(view.tripStats[0].lastStopName, '役場')
})
