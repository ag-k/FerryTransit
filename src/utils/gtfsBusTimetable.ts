import type { LocationType, Trip } from '@/types'

const AMA_BUS_BASE_PATH = '/data/gtfs/bus/ama'
const AMA_BUS_STOP_PREFIX = 'BUS_AMA_'
const AMA_BUS_OPERATOR_ID = 'AMA_TOWN'
const AMA_BUS_NAME = 'AMA_TOWN_BUS'
const AMA_BUS_TRIP_ID_BASE = 3_000_000
const AMA_BUS_FARE = 200

const NISHINOSHIMA_BUS_BASE_PATH = '/data/gtfs/bus/nishinoshima'
const NISHINOSHIMA_BUS_STOP_PREFIX = 'BUS_NISHINOSHIMA_'
const NISHINOSHIMA_BUS_OPERATOR_ID = 'NISHINOSHIMA_TOWN'
const NISHINOSHIMA_BUS_NAME = 'NISHINOSHIMA_TOWN_BUS'
const NISHINOSHIMA_BUS_TRIP_ID_BASE = 4_000_000
const NISHINOSHIMA_BUS_FARE = 200

type GtfsRoute = {
  routeId: string
  shortName?: string
  longName: string
}

type GtfsStop = {
  stopId: string
  name: string
}

type GtfsTrip = {
  routeId: string
  serviceId: string
  tripId: string
  headsign: string
  shortName?: string
}

type GtfsStopTime = {
  tripId: string
  arrivalTime: string
  departureTime: string
  stopId: string
  stopSequence: number
}

type GtfsCalendar = {
  service_id: string
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
  start_date: string
  end_date: string
}

type GtfsCalendarDate = {
  service_id: string
  date: string
  exception_type: string
}

type ServiceWindow = {
  serviceId: string
  startDate: string
  endDate: string
  activeDays: number[]
  addedDates: string[]
  removedDates: string[]
}

type BusFeedConfig = {
  id: string
  basePath: string
  stopPrefix: string
  operatorId: string
  tripName: string
  tripIdBase: number
  fare: number
  formatRouteName: (route: GtfsRoute | undefined, trip: GtfsTrip) => string
}

export type BusTimetableData = {
  trips: Trip[]
  stopCodes: string[]
  locationLabels: Record<string, string>
}

export type AmaBusTimetableData = BusTimetableData

const AMA_BUS_CONFIG: BusFeedConfig = {
  id: 'ama',
  basePath: AMA_BUS_BASE_PATH,
  stopPrefix: AMA_BUS_STOP_PREFIX,
  operatorId: AMA_BUS_OPERATOR_ID,
  tripName: AMA_BUS_NAME,
  tripIdBase: AMA_BUS_TRIP_ID_BASE,
  fare: AMA_BUS_FARE,
  formatRouteName: (route, trip) => normalizeAmaBusRouteName(route?.longName || route?.shortName || trip.headsign)
}

const NISHINOSHIMA_BUS_CONFIG: BusFeedConfig = {
  id: 'nishinoshima',
  basePath: NISHINOSHIMA_BUS_BASE_PATH,
  stopPrefix: NISHINOSHIMA_BUS_STOP_PREFIX,
  operatorId: NISHINOSHIMA_BUS_OPERATOR_ID,
  tripName: NISHINOSHIMA_BUS_NAME,
  tripIdBase: NISHINOSHIMA_BUS_TRIP_ID_BASE,
  fare: NISHINOSHIMA_BUS_FARE,
  formatRouteName: (route, trip) => normalizeNishinoshimaBusRouteName(
    route?.shortName || route?.longName || trip.shortName || trip.headsign
  )
}

export const isAmaBusStopCode = (value?: string): boolean => {
  return typeof value === 'string' && value.startsWith(AMA_BUS_STOP_PREFIX)
}

export const isNishinoshimaBusStopCode = (value?: string): boolean => {
  return typeof value === 'string' && value.startsWith(NISHINOSHIMA_BUS_STOP_PREFIX)
}

export const isBusStopCode = (value?: string): boolean => {
  return isAmaBusStopCode(value) || isNishinoshimaBusStopCode(value)
}

export const toAmaBusStopCode = (stopId: string): string => {
  return `${AMA_BUS_STOP_PREFIX}${stopId.replace(/[^a-zA-Z0-9]/g, '_')}`
}

