import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useOfflineStorage } from '@/composables/useOfflineStorage'

// Mock localStorage
class LocalStorageMock {
  private store: Record<string, string> = {}
  
  getItem = vi.fn((key: string) => this.store[key] || null)
  
  setItem = vi.fn((key: string, value: string) => {
    this.store[key] = value
  })
  
  removeItem = vi.fn((key: string) => {
    delete this.store[key]
  })
  
  clear = vi.fn(() => {
    this.store = {}
  })
  
  get length() {
    return Object.keys(this.store).length
  }
  
  key = vi.fn((index: number) => {
    const keys = Object.keys(this.store)
    return keys[index] || null
  })
  
  // Helper to get all keys (for testing)
  getKeys() {
    return Object.keys(this.store)
  }
}

const localStorageMock = new LocalStorageMock()

// Mock i18n
vi.stubGlobal('useI18n', () => ({
  locale: ref('ja')
}))

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock Object.keys to work with localStorage mock
const originalObjectKeys = Object.keys
Object.keys = (obj: any) => {
  if (obj === localStorage) {
    return localStorageMock.getKeys()
  }
  return originalObjectKeys(obj)
}

describe('useOfflineStorage', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('checks if storage is available', () => {
    const { isStorageAvailable } = useOfflineStorage()
    expect(isStorageAvailable()).toBe(true)
  })

  it('saves and retrieves data', () => {
    const { saveData, getData } = useOfflineStorage()
    
    const testData = { message: 'Hello, World!' }
    const saved = saveData('test', testData)
    
    expect(saved).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalled()
    
    const retrieved = getData('test')
    expect(retrieved).toEqual(testData)
  })

  it('handles TTL expiration', async () => {
    const { saveData, getData } = useOfflineStorage()
    
    // Save with 1 minute TTL
    saveData('temp', { value: 'temporary' }, 1)
    
    // Should retrieve immediately
    expect(getData('temp')).toEqual({ value: 'temporary' })
    
    // Mock time passing (2 minutes)
    const now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now + 2 * 60 * 1000)
    
    // Should return null after expiration
    expect(getData('temp')).toBeNull()
    
    vi.restoreAllMocks()
  })

  it('removes data', () => {
    const { saveData, removeData, getData } = useOfflineStorage()
    
    saveData('test', { value: 'test' })
    expect(getData('test')).toEqual({ value: 'test' })
    
    const removed = removeData('test')
    expect(removed).toBe(true)
    expect(getData('test')).toBeNull()
  })

  it('removes data by pattern', () => {
    const { saveData, removeByPattern, getData } = useOfflineStorage()
    
    saveData('user:1', { name: 'Alice' })
    saveData('user:2', { name: 'Bob' })
    saveData('settings', { theme: 'dark' })
    
    const removed = removeByPattern('user:')
    expect(removed).toBe(2)
    
    expect(getData('user:1')).toBeNull()
    expect(getData('user:2')).toBeNull()
    expect(getData('settings')).toEqual({ theme: 'dark' })
  })

  it('clears all data', () => {
    const { saveData, clearAll, getData } = useOfflineStorage()
    
    saveData('test1', { value: 1 })
    saveData('test2', { value: 2 })
    
    const cleared = clearAll()
    expect(cleared).toBe(true)
    
    expect(getData('test1')).toBeNull()
    expect(getData('test2')).toBeNull()
  })

  it('calculates storage size', () => {
    const { saveData, getStorageSize } = useOfflineStorage()
    
    saveData('test', { data: 'x'.repeat(1000) })
    
    const size = getStorageSize()
    expect(size.used).toBeGreaterThan(0)
    expect(size.total).toBe(5 * 1024 * 1024)
    expect(size.percentage).toBeGreaterThanOrEqual(0)
    expect(size.percentage).toBeLessThanOrEqual(100)
  })

  it('cleans up expired data', () => {
    const { saveData, cleanupExpired, getData } = useOfflineStorage()
    
    // Save with different TTLs
    saveData('keep', { value: 'keep' }, 60) // 60 minutes
    saveData('expire', { value: 'expire' }, 1) // 1 minute
    
    // Mock time passing (2 minutes)
    const now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now + 2 * 60 * 1000)
    
    const cleaned = cleanupExpired()
    expect(cleaned).toBe(1)
    
    expect(getData('keep')).toEqual({ value: 'keep' })
    expect(getData('expire')).toBeNull()
    
    vi.restoreAllMocks()
  })

  it('saves and retrieves timetable data', () => {
    const { saveTimetableData, getTimetableData } = useOfflineStorage()
    
    const timetableData = { routes: [], updatedAt: new Date().toISOString() }
    const saved = saveTimetableData(timetableData)
    
    expect(saved).toBe(true)
    
    const retrieved = getTimetableData()
    expect(retrieved).toEqual(timetableData)
  })

  it('checks data validity', () => {
    const { saveData, isDataValid } = useOfflineStorage()
    
    saveData('recent', { value: 'recent' })
    
    // Should be valid within 60 minutes
    expect(isDataValid('recent', 60)).toBe(true)
    
    // Mock time passing (61 minutes)
    const now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now + 61 * 60 * 1000)
    
    // Should be invalid after 60 minutes
    expect(isDataValid('recent', 60)).toBe(false)
    
    vi.restoreAllMocks()
  })

  it('gets data timestamp', () => {
    const { saveData, getDataTimestamp } = useOfflineStorage()
    
    const now = Date.now()
    saveData('test', { value: 'test' })
    
    const timestamp = getDataTimestamp('test')
    expect(timestamp).toBeDefined()
    expect(timestamp).toBeGreaterThanOrEqual(now)
    expect(timestamp).toBeLessThanOrEqual(Date.now())
  })

  it('handles storage errors gracefully', () => {
    const { saveData, getData } = useOfflineStorage()
    
    // Mock localStorage error
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('QuotaExceededError')
    })
    
    const saved = saveData('test', { value: 'test' })
    expect(saved).toBe(false)
    
    // Mock localStorage error on get
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('SecurityError')
    })
    
    const retrieved = getData('test')
    expect(retrieved).toBeNull()
  })
})