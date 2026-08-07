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

const loadGtfsPublicData = async <T = unknown>(relativePath: string): Promise<T> => {
  const filePath = path.resolve(process.cwd(), 'gtfs', 'public-data', 'data', relativePath)
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
  language?: 'ja' | 'en'
  theme?: 'light' | 'dark' | 'system'
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
  await page.route('https://apis.google.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: ''
    })
  })

  const isWebKitInterruptedModuleImport = (message: string) => {
    const normalizedMessage = message
      .replace(/^Unhandled Promise Rejection: /, '')
      .replace(/^TypeError: /, '')

    return normalizedMessage === 'Importing a module script failed.' &&
      page.context().browser()?.browserType().name() === 'webkit'
  }

  // Surface client-side crashes in Playwright output (helps keep E2E stable)
  page.on('pageerror', (error) => {
    // WebKit はコンテキスト終了時に Nuxt の遅延 import を中断すると、この汎用エラーを
    // pageerror にも出す。実際の読込失敗は requestfailed で別途検出する。
    if (isWebKitInterruptedModuleImport(error.message)) {
      return
    }
    // eslint-disable-next-line no-console
    console.error('[pageerror]', error)
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      // WebKit はコンテキスト終了時に Nuxt の遅延 import を中断すると、この汎用エラーだけを
      // console へ出す。実際の読込失敗は pageerror / requestfailed で別途検出する。
      if (isWebKitInterruptedModuleImport(msg.text())) {
        return
      }
      // eslint-disable-next-line no-console
      console.error('[console.error]', msg.text(), { page: page.url(), location: msg.location() })
    }
  })
  page.on('requestfailed', (request) => {
    if (request.resourceType() === 'script') {
      const pageUrl = page.url()
      const failureText = request.failure()?.errorText
      const isCancelledLocalImport = [
        'cancelled',
        'net::ERR_ABORTED',
        'NS_BINDING_ABORTED'
      ].includes(failureText ?? '') &&
        pageUrl.startsWith('http') &&
        new URL(request.url()).origin === new URL(pageUrl).origin
      if (isCancelledLocalImport) {
        return
      }
      if (failureText === 'cancelled') return
      // eslint-disable-next-line no-console
      console.error('[script.requestfailed]', {
        page: page.url(),
        url: request.url(),
        failure: request.failure()
      })
    }
  })

  const [timetable, fareMaster, shipStatus, shipStatusKankou, holidays, ...busSearchFiles] = await Promise.all([
    loadJsonFixture('api/timetable.json'),
    loadJsonFixture('api/fare-master.json'),
    loadJsonFixture('api/ship-status.json'),
    loadJsonFixture('api/ship-status-kankou.json'),
    loadPublicData('data/holidays.json'),
    ...['ama', 'chibu', 'hatsumi_bus_connection', 'ichibata_bus_connection', 'nishinoshima', 'okinoshima', 'stops']
      .map((name) => loadGtfsPublicData(`bus-search/${name}.json`))
  ])
  const busSearchData = Object.fromEntries(
    ['ama', 'chibu', 'hatsumi_bus_connection', 'ichibata_bus_connection', 'nishinoshima', 'okinoshima', 'stops']
      .map((name, index) => [`${name}.json`, busSearchFiles[index]])
  )

  // 主要データを localStorage に事前投入して Firebase Storage へのアクセスをスキップ
  await page.addInitScript(
    ({
      timetableData,
      fareData,
      shipStatusData,
      shipStatusKankouData,
      holidaysData,
      busData,
      initialDeparture,
      initialArrival,
      language,
      theme
    }) => {
      const originalFetch = window.fetch.bind(window)
      try {
        Object.defineProperty(navigator, 'serviceWorker', {
          configurable: true,
          value: {
            register: () => Promise.resolve({ scope: '/', unregister: () => Promise.resolve(true) }),
            getRegistrations: () => Promise.resolve([])
          }
        })
      } catch {
        // Playwright can expose a non-configurable ServiceWorker container.
      }
      const jsonResponse = (data: unknown) => new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'access-control-allow-origin': '*',
          'content-type': 'application/json'
        }
      })

      window.fetch = (input, init) => {
        const url = typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url
        const decodedUrl = decodeURIComponent(url)
        const busSearchName = decodedUrl.match(/data\/bus-search\/([^?&/]+\.json)/)?.[1]

        if (decodedUrl.includes('api.iconify.design/')) {
          return Promise.resolve(jsonResponse({
            prefix: 'mdi',
            lastModified: 0,
            width: 24,
            height: 24,
            icons: {
              airplane: { body: '<path d="M3 12h18v1H3z"/>' },
              bus: { body: '<path d="M4 4h16v16H4z"/>' },
              ferry: { body: '<path d="M3 12h18l-3 6H6z"/>' }
            }
          }))
        }
        if (busSearchName) return Promise.resolve(jsonResponse(busData[busSearchName] ?? {}))
        if (decodedUrl.includes('data/news.json')) return Promise.resolve(jsonResponse([]))
        if (decodedUrl.includes('fare-master.json')) return Promise.resolve(jsonResponse(fareData))
        if (decodedUrl.includes('holidays.json')) return Promise.resolve(jsonResponse(holidaysData))
        if (decodedUrl.includes('timetable.json') || decodedUrl.endsWith('/api/timetable')) {
          return Promise.resolve(jsonResponse(timetableData))
        }
        if (decodedUrl.endsWith('/status-kankou')) return Promise.resolve(jsonResponse(shipStatusKankouData))
        if (decodedUrl.endsWith('/status')) return Promise.resolve(jsonResponse(shipStatusData))
        if (decodedUrl.includes('/trackAnalytics')) return Promise.resolve(jsonResponse({ data: { success: true } }))
        if (decodedUrl.includes('firebase.googleapis.com/v1alpha/projects/-/apps/')) {
          return Promise.resolve(jsonResponse({
            projectId: 'test',
            appId: 'test',
            storageBucket: 'test',
            apiKey: 'test',
            authDomain: 'test',
            messagingSenderId: 'test',
            measurementId: ''
          }))
        }
        if (decodedUrl.endsWith('/sw.js') && (init?.method === 'HEAD' || input instanceof Request && input.method === 'HEAD')) {
          return Promise.resolve(new Response(null, {
            status: 200,
            headers: { 'content-type': 'application/javascript' }
          }))
        }

        return originalFetch(input, init)
      }

      try {
        const browserLanguage = language === 'en' ? 'en-US' : 'ja-JP'
        Object.defineProperty(navigator, 'language', { value: browserLanguage, configurable: true })
        Object.defineProperty(navigator, 'languages', { value: [browserLanguage], configurable: true })
      } catch {
        // ignore if readonly
      }
      document.cookie = `ferry-transit-locale=${language}; path=/`
      window.localStorage.setItem('ferry-transit-locale', language)
      window.localStorage.setItem('i18n_redirected', language)
      window.localStorage.setItem('theme', theme)
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
        theme,
        language,
        notifications: true,
        autoUpdate: true
      }))
      window.localStorage.setItem('ferry_news_cache', JSON.stringify([]))
      window.localStorage.setItem('ferry_news_cache_time', Date.now().toString())
    },
    {
      timetableData: timetable,
      fareData: fareMaster,
      shipStatusData: shipStatus,
      shipStatusKankouData: shipStatusKankou,
      holidaysData: holidays,
      busData: busSearchData,
      initialDeparture: options.initialDeparture,
      initialArrival: options.initialArrival,
      language: options.language ?? 'ja',
      theme: options.theme ?? 'system'
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
      class MockLatLng {
        constructor(public latValue: number, public lngValue: number) {}
        lat() { return this.latValue }
        lng() { return this.lngValue }
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
          LatLng: MockLatLng,
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

  await page.route('**/data/bus-search/*.json', async (route) => {
    const name = route.request().url().split('/').pop()?.split('?')[0] ?? ''
    await route.fulfill({
      json: busSearchData[name] ?? {},
      headers: { 'access-control-allow-origin': '*' }
    })
  })

  const shipStatusApi = options.shipStatusApi ?? 'https://ship.nkk-oki.com/api'

  await page.route(`${shipStatusApi.replace(/\/$/, '')}/status`, async (route) => {
    await route.fulfill({ json: shipStatus, headers: { 'access-control-allow-origin': '*' } })
  })

  await page.route(`${shipStatusApi.replace(/\/$/, '')}/status-kankou`, async (route) => {
    await route.fulfill({ json: shipStatusKankou, headers: { 'access-control-allow-origin': '*' } })
  })

  await page.route('https://firebasestorage.googleapis.com/**', async (route) => {
    const decodedUrl = decodeURIComponent(route.request().url())
    const busSearchName = decodedUrl.match(/data\/bus-search\/([^?&/]+\.json)/)?.[1]
    const json = decodedUrl.includes('fare-master.json')
      ? fareMaster
      : decodedUrl.includes('news.json')
        ? []
        : decodedUrl.includes('timetable.json')
          ? timetable
          : busSearchName
            ? busSearchData[busSearchName] ?? {}
            : {}
    await route.fulfill({ json, headers: { 'access-control-allow-origin': '*' } })
  })

  await page.route('http://localhost:9199/**', async (route) => {
    await route.continue()
  })

  await page.route('https://maps.googleapis.com/**', (route) => {
    route.fulfill({ status: 204, body: '' })
  })
}
