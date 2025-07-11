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
  
  try {
    // 削除前にデータを取得（ログ用）
    const doc = await firestore.collection('timetables').doc(id).get()
    if (!doc.exists) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Timetable not found'
      })
    }
    
    const deletedData = doc.data()
    
    // データの削除
    await firestore.collection('timetables').doc(id).delete()
    
    // 管理操作ログの記録
    await firestore.collection('adminLogs').add({
      action: 'delete',
      target: 'timetables',
      targetId: id,
      adminId: adminToken.uid,
      adminEmail: adminToken.email,
      timestamp: new Date(),
      details: { deletedData },
      ip: getClientIP(event),
      userAgent: getHeader(event, 'user-agent')
    })
    
    return {
      success: true,
      deletedId: id
    }
  } catch (error) {
    console.error('Failed to delete timetable:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete timetable'
    })
  }
})

function getClientIP(event: H3Event): string {
  return getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
         getHeader(event, 'x-real-ip') || 
         event.node.req.socket.remoteAddress || 
         'unknown'
}