import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PORTS_DATA, ROUTES_DATA } from '~/data/ports'

const API_BASE_URL = 'http://localhost:3003'

describe('全港組み合わせ統合テスト', () => {
  const portCodes = Object.keys(PORTS_DATA)
  const validRoutes = ROUTES_DATA.map(route => `${route.from}-${route.to}`)
  let serverReady = false

  beforeAll(async () => {
    // 開発サーバーの稼働を確認
    try {
      const response = await fetch(`${API_BASE_URL}/api/timetable`)
      serverReady = response.ok
    } catch (error) {
      console.warn('開発サーバーが起動していません。統合テストをスキップします。')
    }
  })

  // サーバーが起動していない場合はテストをスキップ
  const itIfServerReady = serverReady ? it : it.skip

  describe('乗換案内API - 実際のエンドポイントテスト', () => {
    itIfServerReady('有効な港の組み合わせで検索が成功すること', async () => {
      const testDate = '2025-11-02'
      
      // 代表的な路線をテスト（全てテストすると時間がかかるため）
      const testRoutes = [
        'HONDO_SHICHIRUI-SAIGO',
        'HONDO_SAKAIMINATO-BEPPU',
        'SAIGO-HISHIURA',
        'HISHIURA-KURI',
        'BEPPU-HONDO_SHICHIRUI',
        'KURI-SAIGO'
      ]

      for (const routeKey of testRoutes) {
        const [from, to] = routeKey.split('-')
        
        const response = await fetch(`${API_BASE_URL}/api/transit/search?departure=${from}&arrival=${to}&date=${testDate}`)
        const result = await response.json()
        
        expect(response.ok).toBe(true)
        expect(result.success).toBe(true)
        expect(result.data.searchParams.departure).toBe(from)
        expect(result.data.searchParams.arrival).toBe(to)
        expect(Array.isArray(result.data.results)).toBe(true)
        expect(typeof result.data.count).toBe('number')
      }
    })

    itIfServerReady('無効な港の組み合わせで空配列が返ること', async () => {
      const testDate = '2025-11-02'
      
      // 無効な組み合わせをテスト
      const invalidRoutes = [
        'HONDO_SHICHIRUI-HONDO_SAKAIMINATO', // 本土間
        'INVALID_PORT-SAIGO', // 存在しない港
        'SAIGO-INVALID_PORT' // 存在しない港
      ]

      for (const routeKey of invalidRoutes) {
        const [from, to] = routeKey.split('-')
        
        const response = await fetch(`${API_BASE_URL}/api/transit/search?departure=${from}&arrival=${to}&date=${testDate}`)
        const result = await response.json()
        
        if (response.ok) {
          expect(result.success).toBe(true)
          expect(result.data.results).toHaveLength(0)
          expect(result.data.count).toBe(0)
        } else {
          // エラーレスポンスも許容
          expect(result.error).toBeDefined()
        }
      }
    })

    itIfServerReady('POSTリクエストで全港組み合わせをテスト', async () => {
      const requestBody = {
        date: '2025-11-02',
        time: '08:00',
        isArrivalMode: false
      }

      // 代表的な路線をPOSTでテスト
      const testRoutes = [
        { departure: 'HONDO_SHICHIRUI', arrival: 'SAIGO' },
        { departure: 'HONDO_SAKAIMINATO', arrival: 'BEPPU' },
        { departure: 'SAIGO', arrival: 'HISHIURA' }
      ]

      for (const route of testRoutes) {
        const response = await fetch(`${API_BASE_URL}/api/transit/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...requestBody, ...route })
        })
        
        const result = await response.json()
        
        expect(response.ok).toBe(true)
        expect(result.success).toBe(true)
        expect(result.data.searchParams.departure).toBe(route.departure)
        expect(result.data.searchParams.arrival).toBe(route.arrival)
        expect(Array.isArray(result.data.results)).toBe(true)
      }
    })
  })

  describe('時刻表API - 実際のエンドポイントテスト', () => {
    itIfServerReady('有効な港の組み合わせで時刻表検索が成功すること', async () => {
      // 代表的な路線をテスト
      const testRoutes = [
        'HONDO_SHICHIRUI-SAIGO',
        'HONDO_SAKAIMINATO-BEPPU',
        'SAIGO-HISHIURA',
        'HISHIURA-KURI',
        'BEPPU-HONDO_SHICHIRUI',
        'KURI-SAIGO'
      ]

      for (const routeKey of testRoutes) {
        const [from, to] = routeKey.split('-')
        
        const response = await fetch(`${API_BASE_URL}/api/timetable/search?departure=${from}&arrival=${to}&limit=10`)
        const result = await response.json()
        
        expect(response.ok).toBe(true)
        expect(result.success).toBe(true)
        expect(result.data.searchParams.departure).toBe(from)
        expect(result.data.searchParams.arrival).toBe(to)
        expect(Array.isArray(result.data.results)).toBe(true)
        expect(typeof result.data.pagination).toBe('object')
        
        // 全ての結果が正しい港の組み合わせであることを確認
        result.data.results.forEach((trip: any) => {
          expect(trip.departure).toBe(from)
          expect(trip.arrival).toBe(to)
          expect(typeof trip.tripId).toBe('string')
          expect(typeof trip.name).toBe('string')
          expect(typeof trip.departureTime).toBe('string')
          expect(typeof trip.arrivalTime).toBe('string')
          expect(typeof trip.duration).toBe('number')
          expect(['ferry', 'highspeed', 'local']).toContain(trip.type)
        })
      }
    })

    itIfServerReady('全港の出発地のみで検索ができること', async () => {
      for (const departure of portCodes) {
        const response = await fetch(`${API_BASE_URL}/api/timetable/search?departure=${departure}&limit=5`)
        const result = await response.json()
        
        expect(response.ok).toBe(true)
        expect(result.success).toBe(true)
        expect(Array.isArray(result.data.results)).toBe(true)
        
        // 全ての結果が指定した出発地であることを確認
        result.data.results.forEach((trip: any) => {
          expect(trip.departure).toBe(departure)
        })
      }
    })

    itIfServerReady('全港の到着地のみで検索ができること', async () => {
      for (const arrival of portCodes) {
        const response = await fetch(`${API_BASE_URL}/api/timetable/search?arrival=${arrival}&limit=5`)
        const result = await response.json()
        
        expect(response.ok).toBe(true)
        expect(result.success).toBe(true)
        expect(Array.isArray(result.data.results)).toBe(true)
        
        // 全ての結果が指定した到着地であることを確認
        result.data.results.forEach((trip: any) => {
          expect(trip.arrival).toBe(arrival)
        })
      }
    })

    itIfServerReady('船種別フィルタリングが機能すること', async () => {
      const shipTypes = ['ferry', 'highspeed', 'local']
      
      for (const shipType of shipTypes) {
        const response = await fetch(`${API_BASE_URL}/api/timetable/search?shipType=${shipType}&limit=10`)
        const result = await response.json()
        
        expect(response.ok).toBe(true)
        expect(result.success).toBe(true)
        expect(Array.isArray(result.data.results)).toBe(true)
        
        // 全ての結果が指定した船種であることを確認
        result.data.results.forEach((trip: any) => {
          expect(trip.type).toBe(shipType)
        })
      }
    })

    itIfServerReady('ページネーションが機能すること', async () => {
      const departure = 'SAIGO'
      const limit = 2
      const offset = 0
      
      const response = await fetch(`${API_BASE_URL}/api/timetable/search?departure=${departure}&limit=${limit}&offset=${offset}`)
      const result = await response.json()
      
      expect(response.ok).toBe(true)
      expect(result.success).toBe(true)
      expect(result.data.results.length).toBeLessThanOrEqual(limit)
      expect(result.data.pagination.limit).toBe(limit)
      expect(result.data.pagination.offset).toBe(offset)
      expect(typeof result.data.pagination.totalCount).toBe('number')
      expect(typeof result.data.pagination.hasMore).toBe('boolean')
    })
  })

  describe('APIドキュメントエンドポイント', () => {
    itIfServerReady('乗換案内APIドキュメントが取得できること', async () => {
      const response = await fetch(`${API_BASE_URL}/api/transit`)
      expect(response.ok).toBe(true)
      
      const result = await response.json()
      expect(typeof result).toBe('object')
      expect(typeof result.title).toBe('string')
      expect(typeof result.description).toBe('string')
      expect(typeof result.version).toBe('string')
      expect(Array.isArray(result.endpoints)).toBe(true)
    })

    itIfServerReady('時刻表APIドキュメントが取得できること', async () => {
      const response = await fetch(`${API_BASE_URL}/api/timetable`)
      expect(response.ok).toBe(true)
      
      const result = await response.json()
      expect(typeof result).toBe('object')
      expect(typeof result.title).toBe('string')
      expect(typeof result.description).toBe('string')
      expect(typeof result.version).toBe('string')
      expect(Array.isArray(result.endpoints)).toBe(true)
    })

    itIfServerReady('時刻表情報APIが取得できること', async () => {
      const response = await fetch(`${API_BASE_URL}/api/timetable/info`)
      expect(response.ok).toBe(true)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(Array.isArray(result.data.ports)).toBe(true)
      expect(Array.isArray(result.data.ships)).toBe(true)
      expect(Array.isArray(result.data.routes)).toBe(true)
      
      // 港情報の検証
      result.data.ports.forEach((port: any) => {
        expect(typeof port.code).toBe('string')
        expect(typeof port.name).toBe('string')
        expect(typeof port.nameEn).toBe('string')
        expect(typeof port.type).toBe('string')
        expect(portCodes).toContain(port.code)
      })
      
      // 船情報の検証
      result.data.ships.forEach((ship: any) => {
        expect(typeof ship.name).toBe('string')
        expect(typeof ship.type).toBe('string')
        expect(['ferry', 'highspeed', 'local']).toContain(ship.type)
      })
    })
  })

  describe('エラーハンドリング', () => {
    itIfServerReady('無効なHTTPメソッドでエラーが返ること', async () => {
      const response = await fetch(`${API_BASE_URL}/api/transit/search`, {
        method: 'DELETE'
      })
      
      expect(response.status).toBe(405) // Method Not Allowed
    })

    itIfServerReady('無効なJSONでエラーが返ること', async () => {
      const response = await fetch(`${API_BASE_URL}/api/transit/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })
      
      expect(response.status).toBe(400) // Bad Request
    })

    itIfServerReady('存在しないエンドポイントで404が返ること', async () => {
      const response = await fetch(`${API_BASE_URL}/api/nonexistent`)
      expect(response.status).toBe(404)
    })
  })

  describe('パフォーマンス', () => {
    itIfServerReady('APIレスポンスが適切な時間で返ること', async () => {
      const startTime = Date.now()
      
      const response = await fetch(`${API_BASE_URL}/api/timetable/search?departure=SAIGO&limit=10`)
      const result = await response.json()
      
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      expect(response.ok).toBe(true)
      expect(result.success).toBe(true)
      expect(responseTime).toBeLessThan(5000) // 5秒以内
    })
  })
})
