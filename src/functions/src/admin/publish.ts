/* eslint-disable no-console */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import {
  ROUTE_METADATA,
  normalizeRouteId,
  mapHighspeedPortsToCanonicalRoute
} from '../../../utils/fareRoutes'

type TimestampLike = string | number | Date | { toDate: () => Date } | null | undefined

interface VehicleFare {
  under3m?: number | null
  under4m?: number | null
  under5m?: number | null
  [key: string]: unknown
}

interface DisabledFare {
  adult?: number | null
  child?: number | null
  [key: string]: unknown
}

interface FareDocument {
  id: string
  type?: string | null
  versionId?: string | null
  route?: string | null
  routeName?: string | null
  displayName?: string | null
  departure?: string | null
  arrival?: string | null
  adult?: number | null
  child?: number | null
  disabledAdult?: number | null
  disabledChild?: number | null
  car3m?: number | null
  car4m?: number | null
  car5m?: number | null
  seatClass?: string | null
  fares?: {
    seatClass?: string | null
    vehicle?: VehicleFare | null
    disabled?: DisabledFare | null
  }
  vehicle?: VehicleFare | null
  disabled?: DisabledFare | null
  [key: string]: unknown
}

interface NormalizedFareRecord {
  route: string | null
  adult: number | null
  child: number | null
  disabledAdult: number | null
  disabledChild: number | null
  car3m: number | null
  car4m: number | null
  car5m: number | null
  seatClass: string | null
  vehicle: VehicleFare | null
  disabled: DisabledFare | null
  type?: string | null
  departure: string | null
  arrival: string | null
  routeName: string | null
  displayName: string | null
}

interface VersionMetadata {
  id: string
  vesselType?: string | null
  name?: string | null
  description?: string | null
  effectiveFrom?: TimestampLike
  createdAt?: TimestampLike
  updatedAt?: TimestampLike
  [key: string]: unknown
}

interface VersionPayload {
  id: string
  vesselType: string
  name: string | null
  description: string | null
  effectiveFrom: TimestampLike | string
  createdAt: TimestampLike | null
  updatedAt: TimestampLike | null
  fares: NormalizedFareRecord[]
}

/**
 * データの本番公開（管理者のみ実行可能）
 * FirestoreからStorageへデータを公開
 */
