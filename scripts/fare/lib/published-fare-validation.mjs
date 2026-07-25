import { createHash } from 'node:crypto'

const MAINLAND = new Set(['HONDO'])
const DOZEN = new Set(['BEPPU', 'HISHIURA', 'KURI'])
const samePair = (departure, arrival, left, right) =>
  (departure === left && arrival === right) || (departure === right && arrival === left)

export const categoryForFare = ({ departure, arrival }) => {
  if ((MAINLAND.has(departure) && ['SAIGO', ...DOZEN].includes(arrival)) ||
      (MAINLAND.has(arrival) && ['SAIGO', ...DOZEN].includes(departure))) return 'hondo-oki'
  if ((departure === 'SAIGO' && DOZEN.has(arrival)) || (arrival === 'SAIGO' && DOZEN.has(departure))) return 'dozen-dogo'
  if (samePair(departure, arrival, 'BEPPU', 'HISHIURA')) return 'beppu-hishiura'
  if (samePair(departure, arrival, 'HISHIURA', 'KURI')) return 'hishiura-kuri'
  if (samePair(departure, arrival, 'KURI', 'BEPPU')) return 'kuri-beppu'
  return null
}

const stable = value => {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
  return value
}

export const fareFingerprint = fares => createHash('sha256')
  .update(JSON.stringify(stable([...fares].sort((a, b) => a.route.localeCompare(b.route)))))
  .digest('hex')

export const validatePublishedFerryFares = (fares, source, label = 'fare data') => {
  const errors = []
  if (!Array.isArray(fares)) return { errors: [`${label}: faresが配列ではありません`], fingerprint: null }
  if (fares.length !== 20) errors.push(`${label}: 20件ではありません（${fares.length}件）`)
  const routes = new Set()
  const directions = new Set()
  const categoryCounts = new Map()
  for (const fare of fares) {
    if (routes.has(fare.route)) errors.push(`${label}: route重複 ${fare.route}`)
    routes.add(fare.route)
    const direction = `${fare.departure}->${fare.arrival}`
    if (directions.has(direction)) errors.push(`${label}: 方向重複 ${direction}`)
    directions.add(direction)
    const categoryId = categoryForFare(fare)
    if (!categoryId) { errors.push(`${label}: 未定義区間 ${direction}`); continue }
    categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1)
    const expected = source.categories?.[categoryId]
    const expectedAdult = expected?.seatClass?.class2
    const expectedChild = Math.ceil(expectedAdult / 2 / 10) * 10
    if (fare.adult !== expectedAdult) errors.push(`${label}: ${fare.route} adult=${fare.adult} expected=${expectedAdult}`)
    if (fare.child !== expectedChild) errors.push(`${label}: ${fare.route} child=${fare.child} expected=${expectedChild}`)
    if (JSON.stringify(stable(fare.seatClass)) !== JSON.stringify(stable(expected?.seatClass))) errors.push(`${label}: ${fare.route} seatClass不一致`)
    if (JSON.stringify(stable(fare.vehicle)) !== JSON.stringify(stable(expected?.vehicle))) errors.push(`${label}: ${fare.route} vehicle不一致`)
  }
  for (const [categoryId, expectedCount] of Object.entries({ 'hondo-oki': 8, 'dozen-dogo': 6, 'beppu-hishiura': 2, 'hishiura-kuri': 2, 'kuri-beppu': 2 })) {
    const actual = categoryCounts.get(categoryId) ?? 0
    if (actual !== expectedCount) errors.push(`${label}: ${categoryId}=${actual}件 expected=${expectedCount}件`)
  }
  return { errors, fingerprint: fareFingerprint(fares), routes: routes.size, directions: directions.size }
}

export const activeFerryFares = data => {
  const activeVersionId = data.activeVersionIds?.ferry
  const version = data.versions?.find(item => item.id === activeVersionId)
  return { activeVersionId, version, fares: version?.fares }
}
