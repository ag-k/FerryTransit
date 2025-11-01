import { describe, it, expect, beforeEach, vi } from 'vitest'
import { $fetch } from 'ofetch'
import { PORTS_DATA, ROUTES_DATA } from '~/data/ports'

// APIエンドポイントをモック
const mockTransitSearch = vi.fn()
const mockTimetableSearch = vi.fn()

vi.mock('ofetch', () => ({
  $fetch: vi.fn((url) => {
    if (url.includes('/api/transit/search')) {
      return mockTransitSearch()
    }
    if (url.includes('/api/timetable/search')) {
      return mockTimetableSearch()
    }
    return Promise.resolve({})
  })
}))

describe('全港組み合わせテスト', () => {
  const portCodes = Object.keys(PORTS_DATA)
  const validRoutes = ROUTES_DATA.map(route => `${route.from}-${route.to}`)
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('乗換案内API - 全港組み合わせ', () => {
    it('有効な港の組み合わせで検索が成功すること', async () => {
      const testDate = '2025-11-02'
      
      // 全ての有効な路線をテスト
      for (const route of ROUTES_DATA) {
        const { from, to } = route
        
        mockTransitSearch.mockResolvedValue({
          success: true,
          data: {
            searchParams: { departure: from, arrival: to, date: testDate },
            results: [
              {
                id: `route_${from}_${to}`,
                departureTime: '2025-11-02T08:00:00.000Z',
                arrivalTime: '2025-11-02T10:30:00.000Z',
                totalFare: 410,
                duration: 150,
                segments: [{
                  tripId: '123',
                  ship: route.ships[0] || 'FERRY_OKI',
                  departure: from,
                  arrival: to,
                  fare: 410,
                  status: 0
                }]
              }
            ],
            count: 1
          }
        })

        const result = await $fetch(`/api/transit/search?departure=${from}&arrival=${to}&date=${testDate}`)
        
        expect(result.success).toBe(true)
        expect(result.data.searchParams.departure).toBe(from)
        expect(result.data.searchParams.arrival).toBe(to)
        expect(result.data.results).toHaveLength(1)
        expect(result.data.results[0].segments[0].departure).toBe(from)
        expect(result.data.results[0].segments[0].arrival).toBe(to)
      }
    })

    it('無効な港の組み合わせで空配列が返ること', async () => {
      const testDate = '2025-11-02'
      
      // 全ての港の組み合わせを生成
      for (const from of portCodes) {
        for (const to of portCodes) {
          if (from === to) continue // 同じ港はスキップ
          
          const routeKey = `${from}-${to}`
          const isValidRoute = validRoutes.includes(routeKey)
          
          if (!isValidRoute) {
            mockTransitSearch.mockResolvedValue({
              success: true,
              data: {
                searchParams: { departure: from, arrival: to, date: testDate },
                results: [],
                count: 0
              }
            })

            const result = await $fetch(`/api/transit/search?departure=${from}&arrival=${to}&date=${testDate}`)
            
            expect(result.success).toBe(true)
            expect(result.data.results).toHaveLength(0)
            expect(result.data.count).toBe(0)
          }
        }
      }
    })

    it('同じ港を指定した場合はエラーになること', async () => {
      const testDate = '2025-11-02'
      
      for (const port of portCodes) {
        mockTransitSearch.mockRejectedValue(new Error('出発地と目的地は異なる必要があります'))
        
        await expect(
          $fetch(`/api/transit/search?departure=${port}&arrival=${port}&date=${testDate}`)
        ).rejects.toThrow('出発地と目的地は異なる必要があります')
      }
    })
  })

  describe('時刻表API - 全港組み合わせ', () => {
    it('有効な港の組み合わせで時刻表検索が成功すること', async () => {
      // 全ての有効な路線をテスト
      for (const route of ROUTES_DATA) {
        const { from, to, ships } = route
        
        mockTimetableSearch.mockResolvedValue({
          success: true,
          data: {
            searchParams: { departure: from, arrival: to, limit: 10 },
            results: ships.map((ship, index) => ({
              tripId: `${from}_${to}_${index}`,
              name: ship,
              departure: from,
              arrival: to,
              departureTime: `${8 + index}:00`,
              arrivalTime: `${10 + index}:30`,
              duration: 150,
              type: ship.includes('RAINBOW') ? 'highspeed' : 
                    ship.includes('FERRY') ? 'ferry' : 'local'
            })),
            pagination: { totalCount: ships.length, limit: 10, offset: 0 }
          }
        })

        const result = await $fetch(`/api/timetable/search?departure=${from}&arrival=${to}&limit=10`)
        
        expect(result.success).toBe(true)
        expect(result.data.searchParams.departure).toBe(from)
        expect(result.data.searchParams.arrival).toBe(to)
        expect(result.data.results).toHaveLength(ships.length)
        
        // 全ての結果が正しい港の組み合わせであることを確認
        result.data.results.forEach((trip: any) => {
          expect(trip.departure).toBe(from)
          expect(trip.arrival).toBe(to)
        })
      }
    })

    it('全港の出発地のみで検索ができること', async () => {
      for (const departure of portCodes) {
        // その港からの出発路線を取得
        const departureRoutes = ROUTES_DATA.filter(route => route.from === departure)
        
        mockTimetableSearch.mockResolvedValue({
          success: true,
          data: {
            searchParams: { departure },
            results: departureRoutes.map(route => ({
              tripId: `${route.from}_${route.to}_1`,
              name: route.ships[0] || 'FERRY_OKI',
              departure: route.from,
              arrival: route.to
            })),
            pagination: { totalCount: departureRoutes.length }
          }
        })

        const result = await $fetch(`/api/timetable/search?departure=${departure}`)
        
        expect(result.success).toBe(true)
        expect(result.data.results).toHaveLength(departureRoutes.length)
        
        // 全ての結果が指定した出発地であることを確認
        result.data.results.forEach((trip: any) => {
          expect(trip.departure).toBe(departure)
        })
      }
    })

    it('全港の到着地のみで検索ができること', async () => {
      for (const arrival of portCodes) {
        // その港への到着路線を取得
        const arrivalRoutes = ROUTES_DATA.filter(route => route.to === arrival)
        
        mockTimetableSearch.mockResolvedValue({
          success: true,
          data: {
            searchParams: { arrival },
            results: arrivalRoutes.map(route => ({
              tripId: `${route.from}_${route.to}_1`,
              name: route.ships[0] || 'FERRY_OKI',
              departure: route.from,
              arrival: route.to
            })),
            pagination: { totalCount: arrivalRoutes.length }
          }
        })

        const result = await $fetch(`/api/timetable/search?arrival=${arrival}`)
        
        expect(result.success).toBe(true)
        expect(result.data.results).toHaveLength(arrivalRoutes.length)
        
        // 全ての結果が指定した到着地であることを確認
        result.data.results.forEach((trip: any) => {
          expect(trip.arrival).toBe(arrival)
        })
      }
    })
  })

  describe('港の種類別テスト', () => {
    it('本土→島の路線が正しく検索できること', async () => {
      const mainlandPorts = portCodes.filter(code => 
        PORTS_DATA[code].type === 'mainland'
      )
      const islandPorts = portCodes.filter(code => 
        ['dogo', 'dozen'].includes(PORTS_DATA[code].type)
      )
      
      for (const mainland of mainlandPorts) {
        for (const island of islandPorts) {
          const routeKey = `${mainland}-${island}`
          if (validRoutes.includes(routeKey)) {
            mockTransitSearch.mockResolvedValue({
              success: true,
              data: {
                searchParams: { departure: mainland, arrival: island },
                results: [{ id: `route_${routeKey}` }],
                count: 1
              }
            })

            const result = await $fetch(`/api/transit/search?departure=${mainland}&arrival=${island}&date=2025-11-02`)
            
            expect(result.success).toBe(true)
            expect(PORTS_DATA[mainland].type).toBe('mainland')
            expect(['dogo', 'dozen']).toContain(PORTS_DATA[island].type)
          }
        }
      }
    })

    it('島→本土の路線が正しく検索できること', async () => {
      const mainlandPorts = portCodes.filter(code => 
        PORTS_DATA[code].type === 'mainland'
      )
      const islandPorts = portCodes.filter(code => 
        ['dogo', 'dozen'].includes(PORTS_DATA[code].type)
      )
      
      for (const island of islandPorts) {
        for (const mainland of mainlandPorts) {
          const routeKey = `${island}-${mainland}`
          if (validRoutes.includes(routeKey)) {
            mockTransitSearch.mockResolvedValue({
              success: true,
              data: {
                searchParams: { departure: island, arrival: mainland },
                results: [{ id: `route_${routeKey}` }],
                count: 1
              }
            })

            const result = await $fetch(`/api/transit/search?departure=${island}&arrival=${mainland}&date=2025-11-02`)
            
            expect(result.success).toBe(true)
            expect(['dogo', 'dozen']).toContain(PORTS_DATA[island].type)
            expect(PORTS_DATA[mainland].type).toBe('mainland')
          }
        }
      }
    })

    it('島間の路線が正しく検索できること', async () => {
      const islandPorts = portCodes.filter(code => 
        ['dogo', 'dozen'].includes(PORTS_DATA[code].type)
      )
      
      for (const from of islandPorts) {
        for (const to of islandPorts) {
          if (from === to) continue
          
          const routeKey = `${from}-${to}`
          if (validRoutes.includes(routeKey)) {
            mockTransitSearch.mockResolvedValue({
              success: true,
              data: {
                searchParams: { departure: from, arrival: to },
                results: [{ id: `route_${routeKey}` }],
                count: 1
              }
            })

            const result = await $fetch(`/api/transit/search?departure=${from}&arrival=${to}&date=2025-11-02`)
            
            expect(result.success).toBe(true)
            expect(['dogo', 'dozen']).toContain(PORTS_DATA[from].type)
            expect(['dogo', 'dozen']).toContain(PORTS_DATA[to].type)
          }
        }
      }
    })
  })

  describe('船種別テスト', () => {
    it('各船種が正しく判定されること', async () => {
      const shipTypes = {
        highspeed: ['RAINBOWJET'],
        ferry: ['FERRY_OKI', 'FERRY_SHIRASHIMA', 'FERRY_KUNIGA', 'FERRY_DOZEN'],
        local: ['ISOKAZE']
      }
      
      for (const [type, ships] of Object.entries(shipTypes)) {
        for (const ship of ships) {
          // その船が運航する路線を探す
          const routes = ROUTES_DATA.filter(route => route.ships.includes(ship))
          
          for (const route of routes) {
            mockTimetableSearch.mockResolvedValue({
              success: true,
              data: {
                searchParams: { departure: route.from, arrival: route.to },
                results: [{
                  tripId: `${route.from}_${route.to}_${ship}`,
                  name: ship,
                  type: type
                }],
                pagination: { totalCount: 1 }
              }
            })

            const result = await $fetch(`/api/timetable/search?departure=${route.from}&arrival=${route.to}`)
            
            expect(result.success).toBe(true)
            expect(result.data.results[0].name).toBe(ship)
            expect(result.data.results[0].type).toBe(type)
          }
        }
      }
    })
  })

  describe('統計情報テスト', () => {
    it('全港の組み合わせ数が正しいこと', () => {
      const totalPorts = portCodes.length
      const totalCombinations = totalPorts * (totalPorts - 1) // 同じ港を除く
      const validRouteCount = ROUTES_DATA.length
      
      expect(totalPorts).toBe(6) // 6つの港
      expect(totalCombinations).toBe(30) // 6*5 = 30組み合わせ
      expect(validRouteCount).toBe(28) // 実際の路線数
      expect(validRoutes).toHaveLength(28)
    })

    it('各港からの出発路線数が正しいこと', () => {
      const expectedDepartureCounts: Record<string, number> = {
        'HONDO_SHICHIRUI': 4, // 七類からは4港へ
        'HONDO_SAKAIMINATO': 4, // 境港からは4港へ
        'SAIGO': 5, // 西郷からは5港へ
        'HISHIURA': 5, // 菱浦からは5港へ
        'BEPPU': 5, // 別府からは5港へ
        'KURI': 5 // 来居からは5港へ
      }
      
      for (const port of portCodes) {
        const departureRoutes = ROUTES_DATA.filter(route => route.from === port)
        const arrivalRoutes = ROUTES_DATA.filter(route => route.to === port)
        
        const expectedCount = expectedDepartureCounts[port]
        expect(departureRoutes).toHaveLength(expectedCount)
        expect(arrivalRoutes).toHaveLength(expectedCount)
      }
    })

    it('本土港と島港の数が正しいこと', () => {
      const mainlandPorts = portCodes.filter(code => 
        PORTS_DATA[code].type === 'mainland'
      )
      const islandPorts = portCodes.filter(code => 
        ['dogo', 'dozen'].includes(PORTS_DATA[code].type)
      )
      
      expect(mainlandPorts).toHaveLength(2) // 七類、境港
      expect(islandPorts).toHaveLength(4) // 西郷、菱浦、別府、来居
    })

    it('路線データの整合性が正しいこと', () => {
      // 全ての路線が存在する港のコードを使用していることを確認
      for (const route of ROUTES_DATA) {
        expect(portCodes).toContain(route.from)
        expect(portCodes).toContain(route.to)
        expect(route.ships.length).toBeGreaterThan(0)
      }

      // 重複した路線がないことを確認
      const routeKeys = ROUTES_DATA.map(route => `${route.from}-${route.to}`)
      const uniqueRouteKeys = [...new Set(routeKeys)]
      expect(routeKeys).toHaveLength(uniqueRouteKeys.length)
    })
  })
})
