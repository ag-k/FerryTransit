import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { getTimetable } from './timetable'

// Initialize Firebase Admin
admin.initializeApp()

// Export functions
export const getTimetableData = getTimetable