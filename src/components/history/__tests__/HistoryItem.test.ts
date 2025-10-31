import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import HistoryItem from '../HistoryItem.vue'
import { useFerryStore } from '~/stores/ferry'

// Mock i18n messages
const messages = {
  ja: {
    HONDO: '七類(松江市)または境港(境港市)'
  },
  en: {
    HONDO: 'Shichirui or Sakaiminato'
  }
}

describe('HistoryItem', () => {
  let wrapper: any
  let ferryStore: any

  beforeEach(() => {
    const pinia = createPinia()
    const i18n = createI18n({
      legacy: false,
      locale: 'ja',
      messages
    })

    ferryStore = useFerryStore(pinia)
    
    // Mock some port data
    ferryStore.ports = [
      {
        PORT_ID: 'HONDO_SHICHIRUI',
        PLACE_NAME_JA: '七類港',
        PLACE_NAME_EN: 'Shichirui Port'
      }
    ]

    wrapper = mount(HistoryItem, {
      global: {
        plugins: [pinia, i18n]
      },
      props: {
        history: {
          id: '1',
          type: 'route',
          departure: 'HONDO',
          arrival: 'HONDO_SHICHIRUI',
          date: new Date(),
          searchedAt: new Date()
        }
      }
    })
  })

  it('should translate HONDO port ID correctly in Japanese', () => {
    expect(wrapper.vm.getPortName('HONDO')).toBe('七類(松江市)または境港(境港市)')
  })

  it('should translate regular port IDs correctly', () => {
    expect(wrapper.vm.getPortName('HONDO_SHICHIRUI')).toBe('七類港')
  })

  it('should return port ID as fallback for unknown ports', () => {
    expect(wrapper.vm.getPortName('UNKNOWN_PORT')).toBe('UNKNOWN_PORT')
  })
})

describe('HistoryItem (English)', () => {
  let wrapper: any
  let ferryStore: any

  beforeEach(() => {
    const pinia = createPinia()
    const i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages
    })

    ferryStore = useFerryStore(pinia)
    
    // Mock some port data
    ferryStore.ports = [
      {
        PORT_ID: 'HONDO_SHICHIRUI',
        PLACE_NAME_JA: '七類港',
        PLACE_NAME_EN: 'Shichirui Port'
      }
    ]

    wrapper = mount(HistoryItem, {
      global: {
        plugins: [pinia, i18n]
      },
      props: {
        history: {
          id: '1',
          type: 'route',
          departure: 'HONDO',
          arrival: 'HONDO_SHICHIRUI',
          date: new Date(),
          searchedAt: new Date()
        }
      }
    })
  })

  it('should translate HONDO port ID correctly in English', () => {
    expect(wrapper.vm.getPortName('HONDO')).toBe('Shichirui or Sakaiminato')
  })

  it('should translate regular port IDs correctly in English', () => {
    expect(wrapper.vm.getPortName('HONDO_SHICHIRUI')).toBe('Shichirui Port')
  })
})
