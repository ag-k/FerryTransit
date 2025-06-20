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
  // 固定の初期日付を使用（ハイドレーションエラー対策）
  const getInitialDate = () => {
    // JSTで本日の日付を取得
    const now = new Date()
    const jstOffset = 9 * 60 // JST is UTC+9
    const jstTime = new Date(now.getTime() + (jstOffset - now.getTimezoneOffset()) * 60 * 1000)
    jstTime.setHours(0, 0, 0, 0)
    return jstTime
  }
  const selectedDate = ref(getInitialDate())
  // SSR/CSRで同じ初期値を保証
  const departure = ref<string>('')
  const arrival = ref<string>('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchTime = ref<Date | null>(null)

  // Port definitions
  const hondoPorts = ['HONDO', 'HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO']
  const dozenPorts = ['BEPPU', 'HISHIURA', 'KURI']
  const dogoPorts = ['SAIGO']

  const allPorts = computed(() => [...hondoPorts, ...dozenPorts, ...dogoPorts])

  // Port map data
  const portMaps: Record<string, string> = {
    'HONDO': '<iframe src="https://www.google.com/maps/d/embed?mid=10LYdFfHjM-C6lq36egqxMuDIiMg" width="100%" allowfullscreen loading="lazy"></iframe>',
    'HONDO_SAKAIMINATO': '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2292.317150965745!2d133.22227226073633!3d35.54509842041033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x355655ad5deb0d71%3A0x177b9c28785fc8a3!2z6Zqg5bKQ5rG96Ii5IOWig-a4ryDjg5Xjgqfjg6rjg7zjgr_jg7zjg5_jg4rjg6s!5e0!3m2!1sja!2sjp!4v1508490999479" width="100%" allowfullscreen loading="lazy"></iframe>',
    'HONDO_SHICHIRUI': '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3245.2782127375426!2d133.22755195027142!3d35.57152434349223!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3556547244a8948d%3A0xd6870c7a99239d6c!2z5LiD6aGe5riv!5e0!3m2!1sja!2sjp!4v1508490937348" width="100%" allowfullscreen loading="lazy"></iframe>',
    'KURI': '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3226.807196887792!2d133.03717155028508!3d36.0250013185523!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3557d02204625465%3A0x79e1cdd47cbe20cd!2z5p2l5bGF5riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508491503665" width="100%" allowfullscreen loading="lazy"></iframe>',
    'BEPPU': '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3223.417639692854!2d133.03936811472514!3d36.107681714074126!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3557d73e33b20b8f%3A0xaf30d22cfc266131!2z6KW_44OO5bO25Yil5bqc5riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508490887500" width="100%" allowfullscreen loading="lazy"></iframe>',
    'HISHIURA': '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3223.532279545968!2d133.07474405028748!3d36.10488801413124!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3557d6f346eb8e25%3A0x99246dba291fb735!2z6I-x5rWm5riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508491452795" width="100%" allowfullscreen loading="lazy"></iframe>',
    'SAIGO': '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3219.4725184532863!2d133.33284095029055!3d36.20370830865085!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5ffd77b679a1e833%3A0x3375700953b9cf6e!2z6KW_6YO35riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508491478099" width="100%" allowfullscreen loading="lazy"></iframe>'
  }

  // Getters
  const isDataStale = computed(() => {
    if (!lastFetchTime.value) return true
    const now = new Date()
    const diffMinutes = (now.getTime() - lastFetchTime.value.getTime()) / (1000 * 60)
    return diffMinutes > 15 // 15分以上経過したらstale
  })

  // Alerts computed from ship status
  const alerts = computed(() => {
    const alertList: Array<{
      date: string
      shipName: string
      departureTime: string
      status: number
    }> = []
    
    // status値の意味:
    // 0: 通常運航
    // 1: 一部欠航
    // 2: 全便欠航
    // 3: 時間変更
    // 4: 臨時便
    
    // lastShipsから欠航情報を取得
    if (shipStatus.value.isokaze?.lastShips && shipStatus.value.isokaze.status !== 0) {
      shipStatus.value.isokaze.lastShips.forEach((trip: any) => {
        alertList.push({
          date: selectedDate.value.toISOString().split('T')[0],
          shipName: 'ISOKAZE',
          departureTime: trip.departure_time || trip.departureTime,
          status: shipStatus.value.isokaze?.status || 2
        })
      })
    }
    
    if (shipStatus.value.dozen?.lastShips && shipStatus.value.dozen.status !== 0) {
      shipStatus.value.dozen.lastShips.forEach((trip: any) => {
        alertList.push({
          date: selectedDate.value.toISOString().split('T')[0],
          shipName: 'FERRY_DOZEN',
          departureTime: trip.departure_time || trip.departureTime,
          status: shipStatus.value.dozen?.status || 2
        })
      })
    }
    
    return alertList
  })

  const filteredTimetable = computed(() => {
    if (!departure.value || !arrival.value) {
      return []
    }

    const dateStr = selectedDate.value.toISOString().split('T')[0]
    const MAX_NEXT_CHAIN = 5
    
    // 期間でフィルタリング
    const validTimetable = timetableData.value.filter(trip => {
      const startDate = new Date(trip.startDate)
      const endDate = new Date(trip.endDate)
      endDate.setDate(endDate.getDate() + 1) // 終了日の翌日まで含める
      const currentDate = new Date(dateStr)
      
      return currentDate >= startDate && currentDate <= endDate
    })
    
    // 出発地でフィルタリング
    const departureTimetable = validTimetable.filter(trip => {
      return departure.value === 'HONDO' 
        ? (trip.departure === 'HONDO_SHICHIRUI' || trip.departure === 'HONDO_SAKAIMINATO')
        : trip.departure === departure.value
    })
    
    // 直行便を抽出
    const directTrips = departureTimetable.filter(trip => {
      return arrival.value === 'HONDO'
        ? (trip.arrival === 'HONDO_SHICHIRUI' || trip.arrival === 'HONDO_SAKAIMINATO')
        : trip.arrival === arrival.value
    })
    
    const resultTimetable: Trip[] = []
    
    // 直行便を結果に追加
    if ((departure.value === 'HONDO') || (arrival.value === 'HONDO')) {
      directTrips.forEach(trip => {
        let departureLabel = ''
        let arrivalLabel = ''
        
        if (trip.departure === 'HONDO_SHICHIRUI') {
          departureLabel = 'TIMETABLE_SUP_SHICHIRUI'
        } else if (trip.departure === 'HONDO_SAKAIMINATO') {
          departureLabel = 'TIMETABLE_SUP_SAKAIMINATO'
        }
        
        if (trip.arrival === 'HONDO_SHICHIRUI') {
          arrivalLabel = 'TIMETABLE_SUP_SHICHIRUI'
        } else if (trip.arrival === 'HONDO_SAKAIMINATO') {
          arrivalLabel = 'TIMETABLE_SUP_SAKAIMINATO'
        }
        
        resultTimetable.push({
          ...trip,
          departure: trip.departure,
          arrival: trip.arrival,
          departureLabel,
          arrivalLabel
        })
      })
    } else {
      resultTimetable.push(...directTrips)
    }
    
    // 既に抽出済みのトリップIDを記録
    const extractedTripIds = new Set(directTrips.map(t => t.tripId))
    
    // 乗り継ぎルートを探索
    const remainingTrips = departureTimetable.filter(trip => !extractedTripIds.has(trip.tripId))
    
    remainingTrips.forEach(trip => {
      if (trip.nextId) {
        let currentTrip = trip
        let nextId = trip.nextId
        
        for (let i = 0; i < MAX_NEXT_CHAIN; i++) {
          const nextTrip = validTimetable.find(t => t.tripId === nextId)
          if (!nextTrip) break
          
          // 出発地を経由するパスは省く
          if (nextTrip.departure === trip.departure) break
          
          // 本土経由ルートは省く
          if ((nextTrip.arrival === 'HONDO_SHICHIRUI' || nextTrip.arrival === 'HONDO_SAKAIMINATO') &&
              (trip.departure === 'HONDO_SHICHIRUI' || trip.departure === 'HONDO_SAKAIMINATO')) {
            break
          }
          
          // 目的地に到達した場合
          const reachesDestination = arrival.value === 'HONDO'
            ? (nextTrip.arrival === 'HONDO_SHICHIRUI' || nextTrip.arrival === 'HONDO_SAKAIMINATO')
            : nextTrip.arrival === arrival.value
            
          if (reachesDestination) {
            let departureLabel = ''
            let arrivalLabel = ''
            
            if (departure.value === 'HONDO') {
              if (trip.departure === 'HONDO_SHICHIRUI') {
                departureLabel = 'TIMETABLE_SUP_SHICHIRUI'
              } else if (trip.departure === 'HONDO_SAKAIMINATO') {
                departureLabel = 'TIMETABLE_SUP_SAKAIMINATO'
              }
            }
            
            if (arrival.value === 'HONDO') {
              if (nextTrip.arrival === 'HONDO_SHICHIRUI') {
                arrivalLabel = 'TIMETABLE_SUP_SHICHIRUI'
              } else if (nextTrip.arrival === 'HONDO_SAKAIMINATO') {
                arrivalLabel = 'TIMETABLE_SUP_SAKAIMINATO'
              }
            }
            
            resultTimetable.push({
              ...trip,
              arrival: nextTrip.arrival,
              arrivalTime: nextTrip.arrivalTime,
              departureLabel,
              arrivalLabel
            })
            break
          }
          
          if (!nextTrip.nextId) break
          nextId = nextTrip.nextId
        }
      }
    })
    
    return resultTimetable
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
        // APIレスポンスをマッピング
        const [isokazeData, dozenData, ferryData] = statusData
        
        if (isokazeData) {
          shipStatus.value.isokaze = {
            ...isokazeData,
            hasAlert: isokazeData.status !== 0
          }
        }
        
        if (dozenData) {
          shipStatus.value.dozen = {
            ...dozenData,
            hasAlert: dozenData.status !== 0
          }
        }
        
        if (ferryData) {
          // フェリーデータはスネークケースからキャメルケースに変換
          shipStatus.value.ferry = {
            ...ferryData,
            hasAlert: ferryData.ferry_state !== '定期運航' || ferryData.fast_ferry_state !== '( in Operation )',
            ferryState: ferryData.ferry_state || ferryData.ferryState,
            ferryComment: ferryData.ferry_comment || ferryData.ferryComment,
            fastFerryState: ferryData.fast_ferry_state || ferryData.fastFerryState,
            fastFerryComment: ferryData.fast_ferry_comment || ferryData.fastFerryComment,
            todayWave: ferryData.today_wave || ferryData.todayWave,
            tomorrowWave: ferryData.tomorrow_wave || ferryData.tomorrowWave
          }
        }
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
  const initializeFromStorage = async () => {
    // SSR時はスキップ
    if (!process.client) return

    // ハイドレーション完了後に実行
    await new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve(true)
      } else {
        window.addEventListener('load', () => resolve(true))
      }
    })
    
    // さらにnextTickで遅延
    await nextTick()
    
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
    alerts,
    
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