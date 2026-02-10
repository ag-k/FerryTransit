import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Card from '@/components/common/Card.vue'

describe('Card', () => {
  it('デフォルトで基本スタイルと padding を持つ', () => {
    const wrapper = mount(Card, { slots: { default: 'content' } })
    expect(wrapper.text()).toContain('content')
    expect(wrapper.classes()).toContain('bg-app-surface')
    expect(wrapper.classes()).toContain('rounded-xl')
    expect(wrapper.classes()).toContain('shadow-sm')
    expect(wrapper.classes()).toContain('p-4')
  })

  it('padding="none" で余白クラスを付けない', () => {
    const wrapper = mount(Card, { props: { padding: 'none' }, slots: { default: 'x' } })
    expect(wrapper.classes()).not.toContain('p-4')
    expect(wrapper.classes()).not.toContain('p-3')
  })

  it('variant="flat" で shadow を外す', () => {
    const wrapper = mount(Card, { props: { variant: 'flat' }, slots: { default: 'x' } })
    expect(wrapper.classes()).not.toContain('shadow-sm')
  })
})
