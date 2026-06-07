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

const CHIBU_BUS_BASE_PATH = '/data/gtfs/bus/chibu'
const CHIBU_BUS_STOP_PREFIX = 'BUS_CHIBU_'
const CHIBU_BUS_OPERATOR_ID = 'CHIBU_VILLAGE'
const CHIBU_BUS_NAME = 'CHIBU_VILLAGE_BUS'
const CHIBU_BUS_TRIP_ID_BASE = 5_000_000
const CHIBU_BUS_FARE = 100

const OKINOSHIMA_BUS_BASE_PATH = '/data/gtfs/bus/okinoshima'
const OKINOSHIMA_BUS_STOP_PREFIX = 'BUS_OKINOSHIMA_'
const OKINOSHIMA_BUS_OPERATOR_ID = 'OKINOSHIMA'
const OKINOSHIMA_BUS_NAME = 'OKINOSHIMA_BUS'
const OKINOSHIMA_BUS_TRIP_ID_BASE = 6_000_000
const OKINOSHIMA_BUS_FARE = 500

const ICHIBATA_BUS_CONNECTION_BASE_PATH = '/data/gtfs/bus/ichibata_bus_connection'
const ICHIBATA_BUS_CONNECTION_STOP_PREFIX = 'BUS_ICHIBATA_CONNECTION_'
const ICHIBATA_BUS_CONNECTION_OPERATOR_ID = 'ICHIBATA_BUS'
const ICHIBATA_BUS_CONNECTION_NAME = 'ICHIBATA_BUS_CONNECTION'
const ICHIBATA_BUS_CONNECTION_TRIP_ID_BASE = 7_000_000
const ICHIBATA_BUS_CONNECTION_FARE = 1200
const BUS_SEARCH_BASE_PATH = '/data/bus-search'

type GtfsRoute = {
  routeId: string
  agencyId?: string
  shortName?: string
  longName: string
}

type GtfsStop = {
  stopId: string
  name: string
  lat?: number
  lon?: number
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
  resolveOperatorId?: (route: GtfsRoute | undefined, trip: GtfsTrip) => string
  resolveTripName?: (route: GtfsRoute | undefined, trip: GtfsTrip) => string
  resolveFare?: (route: GtfsRoute | undefined, trip: GtfsTrip) => number
}

export type BusStopLocation = {
  id: string
  name: string
  lat: number
  lng: number
  operatorId: string
  townLabelKey: string | null
}

export type BusTimetableData = {
  trips: Trip[]
  stopCodes: string[]
  locationLabels: Record<string, string>
  stopLocations: Record<string, BusStopLocation>
}

export type AmaBusTimetableData = BusTimetableData
export type BusFeedId = 'ama' | 'nishinoshima' | 'chibu' | 'okinoshima' | 'ichibata_bus_connection'

export type BusStopsIndexData = Omit<BusTimetableData, 'trips'>

type BusSearchRoute = {
  agencyId?: string
  shortName?: string
  longName?: string
}

type BusSearchService = {
  startDate: string
  endDate: string
  activeDays: number[]
  addedDates?: string[]
  removedDates?: string[]
}

type BusSearchTripStop = [stopCode: string, arrivalTime: string, departureTime: string]
type BusSearchDepartureIndex = [tripIndex: number, stopIndex: number]

type BusSearchTrip = {
  tripId: string
  routeId: string
  serviceId: string
  headsign: string
  shortName?: string
  stops: BusSearchTripStop[]
}

export type BusSearchFeed = {
  version: 1
  feedId: BusFeedId
  generatedAt: string
  operatorId: string
  townLabelKey: string | null
  tripName: string
  fare: number
  routes: Record<string, BusSearchRoute>
  stops: Array<[code: string, name: string, lat: number | null, lng: number | null]>
  services: Record<string, BusSearchService>
  trips: BusSearchTrip[]
  departuresByStop: Record<string, BusSearchDepartureIndex[]>
}

export type BusRouteLabel = {
  operatorId: string
  tripName: string
  routeName: string
}

