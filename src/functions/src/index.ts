import * as admin from 'firebase-admin'
import { getTimetable, getTimetableFromStorage } from './timetable'

// Initialize Firebase Admin
admin.initializeApp()

// Export functions
export { getTimetable as getTimetableData, getTimetableFromStorage as getTimetableStorage }

// Export admin functions
export * from './admin'