import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { useOfflineStore } from './offline'
import { roundUpToTen } from '@/utils/currency'
import {
  ROUTE_METADATA,
  mapHighspeedPortsToCanonicalRoute,
  normalizeRouteId
} from '@/utils/fareRoutes'
import type { FareMaster, FareRoute, FareVersion, VesselType, RouteFare, VehicleFare, SeatClassFare } from '@/types/fare'
import { createLogger } from '~/utils/logger'

type GetFareOptions = {
  date?: Date
  vesselType?: VesselType
}

const DEFAULT_VERSION_ID = 'default-fare-version'
const DEFAULT_EFFECTIVE_FROM = '1970-01-01'

const vesselTypes: VesselType[] = ['ferry', 'highspeed', 'local']

const toDate = (value: string): Date => {
  // ISO8601日付を日時型へ変換。無効な値の場合は1970-01-01扱い。
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date(DEFAULT_EFFECTIVE_FROM) : parsed
}

const toNumberOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && !Number.isNaN(value) ? value : undefined

const convertSeatClass = (value: unknown): SeatClassFare | undefined => {
  if (!value || typeof value !== 'object') return undefined
  return value as SeatClassFare
}

const convertVehicleFare = (value: unknown): VehicleFare | undefined => {
  if (!value || typeof value !== 'object') return undefined
  return value as VehicleFare
}

const convertDisabledFare = (source: any): { adult?: number; child?: number } | undefined => {
  if (!source || typeof source !== 'object') return undefined
  const adult = toNumberOrUndefined(source.adult)
  const child = toNumberOrUndefined(source.child)
  if (adult === undefined && child === undefined) return undefined
  const result: { adult?: number; child?: number } = {}
  if (adult !== undefined) result.adult = adult
  if (child !== undefined) result.child = child
  return result
}

const convertFaresToRoutes = (
  version: FareVersion & { fares?: any[] }
): FareRoute[] => {
  if (!Array.isArray(version.fares)) return []

  return version.fares
    .filter(fare => fare && typeof fare === 'object')
    .map((fare: any, index: number) => {
      const routeIdCandidates = [
        typeof fare.categoryId === 'string' ? fare.categoryId.trim() : '', // categoryId を優先
        typeof fare.route === 'string' ? fare.route.trim() : '',
        typeof fare.id === 'string' ? fare.id.trim() : ''
      ]
      const routeId =
        routeIdCandidates.find(candidate => candidate.length > 0) ||
        `${version.id}-route-${index}`

      const seatClass = convertSeatClass(fare.seatClass ?? fare.fares?.seatClass)
      const vehicle = convertVehicleFare(fare.vehicle ?? fare.fares?.vehicle)
      
      // Get adult fare from various sources, prioritizing seatClass.class2 if adult is not available
      let adult = toNumberOrUndefined(fare.adult ?? fare.fares?.adult)
      if (adult === undefined && seatClass?.class2 !== undefined) {
        adult = seatClass.class2
      }
      
      const child = toNumberOrUndefined(fare.child ?? fare.fares?.child)
      const disabled = convertDisabledFare(fare.disabled ?? fare.fares?.disabled ?? {
        adult: fare.disabledAdult,
        child: fare.disabledChild
      })

      let routeFare: RouteFare | undefined
      if (
        adult !== undefined ||
        child !== undefined ||
        disabled ||
        seatClass ||
        vehicle
      ) {
        routeFare = {
          adult: adult ?? (child ?? 0),
          child: child ?? (adult !== undefined ? roundUpToTen(adult / 2) : 0)
        }

        if (disabled) {
          routeFare.disabled = {}
          if (disabled.adult !== undefined) {
            routeFare.disabled.adult = disabled.adult
          }
          if (disabled.child !== undefined) {
            routeFare.disabled.child = disabled.child
          }
        }
        if (seatClass) {
          routeFare.seatClass = seatClass
        }
        if (vehicle) {
          routeFare.vehicle = vehicle
        }
      }

      const metadata = ROUTE_METADATA[routeId] ?? null
      const departure =
        typeof fare.departure === 'string' && fare.departure.trim().length
          ? fare.departure.trim()
          : metadata?.departure ?? ''
      const arrival =
        typeof fare.arrival === 'string' && fare.arrival.trim().length
          ? fare.arrival.trim()
          : metadata?.arrival ?? ''

      const route: FareRoute = {
        id: routeId,
        departure,
        arrival,
        fares: routeFare,
        vehicle: vehicle ?? undefined,
        vesselType: version.vesselType,
        versionId: version.id,
        versionEffectiveFrom: version.effectiveFrom
      }

      return route
    })
}

