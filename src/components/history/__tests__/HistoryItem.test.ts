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
    const text = wrapper.text()
    expect(text).toContain('七類')
    expect(text).toContain('境港')
  })

  it('should translate regular port IDs correctly', () => {
    const text = wrapper.text()
    expect(text).toContain('七類港')
  })

  it('should return port ID as fallback for unknown ports', () => {
    wrapper = mount(HistoryItem, {
      global: {
        plugins: [createPinia(), createI18n({ legacy: false, locale: 'ja', messages })]
      },
      props: {
        history: {
          id: '1',
          type: 'route',
          departure: 'UNKNOWN_PORT',
          arrival: 'HONDO_SHICHIRUI',
          date: new Date(),
          searchedAt: new Date()
        }
      }
    })
    expect(wrapper.text()).toContain('UNKNOWN_PORT')
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
    const text = wrapper.text()
    expect(text).toContain('Shichirui')
    expect(text).toContain('Sakaiminato')
  })

  it('should translate regular port IDs correctly in English', () => {
    const text = wrapper.text()
    expect(text).toContain('Shichirui Port')
  })
})
