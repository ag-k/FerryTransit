#!/usr/bin/env node

/**
 * Import timetable data from archive/timetable.json to Firestore emulator using Admin SDK
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import admin from 'firebase-admin'

const projectRoot = process.cwd()

console.log('📅 Importing timetable data using Admin SDK...')

try {
  // Initialize Firebase Admin SDK for emulator
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:18084'
  
  admin.initializeApp({
    projectId: 'oki-ferryguide'
  })
  
  const db = admin.firestore()
  console.log('🔥 Connected to Firestore emulator with Admin SDK')
  
  // Read timetable data
  const timetablePath = join(projectRoot, 'archive/timetable.json')
  const timetableData = JSON.parse(readFileSync(timetablePath, 'utf8'))
  
  console.log(`📊 Found ${timetableData.length} timetable entries`)
  
  // Clear existing timetable data first
  console.log('🗑️  Clearing existing timetable data...')
  const existingDocs = await db.collection('timetables').listDocuments()
  if (existingDocs.length > 0) {
    const deleteBatch = db.batch()
    existingDocs.forEach(doc => {
      deleteBatch.delete(doc)
    })
    await deleteBatch.commit()
    console.log(`✅ Cleared ${existingDocs.length} existing entries`)
  }
  
  // Import to Firestore in batches
  const batchSize = 500
  let importedCount = 0
  
  for (let i = 0; i < timetableData.length; i += batchSize) {
    const batch = db.batch()
    const batchEnd = Math.min(i + batchSize, timetableData.length)
    
    for (let j = i; j < batchEnd; j++) {
      const entry = timetableData[j]
      const docRef = db.collection('timetables').doc(entry.trip_id || `timetable_${j}`)
      
      // Convert data to match expected format (same as admin UI)
      const docData = {
        trip_id: entry.trip_id,
        next_id: entry.next_id || '',
        start_date: entry.start_date,
        end_date: entry.end_date,
        name: entry.name,
        departure: entry.departure,
        departure_time: entry.departure_time,
        arrival: entry.arrival,
        arrival_time: entry.arrival_time,
        status: 0, // 通常運航 (Normal operation)
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      batch.set(docRef, docData)
    }
    
    await batch.commit()
    importedCount += batchEnd - i
    console.log(`✅ Imported batch ${Math.floor(i/batchSize) + 1}: ${importedCount}/${timetableData.length} entries`)
  }
  
  console.log(`🎉 Successfully imported all ${importedCount} timetable entries!`)
  
} catch (error) {
  console.error('❌ Failed to import timetable data:', error)
  process.exit(1)
}