const normalizeVersion = (version: FareVersion & { fares?: any[] }): FareVersion => {
  const baseRoutes =
    (Array.isArray(version.routes) && version.routes.length)
      ? version.routes
      : convertFaresToRoutes(version)

  const normalizedRoutes = baseRoutes.map((route) => ({
    ...route,
    vesselType: route.vesselType ?? version.vesselType,
    versionId: route.versionId ?? version.id,
    versionEffectiveFrom: route.versionEffectiveFrom ?? version.effectiveFrom
  }))

  return {
    ...version,
    routes: normalizedRoutes
  }
}

const fallbackVersion = (routes: FareRoute[] = []): FareVersion => ({
  id: DEFAULT_VERSION_ID,
  vesselType: 'ferry',
  name: '現行版',
  effectiveFrom: DEFAULT_EFFECTIVE_FROM,
  routes: routes.map(route => ({
    ...route,
    vesselType: route.vesselType ?? 'ferry',
    versionId: DEFAULT_VERSION_ID,
    versionEffectiveFrom: DEFAULT_EFFECTIVE_FROM
  }))
})

const sortVersionsDesc = (versions: FareVersion[]): FareVersion[] => {
  return [...versions].sort((a, b) => {
    return toDate(b.effectiveFrom).getTime() - toDate(a.effectiveFrom).getTime()
  })
}

const findActiveVersion = (
  versions: FareVersion[],
  date: Date
): FareVersion | null => {
  if (!versions.length) {
    return null
  }

  const sorted = sortVersionsDesc(versions)
  const targetTime = date.getTime()

  for (const version of sorted) {
    const effectiveTime = toDate(version.effectiveFrom).getTime()
    if (effectiveTime <= targetTime) {
      return version
    }
  }

  // まだ適用日が未来の場合は最も古い（=最後の）バージョンを返す
  return sorted[sorted.length - 1]
}

const aggregateRoutesForDate = (versions: FareVersion[], date: Date): FareRoute[] => {
  const result: FareRoute[] = []

  vesselTypes.forEach((type) => {
    const candidates = versions.filter(version => version.vesselType === type)
    if (!candidates.length) return

    const active = findActiveVersion(candidates, date)
    if (active) {
      result.push(
        ...active.routes.map(route => ({
          ...route,
          vesselType: route.vesselType ?? active.vesselType,
          versionId: route.versionId ?? active.id,
          versionEffectiveFrom: route.versionEffectiveFrom ?? active.effectiveFrom
        }))
      )
    }
  })

  return result
}

const logger = createLogger('fareStore')

