import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFerryData } from '@/composables/useFerryData'
import { useFerryStore } from '@/stores/ferry'
import { useUIStore } from '@/stores/ui'
import type { FerryStatus, ShipStatus, ShipStatusStoreState, Trip } from '@/types'
import { TripStatus } from '@/types'

const {
  ensureTimetableLoadedMock,
  loggerMock
} = vi.hoisted(() => ({
  ensureTimetableLoadedMock: vi.fn(),
  loggerMock: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('@/composables/useTimetableLoader', () => ({
  useTimetableLoader: () => ({
    ensureTimetableLoaded: ensureTimetableLoadedMock
  })
}))

vi.mock('~/utils/logger', () => ({
  createLogger: () => loggerMock
}))

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

const createDeferred = <T>(): Deferred<T> => {
  let resolve: Deferred<T>['resolve'] = () => undefined
  let reject: Deferred<T>['reject'] = () => undefined
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return {
    promise,
    resolve,
    reject
  }
}

const flushPromises = (): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, 0)
  })
}

const processFlags = process as unknown as {
  client?: boolean
  server?: boolean
}

const originalClient = processFlags.client
const originalServer = processFlags.server

const translateMock = vi.fn((key: string): string => `translated:${key}`)

const baseShipStatus = (): ShipStatusStoreState => ({
  isokaze: null,
  dozen: null,
  ferry: null,
  kunigaKankou: null
})

const createShipStatus = (overrides: Partial<ShipStatus> = {}): ShipStatus => ({
  hasAlert: true,
  status: 0,
  date: null,
  updated: null,
  summary: null,
  comment: null,
  ...overrides
})

const createFerryStatus = (overrides: Partial<FerryStatus> = {}): FerryStatus => ({
  hasAlert: true,
  date: null,
  ferryState: '通常運航',
  fastFerryState: '通常運航',
  ...overrides
})

const createTrip = (overrides: Partial<Trip> & Pick<Trip, 'name'>): Trip => ({
  tripId: 1,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  name: overrides.name,
  mode: 'FERRY',
  departure: 'BEPPU',
  departureTime: '08:00',
  arrival: 'HISHIURA',
  arrivalTime: '08:20',
  status: TripStatus.Normal,
  ...overrides
})