type BusStopsIndex = {
  version: 1
  generatedAt: string
  stops: Array<[
    code: string,
    name: string,
    lat: number | null,
    lng: number | null,
    operatorId: string,
    townLabelKey: string | null
  ]>
}

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

const CHIBU_BUS_CONFIG: BusFeedConfig = {
  id: 'chibu',
  basePath: CHIBU_BUS_BASE_PATH,
  stopPrefix: CHIBU_BUS_STOP_PREFIX,
  operatorId: CHIBU_BUS_OPERATOR_ID,
  tripName: CHIBU_BUS_NAME,
  tripIdBase: CHIBU_BUS_TRIP_ID_BASE,
  fare: CHIBU_BUS_FARE,
  formatRouteName: (route, trip) => normalizeChibuBusRouteName(
    route?.shortName || route?.longName || trip.shortName || trip.headsign
  )
}

const OKINOSHIMA_BUS_CONFIG: BusFeedConfig = {
  id: 'okinoshima',
  basePath: OKINOSHIMA_BUS_BASE_PATH,
  stopPrefix: OKINOSHIMA_BUS_STOP_PREFIX,
  operatorId: OKINOSHIMA_BUS_OPERATOR_ID,
  tripName: OKINOSHIMA_BUS_NAME,
  tripIdBase: OKINOSHIMA_BUS_TRIP_ID_BASE,
  fare: OKINOSHIMA_BUS_FARE,
  formatRouteName: (route, trip) => normalizeOkinoshimaBusRouteName(
    route?.shortName || route?.longName || trip.shortName || trip.headsign
  ),
  resolveOperatorId: route => route?.agencyId === 'OKINOSHIMA_TOWN' ? 'OKINOSHIMA_TOWN' : 'OKI_ICHIBATA',
  resolveTripName: route => route?.agencyId === 'OKINOSHIMA_TOWN' ? 'OKINOSHIMA_TOWN_BUS' : 'OKI_ICHIBATA_BUS',
  resolveFare: route => route?.agencyId === 'OKINOSHIMA_TOWN' ? 300 : 500
}

const ICHIBATA_BUS_CONNECTION_CONFIG: BusFeedConfig = {
  id: 'ichibata_bus_connection',
  basePath: ICHIBATA_BUS_CONNECTION_BASE_PATH,
  stopPrefix: ICHIBATA_BUS_CONNECTION_STOP_PREFIX,
  operatorId: ICHIBATA_BUS_CONNECTION_OPERATOR_ID,
  tripName: ICHIBATA_BUS_CONNECTION_NAME,
  tripIdBase: ICHIBATA_BUS_CONNECTION_TRIP_ID_BASE,
  fare: ICHIBATA_BUS_CONNECTION_FARE,
  formatRouteName: (_route, trip) => normalizeIchibataBusConnectionRouteName(trip.shortName || trip.headsign)
}

const BUS_FEED_CONFIGS: Record<BusFeedId, BusFeedConfig> = {
  ama: AMA_BUS_CONFIG,
  nishinoshima: NISHINOSHIMA_BUS_CONFIG,
  chibu: CHIBU_BUS_CONFIG,
  okinoshima: OKINOSHIMA_BUS_CONFIG,
  ichibata_bus_connection: ICHIBATA_BUS_CONNECTION_CONFIG
}

const busSearchFeedPromises = new Map<BusFeedId, Promise<BusSearchFeed>>()

export const isAmaBusStopCode = (value?: string): boolean => {
  return typeof value === 'string' && value.startsWith(AMA_BUS_STOP_PREFIX)
}

export const isNishinoshimaBusStopCode = (value?: string): boolean => {
  return typeof value === 'string' && value.startsWith(NISHINOSHIMA_BUS_STOP_PREFIX)
}

export const isChibuBusStopCode = (value?: string): boolean => {
  return typeof value === 'string' && value.startsWith(CHIBU_BUS_STOP_PREFIX)
}

export const isOkinoshimaBusStopCode = (value?: string): boolean => {
  return typeof value === 'string' && value.startsWith(OKINOSHIMA_BUS_STOP_PREFIX)
}

export const isIchibataBusConnectionStopCode = (value?: string): boolean => {
  return typeof value === 'string' && value.startsWith(ICHIBATA_BUS_CONNECTION_STOP_PREFIX)
}

