import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useFirebaseStorage } from '@/composables/useFirebaseStorage'

const storageUrl = 'https://storage.example.test/data/test.json'

const {
  storageRefMock,
  getDownloadURLMock,
  getMetadataMock,
  useFirebaseMock,
  loggerMock
} = vi.hoisted(() => ({
  storageRefMock: vi.fn(),
  getDownloadURLMock: vi.fn(),
  getMetadataMock: vi.fn(),
  useFirebaseMock: vi.fn(),
  loggerMock: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('firebase/storage', () => ({
  ref: storageRefMock,
  getDownloadURL: getDownloadURLMock,
  getMetadata: getMetadataMock
}))

vi.mock('@/composables/useFirebase', () => ({
  useFirebase: useFirebaseMock
}))

vi.mock('~/utils/logger', () => ({
  createLogger: () => loggerMock
}))

type TestLocalStorage = Storage & {
  getItem: ReturnType<typeof vi.fn<(key: string) => string | null>>
  setItem: ReturnType<typeof vi.fn<(key: string, value: string) => void>>
  removeItem: ReturnType<typeof vi.fn<(key: string) => void>>
  clear: ReturnType<typeof vi.fn<() => void>>
  key: ReturnType<typeof vi.fn<(index: number) => string | null>>
}

const createLocalStorageMock = (): TestLocalStorage => {
  const store = new Map<string, string>()
  const storage = {
    getItem: vi.fn((key: string): string | null => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string): void => {
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string): void => {
      store.delete(key)
    }),
    clear: vi.fn((): void => {
      store.clear()
    }),
    key: vi.fn((index: number): string | null => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size
    }
  }

  return storage
}

const createJsonResponse = (data: unknown, status = 200): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

const stubFetch = (response: Response | Error) => {
  const fetchMock = vi.fn((
    _input: Parameters<typeof fetch>[0],
    _init?: Parameters<typeof fetch>[1]
  ): ReturnType<typeof fetch> => {
    if (response instanceof Error) {
      return Promise.reject(response)
    }

    return Promise.resolve(response)
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const processFlags = process as unknown as {
  client?: boolean
  server?: boolean
}

const originalClient = processFlags.client
const originalServer = processFlags.server

let localStorageMock: TestLocalStorage

describe('useFirebaseStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    processFlags.client = true
    processFlags.server = false

    localStorageMock = createLocalStorageMock()
    vi.stubGlobal('localStorage', localStorageMock)

    const storage = { bucket: 'test-bucket' }
    const fileRef = { fullPath: 'data/test.json' }
    useFirebaseMock.mockReturnValue({ storage })
    storageRefMock.mockReturnValue(fileRef)
    getDownloadURLMock.mockResolvedValue(storageUrl)
  })

  afterEach(() => {
    processFlags.client = originalClient
    processFlags.server = originalServer
    vi.unstubAllGlobals()
  })

  describe('getFileUrl', () => {
    it('ダウンロードURLを返す', async () => {
      const { getFileUrl } = useFirebaseStorage()

      await expect(getFileUrl('data/test.json')).resolves.toBe(storageUrl)

      expect(storageRefMock).toHaveBeenCalledWith({ bucket: 'test-bucket' }, 'data/test.json')
      expect(getDownloadURLMock).toHaveBeenCalledWith({ fullPath: 'data/test.json' })
    })

    it('失敗時は logger.error を呼び出して再throwする', async () => {
      const error = new Error('download failed')
      getDownloadURLMock.mockRejectedValueOnce(error)
      const { getFileUrl } = useFirebaseStorage()

      await expect(getFileUrl('data/missing.json')).rejects.toBe(error)

      expect(loggerMock.error).toHaveBeenCalledWith(
        'Failed to get download URL for data/missing.json',
        error
      )
    })
  })

  describe('getFileMetadata', () => {
    it('メタデータを整形して返す', async () => {
      getMetadataMock.mockResolvedValueOnce({
        size: 1234,
        contentType: undefined,
        updated: '2026-01-02T03:04:05.000Z'
      })
      const { getFileMetadata } = useFirebaseStorage()

      const metadata = await getFileMetadata('data/test.json')

      expect(metadata).toEqual({
        size: 1234,
        contentType: 'application/octet-stream',
        updated: new Date('2026-01-02T03:04:05.000Z')
      })
    })

    it('失敗時は logger.error を呼び出して再throwする', async () => {
      const error = new Error('metadata failed')
      getMetadataMock.mockRejectedValueOnce(error)
      const { getFileMetadata } = useFirebaseStorage()

      await expect(getFileMetadata('data/missing.json')).rejects.toBe(error)

      expect(loggerMock.error).toHaveBeenCalledWith(
        'Failed to get metadata for data/missing.json',
        error
      )
    })
  })

  describe('getJsonFile', () => {
    it('fetch 成功時に JSON を返し no-store を指定する', async () => {
      const data = { ok: true, items: [1, 2, 3] }
      const fetchMock = stubFetch(createJsonResponse(data))
      const { getJsonFile } = useFirebaseStorage()

      await expect(getJsonFile<typeof data>('data/test.json')).resolves.toEqual(data)

      expect(fetchMock).toHaveBeenCalledWith(storageUrl, { cache: 'no-store' })
    })

    it('response.ok=false の場合は throw する', async () => {
      stubFetch(createJsonResponse({ message: 'server error' }, 500))
      const { getJsonFile } = useFirebaseStorage()

      await expect(getJsonFile('data/test.json')).rejects.toThrow('Failed to fetch JSON (500)')
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Failed to get JSON file from data/test.json',
        expect.any(Error)
      )
    })

    it('fetch 例外を再throwする', async () => {
      const error = new Error('network failed')
      stubFetch(error)
      const { getJsonFile } = useFirebaseStorage()

      await expect(getJsonFile('data/test.json')).rejects.toBe(error)
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Failed to get JSON file from data/test.json',
        error
      )
    })
  })

  describe('getCachedJsonFile', () => {
    it('キャッシュ有効期限内なら localStorage から返す', async () => {
      const cached = { source: 'cache' }
      localStorageMock.setItem('test-cache', JSON.stringify(cached))
      localStorageMock.setItem('test-cache_time', Date.now().toString())
      vi.clearAllMocks()
      const { getCachedJsonFile } = useFirebaseStorage()

      await expect(
        getCachedJsonFile<typeof cached>('data/test.json', 'test-cache', 15)
      ).resolves.toEqual(cached)

      expect(getDownloadURLMock).not.toHaveBeenCalled()
      expect(loggerMock.debug).toHaveBeenCalledWith('Using cached data for data/test.json')
    })

    it('キャッシュ無しなら取得して localStorage に保存する', async () => {
      const data = { source: 'storage' }
      stubFetch(createJsonResponse(data))
      const { getCachedJsonFile } = useFirebaseStorage()

      await expect(
        getCachedJsonFile<typeof data>('data/test.json', 'test-cache', 15)
      ).resolves.toEqual(data)

      expect(localStorageMock.setItem).toHaveBeenCalledWith('test-cache', JSON.stringify(data))
      expect(localStorageMock.setItem).toHaveBeenCalledWith('test-cache_time', expect.any(String))
    })

    it('期限切れキャッシュなら再取得して保存する', async () => {
      const cached = { source: 'old-cache' }
      const data = { source: 'storage' }
      const expiredAt = Date.now() - 16 * 60 * 1000
      localStorageMock.setItem('test-cache', JSON.stringify(cached))
      localStorageMock.setItem('test-cache_time', expiredAt.toString())
      vi.clearAllMocks()
      stubFetch(createJsonResponse(data))
      const { getCachedJsonFile } = useFirebaseStorage()

      await expect(
        getCachedJsonFile<typeof data>('data/test.json', 'test-cache', 15)
      ).resolves.toEqual(data)

      expect(getDownloadURLMock).toHaveBeenCalled()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('test-cache', JSON.stringify(data))
    })

    it('localStorage 読み書きが例外でも取得結果を返す', async () => {
      const data = { source: 'storage' }
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('SecurityError')
      })
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      stubFetch(createJsonResponse(data))
      const { getCachedJsonFile } = useFirebaseStorage()

      await expect(
        getCachedJsonFile<typeof data>('data/test.json', 'test-cache', 15)
      ).resolves.toEqual(data)

      expect(loggerMock.warn).toHaveBeenCalledWith('Failed to read from cache', expect.any(Error))
      expect(loggerMock.warn).toHaveBeenCalledWith('Failed to save to cache', expect.any(Error))
    })
  })

  describe('fileExists', () => {
    it('メタデータ取得に成功すると true を返す', async () => {
      getMetadataMock.mockResolvedValueOnce({
        size: 1,
        contentType: 'application/json',
        updated: '2026-01-01T00:00:00.000Z'
      })
      const { fileExists } = useFirebaseStorage()

      await expect(fileExists('data/test.json')).resolves.toBe(true)
    })

    it('storage/object-not-found の場合は false を返す', async () => {
      getMetadataMock.mockRejectedValueOnce({
        code: 'storage/object-not-found'
      })
      const { fileExists } = useFirebaseStorage()

      await expect(fileExists('data/missing.json')).resolves.toBe(false)
    })

    it('それ以外のエラーは再throwする', async () => {
      const error = new Error('permission denied')
      getMetadataMock.mockRejectedValueOnce(error)
      const { fileExists } = useFirebaseStorage()

      await expect(fileExists('data/secret.json')).rejects.toBe(error)
    })
  })
})