export const publishData = onCall(
  { region: 'asia-northeast1' },
  async (request) => {
  // 呼び出し元の認証確認
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  // 管理者権限の確認
  const callerToken = await admin.auth().getUser(request.auth.uid)
  if (!callerToken.customClaims?.admin && !callerToken.customClaims?.superAdmin) {
    throw new HttpsError('permission-denied', 'Admin access required')
  }

  const { dataType } = request.data

  if (!dataType || !['timetable', 'fare', 'holidays'].includes(dataType)) {
    throw new HttpsError('invalid-argument', 'Valid data type is required')
  }

  try {
    let publishData: any
    let fileName: string = ''

    // データの準備
    switch (dataType) {
      case 'timetable':
        publishData = await prepareTimetableData()
        fileName = 'timetable.json'
        break
      case 'fare':
        publishData = await prepareFareData()
        fileName = 'fare-master.json'
        break
      case 'holidays':
        publishData = await prepareHolidayData()
        fileName = 'holidays.json'
        break
      default:
        throw new HttpsError('invalid-argument', 'Invalid data type')
    }

    // Storageへアップロード
    const bucket = admin.storage().bucket()
    const file = bucket.file(`data/${fileName}`)
    
    await file.save(JSON.stringify(publishData, null, 2), {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=3600',
        metadata: {
          publishedBy: request.auth.uid,
          publishedAt: new Date().toISOString(),
          dataType
        }
      }
    })

    // ファイルを公開
    await file.makePublic()
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/data/${fileName}`

    // 公開履歴を保存
    await admin.firestore().collection('publishHistory').add({
      type: dataType,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      publishedBy: request.auth.uid,
      publishedByEmail: callerToken.email,
      url: publicUrl,
      recordCount: Array.isArray(publishData) ? publishData.length : 
                   (publishData.fares ? publishData.fares.length : 0)
    })

    // 管理操作ログの記録
    await admin.firestore().collection('adminLogs').add({
      action: 'publish',
      target: dataType,
      targetId: fileName,
      adminId: request.auth.uid,
      adminEmail: callerToken.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: { url: publicUrl }
    })

    return {
      success: true,
      url: publicUrl,
      dataType,
      publishedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to publish data:', error)
    throw new HttpsError('internal', 'Failed to publish data')
  }
})

/**
 * データのロールバック（管理者のみ実行可能）
 */
export const rollbackData = onCall(
  { region: 'asia-northeast1' },
  async (request) => {
  // 呼び出し元の認証確認
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  // 管理者権限の確認
  const callerToken = await admin.auth().getUser(request.auth.uid)
  if (!callerToken.customClaims?.admin && !callerToken.customClaims?.superAdmin) {
    throw new HttpsError('permission-denied', 'Admin access required')
  }

  const { historyId } = request.data

  if (!historyId) {
    throw new HttpsError('invalid-argument', 'History ID is required')
  }

  try {
    // 履歴データを取得
    const historyDoc = await admin.firestore()
      .collection('publishHistory')
      .doc(historyId)
      .get()

    if (!historyDoc.exists) {
      throw new HttpsError('not-found', 'History not found')
    }

    const history = historyDoc.data()!
    
    // バックアップからデータを復元
    const bucket = admin.storage().bucket()
    const backupFile = bucket.file(`backups/${history.type}_${historyId}.json`)
    
    const [exists] = await backupFile.exists()
    if (!exists) {
      throw new HttpsError('not-found', 'Backup file not found')
    }

    // バックアップデータを取得
    const [backupData] = await backupFile.download()
    const data = JSON.parse(backupData.toString())

    // 本番環境に復元
    const fileName = history.type === 'timetable' ? 'timetable.json' :
                    history.type === 'fare' ? 'fare-master.json' : 'holidays.json'
    
    const file = bucket.file(`data/${fileName}`)
    await file.save(JSON.stringify(data, null, 2), {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=3600',
        metadata: {
          rolledBackBy: request.auth.uid,
          rolledBackAt: new Date().toISOString(),
          fromHistoryId: historyId
        }
      }
    })

    // ファイルを公開
    await file.makePublic()

    // 管理操作ログの記録
    await admin.firestore().collection('adminLogs').add({
      action: 'rollback',
      target: history.type,
      targetId: historyId,
      adminId: request.auth.uid,
      adminEmail: callerToken.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        originalPublishedAt: history.publishedAt
      }
    })

    return {
      success: true,
      dataType: history.type,
      rolledBackAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to rollback data:', error)
    throw new HttpsError('internal', 'Failed to rollback data')
  }
})

// ヘルパー関数
async function prepareTimetableData() {
  const snapshot = await admin.firestore().collection('timetables').get()
  return snapshot.docs.map(doc => ({
    tripId: doc.id,
    ...doc.data()
  }))
}

async function prepareFareData() {
  const [faresSnapshot, versionsSnapshot, discountsSnapshot] = await Promise.all([
    admin.firestore().collection('fares').get(),
    admin.firestore().collection('fareVersions').get(),
    admin.firestore().collection('discounts').where('active', '==', true).get()
  ])

  const parseTimestamp = (value: TimestampLike): number => {
    if (typeof value === 'number') {
      return value
    }
    if (value instanceof Date) {
      return value.getTime()
    }
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().getTime()
    }
    if (typeof value === 'string') {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? 0 : date.getTime()
    }
    return 0
  }

  const fares: FareDocument[] = faresSnapshot.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>
    return {
      id: doc.id,
      ...data
    } as FareDocument
  })
  const versions: VersionMetadata[] = versionsSnapshot.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>
    return {
      id: doc.id,
      ...data
    } as VersionMetadata
  })

  const versionMetaMap = new Map<string, VersionMetadata>()
  versions.forEach((version) => {
    versionMetaMap.set(version.id, version)
  })

  const fallbackVersions: Record<string, VersionMetadata> = {}
  const ensureFallbackVersion = (vesselType: string): VersionMetadata => {
    if (!fallbackVersions[vesselType]) {
      const fallbackId = `legacy-${vesselType}`
      const metadata: VersionMetadata = {
        id: fallbackId,
        vesselType,
        name: '既存データ',
        effectiveFrom: '1970-01-01'
      }
      fallbackVersions[vesselType] = metadata
      versionMetaMap.set(fallbackId, metadata)
    }
    return fallbackVersions[vesselType]
  }

  const versionFaresMap = new Map<string, FareDocument[]>()

  fares.forEach((fare) => {
    const vesselType = fare.type ?? 'ferry'
    let versionId = (typeof fare.versionId === 'string' ? fare.versionId : null)

    if (!versionId || !versionMetaMap.has(versionId)) {
      const fallback = ensureFallbackVersion(vesselType)
      versionId = fallback.id
    }

    if (!versionId) {
      return
    }

    if (!versionFaresMap.has(versionId)) {
      versionFaresMap.set(versionId, [])
    }

    versionFaresMap.get(versionId)!.push(fare)
  })

  const normalizeFareRecord = (fare: FareDocument): NormalizedFareRecord => {
    const seatClass = fare.fares?.seatClass ?? fare.seatClass ?? null
    const vehicle = (fare.fares?.vehicle ?? fare.vehicle ?? null) as VehicleFare | null
    const disabledSource = (fare.fares?.disabled ?? fare.disabled ?? {
      adult: typeof fare.disabledAdult === 'number' ? fare.disabledAdult : null,
      child: typeof fare.disabledChild === 'number' ? fare.disabledChild : null
    }) as DisabledFare | null

    const toNumberOrNull = (value: unknown): number | null => (typeof value === 'number' ? value : null)
    const disabledAdult = toNumberOrNull(disabledSource?.adult ?? fare.disabledAdult)
    const disabledChild = toNumberOrNull(disabledSource?.child ?? fare.disabledChild)
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
      adult: typeof fare.adult === 'number' ? fare.adult : null,
      child: typeof fare.child === 'number' ? fare.child : null,
      disabledAdult,
      disabledChild,
      car3m: typeof vehicle?.under3m === 'number' ? vehicle.under3m : (typeof fare.car3m === 'number' ? fare.car3m : null),
      car4m: typeof vehicle?.under4m === 'number' ? vehicle.under4m : (typeof fare.car4m === 'number' ? fare.car4m : null),
      car5m: typeof vehicle?.under5m === 'number' ? vehicle.under5m : (typeof fare.car5m === 'number' ? fare.car5m : null),
      seatClass,
      vehicle,
      disabled: disabledAdult !== null || disabledChild !== null
        ? { adult: disabledAdult, child: disabledChild }
        : null,
      type: fare.type ?? null,
      departure,
      arrival,
      routeName,
      displayName
    }
  }

  const versionPayloads: VersionPayload[] = []
  versionFaresMap.forEach((fareList, versionId) => {
    const meta: VersionMetadata = versionMetaMap.get(versionId) || { id: versionId }
    const vesselType = (meta.vesselType ?? fareList[0]?.type ?? 'ferry') as string

    versionPayloads.push({
      id: versionId,
      vesselType,
      name: typeof meta.name === 'string' ? meta.name : null,
      description: typeof meta.description === 'string' ? meta.description : null,
      effectiveFrom: meta.effectiveFrom ?? '1970-01-01',
      createdAt: meta.createdAt ?? null,
      updatedAt: meta.updatedAt ?? null,
      fares: fareList.map((fare) => normalizeFareRecord(fare))
    })
  })

  const versionsByType: Record<string, VersionPayload[]> = {}
  versionPayloads.forEach((version) => {
    if (!versionsByType[version.vesselType]) {
      versionsByType[version.vesselType] = []
    }
    versionsByType[version.vesselType].push(version)
  })

  const activeVersionIds: Record<string, string> = {}
  const activeFares: NormalizedFareRecord[] = []
  const now = Date.now()

  Object.entries(versionsByType).forEach(([vesselType, list]) => {
    const sorted = [...list].sort((a, b) => parseTimestamp(b.effectiveFrom) - parseTimestamp(a.effectiveFrom))
    const active = sorted.find((version) => parseTimestamp(version.effectiveFrom) <= now) || sorted[sorted.length - 1]
    if (active) {
      activeVersionIds[vesselType] = active.id
      activeFares.push(...active.fares)
    }
  })

  if (!activeFares.length) {
    activeFares.push(
      ...fares.map(fare => normalizeFareRecord(fare))
    )
  }

  // 内航船料金を取得
  let innerIslandFare: { adult: number | null; child: number | null } | null = null
  let innerIslandVehicleFare: Record<string, number> | null = null
  
  try {
    const innerIslandFareDoc = await admin.firestore()
      .collection('innerIslandFares')
      .doc('default')
      .get()
    
    if (innerIslandFareDoc.exists) {
      const data = innerIslandFareDoc.data()
      innerIslandFare = data?.innerIslandFare ?? null
      innerIslandVehicleFare = data?.innerIslandVehicleFare ?? null
    }
  } catch (error) {
    console.warn('Failed to load inner island fare:', error)
  }

  const result: Record<string, unknown> = {
    fares: activeFares,
    versions: versionPayloads,
    activeVersionIds,
    discounts: discountsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>)
    })),
    notes: [] // FareMaster型に必須のnotesプロパティ
  }

  // 内航船料金が存在する場合のみ追加
  if (innerIslandFare) {
    result.innerIslandFare = innerIslandFare
  } else {
    console.warn('innerIslandFare is null or undefined. This will cause errors for local vessel routes. Please set innerIslandFare in the admin panel.')
  }
  if (innerIslandVehicleFare) {
    result.innerIslandVehicleFare = innerIslandVehicleFare
  }

  return result
}

async function prepareHolidayData() {
  const snapshot = await admin.firestore().collection('holidays').get()
  return snapshot.docs.map(doc => doc.data())
}
