import { firestore } from '~/server/utils/firebase-admin'
import { requireAdminAuth } from '~/server/utils/admin-auth'

interface TimetableData {
  name: string
  departure: string
  arrival: string
  departureTime: string
  arrivalTime: string
  status?: number
  price?: number
  startDate?: string
  endDate?: string
  via?: string
}

export default defineEventHandler(async (event) => {
  // 管理者認証の確認
  const adminToken = await requireAdminAuth(event)
  
  const body = await readBody<TimetableData>(event)
  
  // 必須フィールドの検証
  if (!body.name || !body.departure || !body.arrival || !body.departureTime || !body.arrivalTime) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields'
    })
  }
  
  // 時刻形式の検証
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(body.departureTime) || !timeRegex.test(body.arrivalTime)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid time format'
    })
  }
  
  try {
    // データの作成
    const timetableData = {
      ...body,
      status: body.status || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminToken.uid,
      updatedBy: adminToken.uid
    }
    
    const docRef = await firestore.collection('timetables').add(timetableData)
    
    // 管理操作ログの記録
    await firestore.collection('adminLogs').add({
      action: 'create',
      target: 'timetables',
      targetId: docRef.id,
      adminId: adminToken.uid,
      adminEmail: adminToken.email,
      timestamp: new Date(),
      details: timetableData,
      ip: getClientIP(event),
      userAgent: getHeader(event, 'user-agent')
    })
    
    return {
      id: docRef.id,
      ...timetableData
    }
  } catch (error) {
    console.error('Failed to create timetable:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create timetable'
    })
  }
})

function getClientIP(event: H3Event): string {
  return getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
         getHeader(event, 'x-real-ip') || 
         event.node.req.socket.remoteAddress || 
         'unknown'
}