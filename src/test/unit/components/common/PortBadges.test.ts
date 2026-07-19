import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PortBadges from '@/components/common/PortBadges.vue'

describe('PortBadges', () => {
  it('バス停の自治体名を識別色付きバッジで表示する', () => {
    const wrapper = mount(PortBadges, {
      props: {
        badges: ['海士町', '西ノ島町', '知夫村', '隠岐の島町']
      }
    })

    const badges = wrapper.findAll('span > span')
    expect(badges.map(badge => badge.text())).toEqual([
      '海士町',
      '西ノ島町',
      '知夫村',
      '隠岐の島町'
    ])
    expect(badges[0]!.classes()).toContain('bg-sky-50')
    expect(badges[1]!.classes()).toContain('bg-emerald-50')
    expect(badges[2]!.classes()).toContain('bg-red-50')
    expect(badges[3]!.classes()).toContain('bg-amber-50')
  })

  it('空配列ではバッジ領域を表示しない', () => {
    const wrapper = mount(PortBadges, { props: { badges: [] } })
    expect(wrapper.find('span').exists()).toBe(false)
  })
})
