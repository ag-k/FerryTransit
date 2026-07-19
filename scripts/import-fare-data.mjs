#!/usr/bin/env node

/**
 * Import fare data from src/data/fare-master.json to Firestore emulator using Admin SDK
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import admin from 'firebase-admin'
import { configureAdminEmulatorEnv } from './emulator-config.mjs'

const projectRoot = process.cwd()

console.log('💰 Importing fare data using Admin SDK...')

try {
  // Initialize Firebase Admin SDK for emulator
  const { hosts } = configureAdminEmulatorEnv({ projectRoot })

  admin.initializeApp({
    projectId: 'oki-ferryguide'
  })

  const db = admin.firestore()
  console.log(`🔥 Connected to Firestore emulator with Admin SDK (${hosts.firestore})`)

  // Read fare data
  const fareDataPath = join(projectRoot, 'src/public/data/fare-master.json')
  const fareData = JSON.parse(readFileSync(fareDataPath, 'utf8'))

  console.log(`📊 Found fare data with structure: ${Object.keys(fareData).join(', ')}`)

  // Clear existing fare data first
  console.log('🗑️  Clearing existing fare data...')
  const existingFareDocs = await db.collection('fares').listDocuments()
  if (existingFareDocs.length > 0) {
    const deleteBatch = db.batch()
    existingFareDocs.forEach(doc => {
      deleteBatch.delete(doc)
    })
    await deleteBatch.commit()
    console.log(`✅ Cleared ${existingFareDocs.length} existing fare entries`)
  }

  // Clear existing fare versions
  console.log('🗑️  Clearing existing fare versions...')
  const existingVersionDocs = await db.collection('fareVersions').listDocuments()
  if (existingVersionDocs.length > 0) {
    const deleteBatch = db.batch()
    existingVersionDocs.forEach(doc => {
      deleteBatch.delete(doc)
    })
    await deleteBatch.commit()
    console.log(`✅ Cleared ${existingVersionDocs.length} existing fare version entries`)
  }

  // Convert fare data to Firestore format
  const fareRecords = []
  const versionRecords = []

  // Process inner island fares
  if (fareData.innerIslandFare) {
    const innerIslandVersion = {
      id: 'inner-island-default',
      vesselType: 'ferry',
      name: '島内航路',
      description: '隠岐諸島内航路の基本料金',
      effectiveFrom: '2024-01-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    versionRecords.push(innerIslandVersion)

    // Adult fare
    fareRecords.push({
      route: 'inner-island',
      adult: fareData.innerIslandFare.adult,
      child: fareData.innerIslandFare.child,
      versionId: 'inner-island-default',
      type: 'ferry',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Vehicle fares
    if (fareData.innerIslandVehicleFare) {
      Object.entries(fareData.innerIslandVehicleFare).forEach(([size, price]) => {
        const vehicleType = size.replace('under', '').replace('over', '').replace('m', '')
        fareRecords.push({
          route: 'inner-island',
          adult: null,
          child: null,
          vehicle: {
            [`under${size}`]: price
          },
          versionId: 'inner-island-default',
          type: 'ferry',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      })
    }
  }

  // Process rainbow jet fares
  if (fareData.rainbowJetFares) {
    const jetVersion = {
      id: 'rainbow-jet-default',
      vesselType: 'jet',
      name: 'レインボージェット',
      description: '高速船の基本料金',
      effectiveFrom: '2024-01-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    versionRecords.push(jetVersion)

    Object.entries(fareData.rainbowJetFares).forEach(([route, prices]) => {
      if (prices.adult !== null || prices.child !== null) {
        fareRecords.push({
          route: route,
          adult: prices.adult,
          child: prices.child,
          versionId: 'rainbow-jet-default',
          type: 'jet',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    })
  }

  // Import fare data in batches
  const batchSize = 500
  let importedFares = 0

  for (let i = 0; i < fareRecords.length; i += batchSize) {
    const batch = db.batch()
    const batchEnd = Math.min(i + batchSize, fareRecords.length)

    for (let j = i; j < batchEnd; j++) {
      const record = fareRecords[j]
      const docRef = db.collection('fares').doc()
      batch.set(docRef, record)
    }

    await batch.commit()
    importedFares += batchEnd - i
    console.log(`✅ Imported fare batch ${Math.floor(i / batchSize) + 1}: ${importedFares}/${fareRecords.length} entries`)
  }

  // Import version data
  for (let i = 0; i < versionRecords.length; i += batchSize) {
    const batch = db.batch()
    const batchEnd = Math.min(i + batchSize, versionRecords.length)

    for (let j = i; j < batchEnd; j++) {
      const record = versionRecords[j]
      const docRef = db.collection('fareVersions').doc(record.id)
      batch.set(docRef, record)
    }

    await batch.commit()
    console.log(`✅ Imported version batch ${Math.floor(i / batchSize) + 1}: ${batchEnd}/${versionRecords.length} entries`)
  }

  console.log(`🎉 Successfully imported ${importedFares} fare records and ${versionRecords.length} version records!`)

} catch (error) {
  console.error('❌ Failed to import fare data:', error)
  process.exit(1)
}
