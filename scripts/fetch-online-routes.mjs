#!/usr/bin/env node

// オンライン（Overpass / Google Routes API）で航路を取得し、
// output/routes/<ID>.json に保存後、統合ファイルを更新するCLI。
//
// 例:
//   node scripts/fetch-online-routes.mjs --from BEPPU --to HONDO_SHICHIRUI
//   node scripts/fetch-online-routes.mjs --id BEPPU_HONDO_SHICHIRUI
//   node scripts/fetch-online-routes.mjs --all
//   node scripts/fetch-online-routes.mjs --id A_B,C_D --by you@example.com

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { execFile as _execFile } from 'child_process'
import { promisify } from 'util'
const execFile = promisify(_execFile)

// Node 18+ で fetch がグローバルに存在する前提
if (typeof fetch !== 'function') {
  console.error('This script requires Node.js 18+ (global fetch)')
  process.exit(1)
}

const ROOT = process.cwd()
const OUTPUT_DIR = join(ROOT, 'output', 'routes')

// 必要最小限の港データ（座標と表示名）
const PORTS = {
  HONDO_SHICHIRUI: { id: 'HONDO_SHICHIRUI', name: '七類港', lat: 35.5714, lng: 133.2298 },
  HONDO_SAKAIMINATO: { id: 'HONDO_SAKAIMINATO', name: '境港', lat: 35.5454, lng: 133.2226 },
  SAIGO: { id: 'SAIGO', name: '西郷港', lat: 36.2035, lng: 133.3351 },
  HISHIURA: { id: 'HISHIURA', name: '菱浦港', lat: 36.1049, lng: 133.0769 },
  BEPPU: { id: 'BEPPU', name: '別府港', lat: 36.1077, lng: 133.0416 },
  KURI: { id: 'KURI', name: '来居港', lat: 36.0250, lng: 133.0393 }
}

// 既知のルートペア（管理画面と同等）
const ROUTE_PAIRS = [
  ['HONDO_SHICHIRUI', 'SAIGO'],
  ['HONDO_SHICHIRUI', 'KURI'],
  ['SAIGO', 'HISHIURA'],
  ['SAIGO', 'HONDO_SHICHIRUI'],
  ['HISHIURA', 'HONDO_SHICHIRUI'],
  ['HISHIURA', 'BEPPU'],
  ['HISHIURA', 'SAIGO'],
  ['HISHIURA', 'KURI'],
  ['BEPPU', 'HONDO_SHICHIRUI'],
  ['BEPPU', 'HISHIURA'],
  ['BEPPU', 'KURI'],
  ['BEPPU', 'SAIGO'],
  ['KURI', 'SAIGO'],
  ['SAIGO', 'HONDO_SAKAIMINATO'],
  ['KURI', 'BEPPU'],
  ['KURI', 'HONDO_SAKAIMINATO'],
  ['HISHIURA', 'HONDO_SAKAIMINATO'],
  ['HONDO_SAKAIMINATO', 'BEPPU']
]

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const toRad = d => (d * Math.PI) / 180
const haversine = (a, b) => {
  const R = 6371e3
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}
const pathDistance = (pts) => pts.reduce((s, _, i, arr) => i ? s + haversine(arr[i-1], arr[i]) : 0, 0)

// Overpass: ways からグラフ化して最短経路を抽出
const buildGraphFromWays = (ways, joinTolerance = 300) => {
  const nodes = []
  const adj = new Map()
  const push = (pt) => { nodes.push(pt); return nodes.length - 1 }
  const edge = (a, b) => {
    const w = haversine(nodes[a], nodes[b])
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a).push({ to: b, w })
    adj.get(b).push({ to: a, w })
  }
  const endpoints = []
  for (const w of ways) {
    const g = w.geometry
    if (!Array.isArray(g) || g.length < 2) continue
    let prev = null
    let first = -1
    for (const p of g) {
      const idx = push({ lat: p.lat, lng: p.lon })
      if (prev != null) edge(prev, idx); else first = idx
      prev = idx
    }
    if (first !== -1 && prev != null) endpoints.push(first, prev)
  }
  for (let i = 0; i < endpoints.length; i++) {
    for (let j = i+1; j < endpoints.length; j++) {
      const a = endpoints[i], b = endpoints[j]
      const d = haversine(nodes[a], nodes[b])
      if (d <= joinTolerance) edge(a, b)
    }
  }
  return { nodes, adj }
}

