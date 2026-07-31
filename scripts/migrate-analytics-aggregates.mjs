import {
  applicationDefault,
  getApps,
  initializeApp
} from 'firebase-admin/app'
import {
  FieldPath,
  FieldValue,
  getFirestore
} from 'firebase-admin/firestore'

const COLLECTIONS = [
  'analytics_daily',
  'analytics_monthly',
  'analytics_hourly'
]
const COUNTER_FIELDS = [
  'routeCounts',
  'departureCounts',
  'arrivalCounts',
  'hourCounts'
]
const BATCH_SIZE = 400

const args = process.argv.slice(2)
const getArgValue = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

const projectId = getArgValue('--project')
const shouldApply = args.includes('--apply')

if (!projectId) {
  console.error(
    'Usage: npm run analytics:migrate-aggregates -- --project <firebase-project-id> [--apply]'
  )
  process.exitCode = 1
} else {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId
    })
  }

  const db = getFirestore()
  const pendingMigrations = []

  for (const collectionName of COLLECTIONS) {
    const snapshot = await db.collection(collectionName).get()
    let affectedDocuments = 0
    let affectedFields = 0

    for (const document of snapshot.docs) {
      const data = document.data()
      const legacyCounters = []

      for (const fieldName of COUNTER_FIELDS) {
        const prefix = `${fieldName}.`
        for (const [key, value] of Object.entries(data)) {
          if (!key.startsWith(prefix) || typeof value !== 'number' || !Number.isFinite(value)) {
            continue
          }

          const counterKey = key.slice(prefix.length)
          if (!counterKey) {
            continue
          }

          legacyCounters.push({
            fieldName,
            counterKey,
            legacyFieldName: key,
            value
          })
        }
      }

      if (legacyCounters.length > 0) {
        affectedDocuments += 1
        affectedFields += legacyCounters.length
        pendingMigrations.push({
          reference: document.ref,
          legacyCounters
        })
      }
    }

    console.log(
      `${collectionName}: ${snapshot.size} documents checked, ` +
      `${affectedDocuments} documents / ${affectedFields} fields require migration`
    )
  }

  if (!shouldApply) {
    console.log('Dry run only. Re-run with --apply to migrate the fields.')
  } else {
    for (let offset = 0; offset < pendingMigrations.length; offset += BATCH_SIZE) {
      const batch = db.batch()
      const chunk = pendingMigrations.slice(offset, offset + BATCH_SIZE)

      for (const migration of chunk) {
        const updateArguments = []
        for (const counter of migration.legacyCounters) {
          updateArguments.push(
            new FieldPath(counter.fieldName, counter.counterKey),
            FieldValue.increment(counter.value),
            new FieldPath(counter.legacyFieldName),
            FieldValue.delete()
          )
        }
        batch.update(migration.reference, ...updateArguments)
      }

      await batch.commit()
      console.log(`Migrated ${Math.min(offset + chunk.length, pendingMigrations.length)} / ${pendingMigrations.length} documents`)
    }

    console.log('Analytics aggregate migration completed.')
  }
}
