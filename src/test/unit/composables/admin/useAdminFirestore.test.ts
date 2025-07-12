import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Firebase Firestore
const mockGetDocs = vi.fn()
const mockGetDoc = vi.fn()
const mockAddDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockDeleteDoc = vi.fn()
const mockWriteBatch = vi.fn()
const mockBatchCommit = vi.fn()

const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  commit: mockBatchCommit
}

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  writeBatch: vi.fn(() => mockBatch),
  serverTimestamp: vi.fn(() => new Date()),
  orderBy: vi.fn(),
  where: vi.fn(),
  limit: vi.fn()
}))

// Mock useNuxtApp
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $db: {}
  })
}))

// Mock useAdminAuth  
const mockUseAdminAuth = vi.fn(() => ({
  user: { value: { uid: 'test-uid', email: 'admin@example.com' } }
}))

vi.mock('@/composables/useAdminAuth', () => ({
  useAdminAuth: mockUseAdminAuth
}))

describe('useAdminFirestore', () => {
  const mockUseAdminFirestore = async () => {
    const mod = await import('@/composables/useAdminFirestore')
    return mod.useAdminFirestore()
  }
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCollection', () => {
    it('コレクションからデータを取得できる', async () => {
      const mockData = [
        { id: '1', data: () => ({ name: 'Item 1' }) },
        { id: '2', data: () => ({ name: 'Item 2' }) }
      ]
      
      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockData.forEach(callback)
      })

      const { getCollection } = await mockUseAdminFirestore()
      const result = await getCollection('test-collection')

      expect(result).toEqual([
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ])
    })

    it('制約条件付きでデータを取得できる', async () => {
      const mockData = [
        { id: '1', data: () => ({ name: 'Item 1', status: 'active' }) }
      ]
      
      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockData.forEach(callback)
      })

      const { getCollection } = await mockUseAdminFirestore()
      const result = await getCollection('test-collection', ['mock-constraint'])

      expect(result).toHaveLength(1)
    })
  })

  describe('getDocument', () => {
    it('単一のドキュメントを取得できる', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'test-id',
        data: () => ({ name: 'Test Document' })
      })

      const { getDocument } = await mockUseAdminFirestore()
      const result = await getDocument('test-collection', 'test-id')

      expect(result).toEqual({
        id: 'test-id',
        name: 'Test Document'
      })
    })

    it('存在しないドキュメントでnullを返す', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      })

      const { getDocument } = await mockUseAdminFirestore()
      const result = await getDocument('test-collection', 'non-existent')

      expect(result).toBeNull()
    })
  })

  describe('createDocument', () => {
    it('新しいドキュメントを作成できる', async () => {
      mockAddDoc.mockResolvedValue({ id: 'new-id' })

      const { createDocument } = await mockUseAdminFirestore()
      const result = await createDocument('test-collection', {
        name: 'New Item',
        value: 123
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          name: 'New Item',
          value: 123,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      )
      expect(result).toBe('new-id')
    })
  })

  describe('updateDocument', () => {
    it('ドキュメントを更新できる', async () => {
      mockUpdateDoc.mockResolvedValue(undefined)

      const { updateDocument } = await mockUseAdminFirestore()
      await updateDocument('test-collection', 'test-id', {
        name: 'Updated Item'
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          name: 'Updated Item',
          updatedAt: expect.any(Date)
        })
      )
    })
  })

  describe('deleteDocument', () => {
    it('ドキュメントを削除できる', async () => {
      mockDeleteDoc.mockResolvedValue(undefined)

      const { deleteDocument } = await mockUseAdminFirestore()
      await deleteDocument('test-collection', 'test-id')

      expect(mockDeleteDoc).toHaveBeenCalled()
    })
  })

  describe('batchWrite', () => {
    it('バッチ操作を実行できる', async () => {
      mockBatchCommit.mockResolvedValue(undefined)

      const operations = [
        {
          type: 'create' as const,
          collection: 'test-collection',
          data: { name: 'Item 1' }
        },
        {
          type: 'update' as const,
          collection: 'test-collection',
          id: 'update-id',
          data: { name: 'Updated Item' }
        },
        {
          type: 'delete' as const,
          collection: 'test-collection',
          id: 'delete-id'
        }
      ]

      const { batchWrite } = await mockUseAdminFirestore()
      await batchWrite(operations)

      expect(mockBatch.set).toHaveBeenCalledTimes(1)
      expect(mockBatch.update).toHaveBeenCalledTimes(1)
      expect(mockBatch.delete).toHaveBeenCalledTimes(1)
      expect(mockBatchCommit).toHaveBeenCalled()
    })
  })

  describe('logAdminAction', () => {
    it('管理者アクションをログに記録できる', async () => {
      mockAddDoc.mockResolvedValue({ id: 'log-id' })

      const { logAdminAction } = await mockUseAdminFirestore()
      await logAdminAction('update', 'timetables', 'test-id', {
        oldValue: 'old',
        newValue: 'new'
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          action: 'update',
          collection: 'timetables',
          documentId: 'test-id',
          details: { oldValue: 'old', newValue: 'new' },
          userId: 'test-uid',
          userEmail: 'admin@example.com',
          timestamp: expect.any(Date)
        })
      )
    })
  })
})