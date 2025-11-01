import { describe, it, expect, beforeEach, vi } from 'vitest'
import { $fetch } from 'ofetch'

// モックデータ
const mockTimetableData = [
  {
    trip_id: '123',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    name: 'FERRY_DOZEN',
    departure: 'BEPPU',
    departure_time: '08:00',
    arrival: 'HISHIURA',
    arrival_time: '08:12'
  },
  {
    trip_id: '124',
    start_date: '2025-06-01',
    end_date: '2025-10-31',
    name: 'RAINBOWJET',
    departure: 'BEPPU',
    departure_time: '10:00',
    arrival: 'HISHIURA',
    arrival_time: '10:10'
  }
]

const mockFareData = {
  routes: [
    {
      id: 'beppu-hishiura',
      departure: 'BEPPU',
      arrival: 'HISHIURA',
      fares: {
        adult: 410,
        child: 205,
        vehicle: {
          under3m: 950,
          under4m: 1260
        }
      }
    }
  ]
}

// APIエンドポイントをモック
const mockTransitSearch = vi.fn()

vi.mock('ofetch', () => ({
  $fetch: vi.fn((url) => {
    if (url.includes('/api/fare')) {
      return Promise.resolve(mockFareData)
    }
    if (url.includes('/api/timetable')) {
      return Promise.resolve(mockTimetableData)
    }
    if (url.includes('/api/transit/search')) {
      return mockTransitSearch()
    }
    return Promise.resolve({})
  })
}))

describe('乗換案内API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/transit/search', () => {
    it('基本的な検索ができること', async () => {
      // モックを設定
      mockTransitSearch.mockResolvedValue({
        success: true,
        data: {
          searchParams: { departure: 'BEPPU', arrival: 'HISHIURA', date: '2025-11-02' },
          results: [
            {
              id: 'route_123',
              totalFare: 410,
              segments: [{ ship: 'FERRY_DOZEN' }]
            },
            {
              id: 'route_124',
              totalFare: 410,
              segments: [{ ship: 'RAINBOWJET' }]
            }
          ],
          count: 2
        }
      })

      // APIを呼び出し
      const result = await $fetch('/api/transit/search?departure=BEPPU&arrival=HISHIURA&date=2025-11-02')

      // 結果を検証
      expect(result.success).toBe(true)
      expect(result.data.results).toHaveLength(2)
      expect(result.data.count).toBe(2)
      
      const firstResult = result.data.results[0]
      expect(firstResult.id).toBe('route_123')
      expect(firstResult.totalFare).toBe(410)
      expect(firstResult.segments[0].ship).toBe('FERRY_DOZEN')
    })

    it('必須パラメータがない場合はエラーになること', async () => {
      mockTransitSearch.mockRejectedValue(new Error('出発地と目的地は必須です'))

      await expect(
        $fetch('/api/transit/search?departure=BEPPU')
      ).rejects.toThrow('出発地と目的地は必須です')
    })

    it('日付形式が無効な場合はエラーになること', async () => {
      mockTransitSearch.mockRejectedValue(new Error('日付の形式が無効です'))

      await expect(
        $fetch('/api/transit/search?departure=BEPPU&arrival=HISHIURA&date=invalid-date')
      ).rejects.toThrow('日付の形式が無効です')
    })

    it('該当する便がない場合は空配列を返すこと', async () => {
      mockTransitSearch.mockResolvedValue({
        success: true,
        data: {
          searchParams: { departure: 'BEPPU', arrival: 'INVALID', date: '2025-11-02' },
          results: [],
          count: 0
        }
      })

      const result = await $fetch('/api/transit/search?departure=BEPPU&arrival=INVALID&date=2025-11-02')

      expect(result.success).toBe(true)
      expect(result.data.results).toHaveLength(0)
      expect(result.data.count).toBe(0)
    })
  })

  describe('POST /api/transit/search', () => {
    it('POSTリクエストで検索できること', async () => {
      const requestBody = {
        departure: 'BEPPU',
        arrival: 'HISHIURA',
        date: '2025-11-02',
        time: '08:00',
        isArrivalMode: false
      }

      mockTransitSearch.mockResolvedValue({
        success: true,
        data: {
          searchParams: requestBody,
          results: [
            {
              id: 'route_123',
              totalFare: 410,
              segments: [{ ship: 'FERRY_DOZEN' }]
            },
            {
              id: 'route_124',
              totalFare: 410,
              segments: [{ ship: 'RAINBOWJET' }]
            }
          ],
          count: 2
        }
      })

      const result = await $fetch('/api/transit/search', {
        method: 'POST',
        body: requestBody
      })

      expect(result.success).toBe(true)
      expect(result.data.searchParams).toEqual(requestBody)
      expect(result.data.results).toHaveLength(2)
    })
  })
})
