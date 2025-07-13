import { collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, limit, startAfter, Timestamp, type DocumentData, type QueryConstraint, serverTimestamp, writeBatch } from 'firebase/firestore'
import type { AdminUser } from '~/types/auth'
import type { Alert } from '~/types'

export const useAdminFirestore = () => {
  const { $firebase } = useNuxtApp()
  const db = $firebase.db
  const { getCurrentUser } = useAdminAuth()

  // ========================================
  // 汎用CRUD操作
  // ========================================

  /**
   * ドキュメントの作成
   */
  const createDocument = async <T extends DocumentData>(
    collectionName: string,
    data: T,
    customId?: string
  ): Promise<string> => {
    const user = await getCurrentUser()
    if (!user) throw new Error('認証が必要です')

    try {
      const docRef = customId 
        ? doc(db, collectionName, customId)
        : doc(collection(db, collectionName))

      const documentData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid
      }

      await setDoc(docRef, documentData)

      // 操作ログを記録
      await logAdminAction('create', collectionName, docRef.id, { data: documentData })

      return docRef.id
    } catch (error) {
      console.error('Document creation failed:', error)
      throw error
    }
  }

  /**
   * ドキュメントの更新
   */
  const updateDocument = async <T extends DocumentData>(
    collectionName: string,
    documentId: string,
    data: Partial<T>
  ): Promise<void> => {
    const user = await getCurrentUser()
    if (!user) throw new Error('認証が必要です')

    try {
      const docRef = doc(db, collectionName, documentId)
      
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      }

      await updateDoc(docRef, updateData)

      // 操作ログを記録
      await logAdminAction('update', collectionName, documentId, { data: updateData })
    } catch (error) {
      console.error('Document update failed:', error)
      throw error
    }
  }

  /**
   * ドキュメントの削除
   */
  const deleteDocument = async (
    collectionName: string,
    documentId: string
  ): Promise<void> => {
    const user = await getCurrentUser()
    if (!user) throw new Error('認証が必要です')

    try {
      const docRef = doc(db, collectionName, documentId)
      
      // 削除前にデータを取得（ログ用）
      const docSnap = await getDoc(docRef)
      const deletedData = docSnap.data()

      await deleteDoc(docRef)

      // 操作ログを記録
      await logAdminAction('delete', collectionName, documentId, { deletedData })
    } catch (error) {
      console.error('Document deletion failed:', error)
      throw error
    }
  }

  /**
   * 単一ドキュメントの取得
   */
  const getDocument = async <T extends DocumentData>(
    collectionName: string,
    documentId: string
  ): Promise<T | null> => {
    try {
      const docRef = doc(db, collectionName, documentId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T
      }
      return null
    } catch (error) {
      console.error('Document fetch failed:', error)
      throw error
    }
  }

  /**
   * コレクションの取得（クエリ対応）
   */
  const getCollection = async <T extends DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> => {
    try {
      const q = query(collection(db, collectionName), ...constraints)
      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[]
    } catch (error) {
      console.error('Collection fetch failed:', error)
      throw error
    }
  }

  /**
   * ページネーション付きコレクション取得
   */
  const getCollectionPaginated = async <T extends DocumentData>(
    collectionName: string,
    pageSize: number,
    lastDoc?: DocumentData,
    constraints: QueryConstraint[] = []
  ): Promise<{ data: T[], hasMore: boolean, lastDoc: DocumentData | null }> => {
    try {
      const baseConstraints = [...constraints, limit(pageSize + 1)]
      
      if (lastDoc) {
        baseConstraints.push(startAfter(lastDoc))
      }

      const q = query(collection(db, collectionName), ...baseConstraints)
      const querySnapshot = await getDocs(q)

      const docs = querySnapshot.docs
      const hasMore = docs.length > pageSize
      const data = docs.slice(0, pageSize).map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[]

      const lastDocument = docs.length > 0 ? docs[Math.min(docs.length - 1, pageSize - 1)] : null

      return {
        data,
        hasMore,
        lastDoc: lastDocument
      }
    } catch (error) {
      console.error('Paginated collection fetch failed:', error)
      throw error
    }
  }

  // ========================================
  // バッチ操作
  // ========================================

  /**
   * バッチ作成・更新
   */
  const batchWrite = async (
    operations: Array<{
      type: 'create' | 'update' | 'delete'
      collection: string
      id?: string
      data?: DocumentData
    }>
  ): Promise<void> => {
    const user = await getCurrentUser()
    if (!user) throw new Error('認証が必要です')

    const batch = writeBatch(db)

    try {
      for (const op of operations) {
        const docRef = op.id 
          ? doc(db, op.collection, op.id)
          : doc(collection(db, op.collection))

        switch (op.type) {
          case 'create':
            batch.set(docRef, {
              ...op.data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdBy: user.value.uid,
              updatedBy: user.uid
            })
            break
          case 'update':
            batch.update(docRef, {
              ...op.data,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid
            })
            break
          case 'delete':
            batch.delete(docRef)
            break
        }
      }

      await batch.commit()

      // バッチ操作のログを記録
      await logAdminAction('batch', 'multiple', '', { 
        operations: operations.map(op => ({
          type: op.type,
          collection: op.collection,
          id: op.id
        }))
      })
    } catch (error) {
      console.error('Batch operation failed:', error)
      throw error
    }
  }

  // ========================================
  // 専用データ操作
  // ========================================

  /**
   * 時刻表データの保存
   */
  const saveTimetable = async (timetableData: any): Promise<string> => {
    return createDocument('timetables', timetableData)
  }

  /**
   * 料金データの保存
   */
  const saveFare = async (fareData: any): Promise<string> => {
    return createDocument('fares', fareData)
  }

  /**
   * アラートの保存
   */
  const saveAlert = async (alertData: Partial<Alert>): Promise<string> => {
    return createDocument('alerts', alertData)
  }

  /**
   * お知らせの保存
   */
  const saveAnnouncement = async (announcementData: any): Promise<string> => {
    return createDocument('announcements', announcementData)
  }

  // ========================================
  // 管理者操作ログ
  // ========================================

  /**
   * 管理者操作ログの記録
   */
  const logAdminAction = async (
    action: string,
    target: string,
    targetId: string,
    details: any = {}
  ): Promise<void> => {
    const user = await getCurrentUser()
    if (!user) return

    try {
      const logData = {
        action,
        target,
        targetId,
        adminId: user.uid,
        adminEmail: user.email || '',
        timestamp: serverTimestamp(),
        details,
        ip: await getClientIP(),
        userAgent: navigator.userAgent
      }

      // ログは直接書き込み（createDocumentを使うと無限ループになる）
      const docRef = doc(collection(db, 'adminLogs'))
      await setDoc(docRef, logData)
    } catch (error) {
      console.error('Failed to log admin action:', error)
      // ログの失敗は本処理を止めない
    }
  }

  /**
   * クライアントIPの取得（簡易版）
   */
  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch {
      return 'unknown'
    }
  }

  // ========================================
  // データ検証
  // ========================================

  /**
   * 時刻表データの検証
   */
  const validateTimetableData = (data: any): boolean => {
    const required = ['name', 'departure', 'arrival', 'departureTime', 'arrivalTime']
    return required.every(field => data[field])
  }

  /**
   * 料金データの検証
   */
  const validateFareData = (data: any): boolean => {
    const required = ['route', 'adult', 'child']
    return required.every(field => data[field])
  }

  // ========================================
  // データエクスポート
  // ========================================

  /**
   * コレクションのエクスポート
   */
  const exportCollection = async (collectionName: string): Promise<any[]> => {
    try {
      const data = await getCollection(collectionName)
      
      // 操作ログを記録
      await logAdminAction('export', collectionName, '', { 
        count: data.length 
      })

      return data
    } catch (error) {
      console.error('Export failed:', error)
      throw error
    }
  }

  /**
   * 複数コレクションの一括エクスポート
   */
  const exportAllData = async (): Promise<Record<string, any[]>> => {
    const collections = ['timetables', 'fares', 'holidays', 'alerts', 'announcements']
    const exportData: Record<string, any[]> = {}

    for (const col of collections) {
      exportData[col] = await exportCollection(col)
    }

    return exportData
  }

  return {
    // 汎用CRUD
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    getCollection,
    getCollectionPaginated,
    batchWrite,

    // 専用データ操作
    saveTimetable,
    saveFare,
    saveAlert,
    saveAnnouncement,

    // データ検証
    validateTimetableData,
    validateFareData,

    // エクスポート
    exportCollection,
    exportAllData,

    // ログ
    logAdminAction
  }
}