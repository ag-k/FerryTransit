import { defineStore } from 'pinia'
import type { 
  Trip, 
  TripStatus, 
  ShipStatus, 
  FerryStatus, 
  SightseeingStatus,
  Port,
  Ship,
  PORTS,
  SHIPS
} from '@/types'

export const useFerryStore = defineStore('ferry', () => {
  // State
  const timetableData = ref<Trip[]>([])
  const shipStatus = ref({
    isokaze: null as ShipStatus | null,
    dozen: null as ShipStatus | null,
    ferry: null as FerryStatus | null,
    kunigaKankou: null as SightseeingStatus | null
  })
  const selectedDate = ref(new Date())
  const departure = ref<string>('')
  const arrival = ref<string>('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchTime = ref<Date | null>(null)

  // Port definitions
  const hondoPorts = ['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO']
  const dozenPorts = ['BEPPU', 'HISHIURA', 'KURI']
  const dogoPorts = ['SAIGO']

  const allPorts = computed(() => [...hondoPorts, ...dozenPorts, ...dogoPorts])

  // Port map data
  const portMaps: Record<string, string> = {
    'HONDO': '<iframe src="https://www.google.com/maps/d/embed?mid=10LYdFfHjM-C6lq36egqxMuDIiMg" width="640" height="480"></iframe>',
    'HONDO_SAKAIMINATO': '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2292.317150965745!2d133.22227226073633!3d35.54509842041033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x355655ad5deb0d71%3A0x177b9c28785fc8a3!2z6Zqg5bKQ5rG96Ii5IOWig-a4ryDjg5Xjgqfjg6rjg7zjgr_jg7zjg5_jg4rjg6s!5e0!3m2!1sja!2sjp!4v1508490999479" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>',
    'HONDO_SHICHIRUI': '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3245.2782127375426!2d133.22755195027142!3d35.57152434349223!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3556547244a8948d%3A0xd6870c7a99239d6c!2z5LiD6aGe5riv!5e0!3m2!1sja!2sjp!4v1508490937348" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>',
    'KURI': '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3226.807196887792!2d133.03717155028508!3d36.0250013185523!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3557d02204625465%3A0x79e1cdd47cbe20cd!2z5p2l5bGF5riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508491503665" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>',
    'BEPPU': '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3223.417639692854!2d133.03936811472514!3d36.107681714074126!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3557d73e33b20b8f%3A0xaf30d22cfc266131!2z6KW_44OO5bO25Yil5bqc5riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508490887500" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>',
    'HISHIURA': '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3223.532279545968!2d133.07474405028748!3d36.10488801413124!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3557d6f346eb8e25%3A0x99246dba291fb735!2z6I-x5rWm5riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508491452795" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>',
    'SAIGO': '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3219.4725184532863!2d133.33284095029055!3d36.20370830865085!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5ffd77b679a1e833%3A0x3375700953b9cf6e!2z6KW_6YO35riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508491478099" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>'
  }

  // Getters
  const isDataStale = computed(() => {
    if (!lastFetchTime.value) return true
    const now = new Date()
    const diffMinutes = (now.getTime() - lastFetchTime.value.getTime()) / (1000 * 60)
    return diffMinutes > 15 // 15分以上経過したらstale
  })

  const filteredTimetable = computed(() => {
    if (departure.value === 'DEPARTURE' || arrival.value === 'ARRIVAL') {
      return []
    }

    const dateStr = selectedDate.value.toISOString().split('T')[0]
    
    return timetableData.value.filter(trip => {
      // 日付フィルタリング
      const startDate = new Date(trip.startDate)
      const endDate = new Date(trip.endDate)
      endDate.setDate(endDate.getDate() + 1) // 終了日の翌日まで含める
      const currentDate = new Date(dateStr)
      
      if (currentDate < startDate || currentDate > endDate) {
        return false
      }

      // 出発地・到着地フィルタリング
      return trip.departure === departure.value && trip.arrival === arrival.value
    })
  })

  // Actions
  const fetchTimetable = async (force = false) => {
    if (!force && !isDataStale.value && timetableData.value.length > 0) {
      return // キャッシュが有効な場合はスキップ
    }

    isLoading.value = true
    error.value = null

    try {
      // Use local API endpoint instead of external API
      const data = await $fetch<any[]>('/api/timetable')
      console.log('Fetched timetable data:', data.length, 'items')
      
      // Map API response fields to expected format
      timetableData.value = data.map(trip => ({
        tripId: parseInt(trip.trip_id), // Convert string IDs to numbers
        startDate: trip.start_date,
        endDate: trip.end_date,
        name: trip.name,
        departure: trip.departure,
        departureTime: trip.departure_time, // Keep as string
        arrival: trip.arrival,
        arrivalTime: trip.arrival_time, // Keep as string
        nextId: trip.next_id ? parseInt(trip.next_id) : undefined,
        status: parseInt(trip.status) || 0
      }))
      
      lastFetchTime.value = new Date()
      
      // LocalStorageにキャッシュ
      if (process.client) {
        try {
          localStorage.setItem('rawTimetable', JSON.stringify(data))
          localStorage.setItem('lastFetchTime', lastFetchTime.value.toISOString())
        } catch (e) {
          console.warn('Failed to cache timetable data:', e)
        }
      }
    } catch (e) {
      error.value = 'LOAD_TIMETABLE_ERROR'
      
      // オフラインの場合はキャッシュから読み込み
      if (process.client) {
        try {
          const cached = localStorage.getItem('rawTimetable')
          if (cached) {
            timetableData.value = JSON.parse(cached)
            error.value = 'OFFLINE_TIMETABLE_ERROR'
          }
        } catch (e) {
          console.error('Failed to load cached data:', e)
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  const fetchShipStatus = async () => {
    isLoading.value = true
    
    try {
      const config = useRuntimeConfig()
      const [statusData, kankouData] = await Promise.all([
        $fetch(`${config.public.shipStatusApi}/status`),
        $fetch(`${config.public.shipStatusApi}/status-kankou`).catch(() => null)
      ])

      if (Array.isArray(statusData)) {
        shipStatus.value.isokaze = statusData[0] || null
        shipStatus.value.dozen = statusData[1] || null
        shipStatus.value.ferry = statusData[2] || null
      }

      if (kankouData && Array.isArray(kankouData)) {
        const [status, courseA, courseB] = kankouData
        if (status) {
          shipStatus.value.kunigaKankou = {
            hasAlert: true,
            success: true,
            lastUpdate: status.updated_at,
            courseA: courseA || [],
            courseB: courseB || []
          }
        }
      }

      // 臨時便を時刻表データに追加
      processExtraShips()
      
    } catch (e) {
      console.error('Failed to fetch ship status:', e)
      error.value = 'LOAD_STATUS_ERROR'
    } finally {
      isLoading.value = false
    }
  }

  const processExtraShips = () => {
    const dateStr = selectedDate.value.toISOString().split('T')[0]
    
    // 既存の臨時便を削除
    timetableData.value = timetableData.value.filter(trip => trip.tripId < 1000)
    
    // いそかぜの臨時便
    if (shipStatus.value.isokaze?.extraShips) {
      let tripId = 1000
      shipStatus.value.isokaze.extraShips.forEach(trip => {
        timetableData.value.push({
          tripId,
          startDate: dateStr,
          endDate: dateStr,
          name: 'ISOKAZE',
          departure: trip.departure,
          departureTime: trip.departure_time, // Keep as string
          arrival: trip.arrival,
          arrivalTime: trip.arrival_time || '00:00', // Keep as string
          status: 4, // Extra
          nextId: tripId + 1
        })
        tripId++
      })
    }

    // フェリーどうぜんの臨時便
    if (shipStatus.value.dozen?.extraShips) {
      let tripId = 2000
      shipStatus.value.dozen.extraShips.forEach(trip => {
        timetableData.value.push({
          tripId,
          startDate: dateStr,
          endDate: dateStr,
          name: 'FERRY_DOZEN',
          departure: trip.departure,
          departureTime: trip.departure_time, // Keep as string
          arrival: trip.arrival,
          arrivalTime: trip.arrival_time || '00:00', // Keep as string
          status: 4, // Extra
          nextId: tripId + 1
        })
        tripId++
      })
    }
  }

  const setDeparture = (port: string) => {
    departure.value = port
    // LocalStorageに保存
    if (process.client) {
      try {
        localStorage.setItem('departure', port)
      } catch (e) {}
    }
  }

  const setArrival = (port: string) => {
    arrival.value = port
    // LocalStorageに保存
    if (process.client) {
      try {
        localStorage.setItem('arrival', port)
      } catch (e) {}
    }
  }

  const reverseRoute = () => {
    const temp = departure.value
    departure.value = arrival.value
    arrival.value = temp
  }

  const setSelectedDate = (date: Date) => {
    selectedDate.value = date
  }

  // Initialize from localStorage
  const initializeFromStorage = () => {
    if (!process.client) return

    try {
      const savedDeparture = localStorage.getItem('departure')
      const savedArrival = localStorage.getItem('arrival')
      
      if (savedDeparture) departure.value = savedDeparture
      if (savedArrival) arrival.value = savedArrival
      
      const savedTime = localStorage.getItem('lastFetchTime')
      if (savedTime) {
        lastFetchTime.value = new Date(savedTime)
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e)
    }
  }

  return {
    // State
    timetableData,
    shipStatus,
    selectedDate,
    departure,
    arrival,
    isLoading,
    error,
    lastFetchTime,
    
    // Port data
    hondoPorts,
    dozenPorts,
    dogoPorts,
    allPorts,
    portMaps,
    
    // Getters
    isDataStale,
    filteredTimetable,
    
    // Actions
    fetchTimetable,
    fetchShipStatus,
    setDeparture,
    setArrival,
    reverseRoute,
    setSelectedDate,
    initializeFromStorage
  }
})