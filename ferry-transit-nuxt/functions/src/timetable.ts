import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

export const getTimetable = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    const { fromPort, toPort, date } = data
    
    if (!fromPort || !toPort || !date) {
      throw new functions.https.HttpsError(
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
        .sort((a, b) => a.departureTime.localeCompare(b.departureTime))
      
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
        schedules: allSchedules.map(schedule => ({
          ...schedule,
          operationStatus: alerts[schedule.routeId] || null
        }))
      }
      
      return response
    } catch (error) {
      console.error('Error getting timetable:', error)
      throw new functions.https.HttpsError(
        'internal',
        'Failed to fetch timetable data'
      )
    }
  })