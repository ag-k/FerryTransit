import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'

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

type LocaleJson = Record<string, string>
let jaLocaleCache: LocaleJson | null = null

const loadJaLocale = async (): Promise<LocaleJson> => {
  if (jaLocaleCache) return jaLocaleCache
  const filePath = path.resolve(process.cwd(), 'i18n', 'locales', 'ja.json')
  const content = await fs.readFile(filePath, 'utf-8')
  jaLocaleCache = JSON.parse(content) as LocaleJson
  return jaLocaleCache
}

const tJa = async (key: string): Promise<string> => {
  const ja = await loadJaLocale()
  return ja[key] ?? key
}

export interface StubOptions {
  shipStatusApi?: string
  initialDeparture?: string
  initialArrival?: string
}

/**
 * Select port in the PortSelector modal UI (used by RouteEndpointsSelector).
 * @param label Button aria-label (e.g. "出発地", "目的地")
 * @param portCode i18n key (e.g. "HONDO_SHICHIRUI", "SAIGO")
 */
export const selectPort = async (page: Page, label: string, portCode: string) => {
  const portName = await tJa(portCode)

  await page.getByRole('button', { name: label }).click()
  const modal = page.getByTestId('port-selector-modal')
  await expect(modal).toBeVisible()

  await modal.getByRole('button', { name: portName, exact: true }).click()
  // 現行UIでは、選択後もモーダルが開いたままの場合があるため、必要なら明示的に閉じる
  try {
    await expect(modal).toBeHidden({ timeout: 1000 })
    return
  } catch {
    // fallthrough
  }

  // クリックで閉じると「クリック透過」で直後に再オープンしてしまうケースがあるため、ESCで閉じる
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
}

export const setupPublicPageStubs = async (page: Page, options: StubOptions = {}) => {
  // Surface client-side crashes in Playwright output (helps keep E2E stable)
  page.on('pageerror', (error) => {
    // eslint-disable-next-line no-console
    console.error('[pageerror]', error)
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      // eslint-disable-next-line no-console
      console.error('[console.error]', msg.text())
    }
  })

  const [timetable, fareMaster, shipStatus, shipStatusKankou, holidays] = await Promise.all([
    loadJsonFixture('api/timetable.json'),
    loadJsonFixture('api/fare-master.json'),
    loadJsonFixture('api/ship-status.json'),
    loadJsonFixture('api/ship-status-kankou.json'),
    loadPublicData('data/holidays.json')
  ])

  // 主要データを localStorage に事前投入して Firebase Storage へのアクセスをスキップ
  await page.addInitScript(
    ({ timetableData, fareData, initialDeparture, initialArrival }) => {
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
      // 画面の初期選択（PortSelectorを操作せずに安定させる）
      if (typeof initialDeparture === 'string') {
        window.localStorage.setItem('departure', initialDeparture)
      } else {
        window.localStorage.removeItem('departure')
      }
      if (typeof initialArrival === 'string') {
        window.localStorage.setItem('arrival', initialArrival)
      } else {
        window.localStorage.removeItem('arrival')
      }
      // 料金データをlocalStorageに設定（offlineStoreが使用）
      // useOfflineStorageの形式に合わせて保存
      const fareStorageItem = {
        key: 'fare',
        data: fareData,
        timestamp: Date.now()
      }
      window.localStorage.setItem('ferry-transit:fare', JSON.stringify(fareStorageItem))
      // テスト環境では、エミュレータが起動していない場合でもローカルデータを使用できるようにする
      // エミュレータを使用する場合はオンラインモードを維持
      // エミュレータ経由でFirebase Storageにアクセスできるようにする
      try {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true })
        // onlineイベントを発火してofflineStoreをオンラインモードにする
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new Event('online'))
        }
      } catch {
        // ignore if readonly
      }
      // テスト環境フラグを設定（必要に応じて使用）
      window.localStorage.setItem('ferry-transit:test-mode', 'true')
      window.localStorage.setItem('ferryTransitSettings', JSON.stringify({
        mapEnabled: false,
        mapShowRoutes: true,
        mapAutoCenter: true,
        theme: 'system',
        language: 'ja',
        notifications: true,
        autoUpdate: true
      }))
      window.localStorage.setItem('ferry_news_cache', JSON.stringify([]))
      window.localStorage.setItem('ferry_news_cache_time', Date.now().toString())
    },
    {
      timetableData: timetable,
      fareData: fareMaster,
      initialDeparture: options.initialDeparture,
      initialArrival: options.initialArrival
    }
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
  // /data/fare-master.jsonへのリクエストをモック（offlineStoreが使用する可能性がある）
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

  // Firebase Storage エミュレータへのアクセスを許可
  // エミュレータを使用する場合は、Firebase Storageへのアクセスを許可する
  // エミュレータが起動していない場合は、モックデータを返す
  await page.route('**/fare-master.json*', async (route) => {
    const url = route.request().url()
    // エミュレータのURLパターン（localhost:9199など）の場合はそのまま通す
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes(':9199')) {
      await route.continue()
    } else if (url.includes('firebasestorage.googleapis.com')) {
      // 本番のFirebase Storageへのアクセスは、エミュレータ経由で処理される可能性があるため許可
      // エミュレータが起動していない場合は、エミュレータがエラーを返すため、そのまま通す
      await route.continue()
    } else {
      // その他のURLパターン（/data/fare-master.jsonなど）の場合はモックデータを返す
      await route.fulfill({ json: fareMaster, headers: { 'access-control-allow-origin': '*' } })
    }
  })
  
  // Firebase Storage エミュレータへの直接アクセスを許可
  await page.route('http://localhost:9199/**', async (route) => {
    await route.continue()
  })

  await page.route('https://maps.googleapis.com/**', (route) => {
    route.fulfill({ status: 204, body: '' })
  })
}