const nearestNode = (graph, pt) => {
  let best = -1, bestD = Infinity
  for (let i = 0; i < graph.nodes.length; i++) {
    const d = haversine(graph.nodes[i], pt)
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}

const shortestPath = (graph, s, t) => {
  const n = graph.nodes.length
  const dist = Array(n).fill(Infinity)
  const prev = Array(n).fill(-1)
  const used = Array(n).fill(false)
  dist[s] = 0
  for (let it = 0; it < n; it++) {
    let u = -1, best = Infinity
    for (let i = 0; i < n; i++) if (!used[i] && dist[i] < best) { best = dist[i]; u = i }
    if (u === -1) break
    used[u] = true
    if (u === t) break
    const edges = graph.adj.get(u) || []
    for (const {to, w} of edges) {
      const nd = dist[u] + w
      if (nd < dist[to]) { dist[to] = nd; prev[to] = u }
    }
  }
  if (prev[t] === -1) return []
  const path = []
  for (let cur = t; cur !== -1; cur = prev[cur]) path.push(cur)
  return path.reverse()
}

const isLongSea = (from, to) => (
  (from === 'HONDO_SAKAIMINATO' && to === 'BEPPU') ||
  (from === 'BEPPU' && to === 'HONDO_SAKAIMINATO') ||
  (from === 'HONDO_SHICHIRUI' && to === 'BEPPU') ||
  (from === 'BEPPU' && to === 'HONDO_SHICHIRUI')
)

const decodePolyline = (enc) => {
  const points = []
  let index = 0, lat = 0, lng = 0
  while (index < enc.length) {
    let b, shift = 0, result = 0
    do { b = enc.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1)
    lat += dlat
    shift = 0; result = 0
    do { b = enc.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1)
    lng += dlng
    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

const DEFAULT_OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
]

async function fetchOverpass(from, to) {
  const a = PORTS[from]; const b = PORTS[to]
  if (!a || !b) throw new Error('Unknown port id')
  const minLat = Math.min(a.lat, b.lat) - 0.6
  const maxLat = Math.max(a.lat, b.lat) + 0.6
  const minLng = Math.min(a.lng, b.lng) - 0.6
  const maxLng = Math.max(a.lng, b.lng) + 0.6
  const query = `
    [out:json][timeout:60];
    rel["route"="ferry"](${minLat},${minLng},${maxLat},${maxLng})->.rels;
    way(r.rels)->.wrel;
    way["route"="ferry"](${minLat},${minLng},${maxLat},${maxLng})->.wonly;
    (.wrel; .wonly;);
    out geom;`
  const endpoints = (process.env.OVERPASS_ENDPOINTS || '').split(',').map(s => s.trim()).filter(Boolean)
  const tryList = endpoints.length ? endpoints : DEFAULT_OVERPASS_ENDPOINTS

  let data = null
  let lastErr = null
  for (const ep of tryList) {
    try {
      const res = await fetch(ep, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: query })
      })
      if (!res.ok) {
        // 429/5xx は次のエンドポイントへフォールバック
        if (res.status >= 500 || res.status === 429) {
          lastErr = new Error(`Overpass ${res.status}`)
          await sleep(1000)
          continue
        }
        throw new Error(`Overpass ${res.status}`)
      }
      data = await res.json()
      break
    } catch (e) {
      lastErr = e
      // 次のエンドポイントを試す
      await sleep(1000)
      continue
    }
  }
  if (!data) throw lastErr || new Error('Overpass failed')
  let ways = (data?.elements || []).filter(el => el.type === 'way' && Array.isArray(el.geometry))
  if (ways.length === 0) return null

  // 経由地回避
  const filterWaysByAvoid = (inputWays, avoidIds, radius = 5000) => {
    const avoids = avoidIds.map(id => PORTS[id]).filter(Boolean)
    const filtered = inputWays.filter(w => {
      for (const g of w.geometry) {
        for (const ap of avoids) {
          const d = haversine({ lat: g.lat, lng: g.lon }, { lat: ap.lat, lng: ap.lng })
          if (d <= radius) return false
        }
      }
      return true
    })
    return filtered.length ? filtered : inputWays
  }
  const isBeppuShichirui = (from === 'BEPPU' && to === 'HONDO_SHICHIRUI') || (from === 'HONDO_SHICHIRUI' && to === 'BEPPU')
  if (isBeppuShichirui) ways = filterWaysByAvoid(ways, ['SAIGO'], 5000)
  const isShichiruiKuri = (from === 'HONDO_SHICHIRUI' && to === 'KURI') || (from === 'KURI' && to === 'HONDO_SHICHIRUI')
  if (isShichiruiKuri) ways = filterWaysByAvoid(ways, ['SAIGO', 'BEPPU'], 5000)
  const isHishiuraSaigo = (from === 'HISHIURA' && to === 'SAIGO') || (from === 'SAIGO' && to === 'HISHIURA')
  if (isHishiuraSaigo) ways = filterWaysByAvoid(ways, ['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'], 8000)

  const g = buildGraphFromWays(ways, 300)
  const s = nearestNode(g, { lat: a.lat, lng: a.lng })
  const t = nearestNode(g, { lat: b.lat, lng: b.lng })
  let clipped = []
  if (s !== -1 && t !== -1) {
    const idxs = shortestPath(g, s, t)
    if (idxs.length >= 2) clipped = idxs.map(i => g.nodes[i])
  }
  if (clipped.length < 2) {
    const all = g.nodes
    const nearest = (pt) => all.reduce((best, p, i) => {
      const d = haversine(p, pt); return (d < best.d) ? { i, d } : best
    }, { i: 0, d: Infinity }).i
    const aIdx = nearest({ lat: a.lat, lng: a.lng })
    const bIdx = nearest({ lat: b.lat, lng: b.lng })
    const start = Math.min(aIdx, bIdx); const end = Math.max(aIdx, bIdx)
    clipped = all.slice(start, end + 1)
  }
  if (clipped.length < 2) return null
  const distance = Math.round(pathDistance(clipped))
  const duration = Math.round(distance / (37 * 1000 / 3600))
  return {
    id: `${from}_${to}`,
    from, to,
    fromName: PORTS[from].name, toName: PORTS[to].name,
    path: clipped,
    distance, duration,
    source: 'overpass_osm', geodesic: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }
}

