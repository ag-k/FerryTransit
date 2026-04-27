type LeafletDraggingLike = {
  enable?: () => void
  disable?: () => void
  enabled?: () => boolean
}

type LeafletMapLike = {
  dragging?: LeafletDraggingLike | null
}

type InstallLeafletTwoFingerTouchGuardOptions = {
  map: LeafletMapLike | null | undefined
  container: HTMLElement | null | undefined
  isTouchDevice?: () => boolean
  onSingleTouchMove?: () => void
}

const getTouchCount = (event: Event) => {
  const touchEvent = event as TouchEvent
  return typeof touchEvent.touches?.length === 'number' ? touchEvent.touches.length : 0
}

export const isLeafletTouchGuardTargetDevice = () => {
  if (typeof window === 'undefined') return false

  const hasCoarsePointer = typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false
  const maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0

  return hasCoarsePointer || maxTouchPoints > 0
}

export const installLeafletTwoFingerTouchGuard = ({
  map,
  container,
  isTouchDevice = isLeafletTouchGuardTargetDevice,
  onSingleTouchMove
}: InstallLeafletTwoFingerTouchGuardOptions) => {
  const dragging = map?.dragging

  if (!container || !dragging?.enable || !dragging.disable || !isTouchDevice()) {
    return () => {}
  }

  const restoreDraggingEnabled = typeof dragging.enabled === 'function' ? dragging.enabled() : true
  let draggingEnabled = restoreDraggingEnabled

  const updateDraggingState = (enabled: boolean) => {
    if (enabled === draggingEnabled) return

    if (enabled) {
      dragging.enable?.()
    } else {
      dragging.disable?.()
    }

    draggingEnabled = enabled
  }

  updateDraggingState(false)

  const onTouchStart = (event: Event) => {
    updateDraggingState(getTouchCount(event) >= 2)
  }

  const onTouchMove = (event: Event) => {
    const isMultiTouch = getTouchCount(event) >= 2
    updateDraggingState(isMultiTouch)

    if (!isMultiTouch) {
      onSingleTouchMove?.()
    }
  }

  const onTouchEnd = (event: Event) => {
    updateDraggingState(getTouchCount(event) >= 2)
  }

  container.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
  container.addEventListener('touchmove', onTouchMove, { capture: true, passive: true })
  container.addEventListener('touchend', onTouchEnd, { capture: true, passive: true })
  container.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: true })

  return () => {
    container.removeEventListener('touchstart', onTouchStart, true)
    container.removeEventListener('touchmove', onTouchMove, true)
    container.removeEventListener('touchend', onTouchEnd, true)
    container.removeEventListener('touchcancel', onTouchEnd, true)
    updateDraggingState(restoreDraggingEnabled)
  }
}
