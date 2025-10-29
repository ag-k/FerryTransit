import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { useOfflineStore } from './offline'
import type { FareMaster, FareRoute, FareVersion, VesselType, RouteFare, VehicleFare, SeatClassFare } from '@/types/fare'

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
        typeof fare.route === 'string' ? fare.route.trim() : '',
        typeof fare.id === 'string' ? fare.id.trim() : ''
      ]
      const routeId =
        routeIdCandidates.find(candidate => candidate.length > 0) ||
        `${version.id}-route-${index}`

      const adult = toNumberOrUndefined(fare.adult ?? fare.fares?.adult)
      const child = toNumberOrUndefined(fare.child ?? fare.fares?.child)
      const disabled = convertDisabledFare(fare.disabled ?? fare.fares?.disabled ?? {
        adult: fare.disabledAdult,
        child: fare.disabledChild
      })
      const seatClass = convertSeatClass(fare.seatClass ?? fare.fares?.seatClass)
      const vehicle = convertVehicleFare(fare.vehicle ?? fare.fares?.vehicle)

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
          child: child ?? (adult !== undefined ? Math.round(adult / 2) : 0)
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

      const route: FareRoute = {
        id: routeId,
        departure: typeof fare.departure === 'string' ? fare.departure : '',
        arrival: typeof fare.arrival === 'string' ? fare.arrival : '',
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

const normalizeFareMaster = (data: FareMaster): FareMaster => {
  const normalizedVersions = (data.versions && data.versions.length
    ? data.versions.map(normalizeVersion)
    : [fallbackVersion(data.routes)]
  )

  const normalized: FareMaster = {
    ...data,
    versions: normalizedVersions,
    routes: aggregateRoutesForDate(normalizedVersions, new Date()),
    activeVersionIds: data.activeVersionIds ?? {}
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
      grouped[version.vesselType].push(version)
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
      const searchRoutes = version?.routes ?? getActiveRoutesForDate(date)

      return searchRoutes.find(
        route =>
          route.departure === departure &&
          route.arrival === arrival
      )
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
        error.value = 'FARE_LOAD_ERROR'
      }
    } catch (e) {
      error.value = 'FARE_LOAD_ERROR'
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
