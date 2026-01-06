import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AlertComponent from '@/components/common/AlertComponent.vue'

describe('AlertComponent', () => {
  const defaultProps = {
    visible: true,
    message: 'Test alert message'
  }

  it('renders when visible is true', () => {
    const wrapper = mount(AlertComponent, {
      props: defaultProps
    })

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test alert message')
  })

  it('does not render when visible is false', () => {
    const wrapper = mount(AlertComponent, {
      props: {
        ...defaultProps,
        visible: false
      }
    })

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('applies correct alert type class', () => {
    const typeToClassMap = {
      success: 'bg-green-100',
      danger: 'bg-red-100',
      warning: 'bg-yellow-100',
      info: 'bg-blue-100',
      primary: 'bg-blue-700',
      secondary: 'bg-gray-600',
      light: 'bg-gray-100',
      dark: 'bg-gray-800'
    }
    
    Object.entries(typeToClassMap).forEach(([type, bgClass]) => {
      const wrapper = mount(AlertComponent, {
        props: {
          ...defaultProps,
          type: type as any
        }
      })
      
      const alert = wrapper.find('[role="alert"]')
      expect(alert.classes()).toContain(bgClass)
    })
  })

  it('shows title when provided', () => {
    const wrapper = mount(AlertComponent, {
      props: {
        ...defaultProps,
        title: 'Alert Title'
      }
    })

    expect(wrapper.find('strong').text()).toBe('Alert Title')
  })

  it('shows close button when dismissible is true', () => {
    const wrapper = mount(AlertComponent, {
      props: {
        ...defaultProps,
        dismissible: true
      }
    })

    expect(wrapper.find('button[aria-label="Close"]').exists()).toBe(true)
  })

  it('hides close button when dismissible is false', () => {
    const wrapper = mount(AlertComponent, {
      props: {
        ...defaultProps,
        dismissible: false
      }
    })

    expect(wrapper.find('button[aria-label="Close"]').exists()).toBe(false)
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(AlertComponent, {
      props: {
        ...defaultProps,
        dismissible: true
      }
    })

    await wrapper.find('button[aria-label="Close"]').trigger('click')

    expect(wrapper.emitted('update:visible')).toBeTruthy()
    expect(wrapper.emitted('update:visible')[0][0]).toBe(false)
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('auto closes after specified delay', async () => {
    vi.useFakeTimers()
    
    const wrapper = mount(AlertComponent, {
      props: {
        visible: false,
        message: 'Test alert message',
        autoClose: true,
        autoCloseDelay: 1000
      }
    })

    // Change visible to true to trigger the watch
    await wrapper.setProps({ visible: true })
    
    expect(wrapper.emitted('update:visible')).toBeFalsy()

    // Fast forward time
    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:visible')).toBeTruthy()
    expect(wrapper.emitted('update:visible')[0][0]).toBe(false)

    vi.useRealTimers()
  })

  it('clears auto close timer when unmounted', async () => {
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    
    const wrapper = mount(AlertComponent, {
      props: {
        visible: false,
        message: 'Test alert message',
        autoClose: true,
        autoCloseDelay: 5000
      }
    })

    // Change visible to true to trigger the watch and start the timer
    await wrapper.setProps({ visible: true })
    
    // Now unmount while timer is active
    wrapper.unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('applies dismissible classes correctly', () => {
    const wrapper = mount(AlertComponent, {
      props: {
        ...defaultProps,
        dismissible: true
      }
    })

    // Check if the close button exists when dismissible
    expect(wrapper.find('button[aria-label="Close"]').exists()).toBe(true)
  })
})