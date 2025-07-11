import { storage, firestore } from '~/server/utils/firebase-admin'
import { requireAdminAuth } from '~/server/utils/admin-auth'

interface PublishBody {
  dataType: 'timetable' | 'fare' | 'holidays'
}

export default defineEventHandler(async (event) => {
  // 管理者認証の確認
  const adminToken = await requireAdminAuth(event)
  
  const body = await readBody<PublishBody>(event)
  
  if (!body.dataType) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data type is required'
    })
  }
  
  try {
    let data: any
    let fileName: string
    
    // データの準備（preview.postと同じロジック）
    switch (body.dataType) {
      case 'timetable':
        const timetablesSnapshot = await firestore.collection('timetables').get()
        data = timetablesSnapshot.docs.map(doc => ({
          tripId: doc.id,
          name: doc.data().name,
          departure: doc.data().departure,
          arrival: doc.data().arrival,
          departureTime: doc.data().departureTime,
          arrivalTime: doc.data().arrivalTime,
          status: doc.data().status || 0,
          price: doc.data().price,
          startDate: doc.data().startDate,
          endDate: doc.data().endDate,
          via: doc.data().via
        }))
        fileName = 'timetable.json'
        break
        
      case 'fare':
        const faresSnapshot = await firestore.collection('fares').get()
        data = {
          fares: faresSnapshot.docs.map(doc => ({
            route: doc.data().route,
            adult: doc.data().adult,
            child: doc.data().child,
            car3m: doc.data().car3m,
            car4m: doc.data().car4m,
            car5m: doc.data().car5m,
            type: doc.data().type
          }))
        }
        fileName = 'fare-master.json'
        break
        
      case 'holidays':
        const holidaysSnapshot = await firestore.collection('holidays').get()
        data = holidaysSnapshot.docs.map(doc => ({
          date: doc.data().date,
          name: doc.data().name,
          nameEn: doc.data().nameEn
        }))
        fileName = 'holidays.json'
        break
        
      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid data type'
        })
    }
    
    // 本番環境にアップロード
    const path = `data/${fileName}`
    const file = storage.file(path)
    
    const stream = file.createWriteStream({
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=3600',
        metadata: {
          publishedBy: adminToken.uid,
          publishedAt: new Date().toISOString(),
          dataType: body.dataType
        }
      }
    })
    
    const jsonContent = JSON.stringify(data, null, 2)
    stream.end(jsonContent)
    
    await new Promise((resolve, reject) => {
      stream.on('error', reject)
      stream.on('finish', resolve)
    })
    
    // 公開URLを取得
    await file.makePublic()
    const publicUrl = `https://storage.googleapis.com/${storage.name}/${path}`
    
    // データのハッシュを生成
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(jsonContent)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const dataHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // 公開履歴を保存
    await firestore.collection('publishHistory').add({
      type: body.dataType,
      publishedAt: new Date(),
      publishedBy: adminToken.uid,
      publishedByEmail: adminToken.email,
      url: publicUrl,
      dataSnapshot: data,
      dataHash,
      recordCount: Array.isArray(data) ? data.length : (data.fares ? data.fares.length : 0)
    })
    
    // ログの記録
    await firestore.collection('adminLogs').add({
      action: 'publish',
      target: body.dataType,
      targetId: fileName,
      adminId: adminToken.uid,
      adminEmail: adminToken.email,
      timestamp: new Date(),
      details: { url: publicUrl, dataHash },
      ip: getClientIP(event),
      userAgent: getHeader(event, 'user-agent')
    })
    
    return {
      success: true,
      url: publicUrl,
      dataType: body.dataType,
      dataHash,
      publishedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to publish data:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to publish data'
    })
  }
})

function getClientIP(event: H3Event): string {
  return getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
         getHeader(event, 'x-real-ip') || 
         event.node.req.socket.remoteAddress || 
         'unknown'
}