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

  it('uses ariaLabel in preference to the shared placeholder', () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        ariaLabel: 'From',
        placeholder: 'Search locations'
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

    expect(wrapper.find('[data-testid="port-selector-button"]').attributes('aria-label')).toBe('From')
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
    expect(wrapper.find('[data-testid="port-section-airports"]').exists()).toBe(false)
  })

  it('shows only airport section when allowedLocationType is AIRPORT', async () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        allowedLocationType: 'AIRPORT'
      },
      global: {
        mocks: {
          $t: (key: string) => {
            if (key === 'AIRPORTS_TITLE') return '空港'
            if (key === 'AIRPORT_OKI') return '隠岐空港'
            if (key === 'AIRPORT_IZUMO') return '出雲空港'
            if (key === 'AIRPORT_ITAMI') return '大阪（伊丹）空港'
            return key
          }
        },
        stubs: {
          Teleport: true,
          Icon: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')

    expect(wrapper.find('[data-testid="port-section-airports"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-mainland"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="port-section-busStops"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('隠岐空港')
    expect(wrapper.text()).toContain('出雲空港')
    expect(wrapper.text()).toContain('大阪空港')
    expect(wrapper.text()).toContain('伊丹')
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
    expect(tabs.map(tab => tab.text())).toEqual(['隠岐の島町', '西ノ島町', '海士町', '知夫村'])
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(tabs[0].classes()).toContain('bg-amber-50')
    expect(tabs[1].classes()).toContain('bg-emerald-50')
    expect(tabs[2].classes()).toContain('bg-sky-50')
    expect(tabs[3].classes()).toContain('bg-red-50')

    expect(wrapper.text()).toContain('ポート前')
    expect(wrapper.text()).toContain('隠岐の島町')
    expect(wrapper.text()).toContain('西郷港')
    expect(wrapper.text()).not.toContain('豊田')
    expect(wrapper.text()).not.toContain('隠岐汽船')

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

    expect(wrapper.text()).toContain('豊田')
    expect(wrapper.text()).toContain('海士町')
    expect(wrapper.text()).toContain('隠岐神社前')
    expect(wrapper.text()).toContain('隠岐汽船乗り場')
    expect(wrapper.text()).toContain('菱浦港')
    expect(wrapper.text()).not.toContain('ポート前')

    await updatedTabs[3].trigger('click')

    expect(wrapper.text()).toContain('来居内航船')
    expect(wrapper.text()).toContain('知夫村')
    expect(wrapper.text()).toContain('来居港')
    expect(wrapper.text()).not.toContain('豊田')
    expect(wrapper.text()).not.toContain('隠岐汽船')
  })

  it('defaults the bus stop town tab from the preferred source stop', async () => {
    const store = useFerryStore()
    store.busStops = [
      'BUS_AMA_100_01',
      'BUS_NISHINOSHIMA_nishinoshima_001',
      'BUS_NISHINOSHIMA_nishinoshima_006'
    ]
    store.locationLabels = {
      BUS_AMA_100_01: '豊田',
      BUS_NISHINOSHIMA_nishinoshima_001: '宇賀',
      BUS_NISHINOSHIMA_nishinoshima_006: '隠岐汽船（別府港）'
    }

    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        allowedLocationType: 'STOP',
        preferredBusStopTownSource: 'BUS_NISHINOSHIMA_nishinoshima_001'
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

    const tabs = wrapper.findAll('[data-testid="bus-stop-town-tab"]')
    expect(tabs.map(tab => tab.text())).toEqual(['西ノ島町', '海士町'])
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('宇賀')
    expect(wrapper.text()).toContain('隠岐汽船')
    expect(wrapper.text()).not.toContain('豊田')
  })

  it('shows Ichibata connection stops under the mainland bus stop tab', async () => {
    const store = useFerryStore()
    store.busStops = [
      'BUS_ICHIBATA_CONNECTION_matsue_station',
      'BUS_ICHIBATA_CONNECTION_shichirui_port',
      'BUS_ICHIBATA_CONNECTION_sakaiminato_port',
      'BUS_AMA_100_01'
    ]
    store.locationLabels = {
      BUS_ICHIBATA_CONNECTION_matsue_station: '松江駅',
      BUS_ICHIBATA_CONNECTION_shichirui_port: '七類港',
      BUS_ICHIBATA_CONNECTION_sakaiminato_port: '境港',
      BUS_AMA_100_01: '豊田'
    }

    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        allowedLocationType: 'ALL',
        showTransportTabs: true,
        preferredBusStopTownSource: 'HONDO_SHICHIRUI'
      },
      global: {
        mocks: {
          $t: (key: string) => {
            if (key === 'TRANSPORT_MODES.FERRY') return '船'
            if (key === 'TRANSPORT_MODES.BUS') return 'バス'
            if (key === 'TRANSPORT_MODES.AIR') return '飛行機'
            if (key === 'MAINLAND') return '本土'
            if (key === 'AMA_CHO') return '海士町'
            return key
          }
        },
        stubs: {
          Teleport: true,
          Icon: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')

    const transportTabs = wrapper.findAll('[data-testid="port-selector-transport-tab"]')
    await transportTabs[1].trigger('click')

    const townTabs = wrapper.findAll('[data-testid="bus-stop-town-tab"]')
    expect(townTabs.map(tab => tab.text())).toEqual(['海士町', '本土'])
    expect(townTabs[1].attributes('aria-selected')).toBe('true')
    expect(townTabs[1].classes()).toContain('col-span-2')
    expect(townTabs[0].classes()).toContain('bg-sky-50')
    expect(townTabs[1].classes()).toContain('bg-app-surface-2')
    expect(wrapper.text()).toContain('松江駅')
    expect(wrapper.text()).toContain('七類港')
    expect(wrapper.text()).toContain('境港')
    expect(wrapper.text()).toContain('本土')
    expect(wrapper.text()).not.toContain('豊田')
  })

  it('filters bus stops by route under the selected town tab', async () => {
    const store = useFerryStore()
    store.busStops = [
      'BUS_OKINOSHIMA_port_mae',
      'BUS_OKINOSHIMA_goka_branch',
      'BUS_OKINOSHIMA_igo',
      'BUS_NISHINOSHIMA_nishinoshima_001'
    ]
    store.locationLabels = {
      BUS_OKINOSHIMA_port_mae: 'ポート前',
      BUS_OKINOSHIMA_goka_branch: '五箇支所',
      BUS_OKINOSHIMA_igo: '伊後',
      BUS_NISHINOSHIMA_nishinoshima_001: '宇賀'
    }
    store.busStopRouteFilters = [
      {
        key: 'okinoshima|OKI_ICHIBATA|OKINOSHIMA_CHO|五箇線',
        label: '五箇線',
        operatorId: 'OKI_ICHIBATA',
        townLabelKey: 'OKINOSHIMA_CHO',
        stopCodes: ['BUS_OKINOSHIMA_port_mae', 'BUS_OKINOSHIMA_goka_branch']
      },
      {
        key: 'okinoshima|OKI_ICHIBATA|OKINOSHIMA_CHO|中村線',
        label: '中村線',
        operatorId: 'OKI_ICHIBATA',
        townLabelKey: 'OKINOSHIMA_CHO',
        stopCodes: ['BUS_OKINOSHIMA_port_mae', 'BUS_OKINOSHIMA_igo']
      },
      {
        key: 'nishinoshima|NISHINOSHIMA_TOWN|NISHINOSHIMA_CHO|宇賀線',
        label: '宇賀線',
        operatorId: 'NISHINOSHIMA_TOWN',
        townLabelKey: 'NISHINOSHIMA_CHO',
        stopCodes: ['BUS_NISHINOSHIMA_nishinoshima_001']
      }
    ]

    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        allowedLocationType: 'STOP'
      },
      global: {
        mocks: {
          $t: (key: string) => {
            if (key === 'BUS_ROUTES') return '路線'
            if (key === 'ALL_ROUTES') return 'すべて'
            return key
          }
        },
        stubs: {
          Teleport: true,
          Icon: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')

    expect(wrapper.find('[data-testid="bus-stop-route-filter"]').exists()).toBe(true)
    let routeTabs = wrapper.findAll('[data-testid="bus-stop-route-tab"]')
    expect(routeTabs.map(tab => tab.text())).toEqual(['すべて', '五箇線', '中村線'])
    expect(routeTabs[0]!.attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('五箇支所')
    expect(wrapper.text()).toContain('伊後')

    await routeTabs[1]!.trigger('click')

    routeTabs = wrapper.findAll('[data-testid="bus-stop-route-tab"]')
    expect(routeTabs[1]!.attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('ポート前')
    expect(wrapper.text()).toContain('五箇支所')
    expect(wrapper.text()).not.toContain('伊後')

    await routeTabs[0]!.trigger('click')
    expect(wrapper.text()).toContain('伊後')

    const townTabs = wrapper.findAll('[data-testid="bus-stop-town-tab"]')
    await townTabs[1]!.trigger('click')

    expect(wrapper.find('[data-testid="bus-stop-route-filter"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('宇賀')
    expect(wrapper.text()).not.toContain('五箇支所')
  })

  it('filters bus stops by text across town tabs', async () => {
    const store = useFerryStore()
    store.busStops = [
      'BUS_AMA_100_01',
      'BUS_NISHINOSHIMA_nishinoshima_001',
      'BUS_NISHINOSHIMA_nishinoshima_006',
      'BUS_OKINOSHIMA_goka_clinic'
    ]
    store.locationLabels = {
      BUS_AMA_100_01: '豊田',
      BUS_NISHINOSHIMA_nishinoshima_001: '宇賀',
      BUS_NISHINOSHIMA_nishinoshima_006: '隠岐汽船（別府港）',
      BUS_OKINOSHIMA_goka_clinic: '五箇診療所前'
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
          Teleport: true,
          Icon: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')
    await wrapper.find('[data-testid="port-selector-search-input"]').setValue('五箇')

    expect(wrapper.find('[data-testid="bus-stop-town-tabs"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('五箇診療所前')
    expect(wrapper.text()).toContain('隠岐の島町')
    expect(wrapper.text()).not.toContain('豊田')
    expect(wrapper.text()).not.toContain('宇賀')
    expect(wrapper.text()).not.toContain('隠岐汽船')
  })

  it('separates ship ports and bus stops by transport tabs when enabled', async () => {
    const store = useFerryStore()
    store.busStops = ['BUS_AMA_100_01', 'BUS_NISHINOSHIMA_nishinoshima_006']
    store.locationLabels = {
      BUS_AMA_100_01: '豊田',
      BUS_NISHINOSHIMA_nishinoshima_006: '隠岐汽船（別府港）'
    }

    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        allowedLocationType: 'ALL',
        showTransportTabs: true
      },
      global: {
        mocks: {
          $t: (key: string) => {
            if (key === 'TRANSPORT_MODES.FERRY') return '船'
            if (key === 'TRANSPORT_MODES.BUS') return 'バス'
            if (key === 'TRANSPORT_MODES.AIR') return '飛行機'
            if (key === 'AIRPORTS_TITLE') return '空港'
            return key
          }
        },
        stubs: {
          Teleport: true,
          Icon: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')

    const tabs = wrapper.findAll('[data-testid="port-selector-transport-tab"]')
    expect(tabs).toHaveLength(3)
    expect(tabs.map(tab => tab.text())).toEqual(['船', 'バス', '飛行機'])
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-testid="port-section-mainland"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-dozen"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-dogo"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-busStops"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('豊田')

    await tabs[1].trigger('click')

    const updatedTabs = wrapper.findAll('[data-testid="port-selector-transport-tab"]')
    expect(updatedTabs[1].attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-testid="port-section-busStops"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-mainland"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="port-section-dozen"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="port-section-dogo"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('隠岐汽船')
    expect(wrapper.text()).toContain('西ノ島町')
    expect(wrapper.text()).not.toContain('豊田')

    await updatedTabs[2].trigger('click')
    expect(wrapper.find('[data-testid="port-section-airports"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-busStops"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('空港')
  })

  it('defaults to the bus tab when the preferred source is a bus stop', async () => {
    const store = useFerryStore()
    store.busStops = ['BUS_NISHINOSHIMA_nishinoshima_001']
    store.locationLabels = {
      BUS_NISHINOSHIMA_nishinoshima_001: '宇賀'
    }

    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        allowedLocationType: 'ALL',
        showTransportTabs: true,
        preferredBusStopTownSource: 'BUS_NISHINOSHIMA_nishinoshima_001'
      },
      global: {
        mocks: {
          $t: (key: string) => {
            if (key === 'TRANSPORT_MODES.FERRY') return '船'
            if (key === 'TRANSPORT_MODES.BUS') return 'バス'
            return key
          }
        },
        stubs: {
          Teleport: true,
          Icon: true
        }
      }
    })

    await wrapper.find('[data-testid="port-selector-button"]').trigger('click')

    const tabs = wrapper.findAll('[data-testid="port-selector-transport-tab"]')
    expect(tabs[0].attributes('aria-selected')).toBe('false')
    expect(tabs[1].attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-testid="port-section-busStops"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="port-section-dozen"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('宇賀')
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
