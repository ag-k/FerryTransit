import * as admin from 'firebase-admin'
import { getTimetable, getTimetableFromStorage } from './timetable'

// Initialize Firebase Admin
const app = admin.initializeApp()

// Connect to emulators in development
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  try {
    admin.firestore().settings({
      host: 'localhost:8082',
      ssl: false
    })
    console.log('🔥 Functions: Connected to Firestore emulator on localhost:8082')
  } catch (error) {
    console.warn('⚠️ Functions: Firestore emulator connection failed:', error)
  }
}

// Export functions
export { getTimetable as getTimetableData, getTimetableFromStorage as getTimetableStorage }

// Export admin functions
export * from './admin'