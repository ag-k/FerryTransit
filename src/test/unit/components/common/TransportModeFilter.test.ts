import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TransportModeFilter from '@/components/common/TransportModeFilter.vue'

describe('TransportModeFilter', () => {
  it('交通モードをアクセシブルなタブとして表示して選択を通知する', async () => {
    const wrapper = mount(TransportModeFilter, {
      props: {
        modelValue: 'FERRY',
        options: ['FERRY', 'BUS', 'AIR']
      },
      global: {
        stubs: {
          Icon: { template: '<span aria-hidden="true" />' }
        }
      }
    })

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(3)
    expect(tabs.map(tab => tab.text())).toEqual(['FERRY', 'BUS', 'AIR'])
    expect(tabs[0]!.attributes('aria-selected')).toBe('true')

    await tabs[1]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['BUS']])
  })

  it('選択肢が1件以下なら重複するモード選択を表示しない', () => {
    const wrapper = mount(TransportModeFilter, {
      props: {
        modelValue: 'FERRY',
        options: ['FERRY']
      }
    })

    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
  })
})