export const isBusStopCode = (value?: string): boolean => {
  return isAmaBusStopCode(value) ||
    isNishinoshimaBusStopCode(value) ||
    isChibuBusStopCode(value) ||
    isOkinoshimaBusStopCode(value) ||
    isIchibataBusConnectionStopCode(value)
}

export const toAmaBusStopCode = (stopId: string): string => {
  return `${AMA_BUS_STOP_PREFIX}${stopId.replace(/[^a-zA-Z0-9]/g, '_')}`
}

export const toNishinoshimaBusStopCode = (stopId: string): string => {
  return `${NISHINOSHIMA_BUS_STOP_PREFIX}${stopId.replace(/[^a-zA-Z0-9]/g, '_')}`
}

export const toChibuBusStopCode = (stopId: string): string => {
  return `${CHIBU_BUS_STOP_PREFIX}${stopId.replace(/[^a-zA-Z0-9]/g, '_')}`
}

export const toOkinoshimaBusStopCode = (stopId: string): string => {
  return `${OKINOSHIMA_BUS_STOP_PREFIX}${stopId.replace(/[^a-zA-Z0-9]/g, '_')}`
}

export const toIchibataBusConnectionStopCode = (stopId: string): string => {
  return `${ICHIBATA_BUS_CONNECTION_STOP_PREFIX}${stopId.replace(/[^a-zA-Z0-9]/g, '_')}`
}

const BUS_STOP_PORT_CONNECTIONS: Record<string, { portId: string; portLabel: string }> = {
  [toAmaBusStopCode('126_01')]: { portId: 'HISHIURA', portLabel: '菱浦港' },
  [toNishinoshimaBusStopCode('nishinoshima_006')]: { portId: 'BEPPU', portLabel: '別府港' },
  [toChibuBusStopCode('kuri_naikosen')]: { portId: 'KURI', portLabel: '来居港' },
  [toChibuBusStopCode('kuri_ferry')]: { portId: 'KURI', portLabel: '来居港' },
  [toChibuBusStopCode('kuri_office')]: { portId: 'KURI', portLabel: '来居港' },
  [toOkinoshimaBusStopCode('port_plaza')]: { portId: 'SAIGO', portLabel: '西郷港' },
  [toOkinoshimaBusStopCode('port_mae')]: { portId: 'SAIGO', portLabel: '西郷港' },
  [toOkinoshimaBusStopCode('nakamachi')]: { portId: 'SAIGO', portLabel: '西郷港' },
  [toIchibataBusConnectionStopCode('shichirui_port')]: { portId: 'HONDO_SHICHIRUI', portLabel: '七類港' },
  [toIchibataBusConnectionStopCode('sakaiminato_port')]: { portId: 'HONDO_SAKAIMINATO', portLabel: '境港' }
}

export const getBusStopTownLabelKey = (value?: string): string | null => {
  if (isAmaBusStopCode(value)) return 'AMA_CHO'
  if (isNishinoshimaBusStopCode(value)) return 'NISHINOSHIMA_CHO'
  if (isChibuBusStopCode(value)) return 'CHIBU_MURA'
  if (isOkinoshimaBusStopCode(value)) return 'OKINOSHIMA_CHO'
  if (isIchibataBusConnectionStopCode(value)) return 'BUS_STOPS'
  return null
}

export const getBusStopPortBadgeLabel = (value?: string): string | null => {
  return BUS_STOP_PORT_CONNECTIONS[String(value)]?.portLabel ?? null
}

export const getBusStopConnectedPortId = (value?: string): string | null => {
  return BUS_STOP_PORT_CONNECTIONS[String(value)]?.portId ?? null
}

export const getConnectedBusStopsForPort = (portId?: string): string[] => {
  return Object.entries(BUS_STOP_PORT_CONNECTIONS)
    .filter(([, connection]) => connection.portId === portId)
    .map(([stopCode]) => stopCode)
}

