import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FormModal from '@/components/admin/FormModal.vue'

const slotStub = { template: '<div><slot /></div>' }

const globalOptions = {
  stubs: {
    Dialog: slotStub,
    DialogPanel: slotStub,
    DialogTitle: slotStub,
    TransitionChild: slotStub,
    TransitionRoot: slotStub
  }
}

describe('FormModal', () => {
  it('shows the submit button by default', () => {
    const wrapper = mount(FormModal, {
      props: {
        open: true,
        title: '確認'
      },
      global: globalOptions
    })

    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('hides the submit button for read-only previews', () => {
    const wrapper = mount(FormModal, {
      props: {
        open: true,
        title: 'プレビュー',
        showSubmit: false
      },
      global: globalOptions
    })

    expect(wrapper.find('button[type="submit"]').exists()).toBe(false)
    expect(wrapper.find('button[type="button"]').text()).toBe('キャンセル')
  })
})
