import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFareStore } from '@/stores/fare'
import type { FareMaster } from '@/types/fare'

const baseFareMaster: FareMaster = {
  versions: [
    {
      id: 'v-high',
      vesselType: 'highspeed',
      name: '高速船現行',
      effectiveFrom: '2024-01-01',
      routes: [
        {
          id: 'hondo-oki',
          departure: 'HONDO',
          arrival: 'OKI',
          fares: {
            adult: 6680,
            child: 3340
          }
        },
        {
          id: 'dozen-dogo',
          departure: 'DOZEN',
          arrival: 'DOGO',
          fares: {
            adult: 4890,
            child: 2450
          }
        },
        {
          id: 'beppu-hishiura',
          departure: 'BEPPU',
          arrival: 'HISHIURA',
          fares: {
            adult: 2450,
            child: 1220
          }
        }
      ]
    }
  ],
  routes: [],
  activeVersionIds: {
    highspeed: 'v-high'
  },
  discounts: {},
  notes: []
}

const cloneFareMaster = (): FareMaster => JSON.parse(JSON.stringify(baseFareMaster))

vi.mock('@/stores/offline', () => ({
  useOfflineStore: () => ({
    fetchFareData: vi.fn(async () => cloneFareMaster()),
    saveFareData: vi.fn(),
    getFareData: vi.fn(() => cloneFareMaster())
  })
}))

describe('useFareStore highspeed route resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('maps mainland <-> Saigo queries to the canonical highspeed fare', async () => {
    const fareStore = useFareStore()
    await fareStore.loadFareMaster()

    const route = fareStore.getFareByRoute(
      'HONDO_SHICHIRUI',
      'SAIGO',
      { vesselType: 'highspeed' }
    )

    expect(route?.id).toBe('hondo-oki')
    expect(route?.fares?.adult).toBe(6680)
  })

  it('maps Dozen <-> Dogo queries to the shared highspeed fare', async () => {
    const fareStore = useFareStore()
    await fareStore.loadFareMaster()

    const route = fareStore.getFareByRoute(
      'SAIGO',
      'BEPPU',
      { vesselType: 'highspeed' }
    )

    expect(route?.id).toBe('dozen-dogo')
    expect(route?.fares?.adult).toBe(4890)
  })

  it('returns direct highspeed fares for inner island express routes', async () => {
    const fareStore = useFareStore()
    await fareStore.loadFareMaster()

    const route = fareStore.getFareByRoute(
      'BEPPU',
      'HISHIURA',
      { vesselType: 'highspeed' }
    )

    expect(route?.id).toBe('beppu-hishiura')
    expect(route?.fares?.adult).toBe(2450)
  })
})
