import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PortSelector from '@/components/common/PortSelector.vue'
import { useFerryStore } from '@/stores/ferry'
import { useFavoriteStore } from '@/stores/favorite'

describe('PortSelector', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const defaultProps = {
    modelValue: ''
  }

  it('renders correctly', () => {
    const wrapper = mount(PortSelector, {
      props: defaultProps,
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    expect(wrapper.find('[data-testid="port-selector-button"]').exists()).toBe(true)
  })

  it('displays port options grouped by region', async () => {
    const wrapper = mount(PortSelector, {
      props: defaultProps,
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')
    expect(wrapper.find('[data-testid="port-selector-modal"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-mainland"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-dozen"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-dogo"]').exists()).toBe(true)
  })

  it('shows correct ports in each group', async () => {
    const store = useFerryStore()
    const wrapper = mount(PortSelector, {
      props: defaultProps,
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')

    const mainlandButtons = wrapper.find('[data-testid="port-section-mainland"]').findAll('button')
    const dozenButtons = wrapper.find('[data-testid="port-section-dozen"]').findAll('button')
    const dogoButtons = wrapper.find('[data-testid="port-section-dogo"]').findAll('button')

    expect(mainlandButtons).toHaveLength(store.hondoPorts.length)
    expect(dozenButtons).toHaveLength(store.dozenPorts.length)
    expect(dogoButtons).toHaveLength(store.dogoPorts.length)
  })

  it('shows only port sections when allowedLocationType is PORT', async () => {
    const store = useFerryStore()
    store.busStops = ['BUS_AMA_100_01']

    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        allowedLocationType: 'PORT'
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')

    expect(wrapper.find('[data-testid="port-section-busStops"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="port-section-mainland"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-dozen"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-dogo"]').exists()).toBe(true)
  })

  it('shows bus stop section grouped by town tabs when allowedLocationType is STOP', async () => {
    const store = useFerryStore()
    store.busStops = [
      'BUS_AMA_100_01',
      'BUS_AMA_100_02',
      'BUS_AMA_126_01',
      'BUS_NISHINOSHIMA_nishinoshima_006',
      'BUS_CHIBU_kuri_naikosen',
      'BUS_OKINOSHIMA_port_mae'
    ]
    store.locationLabels = {
      BUS_AMA_100_01: '豊田',
      BUS_AMA_100_02: '隠岐神社前',
      BUS_AMA_126_01: '隠岐汽船乗り場',
      BUS_NISHINOSHIMA_nishinoshima_006: '隠岐汽船（別府港）',
      BUS_CHIBU_kuri_naikosen: '来居内航船',
      BUS_OKINOSHIMA_port_mae: 'ポート前'
    }

    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        allowedLocationType: 'STOP'
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')

    expect(wrapper.find('[data-testid="port-section-busStops"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-mainland"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="port-section-dozen"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="port-section-dogo"]').exists()).toBe(false)

    const tabs = wrapper.findAll('[data-testid="bus-stop-town-tab"]')
    expect(tabs).toHaveLength(4)
    expect(tabs.map(tab => tab.text())).toEqual(['海士町', '西ノ島町', '知夫村', '隠岐の島町'])
    expect(tabs[0].attributes('aria-selected')).toBe('true')

    expect(wrapper.text()).toContain('豊田')
    expect(wrapper.text()).toContain('海士町')
    expect(wrapper.text()).toContain('隠岐神社前')
    expect(wrapper.text()).toContain('隠岐汽船乗り場')
    expect(wrapper.text()).toContain('菱浦港')
    expect(wrapper.text()).not.toContain('別府港')

    await tabs[1].trigger('click')

    const updatedTabs = wrapper.findAll('[data-testid="bus-stop-town-tab"]')
    expect(updatedTabs[1].attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('隠岐汽船')
    expect(wrapper.text()).toContain('西ノ島町')
    expect(wrapper.text()).toContain('別府港')
    expect(wrapper.text()).not.toContain('豊田')
    expect(wrapper.text()).not.toContain('隠岐神社前')
    expect(wrapper.text()).not.toContain('菱浦港')

    await updatedTabs[2].trigger('click')

    expect(wrapper.text()).toContain('来居内航船')
    expect(wrapper.text()).toContain('知夫村')
    expect(wrapper.text()).toContain('来居港')
    expect(wrapper.text()).not.toContain('隠岐汽船')

    await updatedTabs[3].trigger('click')

    expect(wrapper.text()).toContain('ポート前')
    expect(wrapper.text()).toContain('隠岐の島町')
    expect(wrapper.text()).toContain('西郷港')
    expect(wrapper.text()).not.toContain('来居内航船')
  })

  it('emits update:modelValue when selecting a port in the modal', async () => {
    const wrapper = mount(PortSelector, {
      props: defaultProps,
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')
    const saigoButton = wrapper.find('[data-testid="port-section-dogo"]').find('button')
    await saigoButton.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0][0]).toBe('SAIGO')
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')[0][0]).toBe('SAIGO')
  })

  it('shows label when provided', () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        label: 'Select Port'
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    expect(wrapper.find('label').text()).toBe('Select Port')
  })

  it('shows placeholder when provided', () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        placeholder: 'Choose a port'
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    const button = wrapper.find('[data-testid="port-selector-button"]')
    expect(button.text()).toContain('Choose a port')
  })

  it('shows hint when provided', () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        hint: 'Select departure port'
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    expect(wrapper.find('small.text-app-muted').text()).toBe('Select departure port')
  })

  it('disables button when disabled prop is true', () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        disabled: true
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    const button = wrapper.find('[data-testid="port-selector-button"]')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('disables specific ports when disabledPorts is provided', async () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        disabledPorts: ['SAIGO', 'BEPPU']
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')

    const saigoButton = wrapper.findAll('button').find(b => b.text() === 'SAIGO')
    const beppuButton = wrapper.findAll('button').find(b => b.text() === 'BEPPU')

    expect(saigoButton).toBeTruthy()
    expect(beppuButton).toBeTruthy()
    expect(saigoButton!.attributes('disabled')).toBeDefined()
    expect(beppuButton!.attributes('disabled')).toBeDefined()
  })

  it('reflects the current modelValue', () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        modelValue: 'HONDO_SHICHIRUI'
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    const button = wrapper.find('[data-testid="port-selector-button"]')
    expect(button.text()).toContain('HONDO_SHICHIRUI')
  })

  it('shows favorites section on top when favorite ports exist', async () => {
    const favoriteStore = useFavoriteStore()
    favoriteStore.addFavoritePort({ portCode: 'SAIGO' })

    const wrapper = mount(PortSelector, {
      props: defaultProps,
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')

    expect(wrapper.find('[data-testid="port-section-favorites"]').exists()).toBe(true)

    const sectionEls = wrapper.findAll('section')
    expect(sectionEls.length).toBeGreaterThan(0)
    expect(sectionEls[0].attributes('data-testid')).toBe('port-section-favorites')
  })

  it('shows favorite routes section on top when favorite routes exist', async () => {
    const favoriteStore = useFavoriteStore()
    favoriteStore.addFavoriteRoute({ departure: 'HONDO_SHICHIRUI', arrival: 'SAIGO' })

    const wrapper = mount(PortSelector, {
      props: defaultProps,
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')

    expect(wrapper.find('[data-testid="port-section-favorite-routes"]').exists()).toBe(true)
    const sectionEls = wrapper.findAll('section')
    expect(sectionEls.length).toBeGreaterThan(0)
    expect(sectionEls[0].attributes('data-testid')).toBe('port-section-favorite-routes')
  })

  it('emits selectRoute when a favorite route is selected', async () => {
    const favoriteStore = useFavoriteStore()
    favoriteStore.addFavoriteRoute({ departure: 'HONDO_SHICHIRUI', arrival: 'SAIGO' })

    const wrapper = mount(PortSelector, {
      props: defaultProps,
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          Teleport: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')
    const routeButton = wrapper.find('[data-testid="port-section-favorite-routes"]').find('button')
    await routeButton.trigger('click')

    expect(wrapper.emitted('selectRoute')).toBeTruthy()
    expect(wrapper.emitted('selectRoute')![0][0]).toMatchObject({
      departure: 'HONDO_SHICHIRUI',
      arrival: 'SAIGO'
    })
  })
})