export const toNishinoshimaBusStopCode = (stopId: string): string => {
  return `${NISHINOSHIMA_BUS_STOP_PREFIX}${stopId.replace(/[^a-zA-Z0-9]/g, '_')}`
}

export const getBusStopTownLabelKey = (value?: string): string | null => {
  if (isAmaBusStopCode(value)) return 'AMA_CHO'
  if (isNishinoshimaBusStopCode(value)) return 'NISHINOSHIMA_CHO'
  return null
}

export const getBusStopPortBadgeLabel = (value?: string): string | null => {
  if (value === toAmaBusStopCode('126_01')) return '菱浦港'
  return null
}

export const getLocationTypeForCode = (value?: string, fallback: LocationType = 'PORT'): LocationType => {
  if (isBusStopCode(value)) return 'STOP'
  return fallback
}

export const normalizeAmaBusRouteName = (routeName?: string): string => {
  const value = String(routeName ?? '').trim()
  if (/^海士島線\d+$/.test(value)) return '海士島線'
  return value || '海士町バス'
}

export const normalizeNishinoshimaBusRouteName = (routeName?: string): string => {
  const value = String(routeName ?? '').trim().replace(/^西ノ島町営バス\s*/, '')
  if (!value || value === '町営バス' || value === '西ノ島町営バス') return ''
  return value
}

