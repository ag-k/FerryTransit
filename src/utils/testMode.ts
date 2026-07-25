export const TEST_MODE_STORAGE_KEY = 'ferry-transit:test-mode'

export const isBrowserTestMode = (storage: Pick<Storage, 'getItem'> = localStorage) => {
  try {
    return storage.getItem(TEST_MODE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}
