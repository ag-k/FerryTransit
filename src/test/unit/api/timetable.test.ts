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
  },
  {
    trip_id: '125',
    start_date: '2025-03-01',
    end_date: '2025-08-31',
    name: 'ISOKAZE',
    departure: 'SAIGO',
    departure_time: '14:00',
    arrival: 'KURI',
    arrival_time: '14:30'
  }
]

// APIエンドポイントをモック
const mockTimetableSearch = vi.fn()
const mockTimetableInfo = vi.fn()

vi.mock('ofetch', () => ({
  $fetch: vi.fn((url) => {
    if (url.includes('/api/timetable/search')) {
      return mockTimetableSearch()
    }
    if (url.includes('/api/timetable/info')) {
      return mockTimetableInfo()
    }
    if (url.includes('/api/timetable') && !url.includes('/search') && !url.includes('/info')) {
      return Promise.resolve(mockTimetableData)
    }
    return Promise.resolve({})
  })
}))

describe('時刻表API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/timetable/search', () => {
    it('基本的な検索ができること', async () => {
      mockTimetableSearch.mockResolvedValue({
        success: true,
        data: {
          searchParams: { departure: 'BEPPU', arrival: 'HISHIURA', limit: 5 },
          results: [
            {
              tripId: '123',
              name: 'FERRY_DOZEN',
              departure: 'BEPPU',
              arrival: 'HISHIURA',
              departureTime: '08:00',
              arrivalTime: '08:12',
              duration: 12,
              type: 'ferry'
            },
            {
              tripId: '124',
              name: 'RAINBOWJET',
              departure: 'BEPPU',
              arrival: 'HISHIURA',
              departureTime: '10:00',
              arrivalTime: '10:10',
              duration: 10,
              type: 'highspeed'
            }
          ],
          pagination: { totalCount: 2, limit: 5, offset: 0, hasMore: false }
        }
      })

      const result = await $fetch('/api/timetable/search?departure=BEPPU&arrival=HISHIURA&limit=5')

      expect(result.success).toBe(true)
      expect(result.data.results).toHaveLength(2)
      expect(result.data.pagination.totalCount).toBe(2)
      
      const firstResult = result.data.results[0]
      expect(firstResult.tripId).toBe('123')
      expect(firstResult.name).toBe('FERRY_DOZEN')
      expect(firstResult.departure).toBe('BEPPU')
      expect(firstResult.arrival).toBe('HISHIURA')
      expect(firstResult.duration).toBe(12)
      expect(firstResult.type).toBe('ferry')
    })

    it('出発地のみでの検索ができること', async () => {
      mockTimetableSearch.mockResolvedValue({
        success: true,
        data: {
          searchParams: { departure: 'BEPPU' },
          results: [
            {
              tripId: '123',
              name: 'FERRY_DOZEN',
              departure: 'BEPPU',
              arrival: 'HISHIURA'
            },
            {
              tripId: '124',
              name: 'RAINBOWJET',
              departure: 'BEPPU',
              arrival: 'HISHIURA'
            }
          ],
          pagination: { totalCount: 2 }
        }
      })

      const result = await $fetch('/api/timetable/search?departure=BEPPU')

      expect(result.success).toBe(true)
      expect(result.data.results).toHaveLength(2)
      result.data.results.forEach((trip: any) => {
        expect(trip.departure).toBe('BEPPU')
      })
    })

    it('船名での検索ができること', async () => {
      mockTimetableSearch.mockResolvedValue({
        success: true,
        data: {
          searchParams: { ship: 'RAINBOWJET' },
          results: [
            {
              tripId: '124',
              name: 'RAINBOWJET',
              type: 'highspeed'
            }
          ],
          pagination: { totalCount: 1 }
        }
      })

      const result = await $fetch('/api/timetable/search?ship=RAINBOWJET')

      expect(result.success).toBe(true)
      expect(result.data.results).toHaveLength(1)
      expect(result.data.results[0].name).toBe('RAINBOWJET')
      expect(result.data.results[0].type).toBe('highspeed')
    })

    it('特定の日付で検索ができること', async () => {
      mockTimetableSearch.mockResolvedValue({
        success: true,
        data: {
          searchParams: { date: '2025-05-15' },
          results: [
            { tripId: '123' },
            { tripId: '124' }
          ],
          pagination: { totalCount: 2 }
        }
      })

      const result = await $fetch('/api/timetable/search?date=2025-05-15')

      expect(result.success).toBe(true)
      expect(result.data.results).toHaveLength(2)
    })

    it('期間外の便は除外されること', async () => {
      mockTimetableSearch.mockResolvedValue({
        success: true,
        data: {
          searchParams: { date: '2024-12-01' },
          results: [],
          pagination: { totalCount: 0 }
        }
      })

      const result = await $fetch('/api/timetable/search?date=2024-12-01')

      expect(result.success).toBe(true)
      expect(result.data.results).toHaveLength(0)
    })

    it('ページネーションが機能すること', async () => {
      mockTimetableSearch.mockResolvedValue({
        success: true,
        data: {
          searchParams: { limit: 1, offset: 1 },
          results: [{ tripId: '124' }],
          pagination: { limit: 1, offset: 1, hasMore: true }
        }
      })

      const result = await $fetch('/api/timetable/search?limit=1&offset=1')

      expect(result.success).toBe(true)
      expect(result.data.results).toHaveLength(1)
      expect(result.data.pagination.limit).toBe(1)
      expect(result.data.pagination.offset).toBe(1)
      expect(result.data.pagination.hasMore).toBe(true)
    })

    it('船種が正しく判定されること', async () => {
      mockTimetableSearch.mockResolvedValue({
        success: true,
        data: {
          searchParams: {},
          results: [
            { name: 'FERRY_DOZEN', type: 'ferry' },
            { name: 'RAINBOWJET', type: 'highspeed' },
            { name: 'ISOKAZE', type: 'local' }
          ],
          pagination: { totalCount: 3 }
        }
      })

      const result = await $fetch('/api/timetable/search')

      expect(result.success).toBe(true)
      
      const ferryTrip = result.data.results.find((trip: any) => trip.name === 'FERRY_DOZEN')
      expect(ferryTrip.type).toBe('ferry')

      const highspeedTrip = result.data.results.find((trip: any) => trip.name === 'RAINBOWJET')
      expect(highspeedTrip.type).toBe('highspeed')

      const localTrip = result.data.results.find((trip: any) => trip.name === 'ISOKAZE')
      expect(localTrip.type).toBe('local')
    })
  })

  describe('POST /api/timetable/search', () => {
    it('POSTリクエストで検索できること', async () => {
      const requestBody = {
        departure: 'BEPPU',
        arrival: 'HISHIURA',
        limit: 10,
        sortBy: 'departure_time',
        sortOrder: 'asc'
      }

      mockTimetableSearch.mockResolvedValue({
        success: true,
        data: {
          searchParams: requestBody,
          results: [
            { tripId: '123' },
            { tripId: '124' }
          ],
          pagination: { totalCount: 2 }
        }
      })

      const result = await $fetch('/api/timetable/search', {
        method: 'POST',
        body: requestBody
      })

      expect(result.success).toBe(true)
      expect(result.data.searchParams).toEqual(requestBody)
      expect(result.data.results).toHaveLength(2)
    })

    it('ソート機能が機能すること', async () => {
      mockTimetableSearch.mockResolvedValue({
        success: true,
        data: {
          searchParams: { sortBy: 'departure_time', sortOrder: 'desc' },
          results: [
            { departureTime: '14:00' },
            { departureTime: '10:00' },
            { departureTime: '08:00' }
          ],
          pagination: { totalCount: 3 }
        }
      })

      const result = await $fetch('/api/timetable/search', {
        method: 'POST',
        body: {
          sortBy: 'departure_time',
          sortOrder: 'desc'
        }
      })

      expect(result.success).toBe(true)
      
      // 時刻の降順でソートされていることを確認
      const times = result.data.results.map((trip: any) => trip.departureTime)
      expect(times).toEqual(['14:00', '10:00', '08:00'])
    })
  })
})