export const getAllPortConnectedBusStopCodes = (): string[] => {
  return Object.keys(BUS_STOP_PORT_CONNECTIONS)
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

export const normalizeChibuBusRouteName = (routeName?: string): string => {
  const value = String(routeName ?? '').trim().replace(/^知夫村営バス\s*/, '')
  if (!value || value === '村営バス' || value === '知夫村営バス') return ''
  return value
}

export const normalizeOkinoshimaBusRouteName = (routeName?: string): string => {
  const value = String(routeName ?? '')
    .trim()
    .replace(/^隠岐一畑交通\s*/, '')
    .replace(/^隠岐の島町営バス\s*/, '')
  if (!value || value === '町営バス' || value === '隠岐の島町営バス') return ''
  return value
}

export const normalizeIchibataBusConnectionRouteName = (routeName?: string): string => {
  const value = String(routeName ?? '').trim()
  if (!value || value === '松江・七類・境港間時刻表') return ''
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

export const loadChibuBusTimetable = (): Promise<BusTimetableData> => {
  return loadGtfsBusTimetable(CHIBU_BUS_CONFIG)
}

export const loadOkinoshimaBusTimetable = (): Promise<BusTimetableData> => {
  return loadGtfsBusTimetable(OKINOSHIMA_BUS_CONFIG)
}

export const loadIchibataBusConnectionTimetable = (): Promise<BusTimetableData> => {
  return loadGtfsBusTimetable(ICHIBATA_BUS_CONNECTION_CONFIG)
}

export const clearBusSearchFeedCacheForTests = () => {
  busSearchFeedPromises.clear()
}

export const getBusFeedIdForStopCode = (value?: string): BusFeedId | null => {
  if (isAmaBusStopCode(value)) return 'ama'
  if (isNishinoshimaBusStopCode(value)) return 'nishinoshima'
  if (isChibuBusStopCode(value)) return 'chibu'
  if (isOkinoshimaBusStopCode(value)) return 'okinoshima'
  if (isIchibataBusConnectionStopCode(value)) return 'ichibata_bus_connection'
  return null
}

export const loadBusStopsIndex = async (): Promise<BusStopsIndexData> => {
  const index = await fetchJsonFromPath<BusStopsIndex>(`${BUS_SEARCH_BASE_PATH}/stops.json`)
  const stopCodes: string[] = []
  const locationLabels: Record<string, string> = {}
  const stopLocations: Record<string, BusStopLocation> = {}

  for (const [code, name, latValue, lngValue, operatorId, townLabelKey] of index.stops || []) {
    if (!code) continue
    stopCodes.push(code)
    locationLabels[code] = name || code

    const lat = Number(latValue)
    const lng = Number(lngValue)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      stopLocations[code] = {
        id: code,
        name: name || code,
        lat,
        lng,
        operatorId,
        townLabelKey
      }
    }
  }

  return {
    stopCodes,
    locationLabels,
    stopLocations
  }
}

export const loadBusSearchFeed = (feedId: BusFeedId): Promise<BusSearchFeed> => {
  const cached = busSearchFeedPromises.get(feedId)
  if (cached) return cached

  const promise = fetchJsonFromPath<BusSearchFeed>(`${BUS_SEARCH_BASE_PATH}/${feedId}.json`)
  busSearchFeedPromises.set(feedId, promise)
  return promise
}

export const loadBusTripsForRoute = async (
  departure: string,
  arrival: string,
  dateYmd: string
): Promise<Trip[]> => {
  const departureFeedId = getBusFeedIdForStopCode(departure)
  const arrivalFeedId = getBusFeedIdForStopCode(arrival)
  if (!departureFeedId || !arrivalFeedId || departureFeedId !== arrivalFeedId) {
    return []
  }

  const feed = await loadBusSearchFeed(departureFeedId)
  return buildBusTripsForRoute(feed, departure, arrival, dateYmd)
}

export const loadBusRouteLabelsForStops = async (
  departure: string,
  arrival: string
): Promise<BusRouteLabel[]> => {
  const departureFeedId = getBusFeedIdForStopCode(departure)
  const arrivalFeedId = getBusFeedIdForStopCode(arrival)
  if (!departureFeedId || !arrivalFeedId || departureFeedId !== arrivalFeedId) {
    return []
  }

  const feed = await loadBusSearchFeed(departureFeedId)
  return buildBusRouteLabelsForStops(feed, departure, arrival)
}

export const buildBusRouteLabelsForStops = (
  feed: BusSearchFeed,
  departure: string,
  arrival: string
): BusRouteLabel[] => {
  const config = BUS_FEED_CONFIGS[feed.feedId]
  const departures = feed.departuresByStop?.[departure] || []
  const labels: BusRouteLabel[] = []
  const seen = new Set<string>()

  for (const [tripIndex, originIndex] of departures) {
    const busTrip = feed.trips[tripIndex]
    if (!busTrip) continue

    const origin = busTrip.stops[originIndex]
    if (!origin || origin[0] !== departure) continue

    const hasArrivalAfterOrigin = busTrip.stops
      .slice(originIndex + 1)
      .some(stop => stop?.[0] === arrival)
    if (!hasArrivalAfterOrigin) continue

    const route = feed.routes[busTrip.routeId]
    const routeForConfig: GtfsRoute | undefined = route
      ? {
          routeId: busTrip.routeId,
          agencyId: route.agencyId,
          shortName: route.shortName,
          longName: route.longName || route.shortName || busTrip.headsign
        }
      : undefined
    const gtfsTrip: GtfsTrip = {
      routeId: busTrip.routeId,
      serviceId: busTrip.serviceId,
      tripId: busTrip.tripId,
      headsign: busTrip.headsign,
      shortName: busTrip.shortName
    }
    const routeName = config.formatRouteName(routeForConfig, gtfsTrip)
    const operatorId = config.resolveOperatorId?.(routeForConfig, gtfsTrip) ?? config.operatorId
    const tripName = config.resolveTripName?.(routeForConfig, gtfsTrip) ?? config.tripName
    const key = `${operatorId}|${tripName}|${routeName}`

    if (seen.has(key)) continue
    seen.add(key)
    labels.push({
      operatorId,
      tripName,
      routeName
    })
  }

  return labels
}

export const buildBusTripsForRoute = (
  feed: BusSearchFeed,
  departure: string,
  arrival: string,
  dateYmd: string
): Trip[] => {
  const config = BUS_FEED_CONFIGS[feed.feedId]
  const departures = feed.departuresByStop?.[departure] || []
  const busTrips: Trip[] = []

  for (const [tripIndex, originIndex] of departures) {
    const busTrip = feed.trips[tripIndex]
    if (!busTrip) continue

    const service = feed.services[busTrip.serviceId]
    if (!service || !isBusServiceActiveOnDate(service, dateYmd)) continue

    const origin = busTrip.stops[originIndex]
    if (!origin || origin[0] !== departure) continue

    const seenStopPairs = new Set<string>()
    for (let destinationIndex = originIndex + 1; destinationIndex < busTrip.stops.length; destinationIndex++) {
      const destination = busTrip.stops[destinationIndex]
      if (!destination || destination[0] !== arrival) continue

      const stopPairKey = [
        origin[0],
        origin[2],
        destination[0],
        destination[1]
      ].join('|')
      if (seenStopPairs.has(stopPairKey)) continue
      seenStopPairs.add(stopPairKey)

      const route = feed.routes[busTrip.routeId]
      const routeForConfig: GtfsRoute | undefined = route
        ? {
            routeId: busTrip.routeId,
            agencyId: route.agencyId,
            shortName: route.shortName,
            longName: route.longName || route.shortName || busTrip.headsign
          }
        : undefined
      const gtfsTrip: GtfsTrip = {
        routeId: busTrip.routeId,
        serviceId: busTrip.serviceId,
        tripId: busTrip.tripId,
        headsign: busTrip.headsign,
        shortName: busTrip.shortName
      }
      const routeName = config.formatRouteName(routeForConfig, gtfsTrip)
      const operatorId = config.resolveOperatorId?.(routeForConfig, gtfsTrip) ?? config.operatorId
      const tripName = config.resolveTripName?.(routeForConfig, gtfsTrip) ?? config.tripName
      const fare = config.resolveFare?.(routeForConfig, gtfsTrip) ?? config.fare

      busTrips.push({
        tripId: config.tripIdBase + tripIndex * 1000 + originIndex * 100 + destinationIndex,
        startDate: service.startDate,
        endDate: service.endDate,
        activeDays: service.activeDays,
        addedDates: service.addedDates ?? [],
        removedDates: service.removedDates ?? [],
        name: tripName,
        mode: 'BUS',
        operatorId,
        serviceId: busTrip.serviceId,
        vehicleId: busTrip.routeId,
        departure,
        departureType: 'STOP',
        departureTime: origin[2],
        arrival,
        arrivalType: 'STOP',
        arrivalTime: destination[1],
        status: 0,
        price: fare,
        ...(routeName ? { via: routeName } : {})
      })
    }
  }

  return busTrips
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
  const stopLocations = Object.fromEntries(
    stops
      .map(stop => {
        const code = toBusStopCode(config, stop.stopId)
        const lat = Number(stop.lat)
        const lng = Number(stop.lon)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        return [code, {
          id: code,
          name: stop.name,
          lat,
          lng,
          operatorId: config.operatorId,
          townLabelKey: getBusStopTownLabelKey(code)
        }] as const
      })
      .filter((entry): entry is readonly [string, BusStopLocation] => entry !== null)
  )

  const busTrips: Trip[] = []
  let numericTripId = config.tripIdBase

  for (const gtfsTrip of trips) {
    const service = servicesById.get(gtfsTrip.serviceId)
    const tripStopTimes = stopTimesByTripId.get(gtfsTrip.tripId) ?? []
    if (!service || tripStopTimes.length < 2) continue

    const route = routesById.get(gtfsTrip.routeId)
    const routeName = config.formatRouteName(route, gtfsTrip)
    const operatorId = config.resolveOperatorId?.(route, gtfsTrip) ?? config.operatorId
    const tripName = config.resolveTripName?.(route, gtfsTrip) ?? config.tripName
    const fare = config.resolveFare?.(route, gtfsTrip) ?? config.fare
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
          name: tripName,
          mode: 'BUS',
          operatorId,
          serviceId: gtfsTrip.serviceId,
          vehicleId: gtfsTrip.routeId,
          departure: toBusStopCode(config, origin.stopId),
          departureType: 'STOP',
          departureTime: trimSeconds(origin.departureTime),
          arrival: toBusStopCode(config, destination.stopId),
          arrivalType: 'STOP',
          arrivalTime: trimSeconds(destination.arrivalTime),
          status: 0,
          price: fare,
          ...(routeName ? { via: routeName } : {})
        })
      }
    }
  }

  return {
    trips: busTrips,
    stopCodes: stops.map(stop => toBusStopCode(config, stop.stopId)),
    locationLabels,
    stopLocations
  }
}

