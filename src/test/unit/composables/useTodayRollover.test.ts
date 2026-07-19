import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { APP_RESUME_EVENT, useTodayRollover } from '@/composables/useTodayRollover'
import { formatDateYmdJst } from '@/utils/jstDate'

const mountHarness = (initialDate: Date) => {
  const selectedDate = ref(initialDate)
  const Component = defineComponent({
    setup() {
      return useTodayRollover({
        selectedDate,
        setSelectedDate: value => { selectedDate.value = value }
      })
    },
    template: '<div />'
  })
  return { selectedDate, wrapper: mount(Component) }
}

describe('useTodayRollover', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('本日を表示中ならアプリ復帰時に翌日へ追随する', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 20, 9, 0))
    const { selectedDate, wrapper } = mountHarness(new Date(2026, 6, 20))

    vi.setSystemTime(new Date(2026, 6, 21, 9, 0))
    window.dispatchEvent(new Event(APP_RESUME_EVENT))

    expect(formatDateYmdJst(selectedDate.value)).toBe('2026-07-21')
    wrapper.unmount()
  })

  it('明示選択した将来日は日付が変わっても保持する', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 20, 9, 0))
    const { selectedDate, wrapper } = mountHarness(new Date(2026, 6, 22))

    vi.setSystemTime(new Date(2026, 6, 21, 9, 0))
    window.dispatchEvent(new Event(APP_RESUME_EVENT))

    expect(formatDateYmdJst(selectedDate.value)).toBe('2026-07-22')
    wrapper.unmount()
  })

  it('日付選択で本日に戻した後は翌日に追随する', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 20, 9, 0))
    const { selectedDate, wrapper } = mountHarness(new Date(2026, 6, 22))

    ;(wrapper.vm as any).selectDate(new Date(2026, 6, 20))
    vi.setSystemTime(new Date(2026, 6, 21, 9, 0))
    window.dispatchEvent(new Event(APP_RESUME_EVENT))

    expect(formatDateYmdJst(selectedDate.value)).toBe('2026-07-21')
    wrapper.unmount()
  })
})
