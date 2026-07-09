import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFareStore } from '@/stores/fare'
import type {
  FareMaster,
  FareRoute,
  FareVersion,
  SeatClassFare,
  VehicleFare
} from '@/types/fare'

const offlineMocks = vi.hoisted(() => ({
  fetchFareData: vi.fn<() => Promise<FareMaster | null>>(),
  saveFareData: vi.fn(),
  getFareData: vi.fn()
}))

vi.mock('@/stores/offline', () => ({
  useOfflineStore: () => ({
    fetchFareData: offlineMocks.fetchFareData,
    saveFareData: offlineMocks.saveFareData,
    getFareData: offlineMocks.getFareData
  })
}))

type VersionWithLegacyFares = Omit<FareVersion, 'routes'> & {
  routes?: FareRoute[]
  fares?: unknown[]
}

type FareMasterInput = Omit<Partial<FareMaster>, 'versions'> & {
  versions?: VersionWithLegacyFares[]
}

const asFareVersion = (version: VersionWithLegacyFares): FareVersion =>
  version as unknown as FareVersion

const createFareMaster = ({ versions, ...rest }: FareMasterInput = {}): FareMaster => ({
  discounts: {},
  notes: [],
  ...rest,
  ...(versions !== undefined
    ? { versions: versions.map(asFareVersion) }
    : {})
})

const seatClassFare = (class2: number): SeatClassFare => ({
  class2,
  class2Special: class2 + 200,
  class1: class2 + 400,
  classSpecial: class2 + 600,
  specialRoom: class2 + 900
})

const vehicleFare = (base: number): VehicleFare => ({
  under3m: base,
  under4m: base + 100,
  under5m: base + 200,
  under6m: base + 300,
  under7m: base + 400,
  under8m: base + 500,
  under9m: base + 600,
  under10m: base + 700,
  under11m: base + 800,
  under12m: base + 900,
  over12mPer1m: base + 1000
})

const routeFare = (adult: number): NonNullable<FareRoute['fares']> => ({
  adult,
  child: Math.ceil(adult / 2 / 10) * 10
})

const loadStoreWith = async (fareMaster: FareMaster | null) => {
  offlineMocks.fetchFareData.mockResolvedValueOnce(fareMaster)
  const fareStore = useFareStore()

  await fareStore.loadFareMaster()

  return fareStore
}

