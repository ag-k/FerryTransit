import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SecondaryButton from '@/components/common/SecondaryButton.vue'

describe('SecondaryButton', () => {
  it('keeps a 48px minimum touch target at every visual size', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const wrapper = mount(SecondaryButton, {
        props: { size },
        slots: { default: 'Action' }
      })

      expect(wrapper.get('button').classes()).toContain('min-h-12')
    }
  })
})
