import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { useOfflineStore } from './offline'
import type { FareMaster, FareRoute } from '@/types/fare'

export const useFareStore = defineStore('fare', () => {
  // State
  const fareMaster = ref<FareMaster | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const getFareByRoute = computed(() => {
    return (departure: string, arrival: string): FareRoute | undefined => {
      if (!fareMaster.value) return undefined
      
      return fareMaster.value.routes.find(
        route => route.departure === departure && route.arrival === arrival
      )
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
        fareMaster.value = data
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
    isInnerIslandRoute,
    
    // Actions
    loadFareMaster
  }
})
