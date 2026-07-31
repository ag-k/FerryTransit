import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const JAL_SERVICE_NAMES = new Set(['JAL_OKI_ITAMI', 'JAL_OKI_IZUMO'])

export function validateJalFarePolicy(timetable) {
  if (!Array.isArray(timetable)) {
    throw new Error('時刻表JSONのルートは配列である必要があります')
  }

  const jalTrips = timetable.filter(trip => JAL_SERVICE_NAMES.has(trip?.name))
  if (jalTrips.length === 0) {
    throw new Error('JAL便が1件も見つかりません')
  }

  const errors = []
  let variableFareCount = 0
  let knownFareCount = 0

  for (const trip of jalTrips) {
    const fare = trip.price
    if (fare === undefined || fare === null || fare === '') {
      variableFareCount += 1
      continue
    }

    if (typeof fare !== 'number' || !Number.isFinite(fare) || fare <= 0) {
      errors.push(`${trip.trip_id ?? trip.tripId ?? '(ID不明)'}: priceは未設定または正の数にしてください`)
      continue
    }

    knownFareCount += 1
  }

  if (errors.length > 0) {
    throw new Error(`JAL運賃ポリシー違反:\n${errors.join('\n')}`)
  }

  return {
    total: jalTrips.length,
    variableFareCount,
    knownFareCount
  }
}

export async function validateJalFareFile(filePath) {
  const content = await readFile(filePath, 'utf8')
  return validateJalFarePolicy(JSON.parse(content))
}

async function main() {
  const filePath = resolve(process.argv[2] ?? 'gtfs/generated/public/timetable.json')
  const result = await validateJalFareFile(filePath)
  console.log(
    `JAL運賃検証成功: ${result.total}便（変動運賃 ${result.variableFareCount}便、登録済み運賃 ${result.knownFareCount}便）`
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
