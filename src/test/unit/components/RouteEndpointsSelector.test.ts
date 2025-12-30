import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import RouteEndpointsSelector from '@/components/common/RouteEndpointsSelector.vue'

const PortSelectorStub = defineComponent({
  name: 'PortSelector',
  props: [
    'modelValue',
    'placeholder',
    'disabled',
    'disabledPorts',
    'hondoPorts',
    'dozenPorts',
    'dogoPorts',
    'margin'
  ],
  emits: ['update:modelValue'],
  methods: {
    nextValue() {
      // テストでは $t がキー文字列を返す想定なので placeholder で出発/目的地を判別する
      return this.placeholder === 'DEPARTURE' ? 'HONDO_SHICHIRUI' : 'SAIGO'
    }
  },
  template: `
    <button
      type="button"
      :data-testid="'port-selector-stub-' + placeholder"
      @click="$emit('update:modelValue', nextValue())"
    >
      {{ modelValue || placeholder }}
    </button>
  `
})

describe('RouteEndpointsSelector', () => {
  const mountComponent = (props?: Partial<{ departure: string; arrival: string; disabled: boolean; showVia: boolean }>) => {
    return mount(RouteEndpointsSelector, {
      props: {
        departure: '',
        arrival: '',
        hondoPorts: ['HONDO', 'HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'],
        ...props
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          PortSelector: PortSelectorStub
        }
      }
    })
  }

  it('renders labels and actions', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-testid="route-endpoints-selector"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="route-endpoints-from-label"]').text()).toBe('_FROM')
    expect(wrapper.find('[data-testid="route-endpoints-to-label"]').text()).toBe('_TO')
    expect(wrapper.find('[data-testid="route-endpoints-add-via"]').text()).toContain('VIA')
    expect(wrapper.find('button[aria-label="Reverse route"]').exists()).toBe(true)
  })

  it('emits update:departure when departure selector updates', async () => {
    const wrapper = mountComponent()
    await wrapper.find('[data-testid="port-selector-stub-DEPARTURE"]').trigger('click')
    expect(wrapper.emitted('update:departure')).toBeTruthy()
    expect(wrapper.emitted('update:departure')![0][0]).toBe('HONDO_SHICHIRUI')
  })

  it('emits update:arrival when arrival selector updates', async () => {
    const wrapper = mountComponent()
    await wrapper.find('[data-testid="port-selector-stub-ARRIVAL"]').trigger('click')
    expect(wrapper.emitted('update:arrival')).toBeTruthy()
    expect(wrapper.emitted('update:arrival')![0][0]).toBe('SAIGO')
  })

  it('shows clear buttons when values are set and emits empty string when cleared', async () => {
    const wrapper = mountComponent({ departure: 'HONDO_SHICHIRUI', arrival: 'SAIGO' })

    expect(wrapper.find('[data-testid="route-endpoints-clear-departure"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="route-endpoints-clear-arrival"]').exists()).toBe(true)

    await wrapper.find('[data-testid="route-endpoints-clear-departure"]').trigger('click')
    expect(wrapper.emitted('update:departure')).toBeTruthy()
    expect(wrapper.emitted('update:departure')!.at(-1)![0]).toBe('')

    await wrapper.find('[data-testid="route-endpoints-clear-arrival"]').trigger('click')
    expect(wrapper.emitted('update:arrival')).toBeTruthy()
    expect(wrapper.emitted('update:arrival')!.at(-1)![0]).toBe('')
  })

  it('disables mainland ports when the other side is mainland', () => {
    const wrapper = mountComponent({ departure: '', arrival: 'HONDO_SHICHIRUI' })
    const stubs = wrapper.findAllComponents(PortSelectorStub)
    const depStub = stubs.find(w => w.props('placeholder') === 'DEPARTURE')!
    expect(depStub.props('disabledPorts')).toEqual(expect.arrayContaining(['HONDO', 'HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO']))
  })

  it('auto-clears arrival when both departure and arrival are mainland ports', () => {
    const wrapper = mountComponent({ departure: 'HONDO_SHICHIRUI', arrival: 'HONDO_SAKAIMINATO' })
    expect(wrapper.emitted('update:arrival')).toBeTruthy()
    expect(wrapper.emitted('update:arrival')!.at(-1)![0]).toBe('')
  })

  it('emits reverse when swap button is clicked', async () => {
    const wrapper = mountComponent()
    await wrapper.find('button[aria-label="Reverse route"]').trigger('click')
    expect(wrapper.emitted('reverse')).toBeTruthy()
  })

  it('emits addVia when +via is clicked', async () => {
    const wrapper = mountComponent()
    await wrapper.find('[data-testid="route-endpoints-add-via"]').trigger('click')
    expect(wrapper.emitted('addVia')).toBeTruthy()
  })

  it('hides +via button when showVia is false', () => {
    const wrapper = mountComponent({ showVia: false })
    expect(wrapper.find('[data-testid="route-endpoints-add-via"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Reverse route"]').exists()).toBe(true)
  })
})
