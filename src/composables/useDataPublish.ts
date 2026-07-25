import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Timestamp } from 'firebase/firestore'
import { useAdminAuth } from '~/composables/useAdminAuth'
import { useAdminFirestore } from '~/composables/useAdminFirestore'
import { createLogger } from '~/utils/logger'
import type { VesselType } from '~/types/fare'
import {
  ROUTE_METADATA,
  normalizeRouteId,
  mapHighspeedPortsToCanonicalRoute
} from '~/utils/fareRoutes'

/**
 * 公開用のJSONデータを Hosting から取得（ユーザー向け）
 * 参照URL例: /data/routes/ferry-routes.json
 */
export const getJSONData = async <T>(path: string): Promise<T | null> => {
  const logger = createLogger('getJSONData')
  try {
    const localUrl = `/data/${path}`
    const res = await fetch(localUrl, { cache: 'no-cache' })
    if (!res.ok) {
      throw new Error(`Local fetch failed: ${res.status} ${res.statusText}`)
    }
    const json = (await res.json()) as T
    logger.debug(`Loaded JSON from local path: ${localUrl}`)
    return json
  } catch (e) {
    logger.error(`Failed to load local JSON for ${path}`, e)
    return null
  }
}

/**
 * JSONデータをStorageにアップロード（管理者向け）
 */
export const uploadJSON = async (path: string, data: any, userInfo?: { uid: string }): Promise<string> => {
  const { $firebase } = useNuxtApp()
  const logger = createLogger('uploadJSON')

  if (path.replace(/^\/+/, '').replace(/^data\//, '') === 'timetable.json') {
    throw new Error('公開時刻表はコード管理パイプラインからのみ公開できます')
  }
  
  try {
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    })

    const fileRef = storageRef($firebase.storage, `data/${path}`)
    const snapshot = await uploadBytes(fileRef, jsonBlob, {
      contentType: 'application/json',
      customMetadata: {
        uploadedBy: userInfo?.uid || 'system',
        uploadedAt: new Date().toISOString()
      }
    })

    return await getDownloadURL(snapshot.ref)
  } catch (error) {
    logger.error('JSON upload failed', error)
    throw error
  }
}

/**
 * Storage上のJSONのダウンロードURLを取得
 */
export const getStorageDownloadURL = async (path: string): Promise<string> => {
  const { $firebase } = useNuxtApp()
  const logger = createLogger('getStorageDownloadURL')
  try {
    const fileRef = storageRef($firebase.storage, `data/${path}`)
    return await getDownloadURL(fileRef)
  } catch (error) {
    logger.error('Failed to get download URL', error)
    throw error
  }
}