export const isTripActiveOnDate = (trip: Trip, _date: Date, dateYmd: string): boolean => {
  const normalizeYmd = (value: string): string => {
    return value.replace(/\//g, '-').slice(0, 10)
  }

  const startYmd = normalizeYmd(trip.startDate)
  const endYmd = normalizeYmd(trip.endDate)
  if (dateYmd < startYmd || dateYmd > endYmd) return false

  const addedDates = new Set(trip.addedDates ?? [])
  const removedDates = new Set(trip.removedDates ?? [])
  if (removedDates.has(dateYmd)) return false
  if (addedDates.has(dateYmd)) return true
  if (!trip.activeDays) return true
  if (trip.activeDays.length === 0) return false

  const year = Number(dateYmd.slice(0, 4))
  const month = Number(dateYmd.slice(5, 7)) - 1
  const day = Number(dateYmd.slice(8, 10))
  return trip.activeDays.includes(new Date(Date.UTC(year, month, day)).getUTCDay())
}

export const loadAmaBusTimetable = (): Promise<BusTimetableData> => {
  return loadGtfsBusTimetable(AMA_BUS_CONFIG)
}

export const loadNishinoshimaBusTimetable = (): Promise<BusTimetableData> => {
  return loadGtfsBusTimetable(NISHINOSHIMA_BUS_CONFIG)
}

const loadGtfsBusTimetable = async (config: BusFeedConfig): Promise<BusTimetableData> => {
  const [
    routes,
    stops,
    trips,
    stopTimes,
    calendar,
    calendarDates
  ] = await Promise.all([
    fetchJson<GtfsRoute[]>(config, 'routes.json'),
    fetchJson<GtfsStop[]>(config, 'stops.json'),
    fetchJson<GtfsTrip[]>(config, 'trips.json'),
    fetchJson<GtfsStopTime[]>(config, 'stopTimes.json'),
    fetchJson<GtfsCalendar[]>(config, 'calendar.json'),
    fetchJson<GtfsCalendarDate[]>(config, 'calendarDates.json')
  ])

  const routesById = new Map(routes.map(route => [route.routeId, route]))
  const servicesById = buildServices(calendar, calendarDates)
  const stopTimesByTripId = groupStopTimes(stopTimes)
  const locationLabels = Object.fromEntries(
    stops.map(stop => [toBusStopCode(config, stop.stopId), stop.name])
  )

  const busTrips: Trip[] = []
  let numericTripId = config.tripIdBase

  for (const gtfsTrip of trips) {
    const service = servicesById.get(gtfsTrip.serviceId)
    const tripStopTimes = stopTimesByTripId.get(gtfsTrip.tripId) ?? []
    if (!service || tripStopTimes.length < 2) continue

    const route = routesById.get(gtfsTrip.routeId)
    const routeName = config.formatRouteName(route, gtfsTrip)
    const seenStopPairs = new Set<string>()

    for (let originIndex = 0; originIndex < tripStopTimes.length - 1; originIndex++) {
      const origin = tripStopTimes[originIndex]
      if (!origin) continue

      for (let destinationIndex = originIndex + 1; destinationIndex < tripStopTimes.length; destinationIndex++) {
        const destination = tripStopTimes[destinationIndex]
        if (!destination || origin.stopId === destination.stopId) continue

        const stopPairKey = [
          origin.stopId,
          trimSeconds(origin.departureTime),
          destination.stopId,
          trimSeconds(destination.arrivalTime)
        ].join('|')
        if (seenStopPairs.has(stopPairKey)) continue
        seenStopPairs.add(stopPairKey)

        busTrips.push({
          tripId: numericTripId++,
          startDate: service.startDate,
          endDate: service.endDate,
          activeDays: service.activeDays,
          addedDates: service.addedDates,
          removedDates: service.removedDates,
          name: config.tripName,
          mode: 'BUS',
          operatorId: config.operatorId,
          serviceId: gtfsTrip.serviceId,
          vehicleId: gtfsTrip.routeId,
          departure: toBusStopCode(config, origin.stopId),
          departureType: 'STOP',
          departureTime: trimSeconds(origin.departureTime),
          arrival: toBusStopCode(config, destination.stopId),
          arrivalType: 'STOP',
          arrivalTime: trimSeconds(destination.arrivalTime),
          status: 0,
          price: config.fare,
          ...(routeName ? { via: routeName } : {})
        })
      }
    }
  }

  return {
    trips: busTrips,
    stopCodes: stops.map(stop => toBusStopCode(config, stop.stopId)),
    locationLabels
  }
}

const toBusStopCode = (config: BusFeedConfig, stopId: string): string => {
  return `${config.stopPrefix}${stopId.replace(/[^a-zA-Z0-9]/g, '_')}`
}

const fetchJson = async <T>(config: BusFeedConfig, fileName: string): Promise<T> => {
  const response = await fetch(`${config.basePath}/${fileName}`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to load ${config.id} bus GTFS data: ${fileName} (${response.status})`)
  }
  return await response.json() as T
}

const buildServices = (calendar: GtfsCalendar[], calendarDates: GtfsCalendarDate[]): Map<string, ServiceWindow> => {
  const services = new Map<string, ServiceWindow>()

  for (const row of calendar) {
    services.set(row.service_id, {
      serviceId: row.service_id,
      startDate: formatGtfsDate(row.start_date),
      endDate: formatGtfsDate(row.end_date),
      activeDays: activeDaysFromCalendar(row),
      addedDates: [],
      removedDates: []
    })
  }

  for (const row of calendarDates) {
    const date = formatGtfsDate(row.date)
    let service = services.get(row.service_id)
    if (!service) {
      service = {
        serviceId: row.service_id,
        startDate: date,
        endDate: date,
        activeDays: [],
        addedDates: [],
        removedDates: []
      }
      services.set(row.service_id, service)
    } else {
      if (date < service.startDate) service.startDate = date
      if (date > service.endDate) service.endDate = date
    }

    if (row.exception_type === '1') {
      service.addedDates.push(date)
    } else if (row.exception_type === '2') {
      service.removedDates.push(date)
    }
  }

  return services
}

const activeDaysFromCalendar = (row: GtfsCalendar): number[] => {
  const activeDays: number[] = []
  if (row.sunday === '1') activeDays.push(0)
  if (row.monday === '1') activeDays.push(1)
  if (row.tuesday === '1') activeDays.push(2)
  if (row.wednesday === '1') activeDays.push(3)
  if (row.thursday === '1') activeDays.push(4)
  if (row.friday === '1') activeDays.push(5)
  if (row.saturday === '1') activeDays.push(6)
  return activeDays
}

const groupStopTimes = (stopTimes: GtfsStopTime[]): Map<string, GtfsStopTime[]> => {
  const grouped = new Map<string, GtfsStopTime[]>()
  for (const stopTime of stopTimes) {
    const list = grouped.get(stopTime.tripId) ?? []
    list.push(stopTime)
    grouped.set(stopTime.tripId, list)
  }

  for (const list of grouped.values()) {
    list.sort((a, b) => Number(a.stopSequence) - Number(b.stopSequence))
  }

  return grouped
}

const formatGtfsDate = (value: string): string => {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

const trimSeconds = (value: string): string => {
  return value.slice(0, 5)
}
