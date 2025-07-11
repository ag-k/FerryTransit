import { storage, firestore } from '~/server/utils/firebase-admin'
import { requireAdminAuth } from '~/server/utils/admin-auth'

interface PublishPreviewBody {
  dataType: 'timetable' | 'fare' | 'holidays'
}

export default defineEventHandler(async (event) => {
  // 管理者認証の確認
  const adminToken = await requireAdminAuth(event)
  
  const body = await readBody<PublishPreviewBody>(event)
  
  if (!body.dataType) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data type is required'
    })
  }
  
  try {
    let data: any
    let fileName: string
    
    // データの準備
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
    
    // プレビュー用にStorage にアップロード
    const path = `preview/${fileName}`
    const file = storage.file(path)
    
    const stream = file.createWriteStream({
      metadata: {
        contentType: 'application/json',
        metadata: {
          publishedBy: adminToken.uid,
          publishedAt: new Date().toISOString(),
          dataType: body.dataType,
          isPreview: 'true'
        }
      }
    })
    
    stream.end(JSON.stringify(data, null, 2))
    
    await new Promise((resolve, reject) => {
      stream.on('error', reject)
      stream.on('finish', resolve)
    })
    
    // プレビューURLを生成（1時間有効）
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000 // 1時間
    })
    
    // ログの記録
    await firestore.collection('adminLogs').add({
      action: 'preview',
      target: body.dataType,
      targetId: fileName,
      adminId: adminToken.uid,
      adminEmail: adminToken.email,
      timestamp: new Date(),
      details: { url },
      ip: getClientIP(event),
      userAgent: getHeader(event, 'user-agent')
    })
    
    return {
      previewUrl: url,
      dataType: body.dataType,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }
  } catch (error) {
    console.error('Failed to create preview:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create preview'
    })
  }
})

function getClientIP(event: H3Event): string {
  return getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
         getHeader(event, 'x-real-ip') || 
         event.node.req.socket.remoteAddress || 
         'unknown'
}