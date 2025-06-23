import { useFerryStore } from '@/stores/ferry'
import { useFareStore } from '@/stores/fare'
import { useFerryData } from '@/composables/useFerryData'
import type { Trip, TransitRoute, TransitSegment } from '@/types'

export const useRouteSearch = () => {
  const ferryStore = useFerryStore()
  const fareStore = useFareStore()
  const { getTripStatus, initializeData } = useFerryData()
  
  // Initialize fare data
  onMounted(async () => {
    await fareStore.loadFareMaster()
  })
  
  // Search for routes between ports
  const searchRoutes = async (
    departure: string,
    arrival: string,
    searchDate: Date,
    searchTime: string,
    isArrivalMode: boolean = false
  ): Promise<TransitRoute[]> => {
    // Ensure data is loaded
    if (ferryStore.timetableData.length === 0) {
      await initializeData()
    }
    await fareStore.loadFareMaster()
    
    const routes: TransitRoute[] = []
    const searchDateTime = new Date(searchDate)
    const [hours, minutes] = searchTime.split(':').map(Number)
    searchDateTime.setHours(hours, minutes, 0, 0)
    
    // Debug logging
    console.log('Search params:', { departure, arrival, searchDate, searchTime, isArrivalMode })
    console.log('Total timetable data:', ferryStore.timetableData.length)
    
    // Get filtered timetable for the date based on start_date and end_date
    // Format date as YYYY-MM-DD in JST
    const year = searchDate.getFullYear()
    const month = String(searchDate.getMonth() + 1).padStart(2, '0')
    const day = String(searchDate.getDate()).padStart(2, '0')
    const searchDateStr = `${year}-${month}-${day}`
    
    const dayTimetable = ferryStore.timetableData.filter(trip => {
      // Parse start and end dates
      const startDate = trip.startDate.replace(/\//g, '-')
      const endDate = trip.endDate.replace(/\//g, '-')
      
      // Check if search date is within the trip's valid period
      return searchDateStr >= startDate && searchDateStr <= endDate
    })
    
    console.log('Filtered timetable for date range:', dayTimetable.length, 'searchDate:', searchDateStr)
    
    // Find direct routes
    const directRoutes = findDirectRoutes(
      dayTimetable,
      departure,
      arrival,
      searchDateTime,
      isArrivalMode
    )
    
    routes.push(...directRoutes)
    
    // Find transfer routes if direct routes are limited
    if (directRoutes.length < 5) {
      const transferRoutes = findTransferRoutes(
        dayTimetable,
        departure,
        arrival,
        searchDateTime,
        isArrivalMode
      )
      routes.push(...transferRoutes)
    }
    
    // Sort routes
    if (isArrivalMode) {
      routes.sort((a, b) => b.arrivalTime.getTime() - a.arrivalTime.getTime())
    } else {
      routes.sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime())
    }
    
    return routes
  }
  
  // Find direct routes
  const findDirectRoutes = (
    timetable: Trip[],
    departure: string,
    arrival: string,
    searchTime: Date,
    isArrivalMode: boolean
  ): TransitRoute[] => {
    const routes: TransitRoute[] = []
    
    // Handle special HONDO port mapping
    const departurePorts = departure === 'HONDO' 
      ? ['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'] 
      : [departure]
    const arrivalPorts = arrival === 'HONDO' 
      ? ['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'] 
      : [arrival]
    
    console.log('Direct route search:', { departurePorts, arrivalPorts })
    
    for (const trip of timetable) {
      if (departurePorts.includes(trip.departure) && arrivalPorts.includes(trip.arrival)) {
        console.log('Found matching trip:', trip)
        // Create date objects using the search date and trip times
        const [depHours, depMinutes] = trip.departureTime.split(':').map(Number)
        const [arrHours, arrMinutes] = trip.arrivalTime.split(':').map(Number)
        
        const departureTime = new Date(searchTime)
        departureTime.setHours(depHours, depMinutes, 0, 0)
        
        const arrivalTime = new Date(searchTime)
        arrivalTime.setHours(arrHours, arrMinutes, 0, 0)
        
        // Check time constraints
        if (isArrivalMode) {
          if (arrivalTime > searchTime) continue
        } else {
          if (departureTime < searchTime) continue
        }
        
        // Check if trip is cancelled
        const status = getTripStatus(trip)
        if (status === 2) continue // Skip cancelled trips
        
        const segment: TransitSegment = {
          tripId: String(trip.tripId),
          ship: trip.name,
          departure: trip.departure,
          arrival: trip.arrival,
          departureTime,
          arrivalTime,
          status,
          fare: calculateFare(trip.name, trip.departure, trip.arrival, departureTime)
        }
        
        routes.push({
          segments: [segment],
          departureTime,
          arrivalTime,
          totalFare: segment.fare,
          transferCount: 0
        })
      }
    }
    
    return routes
  }
  
  // Find transfer routes
  const findTransferRoutes = (
    timetable: Trip[],
    departure: string,
    arrival: string,
    searchTime: Date,
    isArrivalMode: boolean
  ): TransitRoute[] => {
    const routes: TransitRoute[] = []
    const processedRoutes = new Set<string>()
    
    // Handle special HONDO port mapping
    const departurePorts = departure === 'HONDO' 
      ? ['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'] 
      : [departure]
    const arrivalPorts = arrival === 'HONDO' 
      ? ['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'] 
      : [arrival]
    
    // First leg trips
    for (const firstTrip of timetable) {
      if (!departurePorts.includes(firstTrip.departure)) continue
      
      // Create date objects using the search date and trip times
      const [firstDepHours, firstDepMinutes] = firstTrip.departureTime.split(':').map(Number)
      const [firstArrHours, firstArrMinutes] = firstTrip.arrivalTime.split(':').map(Number)
      
      const firstDepartureTime = new Date(searchTime)
      firstDepartureTime.setHours(firstDepHours, firstDepMinutes, 0, 0)
      
      const firstArrivalTime = new Date(searchTime)
      firstArrivalTime.setHours(firstArrHours, firstArrMinutes, 0, 0)
      
      // Check time constraint for first leg
      if (!isArrivalMode && firstDepartureTime < searchTime) continue
      
      // Skip if first trip is cancelled
      const firstStatus = getTripStatus(firstTrip)
      if (firstStatus === 2) continue
      
      // Skip if first trip arrives at final destination (already covered in direct routes)
      if (arrivalPorts.includes(firstTrip.arrival)) continue
      
      // Second leg trips
      for (const secondTrip of timetable) {
        if (secondTrip.departure !== firstTrip.arrival) continue
        if (!arrivalPorts.includes(secondTrip.arrival)) continue
        
        // Create date objects using the first arrival time as base
        const [secondDepHours, secondDepMinutes] = secondTrip.departureTime.split(':').map(Number)
        const [secondArrHours, secondArrMinutes] = secondTrip.arrivalTime.split(':').map(Number)
        
        const secondDepartureTime = new Date(firstArrivalTime)
        secondDepartureTime.setHours(secondDepHours, secondDepMinutes, 0, 0)
        
        const secondArrivalTime = new Date(secondDepartureTime)
        secondArrivalTime.setHours(secondArrHours, secondArrMinutes, 0, 0)
        
        // Check transfer is possible (enough time between arrival and departure)
        if (secondDepartureTime <= firstArrivalTime) continue
        
        // Check time constraint for arrival mode
        if (isArrivalMode && secondArrivalTime > searchTime) continue
        
        // Skip if second trip is cancelled
        const secondStatus = getTripStatus(secondTrip)
        if (secondStatus === 2) continue
        
        // Prevent mainland-to-mainland transfers when departing from mainland
        if (isMainlandPort(departure) && isMainlandPort(firstTrip.arrival) && isMainlandPort(arrival)) {
          continue
        }
        
        // Create route key to check for duplicates
        const routeKey = `${firstTrip.tripId}-${secondTrip.tripId}`
        if (processedRoutes.has(routeKey)) continue
        processedRoutes.add(routeKey)
        
        // Check if trips should be normalized (connected trips on same ship)
        if (shouldNormalizeTrips(firstTrip, secondTrip)) {
          // Create normalized single-segment route
          const segment: TransitSegment = {
            tripId: String(firstTrip.tripId),
            ship: firstTrip.name,
            departure: firstTrip.departure,
            arrival: secondTrip.arrival,
            departureTime: firstDepartureTime,
            arrivalTime: secondArrivalTime,
            status: Math.max(firstStatus, secondStatus),
            fare: calculateFare(firstTrip.name, firstTrip.departure, secondTrip.arrival, firstDepartureTime)
          }
          
          routes.push({
            segments: [segment],
            departureTime: firstDepartureTime,
            arrivalTime: secondArrivalTime,
            totalFare: segment.fare,
            transferCount: 0
          })
        } else {
          // Create two-segment route with transfer
          const segment1: TransitSegment = {
            tripId: String(firstTrip.tripId),
            ship: firstTrip.name,
            departure: firstTrip.departure,
            arrival: firstTrip.arrival,
            departureTime: firstDepartureTime,
            arrivalTime: firstArrivalTime,
            status: firstStatus,
            fare: calculateFare(firstTrip.name, firstTrip.departure, firstTrip.arrival, firstDepartureTime)
          }
          
          const segment2: TransitSegment = {
            tripId: String(secondTrip.tripId),
            ship: secondTrip.name,
            departure: secondTrip.departure,
            arrival: secondTrip.arrival,
            departureTime: secondDepartureTime,
            arrivalTime: secondArrivalTime,
            status: secondStatus,
            fare: calculateFare(secondTrip.name, secondTrip.departure, secondTrip.arrival, secondDepartureTime)
          }
          
          routes.push({
            segments: [segment1, segment2],
            departureTime: firstDepartureTime,
            arrivalTime: secondArrivalTime,
            totalFare: segment1.fare + segment2.fare,
            transferCount: 1
          })
        }
      }
    }
    
    return routes
  }
  
  // Check if two trips should be normalized (same ship, connected)
  const shouldNormalizeTrips = (trip1: Trip, trip2: Trip): boolean => {
    return trip1.name === trip2.name && trip1.nextId === trip2.tripId
  }
  
  // Check if port is on mainland
  const isMainlandPort = (port: string): boolean => {
    return ferryStore.hondoPorts.includes(port) || port === 'HONDO'
  }
  
  // Calculate fare for a trip with date consideration
  const calculateFare = (ship: string, departure: string, arrival: string, date?: Date): number => {
    // Ensure fare data is loaded
    if (!fareStore.fareMaster) {
      fareStore.loadFareMaster()
    }
    
    // Map HONDO ports to their actual port names for fare lookup
    let fareDeparture = departure
    let fareArrival = arrival
    
    // For fare calculation, treat HONDO_SHICHIRUI and HONDO_SAKAIMINATO as HONDO
    if (departure === 'HONDO_SHICHIRUI' || departure === 'HONDO_SAKAIMINATO') {
      fareDeparture = 'HONDO'
    }
    if (arrival === 'HONDO_SHICHIRUI' || arrival === 'HONDO_SAKAIMINATO') {
      fareArrival = 'HONDO'
    }
    
    // Get fare from master data
    const route = fareStore.getFareByRoute(fareDeparture, fareArrival)
    
    if (route) {
      let baseFare = route.fares.adult
      
      // For high-speed ferry, use a multiplier (example: 2x normal fare)
      const isHighSpeed = ship === 'RAINBOWJET'
      if (isHighSpeed) {
        baseFare = baseFare * 2
      }
      
      // Apply peak season surcharge if applicable
      if (date) {
        const { isPeakSeason, getPeakSeason } = useHolidayCalendar()
        if (isPeakSeason(date)) {
          const peakSeason = getPeakSeason(date)
          if (peakSeason && peakSeason.surchargeRate) {
            baseFare = Math.round(baseFare * peakSeason.surchargeRate)
          }
        }
      }
      
      return baseFare
    }
    
    // Fallback to old calculation if route not found
    const isHighSpeed = ship === 'RAINBOWJET'
    const isInterIsland = 
      (ferryStore.dozenPorts.includes(departure) && ferryStore.dogoPorts.includes(arrival)) ||
      (ferryStore.dogoPorts.includes(departure) && ferryStore.dozenPorts.includes(arrival))
    
    if (isHighSpeed) {
      if (isInterIsland) return 3380
      if (isMainlandPort(departure) || isMainlandPort(arrival)) return 6750
      return 4500
    } else {
      if (isInterIsland) return 1680
      if (isMainlandPort(departure) || isMainlandPort(arrival)) return 3360
      return 2240
    }
  }
  
  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }
  
  // Calculate duration between two times
  const calculateDuration = (start: Date, end: Date): string => {
    const diff = end.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`
    }
    return `${minutes}分`
  }
  
  // Get display name for HONDO ports
  const getPortDisplayName = (port: string): string => {
    const { $i18n } = useNuxtApp()
    
    if (port === 'HONDO_SHICHIRUI') {
      return `${$i18n.t('HONDO')} (${$i18n.t('SHICHIRUI')})`
    } else if (port === 'HONDO_SAKAIMINATO') {
      return `${$i18n.t('HONDO')} (${$i18n.t('SAKAIMINATO')})`
    }
    return $i18n.t(port)
  }
  
  return {
    searchRoutes,
    formatTime,
    calculateDuration,
    getPortDisplayName
  }
}