async function fetchGoogleRoutes(from, to, apiKey) {
  if (!isLongSea(from, to)) return null
  const a = PORTS[from]; const b = PORTS[to]
  const seaWp = (from === 'HONDO_SAKAIMINATO' || from === 'HONDO_SHICHIRUI')
    ? [ { lat: 35.8, lng: 133.15 }, { lat: 36.0, lng: 133.10 } ]
    : [ { lat: 36.0, lng: 133.10 }, { lat: 35.8, lng: 133.15 } ]
  const body = {
    origin: { location: { latLng: { latitude: a.lat, longitude: a.lng } } },
    destination: { location: { latLng: { latitude: b.lat, longitude: b.lng } } },
    intermediates: seaWp.map(p => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } })),
    travelMode: 'DRIVE', polylineQuality: 'HIGH_QUALITY', polylineEncoding: 'ENCODED_POLYLINE',
    languageCode: 'ja', units: 'METRIC'
  }
  const url = `https://routes.googleapis.com/directions/v2:computeRoutes?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline' },
    body: JSON.stringify(body)
  })
  if (!res.ok) return null
  const data = await res.json()
  const route = data?.routes?.[0]
  const enc = route?.polyline?.encodedPolyline
  if (!enc) return null
  const full = decodePolyline(enc)
  const nearestIndex = (target) => {
    let bi = -1, bd = Infinity
    for (let i = 0; i < full.length; i++) {
      const d = haversine(full[i], { lat: target.lat, lng: target.lng })
      if (d < bd) { bd = d; bi = i }
    }
    return bi
  }
  const iA = nearestIndex(seaWp[0]); const iB = nearestIndex(seaWp[1])
  const start = Math.min(iA, iB), end = Math.max(iA, iB)
  const clipped = (start >= 0 && end >= 0) ? full.slice(start, end + 1) : full
  if (clipped.length < 2) return null
  const distance = Math.round(pathDistance(clipped))
  const duration = Math.round(distance / (37 * 1000 / 3600))
  return {
    id: `${from}_${to}`,
    from, to,
    fromName: a.name, toName: b.name,
    path: clipped,
    distance, duration,
    source: 'google_routes', geodesic: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }
}

async function fetchGoogleDirections(from, to, apiKey) {
  if (!apiKey) return null
  const a = PORTS[from]; const b = PORTS[to]
  const params = new URLSearchParams({
    origin: `${a.lat},${a.lng}`,
    destination: `${b.lat},${b.lng}`,
    mode: 'transit',
    transit_mode: 'ferry',
    alternatives: 'false',
    key: apiKey
  })
  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const route = data?.routes?.[0]
  const enc = route?.overview_polyline?.points
  if (!enc) return null
  const pts = decodePolyline(enc)
  if (pts.length < 2) return null
  const distance = Math.round(pathDistance(pts))
  const duration = Math.round(distance / (37 * 1000 / 3600))
  return {
    id: `${from}_${to}`,
    from, to,
    fromName: a.name, toName: b.name,
    path: pts,
    distance, duration,
    source: 'google_transit', geodesic: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }
}

function parseArgs(argv) {
  const out = { ids: [], from: null, to: null, all: false, by: null, throttle: 2000 }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--id') {
      const v = argv[++i]; if (v) out.ids.push(...v.split(',').map(s => s.trim()))
    } else if (a === '--from') {
      out.from = argv[++i]
    } else if (a === '--to') {
      out.to = argv[++i]
    } else if (a === '--all') {
      out.all = true
    } else if (a === '--by') {
      out.by = argv[++i]
    } else if (a === '--throttle') {
      out.throttle = parseInt(argv[++i] || '2000', 10)
    }
  }
  if (out.from && out.to) out.ids.push(`${out.from}_${out.to}`)
  return out
}

async function main() {
  const args = parseArgs(process.argv)
  const ids = args.all ? ROUTE_PAIRS.map(([f,t]) => `${f}_${t}`) : Array.from(new Set(args.ids))
  if (ids.length === 0) {
    console.error('取得対象がありません。--id, --from/--to, または --all を指定してください。')
    process.exit(1)
  }
  const apiKey = process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ''
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const updated = []
  const splitId = (rid) => {
    const idxs = []
    for (let i = 0; i < rid.length; i++) if (rid[i] === '_') idxs.push(i)
    for (const i of idxs) {
      const left = rid.slice(0, i)
      const right = rid.slice(i + 1)
      if (PORTS[left] && PORTS[right]) return [left, right]
    }
    return [null, null]
  }

  for (const id of ids) {
    const [from, to] = splitId(id)
    if (!PORTS[from] || !PORTS[to]) {
      console.warn(`⚠  未知の港ID: ${id}`)
      continue
    }
    console.log(`➡  取得: ${from} → ${to}`)
    let result = null
    try {
      result = await fetchOverpass(from, to)
    } catch (e) {
      console.warn(`  Overpass失敗: ${e}`)
    }
    if (!result) {
      if (apiKey && isLongSea(from, to)) {
        try { result = await fetchGoogleRoutes(from, to, apiKey) } catch (e) { console.warn(`  Routes API失敗: ${e}`) }
      } else if (!apiKey && isLongSea(from, to)) {
        console.warn('  Routes APIはAPIキー未設定のためスキップ')
      }
    }
    if (!result) {
      if (apiKey) {
        try { result = await fetchGoogleDirections(from, to, apiKey) } catch (e) { console.warn(`  Directions API失敗: ${e}`) }
      } else {
        console.warn('  Directions APIはAPIキー未設定のためスキップ')
      }
    }
    if (!result) {
      console.warn(`  取得できませんでした: ${id}`)
    } else {
      const outPath = join(OUTPUT_DIR, `${id}.json`)
      writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf-8')
      updated.push(id)
      console.log(`  保存: ${outPath}`)
    }
    await sleep(args.throttle)
  }

  if (updated.length) {
    const by = args.by || process.env.GIT_AUTHOR_EMAIL || process.env.USER || 'script'
    try {
      const { stdout } = await execFile('node', ['scripts/fetch-routes.mjs', '--id', updated.join(','), '--by', by])
      if (stdout) process.stdout.write(stdout)
    } catch (e) {
      console.warn('統合更新でエラー:', e?.stdout || e?.message)
    }
  }

  console.log(`✅ 完了: 更新 ${updated.length}/${ids.length}`)
}

main().catch(e => {
  console.error('致命的エラー:', e)
  process.exit(1)
})