export const useDataPublish = () => {
  const { $firebase } = useNuxtApp()
  const { user } = useAdminAuth()
  const { logAdminAction, getCollection, getDocument } = useAdminFirestore()
  const logger = createLogger('useDataPublish')

  // ========================================
  // データ公開管理
  // ========================================

  /**
   * Firestoreデータを JSON に変換してStorageに公開
   */
  const publishData = async (
    dataType: 'timetable' | 'fare' | 'holidays' | 'news',
    preview: boolean = false
  ): Promise<string> => {

    if (!user.value) throw new Error('認証が必要です')
    if (dataType === 'timetable' && !preview) {
      throw new Error('公開時刻表はコード管理パイプラインからのみ公開できます。管理画面ではプレビューのみ生成できます。')
    }

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
        case 'news':
          data = await prepareNewsData()
          fileName = 'news.json'
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
      const fileRef = storageRef($firebase.storage, path)
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
      logger.error('Data publish failed', error)
      throw error
    }
  }

  /**
   * 時刻表データの準備
   */
  const prepareTimetableData = async () => {
    const timetables = await getCollection('timetables')

    const normalizeDate = (value: unknown) => {
      if (value === undefined || value === null) return ''
      return String(value).trim().replace(/-/g, '/')
    }

    const normalizeTime = (value: unknown) => {
      if (value === undefined || value === null) return ''
      const str = String(value).trim()
      if (!str) return ''
      if (str.includes(':')) {
        const [hour = '', minute = ''] = str.split(':')
        if (!minute) return str
        return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
      }
      if (str.length === 4) {
        return `${str.slice(0, 2).padStart(2, '0')}:${str.slice(2).padStart(2, '0')}`
      }
      return str
    }

    const normalizeString = (value: unknown) => {
      if (value === undefined || value === null) return ''
      return String(value)
    }

    const normalizeMode = (value: unknown) => {
      const mode = normalizeString(value).trim().toUpperCase()
      if (mode === 'BUS') return 'BUS'
      if (mode === 'AIR' || mode === 'FLIGHT') return 'AIR'
      return 'FERRY'
    }

    const normalizeLocationType = (value: unknown, mode: string) => {
      const type = normalizeString(value).trim().toUpperCase()
      if (type === 'STOP' || type === 'BUS_STOP') return 'STOP'
      if (type === 'AIRPORT') return 'AIRPORT'
      if (type === 'PORT') return 'PORT'
      if (mode === 'BUS') return 'STOP'
      if (mode === 'AIR') return 'AIRPORT'
      return 'PORT'
    }

    const normalizeDateList = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.map(item => normalizeString(item).trim().replace(/\//g, '-')).filter(Boolean)
      }
      return normalizeString(value)
        .split(/[,\n;]/)
        .map(item => item.trim().replace(/\//g, '-'))
        .filter(Boolean)
    }

    const normalizeActiveDays = (value: unknown): number[] | undefined => {
      if (Array.isArray(value)) {
        const days = Array.from(new Set(value.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))).sort()
        return days.length > 0 ? days : undefined
      }

      const raw = normalizeString(value).trim()
      if (!raw) return undefined

      const lower = raw.toLowerCase()
      if (['all', 'daily', '毎日', '全日'].includes(lower)) return [0, 1, 2, 3, 4, 5, 6]
      if (['weekday', 'weekdays', '平日'].includes(lower)) return [1, 2, 3, 4, 5]
      if (['weekend', 'weekends', '土日'].includes(lower)) return [0, 6]

      const dayNameMap: Record<string, number> = {
        sun: 0,
        sunday: 0,
        日: 0,
        mon: 1,
        monday: 1,
        月: 1,
        tue: 2,
        tuesday: 2,
        火: 2,
        wed: 3,
        wednesday: 3,
        水: 3,
        thu: 4,
        thursday: 4,
        木: 4,
        fri: 5,
        friday: 5,
        金: 5,
        sat: 6,
        saturday: 6,
        土: 6
      }

      const days = Array.from(new Set(raw
        .split(/[,\s;/、]+/)
        .map(part => {
          const trimmed = part.trim().toLowerCase()
          if (!trimmed) return Number.NaN
          if (dayNameMap[trimmed] !== undefined) return dayNameMap[trimmed]
          return Number(trimmed)
        })
        .filter(day => Number.isInteger(day) && day >= 0 && day <= 6))).sort()

      return days.length > 0 ? days : undefined
    }

    // クライアント向けに必要なフィールドのみを抽出
    return timetables.map(item => {
      const statusValue = typeof item.status === 'number'
        ? item.status
        : Number.parseInt(item.status ?? '0', 10)
      const status = Number.isNaN(statusValue) ? 0 : statusValue

      const priceCandidate = item.price ?? item.fare
      const hasPrice = priceCandidate !== undefined && priceCandidate !== null && priceCandidate !== ''
      const price = hasPrice ? Number(priceCandidate) : undefined
      const mode = normalizeMode(item.mode)

      const result: Record<string, any> = {
        trip_id: normalizeString(item.trip_id ?? item.tripId),
        next_id: normalizeString(item.next_id ?? item.nextId),
        mode,
        operator_id: normalizeString(item.operator_id ?? item.operatorId),
        service_id: normalizeString(item.service_id ?? item.serviceId),
        vehicle_id: normalizeString(item.vehicle_id ?? item.vehicleId),
        start_date: normalizeDate(item.start_date ?? item.startDate),
        end_date: normalizeDate(item.end_date ?? item.endDate),
        name: normalizeString(item.name),
        departure: normalizeString(item.departure),
        departure_type: normalizeLocationType(item.departure_type ?? item.departureType, mode),
        departure_time: normalizeTime(item.departure_time ?? item.departureTime),
        arrival: normalizeString(item.arrival),
        arrival_type: normalizeLocationType(item.arrival_type ?? item.arrivalType, mode),
        arrival_time: normalizeTime(item.arrival_time ?? item.arrivalTime),
        status
      }

      const activeDays = normalizeActiveDays(item.active_days ?? item.activeDays)
      if (activeDays) {
        result.active_days = activeDays
      }

      const addedDates = normalizeDateList(item.added_dates ?? item.addedDates)
      if (addedDates.length > 0) {
        result.added_dates = addedDates
      }

      const removedDates = normalizeDateList(item.removed_dates ?? item.removedDates)
      if (removedDates.length > 0) {
        result.removed_dates = removedDates
      }

      if (price !== undefined && !Number.isNaN(price)) {
        result.price = price
      }

      if (item.via) {
        result.via = item.via
      }

      if (item.platform) {
        result.platform = item.platform
      }

      if (item.terminal) {
        result.terminal = item.terminal
      }

      if (item.gate) {
        result.gate = item.gate
      }

      if (!result.trip_id) {
        result.trip_id = normalizeString(item.id)
      }

      if (!result.next_id) {
        result.next_id = ''
      }

      return result
    })
  }

  /**
   * 料金データの準備
   */
  const prepareFareData = async () => {
    const [fares, versions, discounts] = await Promise.all([
      getCollection<any>('fares'),
      getCollection<any>('fareVersions'),
      getCollection<any>('discounts')
    ])

    type VersionPayload = {
      id: string
      vesselType: VesselType
      name?: string | null
      description?: string | null
      effectiveFrom: string
      createdAt?: string | null
      updatedAt?: string | null
      fares: any[]
    }

    const parseTimestamp = (value: string): number => {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? 0 : date.getTime()
    }

    const versionMetaMap = new Map<string, any>()
    versions.forEach((version: any) => {
      versionMetaMap.set(version.id, version)
    })

    const fallbackVersions: Partial<Record<VesselType, any>> = {}
    const ensureFallbackVersion = (vesselType: VesselType) => {
      if (!fallbackVersions[vesselType]) {
        const fallbackId = `legacy-${vesselType}`
        const metadata = {
          id: fallbackId,
          vesselType,
          name: '既存データ',
          effectiveFrom: '1970-01-01'
        }
        fallbackVersions[vesselType] = metadata
        versionMetaMap.set(fallbackId, metadata)
      }
      return fallbackVersions[vesselType]!
    }

    const versionFaresMap = new Map<string, any[]>()

    fares.forEach((fare: any) => {
      const vesselType = (fare.type as VesselType) || 'ferry'
      let versionId = fare.versionId as string | undefined

      if (!versionId || !versionMetaMap.has(versionId)) {
        const fallback = ensureFallbackVersion(vesselType)
        versionId = fallback.id ?? `legacy-${vesselType}`
      }
      const resolvedVersionId = versionId ?? `legacy-${vesselType}`

      if (!versionFaresMap.has(resolvedVersionId)) {
        versionFaresMap.set(resolvedVersionId, [])
      }

      versionFaresMap.get(resolvedVersionId)!.push(fare)
    })

    const normalizeFareRecord = (fare: any) => {
      const seatClass = fare.fares?.seatClass ?? fare.seatClass ?? null
      const vehicle = fare.fares?.vehicle ?? fare.vehicle ?? null
      const disabled = fare.fares?.disabled ?? fare.disabled ?? {
        adult: typeof fare.disabledAdult === 'number' ? fare.disabledAdult : null,
        child: typeof fare.disabledChild === 'number' ? fare.disabledChild : null
      }

      const disabledAdult = typeof (disabled?.adult ?? fare.disabledAdult) === 'number'
        ? (disabled?.adult ?? fare.disabledAdult)
        : null
      const disabledChild = typeof (disabled?.child ?? fare.disabledChild) === 'number'
        ? (disabled?.child ?? fare.disabledChild)
        : null
      const normalizedRoute =
        normalizeRouteId(fare.route ?? fare.routeName ?? fare.id ?? null) ??
        (typeof fare.route === 'string' ? fare.route : null)
      const metadata = normalizedRoute ? ROUTE_METADATA[normalizedRoute] : null
      const departure =
        typeof fare.departure === 'string' && fare.departure.trim().length
          ? fare.departure.trim()
          : metadata?.departure ?? null
      const arrival =
        typeof fare.arrival === 'string' && fare.arrival.trim().length
          ? fare.arrival.trim()
          : metadata?.arrival ?? null
      const canonicalFromPorts =
        departure && arrival ? mapHighspeedPortsToCanonicalRoute(departure, arrival) : null
      const finalRoute = normalizedRoute ?? canonicalFromPorts ?? (typeof fare.route === 'string' ? fare.route : null)
      const routeName =
        typeof fare.routeName === 'string' && fare.routeName.trim().length
          ? fare.routeName.trim()
          : null
      const displayName =
        typeof fare.displayName === 'string' && fare.displayName.trim().length
          ? fare.displayName.trim()
          : null

      return {
        route: finalRoute,
        adult: fare.adult ?? null,
        child: fare.child ?? null,
        disabledAdult,
        disabledChild,
        car3m: vehicle?.under3m ?? fare.car3m ?? null,
        car4m: vehicle?.under4m ?? fare.car4m ?? null,
        car5m: vehicle?.under5m ?? fare.car5m ?? null,
        car6m: vehicle?.under6m ?? fare.car6m ?? null,
        car7m: vehicle?.under7m ?? fare.car7m ?? null,
        car8m: vehicle?.under8m ?? fare.car8m ?? null,
        car9m: vehicle?.under9m ?? fare.car9m ?? null,
        car10m: vehicle?.under10m ?? fare.car10m ?? null,
        car11m: vehicle?.under11m ?? fare.car11m ?? null,
        car12m: vehicle?.under12m ?? fare.car12m ?? null,
        over12mPer1m: vehicle?.over12mPer1m ?? fare.over12mPer1m ?? null,
        seatClass: seatClass ?? null,
        vehicle: vehicle ?? null,
        disabled: disabledAdult !== null || disabledChild !== null
          ? { adult: disabledAdult, child: disabledChild }
          : null,
        type: fare.type,
        departure,
        arrival,
        routeName,
        displayName
      }
    }

    const versionPayloads: VersionPayload[] = Array.from(versionFaresMap.entries()).map(([versionId, versionFares]) => {
      const meta = versionMetaMap.get(versionId) || {}
      const vesselType = (meta.vesselType as VesselType) || (versionFares[0]?.type as VesselType) || 'ferry'

      return {
        id: versionId,
        vesselType,
        name: meta.name || null,
        description: meta.description || null,
        effectiveFrom: meta.effectiveFrom || '1970-01-01',
        createdAt: meta.createdAt || null,
        updatedAt: meta.updatedAt || null,
        fares: versionFares.map((fare: any) => normalizeFareRecord(fare))
      }
    })

    const versionsByType: Partial<Record<VesselType, VersionPayload[]>> = {}
    versionPayloads.forEach((version) => {
      if (!versionsByType[version.vesselType]) {
        versionsByType[version.vesselType] = []
      }
      versionsByType[version.vesselType]?.push(version)
    })

    const activeVersionIds: Partial<Record<VesselType, string>> = {}
    const activeFares: any[] = []
    const now = Date.now()

    Object.entries(versionsByType).forEach(([vesselType, versionList]) => {
      const sorted = versionList.sort((a, b) => parseTimestamp(b.effectiveFrom) - parseTimestamp(a.effectiveFrom))
      const active = sorted.find(version => parseTimestamp(version.effectiveFrom) <= now) || sorted[sorted.length - 1]
      if (active) {
        activeVersionIds[vesselType as VesselType] = active.id
        activeFares.push(...active.fares)
      }
    })

    if (!activeFares.length) {
      activeFares.push(
        ...fares.map((fare: any) => normalizeFareRecord(fare))
      )
    }

    // 有効な版だけをフィルタリング
    const activeVersions = versionPayloads.filter(version => {
      const activeId = activeVersionIds[version.vesselType]
      return activeId === version.id
    })

    // 内航船料金を取得
    let innerIslandFare: { adult: number | null; child: number | null } | null = null
    let innerIslandVehicleFare: Record<string, number> | null = null
    
    try {
      const innerIslandFareDoc = await getDocument('innerIslandFares', 'default')
      if (innerIslandFareDoc) {
        innerIslandFare = innerIslandFareDoc.innerIslandFare ?? null
        innerIslandVehicleFare = innerIslandFareDoc.innerIslandVehicleFare ?? null
      }
    } catch (error) {
      logger.warn('Failed to load inner island fare', error)
    }

    const result: Record<string, unknown> = {
      fares: activeFares,
      versions: activeVersions,
      activeVersionIds,
      discounts: discounts
        .filter((discount: any) => discount.active)
        .map((discount: any) => ({
          id: discount.id,
          name: discount.name,
          rate: discount.rate,
          conditions: discount.conditions
        })),
      notes: [] // FareMaster型に必須のnotesプロパティ
    }

    // 内航船料金が存在する場合のみ追加
    if (innerIslandFare) {
      result.innerIslandFare = innerIslandFare
    }
    
    if (innerIslandVehicleFare) {
      result.innerIslandVehicleFare = innerIslandVehicleFare
    }

    return result
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
   * ニュースデータの準備
   */
  const prepareNewsData = async () => {
    const { where, orderBy } = await import('firebase/firestore')
    const news = await getCollection('news', [
      where('status', '==', 'published'),
      orderBy('publishDate', 'desc')
    ])
    
    // 公開中のニュースのみをエクスポート
    return news.map(item => ({
      id: item.id,
      category: item.category,
      title: item.title,
      titleEn: item.titleEn,
      content: item.content,
      contentEn: item.contentEn,
      hasDetail: item.hasDetail || false,
      detailContent: item.detailContent,
      detailContentEn: item.detailContentEn,
      publishDate: item.publishDate instanceof Timestamp ? item.publishDate.toDate().toISOString() : item.publishDate,
      isPinned: item.isPinned || false,
      priority: item.priority || 'medium',
      status: item.status || 'published' // statusフィールドを追加
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
    
    const constraints: any[] = [
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

      if (history.type === 'timetable') {
        throw new Error('公開時刻表のロールバックはコード管理パイプラインからのみ実行できます')
      }

      // データを復元
      const jsonBlob = new Blob([JSON.stringify(history.dataSnapshot, null, 2)], {
        type: 'application/json'
      })

      let fileName: string
      switch (history.type) {
        case 'fare':
          fileName = 'fare-master.json'
          break
        case 'holidays':
          fileName = 'holidays.json'
          break
        case 'news':
          fileName = 'news.json'
          break
        default:
          throw new Error(`Unknown data type: ${history.type}`)
      }

      // Storage にアップロード
      const fileRef = storageRef($firebase.storage, `data/${fileName}`)
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
      logger.error('Rollback failed', error)
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
      const fileRef = storageRef($firebase.storage, `backups/${fileName}`)
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
      logger.error('Backup creation failed', error)
      throw error
    }
  }

  /**
   * バックアップからの復元
   */
  const restoreFromBackup = (backupId: string): Promise<never> => {
    // 実装は省略（セキュリティ上、慎重に実装する必要がある）
    return Promise.reject(new Error(`Not implemented: restore from backup ${backupId}`))
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
