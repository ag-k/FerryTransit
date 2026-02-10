import { useFerryStore } from '@/stores/ferry'

let inFlightPromise: Promise<void> | null = null

export const useTimetableLoader = () => {
  const ferryStore = process.client ? useFerryStore() : null

  const ensureTimetableLoaded = (force = false): Promise<void> => {
    if (!ferryStore) {
      return Promise.resolve()
    }

    if (!force && inFlightPromise) {
      return inFlightPromise
    }

    const hasTimetable = ferryStore.timetableData.length > 0
    const isStale = isFerryStoreDataStale(ferryStore)
    const shouldFetch = force || !hasTimetable || isStale

    if (!shouldFetch) {
      return Promise.resolve()
    }

    const fetchPromise = ferryStore.fetchTimetable(force)

    if (force) {
      return fetchPromise
    }

    const trackedPromise = fetchPromise.finally(() => {
      if (inFlightPromise === trackedPromise) {
        inFlightPromise = null
      }
    })

    inFlightPromise = trackedPromise
    return trackedPromise
  }

  return {
    ensureTimetableLoaded
  }
}

const isFerryStoreDataStale = (ferryStore: ReturnType<typeof useFerryStore>): boolean => {
  try {
    const value = ferryStore.isDataStale
    return typeof value === 'boolean' ? value : Boolean((value as { value?: unknown })?.value)
  } catch (error) {
    return true
  }
}