describe('useFerryData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureTimetableLoadedMock.mockReset()
    ensureTimetableLoadedMock.mockResolvedValue(undefined)
    processFlags.client = true
    processFlags.server = false
    setActivePinia(createPinia())
    translateMock.mockClear()
    vi.stubGlobal('useNuxtApp', () => ({
      $i18n: {
        t: translateMock
      }
    }))
  })

  afterEach(() => {
    processFlags.client = originalClient
    processFlags.server = originalServer
    vi.unstubAllGlobals()
  })

  describe('initializeData', () => {
    it('initializeFromStorage の後に時刻表と運航状況を並行取得し finally で loading を解除する', async () => {
      const ferryStore = useFerryStore()
      const uiStore = useUIStore()
      const initializeDeferred = createDeferred<void>()
      const timetableDeferred = createDeferred<void>()
      const shipStatusDeferred = createDeferred<void>()
      const initializeSpy = vi
        .spyOn(ferryStore, 'initializeFromStorage')
        .mockReturnValue(initializeDeferred.promise)
      const fetchShipStatusSpy = vi
        .spyOn(ferryStore, 'fetchShipStatus')
        .mockReturnValue(shipStatusDeferred.promise)
      const setLoadingSpy = vi.spyOn(uiStore, 'setLoading')

      const { initializeData } = useFerryData()
      const initializePromise = initializeData()

      expect(setLoadingSpy).toHaveBeenCalledWith(true)
      expect(initializeSpy).toHaveBeenCalledOnce()
      expect(ensureTimetableLoadedMock).not.toHaveBeenCalled()
      expect(fetchShipStatusSpy).not.toHaveBeenCalled()

      initializeDeferred.resolve(undefined)
      await flushPromises()

      expect(ensureTimetableLoadedMock).toHaveBeenCalledOnce()
      expect(ensureTimetableLoadedMock).toHaveBeenCalledWith()
      expect(fetchShipStatusSpy).toHaveBeenCalledOnce()
      expect(initializeSpy.mock.invocationCallOrder[0]).toBeLessThan(
        ensureTimetableLoadedMock.mock.invocationCallOrder[0]
      )
      expect(initializeSpy.mock.invocationCallOrder[0]).toBeLessThan(
        fetchShipStatusSpy.mock.invocationCallOrder[0]
      )
      expect(setLoadingSpy).not.toHaveBeenLastCalledWith(false)

      timetableDeferred.resolve(undefined)
      shipStatusDeferred.resolve(undefined)
      await initializePromise

      expect(setLoadingSpy).toHaveBeenLastCalledWith(false)
    })

    it('例外時に danger alert を追加し finally で loading を解除する', async () => {
      const ferryStore = useFerryStore()
      const uiStore = useUIStore()
      const error = new Error('timetable failed')
      vi.spyOn(ferryStore, 'initializeFromStorage').mockResolvedValue(undefined)
      vi.spyOn(ferryStore, 'fetchShipStatus').mockResolvedValue(undefined)
      ensureTimetableLoadedMock.mockRejectedValueOnce(error)
      const addAlertSpy = vi.spyOn(uiStore, 'addAlert')
      const setLoadingSpy = vi.spyOn(uiStore, 'setLoading')

      const { initializeData } = useFerryData()
      await initializeData()

      expect(loggerMock.error).toHaveBeenCalledWith('Failed to initialize ferry data', error)
      expect(addAlertSpy).toHaveBeenCalledWith(
        'danger',
        'translated:LOAD_TIMETABLE_ERROR'
      )
      expect(setLoadingSpy).toHaveBeenLastCalledWith(false)
    })
  })

  describe('updates', () => {
    it('updateTimetable は ensureTimetableLoaded(true) を呼ぶ', async () => {
      const { updateTimetable } = useFerryData()

      await updateTimetable()

      expect(ensureTimetableLoadedMock).toHaveBeenCalledWith(true)
    })

    it('updateShipStatus は fetchShipStatus 失敗時に warning alert を追加する', async () => {
      const ferryStore = useFerryStore()
      const uiStore = useUIStore()
      vi.spyOn(ferryStore, 'fetchShipStatus').mockRejectedValueOnce(new Error('status failed'))
      const addAlertSpy = vi.spyOn(uiStore, 'addAlert')

      const { updateShipStatus } = useFerryData()
      await updateShipStatus()

      expect(addAlertSpy).toHaveBeenCalledWith(
        'warning',
        'translated:LOAD_STATUS_ERROR'
      )
    })
  })

  describe('getTripStatus', () => {
    it('RAINBOWJET は高速船が欠航なら 2、それ以外は trip.status を返す', () => {
      const ferryStore = useFerryStore()
      const { getTripStatus } = useFerryData()

      ferryStore.shipStatus = {
        ...baseShipStatus(),
        ferry: createFerryStatus({
          hasAlert: true,
          fastFerryState: '欠航'
        })
      }
      expect(getTripStatus(createTrip({ name: 'RAINBOWJET' }))).toBe(2)

      ferryStore.shipStatus = {
        ...baseShipStatus(),
        ferry: createFerryStatus({
          hasAlert: false,
          fastFerryState: '通常運航'
        })
      }
      expect(getTripStatus(createTrip({
        name: 'RAINBOWJET',
        status: TripStatus.Change
      }))).toBe(TripStatus.Change)
    })

    it('ISOKAZE は alert 無しなら 0 を返す', () => {
      const ferryStore = useFerryStore()
      ferryStore.shipStatus = {
        ...baseShipStatus(),
        isokaze: createShipStatus({
          hasAlert: false,
          status: 1
        })
      }
      const { getTripStatus } = useFerryData()

      expect(getTripStatus(createTrip({
        name: 'ISOKAZE',
        status: TripStatus.Change
      }))).toBe(0)
    })

    it('ISOKAZE status 1 は欠航、status 3/4 は変更/臨時便を返す', () => {
      const ferryStore = useFerryStore()
      const { getTripStatus } = useFerryData()

      ferryStore.shipStatus = {
        ...baseShipStatus(),
        isokaze: createShipStatus({ status: 1 })
      }
      expect(getTripStatus(createTrip({ name: 'ISOKAZE' }))).toBe(2)

      ferryStore.shipStatus = {
        ...baseShipStatus(),
        isokaze: createShipStatus({ status: 3 })
      }
      expect(getTripStatus(createTrip({ name: 'ISOKAZE' }))).toBe(3)

      ferryStore.shipStatus = {
        ...baseShipStatus(),
        isokaze: createShipStatus({ status: 4 })
      }
      expect(getTripStatus(createTrip({ name: 'ISOKAZE' }))).toBe(4)
    })

    it('ISOKAZE status 2 は startTime 以降のみ欠航にする', () => {
      const ferryStore = useFerryStore()
      ferryStore.shipStatus = {
        ...baseShipStatus(),
        isokaze: createShipStatus({
          status: 2,
          startTime: '09:00'
        })
      }
      const { getTripStatus } = useFerryData()

      expect(getTripStatus(createTrip({
        name: 'ISOKAZE',
        departureTime: '09:00'
      }))).toBe(2)
      expect(getTripStatus(createTrip({
        name: 'ISOKAZE',
        departureTime: new Date(2026, 0, 1, 8, 59)
      }))).toBe(0)
    })

    it('ISOKAZE status 2 は startTime が無ければ 0 を返す', () => {
      const ferryStore = useFerryStore()
      ferryStore.shipStatus = {
        ...baseShipStatus(),
        isokaze: createShipStatus({
          status: 2,
          startTime: undefined
        })
      }
      const { getTripStatus } = useFerryData()

      expect(getTripStatus(createTrip({
        name: 'ISOKAZE',
        departureTime: '10:00'
      }))).toBe(0)
    })

    it('FERRY_DOZEN status 2 は startTime 以降を欠航にする', () => {
      const ferryStore = useFerryStore()
      ferryStore.shipStatus = {
        ...baseShipStatus(),
        dozen: createShipStatus({
          status: 2,
          startTime: '11:00'
        })
      }
      const { getTripStatus } = useFerryData()

      expect(getTripStatus(createTrip({
        name: 'FERRY_DOZEN',
        departureTime: '11:00'
      }))).toBe(2)
      expect(getTripStatus(createTrip({
        name: 'FERRY_DOZEN',
        departureTime: '10:59'
      }))).toBe(0)
    })

    it('FERRY_DOZEN status 3 は startTime と完全一致のみ欠航にする', () => {
      const ferryStore = useFerryStore()
      ferryStore.shipStatus = {
        ...baseShipStatus(),
        dozen: createShipStatus({
          status: 3,
          startTime: '12:30'
        })
      }
      const { getTripStatus } = useFerryData()

      expect(getTripStatus(createTrip({
        name: 'FERRY_DOZEN',
        departureTime: '12:30'
      }))).toBe(2)
      expect(getTripStatus(createTrip({
        name: 'FERRY_DOZEN',
        departureTime: '12:31'
      }))).toBe(0)
    })

    it('FERRY_DOZEN は alert 無しまたは startTime 無しなら 0 を返す', () => {
      const ferryStore = useFerryStore()
      const { getTripStatus } = useFerryData()

      ferryStore.shipStatus = {
        ...baseShipStatus(),
        dozen: createShipStatus({
          hasAlert: false,
          status: 2,
          startTime: '11:00'
        })
      }
      expect(getTripStatus(createTrip({
        name: 'FERRY_DOZEN',
        departureTime: '11:00'
      }))).toBe(0)

      ferryStore.shipStatus = {
        ...baseShipStatus(),
        dozen: createShipStatus({
          status: 2,
          startTime: undefined
        })
      }
      expect(getTripStatus(createTrip({
        name: 'FERRY_DOZEN',
        departureTime: '11:00'
      }))).toBe(0)
    })

    it.each([
      'FERRY_OKI',
      'FERRY_SHIRASHIMA',
      'FERRY_KUNIGA'
    ] as const)('%s は ferryState が欠航なら 2 を返す', (name) => {
      const ferryStore = useFerryStore()
      ferryStore.shipStatus = {
        ...baseShipStatus(),
        ferry: createFerryStatus({
          hasAlert: true,
          ferryState: '欠航'
        })
      }
      const { getTripStatus } = useFerryData()

      expect(getTripStatus(createTrip({ name }))).toBe(2)
    })

    it('未知の trip.name は trip.status を返す', () => {
      const ferryStore = useFerryStore()
      ferryStore.shipStatus = baseShipStatus()
      const { getTripStatus } = useFerryData()

      expect(getTripStatus(createTrip({
        name: 'UNKNOWN',
        status: TripStatus.Extra
      }))).toBe(TripStatus.Extra)
    })
  })

  describe('computed states', () => {
    it('client では ferry store の状態を computed で返す', () => {
      const ferryStore = useFerryStore()
      const trip = createTrip({ name: 'FERRY_OKI' })
      const shipStatus = {
        ...baseShipStatus(),
        ferry: createFerryStatus({
          hasAlert: true,
          ferryState: '欠航'
        })
      }
      ferryStore.timetableData = [trip]
      ferryStore.shipStatus = shipStatus
      ferryStore.departure = 'BEPPU'
      ferryStore.arrival = 'HISHIURA'

      const ferryData = useFerryData()

      expect(ferryData.timetableData.value).toEqual([trip])
      expect(ferryData.shipStatus.value).toEqual(shipStatus)
      expect(ferryData.departure.value).toBe('BEPPU')
      expect(ferryData.arrival.value).toBe('HISHIURA')
    })

    it('client でない場合は store 値のフォールバックを返す', () => {
      processFlags.client = false

      const ferryData = useFerryData()

      expect(ferryData.timetableData.value).toEqual([])
      expect(ferryData.filteredTimetable.value).toEqual([])
      expect(ferryData.shipStatus.value).toEqual(baseShipStatus())
      expect(ferryData.departure.value).toBe('')
      expect(ferryData.arrival.value).toBe('')
      expect(ferryData.selectedDate.value).toBeInstanceOf(Date)
      expect(ferryData.hondoPorts).toEqual([])
    })
  })
})
