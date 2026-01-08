import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Badge from '@/components/common/Badge.vue'

describe('Badge', () => {
  it('pill=true のとき rounded-full になる', () => {
    const wrapper = mount(Badge, { props: { pill: true }, slots: { default: 'X' } })
    expect(wrapper.classes()).toContain('rounded-full')
  })

  it('variant を data ではなく class で表現し、最低限のベースクラスを持つ', () => {
    const wrapper = mount(Badge, { props: { variant: 'danger' }, slots: { default: 'Danger' } })
    expect(wrapper.classes()).toContain('inline-flex')
    expect(wrapper.text()).toContain('Danger')
  })
})
