import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimaryButton from '@/components/common/PrimaryButton.vue'

describe('PrimaryButton', () => {
  it('button としてクリックイベントを emit する', async () => {
    const wrapper = mount(PrimaryButton, { slots: { default: 'OK' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('to 指定時は NuxtLink として描画される', () => {
    const wrapper = mount(PrimaryButton, {
      props: { to: '/news' },
      slots: { default: 'Go' },
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>' }
        }
      }
    })

    expect(wrapper.element.tagName.toLowerCase()).toBe('a')
    expect(wrapper.text()).toContain('Go')
  })

  it('disabled のとき click を emit しない', async () => {
    const wrapper = mount(PrimaryButton, { props: { disabled: true }, slots: { default: 'OK' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })
})
