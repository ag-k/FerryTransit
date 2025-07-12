import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import type { DocumentData } from 'firebase/firestore'

export const useDataPublish = () => {
  const { $storage } = useNuxtApp()
  const { user } = useAdminAuth()
  const { logAdminAction, getCollection } = useAdminFirestore()

  // ========================================
  // データ公開管理
  // ========================================

  /**
   * Firestoreデータを JSON に変換してStorageに公開
   */
  const publishData = async (
    dataType: 'timetable' | 'fare' | 'holidays' | 'alerts',
    preview: boolean = false
  ): Promise<string> => {
    if (!user.value) throw new Error('認証が必要です')

    try {
      // Firestoreからデータを取得
      let data: any
      let fileName: string

      switch (dataType) {
        case 'timetable':
          data = await prepareTimetableData()
          fileName = 'timetable.json'
          break
        case 'fare':
          data = await prepareFareData()
          fileName = 'fare-master.json'
          break
        case 'holidays':
          data = await prepareHolidayData()
          fileName = 'holidays.json'
          break
        case 'alerts':
          data = await prepareAlertData()
          fileName = 'alerts.json'
          break
        default:
          throw new Error(`Unknown data type: ${dataType}`)
      }

      // JSONファイルを作成
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      })

      // Storage パスを決定
      const path = preview 
        ? `preview/${fileName}` 
        : `data/${fileName}`

      // Storage にアップロード
      const fileRef = storageRef($storage, path)
      const snapshot = await uploadBytes(fileRef, jsonBlob, {
        contentType: 'application/json',
        customMetadata: {
          publishedBy: user.value.uid,
          publishedAt: new Date().toISOString(),
          dataType
        }
      })

      // ダウンロードURLを取得
      const downloadURL = await getDownloadURL(snapshot.ref)

      // 公開履歴を記録
      if (!preview) {
        await savePublishHistory(dataType, data, downloadURL)
      }

      // 操作ログを記録
      await logAdminAction(
        preview ? 'preview' : 'publish',
        dataType,
        fileName,
        { url: downloadURL }
      )

      return downloadURL
    } catch (error) {
      console.error('Data publish failed:', error)
      throw error
    }
  }

  /**
   * 時刻表データの準備
   */
  const prepareTimetableData = async () => {
    const timetables = await getCollection('timetables')
    
    // クライアント向けに必要なフィールドのみを抽出
    return timetables.map(item => ({
      tripId: item.tripId,
      name: item.name,
      departure: item.departure,
      arrival: item.arrival,
      departureTime: item.departureTime,
      arrivalTime: item.arrivalTime,
      status: item.status || 0,
      price: item.price,
      startDate: item.startDate,
      endDate: item.endDate,
      via: item.via
    }))
  }

  /**
   * 料金データの準備
   */
  const prepareFareData = async () => {
    const fares = await getCollection('fares')
    const discounts = await getCollection('discounts')
    const peakPeriods = await getCollection('peakPeriods')

    return {
      fares: fares.map(fare => ({
        route: fare.route,
        adult: fare.adult,
        child: fare.child,
        car3m: fare.car3m,
        car4m: fare.car4m,
        car5m: fare.car5m,
        type: fare.type
      })),
      discounts: discounts.filter(d => d.active).map(discount => ({
        id: discount.id,
        name: discount.name,
        rate: discount.rate,
        conditions: discount.conditions
      })),
      peakPeriods: peakPeriods.map(period => ({
        start: period.start,
        end: period.end,
        surchargeRate: period.surchargeRate
      }))
    }
  }

  /**
   * 祝日データの準備
   */
  const prepareHolidayData = async () => {
    const holidays = await getCollection('holidays')
    
    return holidays.map(holiday => ({
      date: holiday.date,
      name: holiday.name,
      nameEn: holiday.nameEn
    }))
  }

  /**
   * アラートデータの準備
   */
  const prepareAlertData = async () => {
    const { where } = await import('firebase/firestore')
    const alerts = await getCollection('alerts', [where('active', '==', true)])
    
    // アクティブなアラートのみをエクスポート
    return alerts.map(alert => ({
      id: alert.id,
      ship: alert.ship,
      route: alert.route,
      status: alert.status,
      severity: alert.severity || 'medium',
      summary: alert.summary,
      comment: alert.comment,
      summaryEn: alert.summaryEn,
      commentEn: alert.commentEn,
      startDate: alert.startDate,
      endDate: alert.endDate,
      affectedRoutes: alert.affectedRoutes || []
    }))
  }

  // ========================================
  // 公開履歴管理
  // ========================================

  /**
   * 公開履歴の保存
   */
  const savePublishHistory = async (
    dataType: string,
    data: any,
    url: string
  ) => {
    const { createDocument } = useAdminFirestore()
    
    await createDocument('publishHistory', {
      type: dataType,
      publishedAt: new Date(),
      publishedBy: user.value?.uid,
      url,
      dataSnapshot: data,
      dataHash: await generateHash(JSON.stringify(data))
    })
  }

  /**
   * 公開履歴の取得
   */
  const getPublishHistory = async (
    dataType?: string,
    limit: number = 10
  ) => {
    const { getCollection } = useAdminFirestore()
    const { where, orderBy, limit: limitConstraint } = await import('firebase/firestore')
    
    const constraints = [
      orderBy('publishedAt', 'desc'),
      limitConstraint(limit)
    ]
    
    if (dataType) {
      constraints.push(where('type', '==', dataType))
    }
    
    return getCollection('publishHistory', constraints)
  }

  // ========================================
  // ロールバック機能
  // ========================================

  /**
   * 特定の公開履歴にロールバック
   */
  const rollbackToHistory = async (historyId: string) => {
    if (!user.value) throw new Error('認証が必要です')

    try {
      // 履歴データを取得
      const { getDocument } = useAdminFirestore()
      const history = await getDocument('publishHistory', historyId)
      
      if (!history) {
        throw new Error('履歴が見つかりません')
      }

      // データを復元
      const jsonBlob = new Blob([JSON.stringify(history.dataSnapshot, null, 2)], {
        type: 'application/json'
      })

      let fileName: string
      switch (history.type) {
        case 'timetable':
          fileName = 'timetable.json'
          break
        case 'fare':
          fileName = 'fare-master.json'
          break
        case 'holidays':
          fileName = 'holidays.json'
          break
        default:
          throw new Error(`Unknown data type: ${history.type}`)
      }

      // Storage にアップロード
      const fileRef = storageRef($storage, `data/${fileName}`)
      await uploadBytes(fileRef, jsonBlob, {
        contentType: 'application/json',
        customMetadata: {
          rolledBackBy: user.value.uid,
          rolledBackAt: new Date().toISOString(),
          fromHistoryId: historyId
        }
      })

      // ロールバックの履歴を保存
      await savePublishHistory(
        history.type,
        history.dataSnapshot,
        history.url
      )

      // 操作ログを記録
      await logAdminAction('rollback', history.type, historyId, {
        originalPublishedAt: history.publishedAt
      })

    } catch (error) {
      console.error('Rollback failed:', error)
      throw error
    }
  }

  // ========================================
  // バックアップ管理
  // ========================================

  /**
   * データのバックアップ
   */
  const createBackup = async (
    includeAll: boolean = true,
    collections?: string[]
  ): Promise<string> => {
    if (!user.value) throw new Error('認証が必要です')

    try {
      const { exportAllData, exportCollection } = useAdminFirestore()
      
      // データをエクスポート
      const backupData = includeAll 
        ? await exportAllData()
        : {}

      if (!includeAll && collections) {
        for (const col of collections) {
          backupData[col] = await exportCollection(col)
        }
      }

      // バックアップファイルを作成
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `backup_${timestamp}.json`
      
      const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      })

      // Storage にアップロード
      const fileRef = storageRef($storage, `backups/${fileName}`)
      const snapshot = await uploadBytes(fileRef, jsonBlob, {
        contentType: 'application/json',
        customMetadata: {
          createdBy: user.value.uid,
          createdAt: new Date().toISOString(),
          collections: collections?.join(',') || 'all'
        }
      })

      const downloadURL = await getDownloadURL(snapshot.ref)

      // バックアップメタデータを保存
      const { createDocument } = useAdminFirestore()
      await createDocument('backups', {
        fileName,
        url: downloadURL,
        size: jsonBlob.size,
        collections: collections || ['all'],
        createdAt: new Date()
      })

      return downloadURL
    } catch (error) {
      console.error('Backup creation failed:', error)
      throw error
    }
  }

  /**
   * バックアップからの復元
   */
  const restoreFromBackup = async (backupId: string) => {
    // 実装は省略（セキュリティ上、慎重に実装する必要がある）
    throw new Error('Not implemented')
  }

  // ========================================
  // ユーティリティ
  // ========================================

  /**
   * データのハッシュ生成
   */
  const generateHash = async (data: string): Promise<string> => {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * プレビューURLの生成
   */
  const getPreviewUrl = (dataType: string): string => {
    const baseUrl = window.location.origin
    return `${baseUrl}/admin/preview?type=${dataType}`
  }

  return {
    // データ公開
    publishData,
    
    // 公開履歴
    getPublishHistory,
    
    // ロールバック
    rollbackToHistory,
    
    // バックアップ
    createBackup,
    restoreFromBackup,
    
    // ユーティリティ
    getPreviewUrl
  }
}