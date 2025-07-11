import { firestore } from '~/server/utils/firebase-admin'
import { requireAdminAuth } from '~/server/utils/admin-auth'

export default defineEventHandler(async (event) => {
  // 管理者認証の確認
  await requireAdminAuth(event)
  
  try {
    const query = getQuery(event)
    const limit = parseInt(query.limit as string) || 50
    const offset = parseInt(query.offset as string) || 0
    const route = query.route as string | undefined
    const status = query.status as string | undefined
    
    // Firestoreクエリの構築
    let firestoreQuery = firestore.collection('timetables')
    
    if (route) {
      firestoreQuery = firestoreQuery.where('departure', '==', route.split('-')[0])
                                     .where('arrival', '==', route.split('-')[1])
    }
    
    if (status !== undefined) {
      firestoreQuery = firestoreQuery.where('status', '==', parseInt(status))
    }
    
    // データの取得
    const snapshot = await firestoreQuery
      .orderBy('departureTime', 'asc')
      .limit(limit)
      .offset(offset)
      .get()
    
    const timetables = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // 総数の取得
    const countSnapshot = await firestoreQuery.count().get()
    const totalCount = countSnapshot.data().count
    
    return {
      timetables,
      totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount
    }
  } catch (error) {
    console.error('Failed to fetch timetables:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch timetables'
    })
  }
})