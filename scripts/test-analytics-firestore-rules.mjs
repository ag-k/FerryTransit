import { readFile } from 'node:fs/promises'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore'

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8751'
const [host, portText] = emulatorHost.split(':')
const rules = await readFile(new URL('../src/firestore.rules', import.meta.url), 'utf8')
const testEnvironment = await initializeTestEnvironment({
  projectId: 'demo-ferry-transit',
  firestore: {
    host,
    port: Number(portText),
    rules
  }
})

try {
  const anonymousDb = testEnvironment.unauthenticatedContext().firestore()
  const adminDb = testEnvironment.authenticatedContext('admin-user', {
    admin: true,
    role: 'general'
  }).firestore()
  const dailyPath = 'analytics_daily/2026-07-30'

  await assertFails(setDoc(doc(anonymousDb, dailyPath), {
    dateKey: '2026-07-30',
    pvTotal: 999999
  }))

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), dailyPath), {
      dateKey: '2026-07-30',
      pvTotal: 1
    })
  })

  await assertFails(getDoc(doc(anonymousDb, dailyPath)))
  await assertSucceeds(getDoc(doc(adminDb, dailyPath)))
  await assertFails(setDoc(doc(adminDb, dailyPath), {
    pvTotal: 999999
  }, { merge: true }))

  console.log('Analytics Firestore rules tests passed.')
} finally {
  await testEnvironment.cleanup()
}