const normalizeFareMaster = (data: FareMaster): FareMaster => {
  const normalizedVersions = (data.versions && data.versions.length
    ? data.versions.map(normalizeVersion)
    : [fallbackVersion(data.routes)]
  )

  // innerIslandFareが有効な値を持つか確認
  const innerIslandFare = data.innerIslandFare && 
    typeof data.innerIslandFare === 'object' && 
    data.innerIslandFare !== null &&
    ('adult' in data.innerIslandFare || 'child' in data.innerIslandFare)
    ? data.innerIslandFare
    : undefined

  // まず、innerIslandFareなどのトップレベルプロパティを保持
  const normalized: FareMaster = {
    // トップレベルのプロパティを先に設定（versionsやroutesで上書きされないように）
    // innerIslandFareが有効な値を持つ場合のみ設定
    ...(innerIslandFare ? { innerIslandFare } : {}),
    ...(data.innerIslandVehicleFare ? { innerIslandVehicleFare: data.innerIslandVehicleFare } : {}),
    ...(data.rainbowJetFares ? { rainbowJetFares: data.rainbowJetFares } : {}),
    // その他のプロパティ
    versions: normalizedVersions,
    routes: aggregateRoutesForDate(normalizedVersions, new Date()),
    activeVersionIds: data.activeVersionIds ?? {},
    discounts: data.discounts ?? {},
    notes: data.notes ?? []
  }

  return normalized
}

