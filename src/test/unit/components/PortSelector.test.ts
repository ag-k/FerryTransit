import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PortSelector from '@/components/common/PortSelector.vue'
import { useFerryStore } from '@/stores/ferry'

describe('PortSelector', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const defaultProps = {
    modelValue: ''
  }

  it('renders correctly', () => {
    const wrapper = mount(PortSelector, {
      props: defaultProps
    })

    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.findAll('optgroup')).toHaveLength(3)
  })

  it('displays port options grouped by region', () => {
    const wrapper = mount(PortSelector, {
      props: defaultProps
    })

    const optgroups = wrapper.findAll('optgroup')
    expect(optgroups[0].attributes('label')).toBe('MAINLAND')
    expect(optgroups[1].attributes('label')).toBe('DOZEN')
    expect(optgroups[2].attributes('label')).toBe('DOGO')
  })

  it('shows correct ports in each group', () => {
    const store = useFerryStore()
    const wrapper = mount(PortSelector, {
      props: defaultProps
    })

    const optgroups = wrapper.findAll('optgroup')
    
    // Check mainland ports
    const mainlandOptions = optgroups[0].findAll('option')
    expect(mainlandOptions).toHaveLength(store.hondoPorts.length)
    
    // Check dozen ports
    const dozenOptions = optgroups[1].findAll('option')
    expect(dozenOptions).toHaveLength(store.dozenPorts.length)
    
    // Check dogo ports
    const dogoOptions = optgroups[2].findAll('option')
    expect(dogoOptions).toHaveLength(store.dogoPorts.length)
  })

  it('emits update:modelValue when selection changes', async () => {
    const wrapper = mount(PortSelector, {
      props: defaultProps
    })

    const select = wrapper.find('select')
    await select.setValue('SAIGO')

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
      }
    })

    expect(wrapper.find('label').text()).toBe('Select Port')
  })

  it('shows placeholder when provided', () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        placeholder: 'Choose a port'
      }
    })

    const placeholderOption = wrapper.find('option[disabled]')
    expect(placeholderOption.exists()).toBe(true)
    expect(placeholderOption.text()).toBe('Choose a port')
  })

  it('shows hint when provided', () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        hint: 'Select departure port'
      }
    })

    expect(wrapper.find('small.text-gray-500').text()).toBe('Select departure port')
  })

  it('disables select when disabled prop is true', () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        disabled: true
      }
    })

    const select = wrapper.find('select')
    expect(select.attributes('disabled')).toBeDefined()
  })

  it('disables specific ports when disabledPorts is provided', () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        disabledPorts: ['SAIGO', 'BEPPU']
      }
    })

    const saigoOption = wrapper.find('option[value="SAIGO"]')
    const beppuOption = wrapper.find('option[value="BEPPU"]')
    
    expect(saigoOption.attributes('disabled')).toBeDefined()
    expect(beppuOption.attributes('disabled')).toBeDefined()
  })

  it('reflects the current modelValue', () => {
    const wrapper = mount(PortSelector, {
      props: {
        ...defaultProps,
        modelValue: 'HONDO_SHICHIRUI'
      }
    })

    const select = wrapper.find('select')
    expect(select.element.value).toBe('HONDO_SHICHIRUI')
  })
})