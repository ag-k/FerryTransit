#!/usr/bin/env node

// フェリー航路ローカル更新スクリプト
// - デフォルト: output/routes/*.json（.custom優先）を統合し、src/public/data/routes/ferry-routes.json を更新
// - 部分更新: --id ID(複数はカンマ区切り) または --from XXX --to YYY で指定
// 使い方:
//   node scripts/fetch-routes.mjs                # 全更新
//   node scripts/fetch-routes.mjs --id BEPPU_HONDO_SHICHIRUI
//   node scripts/fetch-routes.mjs --from BEPPU --to HONDO_SHICHIRUI
//   node scripts/fetch-routes.mjs --id A_B --id C_D --by you@example.com

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, basename } from 'path'

const ROOT = process.cwd()
const OUTPUT_DIR = join(ROOT, 'output', 'routes')
const TARGET_DIR = join(ROOT, 'src', 'public', 'data', 'routes')
const TARGET_FILE = join(TARGET_DIR, 'ferry-routes.json')

function parseArgs(argv) {
  const args = { ids: [], from: null, to: null, by: null, all: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--id') {
      const v = argv[++i]
      if (!v) continue
      v.split(',').forEach(x => args.ids.push(x.trim()))
    } else if (a === '--from') {
      args.from = (argv[++i] || '').trim()
    } else if (a === '--to') {
      args.to = (argv[++i] || '').trim()
    } else if (a === '--by') {
      args.by = (argv[++i] || '').trim()
    } else if (a === '--all') {
      args.all = true
    }
  }
  return args
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function writeJson(path, data) {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

function listRouteFiles() {
  if (!existsSync(OUTPUT_DIR)) return []
  return readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => join(OUTPUT_DIR, f))
}

function pickBestFileForId(id) {
  const custom = join(OUTPUT_DIR, `${id}.custom.json`)
  const normal = join(OUTPUT_DIR, `${id}.json`)
  if (existsSync(custom)) return custom
  if (existsSync(normal)) return normal
  return null
}

function idFromFilePath(p) {
  const name = basename(p).replace(/\.json$/, '')
  return name.replace(/\.custom$/, '')
}

function computeDistanceMeters(path) {
  // Haversine 合計
  const R = 6371000
  let d = 0
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]
    const b = path[i]
    const dLat = (b.lat - a.lat) * Math.PI / 180
    const dLng = (b.lng - a.lng) * Math.PI / 180
    const lat1 = a.lat * Math.PI / 180
    const lat2 = b.lat * Math.PI / 180
    const sinDLat = Math.sin(dLat / 2)
    const sinDLng = Math.sin(dLng / 2)
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
    d += R * c
  }
  return Math.round(d)
}

function loadExisting() {
  if (!existsSync(TARGET_FILE)) return null
  try {
    return readJson(TARGET_FILE)
  } catch {
    return null
  }
}

function normalizeRoute(route, sourceHint = 'custom', prev) {
  const now = new Date().toISOString()
  const distance = Array.isArray(route.path) ? computeDistanceMeters(route.path) : undefined
  return {
    id: route.id || `${route.from}_${route.to}`,
    from: route.from,
    to: route.to,
    fromName: route.fromName || '',
    toName: route.toName || '',
    path: route.path || [],
    distance,
    source: sourceHint,
    geodesic: true,
    createdAt: prev?.createdAt || now,
    updatedAt: now
  }
}

function buildAllFromOutput() {
  const files = listRouteFiles()
  // 同じIDは .custom を優先
  const grouped = new Map()
  for (const full of files) {
    const id = idFromFilePath(full)
    const isCustom = full.endsWith('.custom.json')
    const current = grouped.get(id)
    if (!current || (!current.isCustom && isCustom)) {
      grouped.set(id, { path: full, isCustom })
    }
  }
  const entries = []
  for (const [id, info] of grouped.entries()) {
    const raw = readJson(info.path)
    entries.push(normalizeRoute(raw, info.isCustom ? 'custom' : 'manual'))
  }
  return entries
}

function updateSpecific(existing, ids) {
  const map = new Map(existing.routes.map(r => [r.id, r]))
  for (const id of ids) {
    const best = pickBestFileForId(id)
    if (!best) {
      console.warn(`⚠  ルートIDが見つかりません: ${id}`)
      continue
    }
    const raw = readJson(best)
    const prev = map.get(id)
    map.set(id, normalizeRoute(raw, best.endsWith('.custom.json') ? 'custom' : 'manual', prev))
  }
  const routes = Array.from(map.values())
  return routes
}

function main() {
  const args = parseArgs(process.argv)
  const fetchedBy = args.by || process.env.GIT_AUTHOR_EMAIL || process.env.USER || 'script'
  let ids = args.ids
  if (args.from && args.to) {
    ids = [...ids, `${args.from}_${args.to}`]
  }

  const hasSpecific = ids.length > 0
  const prev = loadExisting()

  let routes
  if (hasSpecific && prev) {
    routes = updateSpecific(prev, ids)
  } else if (hasSpecific && !prev) {
    // 既存がない場合は必要分だけ作成
    routes = []
    for (const id of ids) {
      const best = pickBestFileForId(id)
      if (!best) {
        console.warn(`⚠  ルートIDが見つかりません: ${id}`)
        continue
      }
      const raw = readJson(best)
      routes.push(normalizeRoute(raw, best.endsWith('.custom.json') ? 'custom' : 'manual'))
    }
  } else {
    if (prev) {
      if (args.all) {
        routes = buildAllFromOutput()
      } else {
        // 既存を基に、出力ディレクトリにあるIDのみ置換（安全なデフォルト）
        const allFiles = listRouteFiles()
        const allIds = Array.from(new Set(allFiles.map(idFromFilePath)))
        routes = updateSpecific(prev, allIds)
      }
    } else {
      // 既存がなければ出力から全構築
      routes = buildAllFromOutput()
    }
  }

  // メタデータ
  const version = prev?.metadata?.version ? prev.metadata.version + 1 : 1
  const metadata = {
    version,
    lastFetchedAt: new Date().toISOString(),
    totalRoutes: routes.length,
    fetchedBy
  }

  mkdirSync(TARGET_DIR, { recursive: true })
  writeJson(TARGET_FILE, { metadata, routes })

  console.log(`✅ 更新完了: ${TARGET_FILE}`)
  console.log(`   version: v${version}, routes: ${routes.length}`)
  if (hasSpecific) {
    console.log(`   更新対象: ${ids.join(', ')}`)
  }
}

main()
