#!/usr/bin/env node

/**
 * Test script to verify super admin registration in Firebase emulators
 */

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { configureAdminEmulatorEnv } from './emulator-config.mjs'

const { hosts } = configureAdminEmulatorEnv()

// Initialize Firebase Admin for emulator
initializeApp({
  projectId: 'oki-ferryguide'
})

const auth = getAuth()
const db = getFirestore()

async function testAdminRegistration() {
  try {
    console.log(`🔍 Testing super admin registration (${hosts.auth}, ${hosts.firestore})...\n`)

    // Check if user exists in Auth
    try {
      const user = await auth.getUserByEmail('admin@ferry-dev.local')
      console.log('✅ User found in Authentication:')
      console.log(`   Email: ${user.email}`)
      console.log(`   UID: ${user.uid}`)
      console.log(`   Display Name: ${user.displayName || 'None'}`)
      console.log(`   Custom Claims: ${JSON.stringify(user.customClaims)}`)
    } catch (error) {
      console.log('❌ User not found in Authentication:', error.message)
      return
    }

    // Check if user exists in Firestore
    try {
      // First get the user UID from auth
      const user = await auth.getUserByEmail('admin@ferry-dev.local')
      const userDoc = await db.collection('users').doc(user.uid).get()
      if (userDoc.exists) {
        console.log('\n✅ User found in Firestore users collection:')
        console.log(`   Data: ${JSON.stringify(userDoc.data())}`)
      } else {
        console.log('\n⚠️  User not found in Firestore users collection')
      }
    } catch (error) {
      console.log('\n❌ Error checking Firestore users:', error.message)
    }

    // Check if admin exists in Firestore admins collection
    try {
      // First get the user UID from auth
      const user = await auth.getUserByEmail('admin@ferry-dev.local')
      const adminDoc = await db.collection('admins').doc(user.uid).get()
      if (adminDoc.exists) {
        console.log('\n✅ Admin found in Firestore admins collection:')
        console.log(`   Data: ${JSON.stringify(adminDoc.data())}`)
      } else {
        console.log('\n⚠️  Admin not found in Firestore admins collection')
      }
    } catch (error) {
      console.log('\n❌ Error checking Firestore admins:', error.message)
    }

    console.log('\n🎉 Admin registration test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testAdminRegistration().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
