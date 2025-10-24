import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesRoot = path.resolve(currentDir, '..', 'fixtures')

const loadJsonFixture = async <T = unknown>(relativePath: string): Promise<T> => {
  const filePath = path.join(fixturesRoot, relativePath)
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content) as T
}

const loadPublicData = async <T = unknown>(relativePath: string): Promise<T> => {
  const filePath = path.resolve(process.cwd(), 'src/public', relativePath)
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content) as T
}

export interface StubOptions {
  shipStatusApi?: string
}

export const setupPublicPageStubs = async (page: Page, options: StubOptions = {}) => {
  const [timetable, fareMaster, shipStatus, shipStatusKankou, holidays] = await Promise.all([
    loadJsonFixture('api/timetable.json'),
    loadJsonFixture('api/fare-master.json'),
    loadJsonFixture('api/ship-status.json'),
    loadJsonFixture('api/ship-status-kankou.json'),
    loadPublicData('data/holidays.json')
  ])

  // 主要データを localStorage に事前投入して Firebase Storage へのアクセスをスキップ
  await page.addInitScript(
    ({ timetableData, fareData }) => {
      try {
        Object.defineProperty(navigator, 'language', { value: 'ja-JP', configurable: true })
        Object.defineProperty(navigator, 'languages', { value: ['ja-JP'], configurable: true })
      } catch {
        // ignore if readonly
      }
      document.cookie = 'ferry-transit-locale=ja; path=/'
      window.localStorage.setItem('ferry-transit-locale', 'ja')
      window.localStorage.setItem('i18n_redirected', 'ja')
      window.localStorage.setItem('rawTimetable', JSON.stringify(timetableData))
      window.localStorage.setItem('rawTimetable_time', Date.now().toString())
      window.localStorage.setItem('ferryTransitSettings', JSON.stringify({
        mapEnabled: false,
        mapShowRoutes: true,
        mapAutoCenter: true,
        theme: 'system',
        language: 'ja',
        notifications: true,
        autoUpdate: true,
        system: {
          notificationSound: true,
          notificationVibration: true,
          notificationEmail: false,
          enableAnimations: true,
          imageQuality: 'high',
          reducedMotion: false,
          offlineMode: false,
          dataSaver: false,
          autoDownloadUpdates: true,
          wifiOnlyDownloads: false,
          analyticsEnabled: true,
          crashReportingEnabled: true,
          locationPermission: false,
          fontSize: 'medium',
          highContrast: false,
          screenReaderOptimization: false,
          cacheSize: 100,
          autoClearCache: false,
          cacheClearInterval: 'monthly'
        }
      }))
      window.localStorage.setItem('ferry_news_cache', JSON.stringify([]))
      window.localStorage.setItem('ferry_news_cache_time', Date.now().toString())
    },
    { timetableData: timetable, fareData: fareMaster }
  )

  // Google Maps 依存をモック
  await page.addInitScript(() => {
    if (!(window as any).google) {
      const createListener = () => ({ remove: () => undefined })
      class MockMap {
        addListener() { return createListener() }
        fitBounds() { /* noop */ }
        setCenter() { /* noop */ }
        setZoom() { /* noop */ }
        getZoom() { return 10 }
        panTo() { /* noop */ }
        setOptions() { /* noop */ }
      }
      class MockMarker {
        setAnimation() { /* noop */ }
        addListener() { return createListener() }
        setMap() { /* noop */ }
        setIcon() { /* noop */ }
        setZIndex() { /* noop */ }
        setOpacity() { /* noop */ }
        setTitle() { /* noop */ }
      }
      class MockPolyline {
        setMap() { /* noop */ }
        getMap() { return null }
        getPath() {
          return {
            getArray: () => [],
            forEach: () => undefined
          }
        }
        addListener() { return createListener() }
        setOptions() { /* noop */ }
      }
      class MockInfoWindow {
        setContent() { /* noop */ }
        open() { /* noop */ }
        close() { /* noop */ }
        setPosition() { /* noop */ }
      }
      class MockLatLngBounds {
        extend() { return this }
        union() { return this }
        toJSON() { return { south: 0, west: 0, north: 0, east: 0 } }
        isEmpty() { return false }
        getCenter() { return { lat: () => 0, lng: () => 0 } }
      }
      (window as any).google = {
        maps: {
          version: 'test',
          Map: MockMap,
          LatLngBounds: MockLatLngBounds,
          Marker: MockMarker,
          Polyline: MockPolyline,
          InfoWindow: MockInfoWindow,
          DirectionsService: function () { return { route: (_req: unknown, cb: Function) => cb({ routes: [] }, 'OK') } },
          DirectionsRenderer: function () { return { setMap: () => undefined, setDirections: () => undefined, setOptions: () => undefined } },
          Animation: { BOUNCE: 'BOUNCE' },
          TravelMode: { TRANSIT: 'TRANSIT', DRIVING: 'DRIVING' },
          TransitMode: { FERRY: 'FERRY' },
          TransitRoutePreference: { FEWER_TRANSFERS: 'FEWER_TRANSFERS' },
          SymbolPath: {
            FORWARD_OPEN_ARROW: 'FORWARD_OPEN_ARROW',
            CIRCLE: 'CIRCLE'
          },
          event: { clearInstanceListeners: () => undefined },
          importLibrary: async () => ({})
        }
      }
    }
  })

  // ローカルデータを返すルート定義
  await page.route('**/data/fare-master.json', async (route) => {
    await route.fulfill({ json: fareMaster, headers: { 'access-control-allow-origin': '*' } })
  })

  await page.route('**/data/holidays.json', async (route) => {
    await route.fulfill({ json: holidays, headers: { 'access-control-allow-origin': '*' } })
  })

  const shipStatusApi = options.shipStatusApi ?? 'https://ship.nkk-oki.com/api'

  await page.route(`${shipStatusApi.replace(/\/$/, '')}/status`, async (route) => {
    await route.fulfill({ json: shipStatus, headers: { 'access-control-allow-origin': '*' } })
  })

  await page.route(`${shipStatusApi.replace(/\/$/, '')}/status-kankou`, async (route) => {
    await route.fulfill({ json: shipStatusKankou, headers: { 'access-control-allow-origin': '*' } })
  })

  // Firebase Storage へのアクセスをブロックし、テストの決定性を保つ
  await page.route('https://firebasestorage.googleapis.com/**', (route) => {
    route.fulfill({ status: 404, body: '' })
  })

  await page.route('https://maps.googleapis.com/**', (route) => {
    route.fulfill({ status: 204, body: '' })
  })
}