const toBusStopCode = (config: BusFeedConfig, stopId: string): string => {
  return `${config.stopPrefix}${stopId.replace(/[^a-zA-Z0-9]/g, '_')}`
}

const fetchJson = async <T>(config: BusFeedConfig, fileName: string): Promise<T> => {
  const response = await fetch(`${config.basePath}/${fileName}`)
  if (!response.ok) {
    throw new Error(`Failed to load ${config.id} bus GTFS data: ${fileName} (${response.status})`)
  }
  return await response.json() as T
}

const fetchJsonFromPath = async <T>(path: string): Promise<T> => {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to load bus search data: ${path} (${response.status})`)
  }
  return await response.json() as T
}

const isBusServiceActiveOnDate = (service: BusSearchService, dateYmd: string): boolean => {
  if (dateYmd < service.startDate || dateYmd > service.endDate) return false

  const removedDates = service.removedDates ?? []
  if (removedDates.includes(dateYmd)) return false

  const addedDates = service.addedDates ?? []
  if (addedDates.includes(dateYmd)) return true

  if (!service.activeDays) return true
  if (service.activeDays.length === 0) return false

  const year = Number(dateYmd.slice(0, 4))
  const month = Number(dateYmd.slice(5, 7)) - 1
  const day = Number(dateYmd.slice(8, 10))
  return service.activeDays.includes(new Date(Date.UTC(year, month, day)).getUTCDay())
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
