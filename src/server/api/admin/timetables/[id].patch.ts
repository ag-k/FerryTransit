import { firestore } from '~/server/utils/firebase-admin'
import { requireAdminAuth } from '~/server/utils/admin-auth'

export default defineEventHandler(async (event) => {
  // 管理者認証の確認
  const adminToken = await requireAdminAuth(event)
  
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Timetable ID is required'
    })
  }
  
  const body = await readBody(event)
  
  try {
    // 更新データの準備
    const updateData = {
      ...body,
      updatedAt: new Date(),
      updatedBy: adminToken.uid
    }
    
    // 時刻形式の検証（もし含まれていれば）
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (body.departureTime && !timeRegex.test(body.departureTime)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid departure time format'
      })
    }
    if (body.arrivalTime && !timeRegex.test(body.arrivalTime)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid arrival time format'
      })
    }
    
    // データの更新
    await firestore.collection('timetables').doc(id).update(updateData)
    
    // 管理操作ログの記録
    await firestore.collection('adminLogs').add({
      action: 'update',
      target: 'timetables',
      targetId: id,
      adminId: adminToken.uid,
      adminEmail: adminToken.email,
      timestamp: new Date(),
      details: updateData,
      ip: getClientIP(event),
      userAgent: getHeader(event, 'user-agent')
    })
    
    // 更新後のデータを返す
    const doc = await firestore.collection('timetables').doc(id).get()
    if (!doc.exists) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Timetable not found'
      })
    }
    
    return {
      id: doc.id,
      ...doc.data()
    }
  } catch (error) {
    console.error('Failed to update timetable:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update timetable'
    })
  }
})

function getClientIP(event: H3Event): string {
  return getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
         getHeader(event, 'x-real-ip') || 
         event.node.req.socket.remoteAddress || 
         'unknown'
}