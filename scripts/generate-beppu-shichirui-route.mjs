#!/usr/bin/env node
// Generate route data for Beppu (別府港, BEPPU) -> Shichirui (七類港, HONDO_SHICHIRUI)
// - Uses Google Routes API v2 with DRIVE mode and sea waypoints
// - Decodes polyline, clips between sea waypoints to remove land segments
// - Falls back to straight sea line if API fails

import fs from 'node:fs/promises'
import path from 'node:path'

const OUT_DIR = path.resolve('output/routes')
const OUT_FILE = path.join(OUT_DIR, 'BEPPU_HONDO_SHICHIRUI.json')

// Port coordinates (from src/data/ports.ts)
const PORTS = {
  BEPPU: { id: 'BEPPU', name: '別府港', lat: 36.1077, lng: 133.0416 },
  HONDO_SHICHIRUI: { id: 'HONDO_SHICHIRUI', name: '七類港', lat: 35.5714, lng: 133.2298 }
}

// Read API key from .env
async function readApiKey() {
  try {
    const env = await fs.readFile(path.resolve('.env'), 'utf8')
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(/^NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=(.*)$/)
      if (m) return m[1].trim()
    }
  } catch {}
  return process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
}

// Haversine distance in meters
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

// Polyline decoder (Google Encoded Polyline Algorithm Format)
function decodePolyline(str) {
  let index = 0, lat = 0, lng = 0
  const coordinates = []
  while (index < str.length) {
    let b, shift = 0, result = 0
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1)
    lat += dlat
    shift = 0; result = 0
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1)
    lng += dlng
    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return coordinates
}

function nearestIndex(path, target) {
  let best = -1
  let dist = Infinity
  for (let i = 0; i < path.length; i++) {
    const d = haversine(path[i], { lat: target.latitude, lng: target.longitude })
    if (d < dist) { dist = d; best = i }
  }
  return best
}

// Fallback straight sea path
function straightSeaPath(from, to, steps = 50) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push({ lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t })
  }
  return pts
}

async function main() {
  const apiKey = await readApiKey()
  if (!apiKey) {
    console.error('Google Maps APIキーが見つかりません (.env の NUXT_PUBLIC_GOOGLE_MAPS_API_KEY)')
    process.exit(1)
  }

  const from = PORTS.BEPPU
  const to = PORTS.HONDO_SHICHIRUI

  // Long sea route waypoints for Beppu -> Shichirui direction
  const waypoints = [
    { location: { latLng: { latitude: 36.0, longitude: 133.10 }}},
    { location: { latLng: { latitude: 35.8, longitude: 133.15 }}}
  ]

  const body = {
    origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
    destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
    intermediates: waypoints,
    travelMode: 'DRIVE',
    polylineQuality: 'HIGH_QUALITY',
    polylineEncoding: 'ENCODED_POLYLINE',
    languageCode: 'ja',
    units: 'METRIC'
  }

  let pathPts = null
  try {
    const res = await fetch(`https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}` , {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline'
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`Routes API ${res.status}`)
    const data = await res.json()
    const encoded = data?.routes?.[0]?.polyline?.encodedPolyline
    if (encoded) {
      const full = decodePolyline(encoded)
      const idxA = nearestIndex(full, waypoints[0].location.latLng)
      const idxB = nearestIndex(full, waypoints[1].location.latLng)
      if (idxA !== -1 && idxB !== -1) {
        const s = Math.min(idxA, idxB)
        const e = Math.max(idxA, idxB)
        pathPts = full.slice(s, e + 1)
      } else {
        pathPts = full
      }
    }
  } catch (e) {
    console.error('Routes API失敗:', e?.message || e)
  }

  if (!pathPts || pathPts.length < 2) {
    // fallback to straight sea path
    pathPts = straightSeaPath({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng })
  }

  const distance = Math.round(pathDistanceMeters(pathPts))
  const duration = Math.round(distance / (37 * 1000 / 3600)) // ~37km/h

  const out = {
    id: `${from.id}_${to.id}`,
    from: from.id,
    to: to.id,
    fromName: from.name,
    toName: to.name,
    path: pathPts,
    distance,
    duration,
    source: 'google_routes',
    geodesic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await fs.mkdir(OUT_DIR, { recursive: true })
  await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2), 'utf8')
  console.log('生成完了:', OUT_FILE)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

