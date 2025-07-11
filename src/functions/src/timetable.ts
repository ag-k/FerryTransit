import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import * as cors from 'cors'

// CORS設定
const corsOptions = {
  origin: true,
  credentials: true
}
const corsHandler = cors(corsOptions)

/**
 * Firebase Storage から時刻表データを取得
 */
export const getTimetableFromStorage = onRequest(
  { 
    region: 'asia-northeast1',
    cors: true
  },
  (request, response) => {
    return corsHandler(request, response, async () => {
      try {
        // Firebase Storage からファイルを取得
        const bucket = admin.storage().bucket()
        const file = bucket.file('data/timetable.json')
        
        // ファイルの存在確認
        const [exists] = await file.exists()
        if (!exists) {
          response.status(404).json({
            error: 'Timetable data not found'
          })
          return
        }
        
        // ファイルをダウンロード
        const [contents] = await file.download()
        const data = JSON.parse(contents.toString('utf-8'))
        
        // キャッシュヘッダーを設定（15分）
        response.set('Cache-Control', 'public, max-age=900')
        response.json(data)
      } catch (error) {
        console.error('Error getting timetable from storage:', error)
        response.status(500).json({
          error: 'Failed to fetch timetable data'
        })
      }
    })
  })

/**
 * Firestore から時刻表データを取得（既存の関数）
 */
export const getTimetable = onCall(
  { region: 'asia-northeast1' },
  async (request) => {
    const { fromPort, toPort, date } = request.data
    
    if (!fromPort || !toPort || !date) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required parameters: fromPort, toPort, date'
      )
    }
    
    try {
      const db = admin.firestore()
      const queryDate = new Date(date)
      const dayOfWeek = queryDate.getDay()
      
      // Get routes
      const routesSnapshot = await db.collection('routes')
        .where('fromPortCode', '==', fromPort)
        .where('toPortCode', '==', toPort)
        .get()
      
      if (routesSnapshot.empty) {
        return { schedules: [] }
      }
      
      const routeIds = routesSnapshot.docs.map(doc => doc.id)
      
      // Get timetables for these routes
      const timetablesPromises = routeIds.map(async (routeId) => {
        const timetablesSnapshot = await db.collection('timetables')
          .where('routeId', '==', routeId)
          .where('validFrom', '<=', queryDate)
          .where('dayOfWeek', 'array-contains', dayOfWeek)
          .orderBy('validFrom', 'desc')
          .orderBy('departureTime', 'asc')
          .get()
        
        return timetablesSnapshot.docs
          .filter(doc => {
            const data = doc.data()
            // Check if validUntil is null or after query date
            if (data.validUntil && data.validUntil.toDate() < queryDate) {
              return false
            }
            // Check if date is in excluded dates
            if (data.excludedDates && data.excludedDates.includes(date)) {
              return false
            }
            return true
          })
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            routeInfo: routesSnapshot.docs.find(r => r.id === routeId)?.data()
          }))
      })
      
      const allTimetables = (await Promise.all(timetablesPromises)).flat()
      
      // Check for special schedules
      const specialSchedules = await db.collection('timetables')
        .where('routeId', 'in', routeIds)
        .where('isSpecialSchedule', '==', true)
        .where('specialDates', 'array-contains', date)
        .orderBy('departureTime', 'asc')
        .get()
      
      const specialTimetables = specialSchedules.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        routeInfo: routesSnapshot.docs.find(r => r.id === doc.data().routeId)?.data()
      }))
      
      // Merge and sort all timetables
      const allSchedules = [...allTimetables, ...specialTimetables]
        .sort((a: any, b: any) => a.departureTime.localeCompare(b.departureTime))
      
      // Get operation alerts for the date
      const alertsSnapshot = await db.collection('operationAlerts')
        .where('alertDate', '==', date)
        .where('routeId', 'in', routeIds)
        .get()
      
      const alerts = alertsSnapshot.docs.reduce((acc, doc) => {
        acc[doc.data().routeId] = doc.data()
        return acc
      }, {} as Record<string, any>)
      
      // Format response
      const response = {
        date,
        fromPort,
        toPort,
        schedules: allSchedules.map((schedule: any) => ({
          ...schedule,
          operationStatus: alerts[schedule.routeId] || null
        }))
      }
      
      return response
    } catch (error) {
      console.error('Error getting timetable:', error)
      throw new HttpsError(
        'internal',
        'Failed to fetch timetable data'
      )
    }
  })