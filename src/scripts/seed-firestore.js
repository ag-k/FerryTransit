const admin = require('firebase-admin')

// Initialize Firebase Admin
admin.initializeApp()
const db = admin.firestore()

// Seed data
const seedData = async () => {
  try {
    // Ports data
    const ports = [
      { code: 'saigo', nameJa: '西郷', nameEn: 'Saigo', latitude: 36.2167, longitude: 133.3167, isMainland: false },
      { code: 'hishiura', nameJa: '菱浦', nameEn: 'Hishiura', latitude: 36.3000, longitude: 133.2167, isMainland: false },
      { code: 'beppu', nameJa: '別府', nameEn: 'Beppu', latitude: 36.3333, longitude: 133.2667, isMainland: false },
      { code: 'kurii', nameJa: '来居', nameEn: 'Kurii', latitude: 36.1500, longitude: 133.1833, isMainland: false },
      { code: 'shichirui', nameJa: '七類', nameEn: 'Shichirui', latitude: 35.5167, longitude: 133.1667, isMainland: true },
      { code: 'sakaiminato', nameJa: '境港', nameEn: 'Sakaiminato', latitude: 35.5333, longitude: 133.2333, isMainland: true }
    ]
    
    console.log('Seeding ports...')
    const portRefs = {}
    for (const port of ports) {
      const ref = await db.collection('ports').add({
        ...port,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      portRefs[port.code] = ref.id
      console.log(`Added port: ${port.code}`)
    }
    
    // Ships data
    const ships = [
      { code: 'oki', nameJa: 'フェリーおき', nameEn: 'Ferry Oki', capacityPassengers: 764, capacityCars: 100, speedKnots: 18.0 },
      { code: 'shirashima', nameJa: 'フェリーしらしま', nameEn: 'Ferry Shirashima', capacityPassengers: 764, capacityCars: 100, speedKnots: 18.0 },
      { code: 'kuniga', nameJa: 'フェリーくにが', nameEn: 'Ferry Kuniga', capacityPassengers: 764, capacityCars: 100, speedKnots: 18.0 },
      { code: 'dozen', nameJa: 'フェリーどうぜん', nameEn: 'Ferry Dozen', capacityPassengers: 350, capacityCars: 0, speedKnots: 20.0 }
    ]
    
    console.log('Seeding ships...')
    const shipRefs = {}
    for (const ship of ships) {
      const ref = await db.collection('ships').add({
        ...ship,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      shipRefs[ship.code] = ref.id
      console.log(`Added ship: ${ship.code}`)
    }
    
    // Routes data
    const routes = [
      { fromPort: 'shichirui', toPort: 'saigo', ship: 'oki', durationMinutes: 150, distanceKm: 85 },
      { fromPort: 'shichirui', toPort: 'hishiura', ship: 'oki', durationMinutes: 180, distanceKm: 95 },
      { fromPort: 'shichirui', toPort: 'beppu', ship: 'oki', durationMinutes: 210, distanceKm: 105 },
      { fromPort: 'saigo', toPort: 'shichirui', ship: 'oki', durationMinutes: 150, distanceKm: 85 },
      { fromPort: 'hishiura', toPort: 'shichirui', ship: 'oki', durationMinutes: 180, distanceKm: 95 },
      { fromPort: 'beppu', toPort: 'shichirui', ship: 'oki', durationMinutes: 210, distanceKm: 105 },
      { fromPort: 'saigo', toPort: 'hishiura', ship: 'dozen', durationMinutes: 70, distanceKm: 45 },
      { fromPort: 'saigo', toPort: 'beppu', ship: 'dozen', durationMinutes: 100, distanceKm: 60 },
      { fromPort: 'hishiura', toPort: 'saigo', ship: 'dozen', durationMinutes: 70, distanceKm: 45 },
      { fromPort: 'beppu', toPort: 'saigo', ship: 'dozen', durationMinutes: 100, distanceKm: 60 }
    ]
    
    console.log('Seeding routes...')
    const routeRefs = []
    for (const route of routes) {
      const ref = await db.collection('routes').add({
        fromPortId: portRefs[route.fromPort],
        fromPortCode: route.fromPort,
        toPortId: portRefs[route.toPort],
        toPortCode: route.toPort,
        shipId: shipRefs[route.ship],
        durationMinutes: route.durationMinutes,
        distanceKm: route.distanceKm,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      routeRefs.push({ id: ref.id, ...route })
      console.log(`Added route: ${route.fromPort} -> ${route.toPort}`)
    }
    
    // Sample timetables
    const timetables = [
      { route: 0, departure: '09:00', arrival: '11:30' },
      { route: 0, departure: '14:30', arrival: '17:00' },
      { route: 3, departure: '11:50', arrival: '14:20' },
      { route: 3, departure: '17:20', arrival: '19:50' }
    ]
    
    console.log('Seeding timetables...')
    for (const timetable of timetables) {
      await db.collection('timetables').add({
        routeId: routeRefs[timetable.route].id,
        departureTime: timetable.departure,
        arrivalTime: timetable.arrival,
        validFrom: admin.firestore.Timestamp.fromDate(new Date('2025-01-01')),
        validUntil: null,
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
        isSpecialSchedule: false,
        specialDates: [],
        excludedDates: [],
        notesJa: '',
        notesEn: '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log(`Added timetable: ${routeRefs[timetable.route].fromPort} -> ${routeRefs[timetable.route].toPort} at ${timetable.departure}`)
    }
    
    // Holidays
    const holidays = [
      { date: '2025-01-01', nameJa: '元日', nameEn: 'New Year\'s Day' },
      { date: '2025-05-03', nameJa: '憲法記念日', nameEn: 'Constitution Day' },
      { date: '2025-05-04', nameJa: 'みどりの日', nameEn: 'Greenery Day' },
      { date: '2025-05-05', nameJa: 'こどもの日', nameEn: 'Children\'s Day' }
    ]
    
    console.log('Seeding holidays...')
    for (const holiday of holidays) {
      await db.collection('holidays').add({
        ...holiday,
        isPeakSeason: holiday.date.startsWith('2025-05'),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log(`Added holiday: ${holiday.date}`)
    }
    
    console.log('Seeding completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding data:', error)
    process.exit(1)
  }
}

seedData()