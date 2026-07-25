const LOCALE_ROOT_PATH = /^\/[a-z]{2}(?:-[A-Za-z]{2})?\/?$/
const IOS_BACK_SWIPE_EDGE_PX = 24
const IOS_BACK_SWIPE_MIN_HORIZONTAL_PX = 80
const IOS_BACK_SWIPE_MAX_VERTICAL_PX = 64

export type SwipeCoordinates = {
  startX: number
  startY: number
  endX: number
  endY: number
}

/**
 * Returns whether a route is the app's timetable root, including locale-prefixed roots.
 */
export const isAppRootPath = (path: string): boolean => {
  return path === '/' || LOCALE_ROOT_PATH.test(path)
}

/**
 * Detects a deliberate iOS-style back gesture without taking over ordinary
 * horizontal map or carousel gestures that start away from the screen edge.
 */
export const isIOSBackSwipe = ({ startX, startY, endX, endY }: SwipeCoordinates): boolean => {
  const horizontalDistance = endX - startX
  const verticalDistance = Math.abs(endY - startY)

  return startX <= IOS_BACK_SWIPE_EDGE_PX
    && horizontalDistance >= IOS_BACK_SWIPE_MIN_HORIZONTAL_PX
    && verticalDistance <= IOS_BACK_SWIPE_MAX_VERTICAL_PX
}
