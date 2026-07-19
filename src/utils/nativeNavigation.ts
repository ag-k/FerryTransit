const LOCALE_ROOT_PATH = /^\/[a-z]{2}(?:-[A-Za-z]{2})?\/?$/

/**
 * Returns whether a route is the app's timetable root, including locale-prefixed roots.
 */
export const isAppRootPath = (path: string): boolean => {
  return path === '/' || LOCALE_ROOT_PATH.test(path)
}