export const useFareStore = defineStore('fare', () => {
  // State
  const fareMaster = ref<FareMaster | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const versionsByType = computed<Record<VesselType, FareVersion[]>>(() => {
    const grouped: Record<VesselType, FareVersion[]> = {
      ferry: [],
      highspeed: [],
      local: []
    }

    const versions = fareMaster.value?.versions ?? []
    versions.forEach((version) => {
      if (version.vesselType && grouped[version.vesselType]) {
        grouped[version.vesselType].push(version)
      }
    })

    vesselTypes.forEach((type) => {
      grouped[type] = sortVersionsDesc(grouped[type])
    })

    return grouped
  })

  const getActiveVersionInternal = (vesselType: VesselType, date: Date = new Date()): FareVersion | null => {
    const versions = versionsByType.value[vesselType]
    if (!versions.length) return null
    return findActiveVersion(versions, date)
  }

  const getActiveRoutesForDate = (date: Date = new Date()): FareRoute[] => {
    if (!fareMaster.value) return []
    return aggregateRoutesForDate(fareMaster.value.versions ?? [], date)
  }

  // Getters
  const getFareByRoute = computed(() => {
    return (
      departure: string,
      arrival: string,
      options: GetFareOptions = {}
    ): FareRoute | undefined => {
      if (!fareMaster.value) return undefined

      const date = options.date ?? new Date()
      const vesselType = options.vesselType ?? 'ferry'
      const version = getActiveVersionInternal(vesselType, date)
      const allRoutes = version?.routes ?? getActiveRoutesForDate(date)
      // Filter routes by vesselType to avoid mixing different vessel types
      const searchRoutes = allRoutes.filter(route => (route.vesselType ?? vesselType) === vesselType)
      const departureUpper = departure.toUpperCase()
      const arrivalUpper = arrival.toUpperCase()

      const directMatch = searchRoutes.find(
        route =>
          route.departure === departureUpper &&
          route.arrival === arrivalUpper
      )
      if (directMatch) {
        return directMatch
      }
      
      // For local vessels, use inner island fare regardless of route
      if (vesselType === 'local') {
        if (fareMaster.value?.innerIslandFare) {
          // 内航船はルートに関わらず一定料金
          return {
            id: 'inner-island',
            departure: departureUpper,
            arrival: arrivalUpper,
            fares: {
              adult: fareMaster.value.innerIslandFare.adult,
              child: fareMaster.value.innerIslandFare.child
            },
            vesselType: 'local',
            versionId: version?.id,
            versionEffectiveFrom: version?.effectiveFrom
          }
        }
      }

      if (vesselType === 'highspeed') {
        const canonical = mapHighspeedPortsToCanonicalRoute(departureUpper, arrivalUpper)
        if (canonical) {
          const fallback = searchRoutes.find(route => {
            if (route.id === canonical) return true
            const routeCanonical = mapHighspeedPortsToCanonicalRoute(route.departure, route.arrival)
            return routeCanonical === canonical
          })
          if (fallback) {
            return fallback
          }
        }
      }

      // For ferry routes, try to find by category ID
      if (vesselType === 'ferry') {
        // Map individual routes to category IDs
        const routeToCategoryMap: Record<string, string> = {
          'hondo-saigo': 'hondo-oki',
          'saigo-hondo': 'hondo-oki',
          'hondo-beppu': 'hondo-oki',
          'beppu-hondo': 'hondo-oki',
          'hondo-hishiura': 'hondo-oki',
          'hishiura-hondo': 'hondo-oki',
          'hondo-kuri': 'hondo-oki',
          'kuri-hondo': 'hondo-oki',
          'saigo-beppu': 'dozen-dogo',
          'beppu-saigo': 'dozen-dogo',
          'saigo-hishiura': 'dozen-dogo',
          'hishiura-saigo': 'dozen-dogo',
          'saigo-kuri': 'dozen-dogo',
          'kuri-saigo': 'dozen-dogo',
          'beppu-hishiura': 'beppu-hishiura',
          'hishiura-beppu': 'beppu-hishiura',
          'hishiura-kuri': 'hishiura-kuri',
          'kuri-hishiura': 'hishiura-kuri',
          'kuri-beppu': 'kuri-beppu',
          'beppu-kuri': 'kuri-beppu'
        }

        // Try to find route ID from departure and arrival
        const routeId = normalizeRouteId(`${departure.toLowerCase()}-${arrival.toLowerCase()}`)
        
        // Check if routeId is already a category ID
        const categoryIds = ['hondo-oki', 'dozen-dogo', 'beppu-hishiura', 'hishiura-kuri', 'kuri-beppu']
        if (routeId && categoryIds.includes(routeId)) {
          const categoryRoute = searchRoutes.find(route => route.id === routeId)
          if (categoryRoute) {
            return categoryRoute
          }
        }
        
        // Check if routeId maps to a category
        if (routeId && routeToCategoryMap[routeId]) {
          const categoryId = routeToCategoryMap[routeId]
          const categoryRoute = searchRoutes.find(route => route.id === categoryId)
          if (categoryRoute) {
            return categoryRoute
          }
        }
      }

      return undefined
    }
  })

  const getRoutesByVesselType = computed(() => {
    return (vesselType: VesselType, options: { date?: Date } = {}): FareRoute[] => {
      const date = options.date ?? new Date()
      const version = getActiveVersionInternal(vesselType, date)
      if (version) {
        return version.routes
      }

      // バージョンが存在しない場合は全体のルートからフィルター
      return getActiveRoutesForDate(date).filter(route => route.vesselType === vesselType)
    }
  })

  const getActiveVersion = computed(() => {
    return (vesselType: VesselType, options: { date?: Date } = {}): FareVersion | null => {
      const date = options.date ?? new Date()
      return getActiveVersionInternal(vesselType, date)
    }
  })

  const isInnerIslandRoute = computed(() => {
    return (departure: string, arrival: string): boolean => {
      const innerIslandPorts = ['BEPPU', 'HISHIURA', 'KURI']
      return innerIslandPorts.includes(departure) && innerIslandPorts.includes(arrival)
    }
  })

  // Actions
  const loadFareMaster = async () => {
    if (fareMaster.value) return // Already loaded

    isLoading.value = true
    error.value = null

    try {
      // オフラインストアを使用
      const offlineStore = useOfflineStore()
      const data = await offlineStore.fetchFareData()

      if (data) {
        fareMaster.value = normalizeFareMaster(data)
      } else {
        fareMaster.value = null
        error.value = 'FARE_LOAD_ERROR'
        logger.warn('Fare data not loaded')
      }
    } catch (e) {
      fareMaster.value = null
      error.value = 'FARE_LOAD_ERROR'
      logger.error('Failed to load fare master', e)
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    fareMaster: readonly(fareMaster),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Getters
    getFareByRoute,
    getRoutesByVesselType,
    getActiveVersion,
    isInnerIslandRoute,
    
    // Actions
    loadFareMaster
  }
})
