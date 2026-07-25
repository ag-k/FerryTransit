import { describe, expect, it, vi } from 'vitest'
import {
  installLeafletTwoFingerTouchGuard,
  isLeafletTouchGuardTargetDevice
} from '@/utils/leafletTouchGuard'

const createTouchEvent = (type: string, touchCount: number) => {
  const event = new Event(type)
  Object.defineProperty(event, 'touches', {
    configurable: true,
    value: Array.from({ length: touchCount }, () => ({}))
  })
  return event
}

const createDragging = (initialEnabled = true) => {
  let enabled = initialEnabled

  return {
    enable: vi.fn(() => {
      enabled = true
    }),
    disable: vi.fn(() => {
      enabled = false
    }),
    enabled: vi.fn(() => enabled)
  }
}

describe('leafletTouchGuard', () => {
  it('タッチ端末で初期状態を無効化し、2本指のときだけドラッグを有効化する', () => {
    const container = document.createElement('div')
    const dragging = createDragging(true)
    const onSingleTouchMove = vi.fn()

    const cleanup = installLeafletTwoFingerTouchGuard({
      map: { dragging },
      container,
      isTouchDevice: () => true,
      onSingleTouchMove
    })

    expect(dragging.disable).toHaveBeenCalledTimes(1)
    expect(dragging.enabled()).toBe(false)

    container.dispatchEvent(createTouchEvent('touchstart', 1))
    container.dispatchEvent(createTouchEvent('touchmove', 1))

    expect(dragging.enabled()).toBe(false)
    expect(onSingleTouchMove).toHaveBeenCalledTimes(1)

    container.dispatchEvent(createTouchEvent('touchstart', 2))
    expect(dragging.enabled()).toBe(true)

    container.dispatchEvent(createTouchEvent('touchend', 1))
    expect(dragging.enabled()).toBe(false)

    cleanup()
    expect(dragging.enabled()).toBe(true)
  })

  it('非タッチ端末では何もしない', () => {
    const container = document.createElement('div')
    const dragging = createDragging(true)

    const cleanup = installLeafletTwoFingerTouchGuard({
      map: { dragging },
      container,
      isTouchDevice: () => false
    })

    expect(dragging.disable).not.toHaveBeenCalled()
    cleanup()
    expect(dragging.enable).not.toHaveBeenCalled()
  })

  it('coarse pointer または maxTouchPoints をタッチ端末として判定する', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true })
    const originalMatchMedia = window.matchMedia
    const originalMaxTouchPoints = navigator.maxTouchPoints

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: matchMedia
    })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 0
    })

    expect(isLeafletTouchGuardTargetDevice()).toBe(true)

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false })
    })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 2
    })

    expect(isLeafletTouchGuardTargetDevice()).toBe(true)

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia
    })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: originalMaxTouchPoints
    })
  })
})