describe('useFareStore', () => {
  beforeEach(() => {
    offlineMocks.fetchFareData.mockReset()
    offlineMocks.saveFareData.mockReset()
    offlineMocks.getFareData.mockReset()
    setActivePinia(createPinia())
  })

  describe('fare data normalization', () => {
    it('converts legacy fare entries using route id fallbacks and fare field fallbacks', async () => {
      const directSeatClass = seatClassFare(1000)
      const nestedSeatClass = seatClassFare(1200)
      const seatOnlyClass = seatClassFare(777)
      const directVehicle = vehicleFare(2000)
      const nestedVehicle = vehicleFare(3000)
      const fareStore = await loadStoreWith(createFareMaster({
        versions: [
          {
            id: 'legacy-v1',
            vesselType: 'ferry',
            name: 'Legacy fare table',
            effectiveFrom: '2024-01-01',
            routes: [],
            fares: [
              {
                categoryId: ' hondo-oki ',
                route: 'unused-route',
                id: 'unused-id',
                adult: 1010,
                child: 510,
                disabled: {
                  adult: 505,
                  child: 250
                },
                seatClass: directSeatClass,
                vehicle: directVehicle
              },
              {
                route: ' nested-route ',
                departure: ' NESTED_DEP ',
                arrival: ' NESTED_ARR ',
                fares: {
                  adult: 1234,
                  child: 'not-a-number',
                  disabled: {
                    adult: 'invalid',
                    child: 60
                  },
                  seatClass: nestedSeatClass,
                  vehicle: nestedVehicle
                }
              },
              {
                id: ' id-fallback ',
                adult: Number.NaN,
                child: null,
                disabled: 'invalid-disabled'
              },
              {
                child: 480,
                disabledAdult: 240,
                disabledChild: null
              },
              {
                route: 'seat-only',
                seatClass: seatOnlyClass
              },
              null
            ]
          }
        ]
      }))

      const routes = fareStore.fareMaster?.versions?.[0]?.routes ?? []

      expect(routes.map(route => route.id)).toEqual([
        'hondo-oki',
        'nested-route',
        'id-fallback',
        'legacy-v1-route-3',
        'seat-only'
      ])

      expect(routes[0]).toMatchObject({
        departure: 'HONDO_SHICHIRUI',
        arrival: 'SAIGO',
        vesselType: 'ferry',
        versionId: 'legacy-v1',
        versionEffectiveFrom: '2024-01-01'
      })
      expect(routes[0]?.fares?.seatClass).toEqual(directSeatClass)
      expect(routes[0]?.fares?.vehicle).toEqual(directVehicle)
      expect(routes[0]?.vehicle).toEqual(directVehicle)
      expect(routes[0]?.fares?.disabled).toEqual({
        adult: 505,
        child: 250
      })

      expect(routes[1]).toMatchObject({
        departure: 'NESTED_DEP',
        arrival: 'NESTED_ARR'
      })
      expect(routes[1]?.fares).toMatchObject({
        adult: 1234,
        child: 620,
        disabled: {
          child: 60
        },
        seatClass: nestedSeatClass,
        vehicle: nestedVehicle
      })

      expect(routes[2]).toMatchObject({
        departure: '',
        arrival: ''
      })
      expect(routes[2]?.fares).toBeUndefined()
      expect(routes[2]?.vehicle).toBeUndefined()

      expect(routes[3]?.fares).toMatchObject({
        adult: 480,
        child: 480,
        disabled: {
          adult: 240
        }
      })
      expect(routes[3]?.fares?.disabled).not.toHaveProperty('child')

      expect(routes[4]?.fares).toMatchObject({
        adult: 777,
        child: 390,
        seatClass: seatOnlyClass
      })
    })

    it('keeps explicit routes and fills version metadata without using legacy fares', async () => {
      const fareStore = await loadStoreWith(createFareMaster({
        versions: [
          {
            id: 'routes-v1',
            vesselType: 'local',
            name: 'Explicit routes',
            effectiveFrom: '2024-04-01',
            routes: [
              {
                id: 'explicit-route',
                departure: 'EXPLICIT_DEP',
                arrival: 'EXPLICIT_ARR',
                fares: routeFare(900)
              }
            ],
            fares: [
              {
                route: 'legacy-route',
                adult: 999
              }
            ]
          }
        ]
      }))

      const routes = fareStore.fareMaster?.versions?.[0]?.routes ?? []

      expect(routes).toHaveLength(1)
      expect(routes[0]).toMatchObject({
        id: 'explicit-route',
        vesselType: 'local',
        versionId: 'routes-v1',
        versionEffectiveFrom: '2024-04-01'
      })
    })

    it('creates a default ferry version from top-level routes when versions are empty', async () => {
      const fareStore = await loadStoreWith(createFareMaster({
        versions: [],
        routes: [
          {
            id: 'top-level-route',
            departure: 'TOP_DEP',
            arrival: 'TOP_ARR',
            fares: routeFare(800)
          }
        ]
      }))

      const version = fareStore.fareMaster?.versions?.[0]
      const route = version?.routes[0]

      expect(version).toMatchObject({
        id: 'default-fare-version',
        vesselType: 'ferry',
        name: '現行版',
        effectiveFrom: '1970-01-01'
      })
      expect(route).toMatchObject({
        id: 'top-level-route',
        vesselType: 'ferry',
        versionId: 'default-fare-version',
        versionEffectiveFrom: '1970-01-01'
      })
      expect(fareStore.getFareByRoute('TOP_DEP', 'TOP_ARR')?.fares?.adult).toBe(800)
    })

    it('uses empty defaults when sparse fare data omits optional collections', async () => {
      const sparseFareMaster = {} as unknown as FareMaster
      const fareStore = await loadStoreWith(sparseFareMaster)

      expect(fareStore.fareMaster?.versions).toEqual([
        {
          id: 'default-fare-version',
          vesselType: 'ferry',
          name: '現行版',
          effectiveFrom: '1970-01-01',
          routes: []
        }
      ])
      expect(fareStore.fareMaster?.routes).toEqual([])
      expect(fareStore.fareMaster?.activeVersionIds).toEqual({})
      expect(fareStore.fareMaster?.discounts).toEqual({})
      expect(fareStore.fareMaster?.notes).toEqual([])
    })
  })

  describe('version selection', () => {
    it('sorts versions by effective date and chooses the active version for the target date', async () => {
      const fareStore = await loadStoreWith(createFareMaster({
        versions: [
          {
            id: 'ferry-invalid-date',
            vesselType: 'ferry',
            name: 'Invalid date fallback',
            effectiveFrom: 'not-a-date',
            routes: [
              {
                id: 'invalid-date-route',
                departure: 'INVALID_DEP',
                arrival: 'INVALID_ARR',
                fares: routeFare(100)
              }
            ]
          },
          {
            id: 'ferry-2025',
            vesselType: 'ferry',
            name: '2025 fares',
            effectiveFrom: '2025-04-01',
            routes: [
              {
                id: 'current-route',
                departure: 'CURRENT_DEP',
                arrival: 'CURRENT_ARR',
                fares: routeFare(200)
              }
            ]
          },
          {
            id: 'ferry-2024',
            vesselType: 'ferry',
            name: '2024 fares',
            effectiveFrom: '2024-01-01',
            routes: [
              {
                id: 'previous-route',
                departure: 'PREVIOUS_DEP',
                arrival: 'PREVIOUS_ARR',
                fares: routeFare(300)
              }
            ]
          },
          {
            id: 'ferry-2030',
            vesselType: 'ferry',
            name: 'Future fares',
            effectiveFrom: '2030-01-01',
            routes: [
              {
                id: 'future-route',
                departure: 'FUTURE_DEP',
                arrival: 'FUTURE_ARR',
                fares: routeFare(400)
              }
            ]
          }
        ]
      }))

      expect(fareStore.getActiveVersion('ferry', {
        date: new Date('2024-06-01T00:00:00Z')
      })?.id).toBe('ferry-2024')
      expect(fareStore.getActiveVersion('ferry', {
        date: new Date('2025-04-01T00:00:00Z')
      })?.id).toBe('ferry-2025')
      expect(fareStore.getActiveVersion('ferry', {
        date: new Date('1960-01-01T00:00:00Z')
      })?.id).toBe('ferry-invalid-date')
      expect(fareStore.getRoutesByVesselType('ferry', {
        date: new Date('2025-05-01T00:00:00Z')
      }).map(route => route.id)).toEqual(['current-route'])
      expect(fareStore.getActiveVersion('local', {
        date: new Date('2025-05-01T00:00:00Z')
      })).toBeNull()
    })
  })

  describe('getters and actions', () => {
    it('returns unloaded fallbacks before fare data is loaded', () => {
      const fareStore = useFareStore()

      expect(fareStore.getFareByRoute('A', 'B')).toBeUndefined()
      expect(fareStore.getRoutesByVesselType('ferry')).toEqual([])
      expect(fareStore.getActiveVersion('ferry')).toBeNull()
      expect(fareStore.isInnerIslandRoute('BEPPU', 'KURI')).toBe(true)
      expect(fareStore.isInnerIslandRoute('BEPPU', 'SAIGO')).toBe(false)
    })

    it('returns direct, category-id, and mapped category ferry fares', async () => {
      const fareStore = await loadStoreWith(createFareMaster({
        versions: [
          {
            id: 'ferry-v1',
            vesselType: 'ferry',
            name: 'Ferry fares',
            effectiveFrom: '2024-01-01',
            routes: [
              {
                id: 'direct-ferry',
                departure: 'DIRECT_DEP',
                arrival: 'DIRECT_ARR',
                fares: routeFare(1000)
              },
              {
                id: 'kuri-beppu',
                departure: 'CATEGORY_DEP',
                arrival: 'CATEGORY_ARR',
                fares: routeFare(700)
              },
              {
                id: 'beppu-hishiura',
                departure: 'MAPPED_DEP',
                arrival: 'MAPPED_ARR',
                fares: routeFare(410)
              }
            ]
          }
        ]
      }))

      expect(fareStore.getFareByRoute('DIRECT_DEP', 'DIRECT_ARR', {
        vesselType: 'ferry'
      })?.id).toBe('direct-ferry')
      expect(fareStore.getFareByRoute('KURI', 'BEPPU', {
        vesselType: 'ferry'
      })?.fares?.adult).toBe(700)
      expect(fareStore.getFareByRoute('HISHIURA', 'BEPPU', {
        vesselType: 'ferry'
      })?.fares?.adult).toBe(410)
      expect(fareStore.getFareByRoute('UNKNOWN_DEP', 'UNKNOWN_ARR', {
        vesselType: 'ferry'
      })).toBeUndefined()
    })

    it('returns local direct fares before inner-island fallback fares', async () => {
      const fareStore = await loadStoreWith(createFareMaster({
        innerIslandFare: {
          adult: 300,
          child: 150
        },
        versions: [
          {
            id: 'local-v1',
            vesselType: 'local',
            name: 'Local fares',
            effectiveFrom: '2024-01-01',
            routes: [
              {
                id: 'local-direct',
                departure: 'LOCAL_DEP',
                arrival: 'LOCAL_ARR',
                fares: routeFare(500)
              }
            ]
          }
        ]
      }))

      expect(fareStore.getFareByRoute('LOCAL_DEP', 'LOCAL_ARR', {
        vesselType: 'local'
      })?.id).toBe('local-direct')
      expect(fareStore.getFareByRoute('BEPPU', 'KURI', {
        vesselType: 'local'
      })).toMatchObject({
        id: 'inner-island',
        departure: 'BEPPU',
        arrival: 'KURI',
        fares: {
          adult: 300,
          child: 150
        },
        vesselType: 'local',
        versionId: 'local-v1',
        versionEffectiveFrom: '2024-01-01'
      })
      expect(fareStore.getRoutesByVesselType('local')).toHaveLength(1)
    })

    it('falls back to aggregated routes when a vessel type has no own version', async () => {
      const fareStore = await loadStoreWith(createFareMaster({
        versions: [
          {
            id: 'mixed-v1',
            vesselType: 'ferry',
            name: 'Mixed routes',
            effectiveFrom: '2024-01-01',
            routes: [
              {
                id: 'embedded-local',
                departure: 'EMBEDDED_DEP',
                arrival: 'EMBEDDED_ARR',
                vesselType: 'local',
                fares: routeFare(250)
              }
            ]
          }
        ]
      }))

      expect(fareStore.getRoutesByVesselType('local', {
        date: new Date('2024-06-01T00:00:00Z')
      }).map(route => route.id)).toEqual(['embedded-local'])
      expect(fareStore.getFareByRoute('EMBEDDED_DEP', 'EMBEDDED_ARR', {
        vesselType: 'local',
        date: new Date('2024-06-01T00:00:00Z')
      })?.fares?.adult).toBe(250)
    })

    it('does not fetch fare data again once it is loaded', async () => {
      const fareStore = await loadStoreWith(createFareMaster({
        versions: [
          {
            id: 'ferry-v1',
            vesselType: 'ferry',
            name: 'Ferry fares',
            effectiveFrom: '2024-01-01',
            routes: []
          }
        ]
      }))

      await fareStore.loadFareMaster()

      expect(offlineMocks.fetchFareData).toHaveBeenCalledTimes(1)
    })

    it('sets a load error when offline fare data is empty', async () => {
      const fareStore = await loadStoreWith(null)

      expect(fareStore.fareMaster).toBeNull()
      expect(fareStore.error).toBe('FARE_LOAD_ERROR')
      expect(fareStore.isLoading).toBe(false)
    })

    it('sets a load error when offline fare loading rejects', async () => {
      offlineMocks.fetchFareData.mockRejectedValueOnce(new Error('failed to load'))
      const fareStore = useFareStore()

      await fareStore.loadFareMaster()

      expect(fareStore.fareMaster).toBeNull()
      expect(fareStore.error).toBe('FARE_LOAD_ERROR')
      expect(fareStore.isLoading).toBe(false)
    })
  })
})
