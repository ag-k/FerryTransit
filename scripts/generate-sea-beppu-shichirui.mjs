#!/usr/bin/env node
// Generate a manual sea-only route for Beppu -> Shichirui via predefined sea control points
import fs from 'node:fs/promises'
import path from 'node:path'

const OUT_DIR = path.resolve('output/routes')
const OUT_FILE = path.join(OUT_DIR, 'BEPPU_HONDO_SHICHIRUI.custom.json')

const BEPPU = { id: 'BEPPU', name: '別府港', lat: 36.1077, lng: 133.0416 }
const SHICHIRUI = { id: 'HONDO_SHICHIRUI', name: '七類港', lat: 35.5714, lng: 133.2298 }

// Sea control points (same idea as in admin routes code)
const controlPoints = [
  { lat: BEPPU.lat, lng: BEPPU.lng },
  { lat: 36.10, lng: 133.55 }, // 別府港からの出発海域
  { lat: 36.20, lng: 133.35 }, // 島前海域
  { lat: 36.05, lng: 133.25 }, // 隠岐諸島西側海域
  { lat: SHICHIRUI.lat, lng: SHICHIRUI.lng }
]

function haversine(a, b) {
  const R = 6371e3
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1-h))
}

function pathDistanceMeters(path) {
  let sum = 0
  for (let i = 1; i < path.length; i++) sum += haversine(path[i-1], path[i])
  return sum
}

// Densify between points with linear interpolation (sufficient for display)
function densify(points, stepsPerSegment = 40) {
  const out = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment
      out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t })
    }
  }
  out.push(points[points.length - 1])
  return out
}

async function main() {
  const pathPts = densify(controlPoints, 50)
  const distance = Math.round(pathDistanceMeters(pathPts))
  const duration = Math.round(distance / (37 * 1000 / 3600)) // ~37km/h

  const out = {
    id: `${BEPPU.id}_${SHICHIRUI.id}`,
    from: BEPPU.id,
    to: SHICHIRUI.id,
    fromName: BEPPU.name,
    toName: SHICHIRUI.name,
    path: pathPts,
    distance,
    duration,
    source: 'custom',
    geodesic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await fs.mkdir(OUT_DIR, { recursive: true })
  await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2), 'utf8')
  console.log('海上ルート(手動) 生成完了:', OUT_FILE)
}

main().catch(err => { console.error(err); process.exit(1) })

