import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToggleSwitch from '../ToggleSwitch.vue'

describe('ToggleSwitch', () => {
  it('ラベルが表示される', () => {
    const wrapper = mount(ToggleSwitch, {
      props: {
        checked: false,
        label: 'テストラベル'
      }
    })

    expect(wrapper.text()).toContain('テストラベル')
  })

  it('説明が表示される', () => {
    const wrapper = mount(ToggleSwitch, {
      props: {
        checked: false,
        label: 'テストラベル',
        description: 'テストの説明'
      }
    })

    expect(wrapper.text()).toContain('テストの説明')
  })

  it('チェック状態が正しく反映される', () => {
    const wrapper = mount(ToggleSwitch, {
      props: {
        checked: true,
        label: 'テストラベル'
      }
    })

    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })

  it('クリック時にイベントが発火する', async () => {
    const wrapper = mount(ToggleSwitch, {
      props: {
        checked: false,
        label: 'テストラベル'
      }
    })

    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)

    expect(wrapper.emitted('update:checked')).toBeTruthy()
    expect(wrapper.emitted('update:checked')?.[0]).toEqual([true])
  })

  it('チェック状態に応じてスタイルが変わる', async () => {
    const wrapper = mount(ToggleSwitch, {
      props: {
        checked: false,
        label: 'テストラベル'
      }
    })

    const label = wrapper.find('.toggle-label')
    expect(label.classes()).toContain('bg-app-border')

    await wrapper.setProps({ checked: true })
    expect(label.classes()).toContain('bg-app-primary')
  })

  it('説明がない場合は説明要素が表示されない', () => {
    const wrapper = mount(ToggleSwitch, {
      props: {
        checked: false,
        label: 'テストラベル'
      }
    })

    const description = wrapper.find('.text-xs.text-app-muted')
    expect(description.exists()).toBe(false)
  })
})
