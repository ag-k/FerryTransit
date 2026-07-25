#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SOURCE = join(ROOT, 'config', 'bus-feeds.json')
const NODE_OUTPUT = join(ROOT, 'scripts', 'generated', 'bus-feed-config.mjs')
const APP_OUTPUT = join(ROOT, 'src', 'generated', 'busFeedConfig.ts')

export function validateBusFeedRegistry(registry) {
  if (registry?.version !== 1 || !Array.isArray(registry.feeds) || registry.feeds.length === 0) {
    throw new Error('bus-feeds.json は version=1 と1件以上の feeds が必要です')
  }

  const ids = new Set()
  const prefixes = new Set()
  for (const feed of registry.feeds) {
    for (const key of ['id', 'sourceId', 'basePath', 'stopPrefix', 'operatorId', 'tripName', 'routeNameStrategy']) {
      if (!String(feed[key] || '').trim()) throw new Error(`${feed.id || '(unknown)'}: ${key} が必要です`)
    }
    if (ids.has(feed.id)) throw new Error(`feed id が重複しています: ${feed.id}`)
    if (prefixes.has(feed.stopPrefix)) throw new Error(`stopPrefix が重複しています: ${feed.stopPrefix}`)
    if (!Number.isInteger(feed.tripIdBase) || !Number.isFinite(feed.fare)) {
      throw new Error(`${feed.id}: tripIdBase と fare は数値で指定してください`)
    }
    ids.add(feed.id)
    prefixes.add(feed.stopPrefix)
  }
  return registry
}

export function renderNodeConfig(registry) {
  return `// config/bus-feeds.json から生成。直接編集しないでください。\nexport const BUS_FEED_REGISTRY = Object.freeze(${JSON.stringify(registry, null, 2)})\nexport const BUS_FEED_CONFIGS = Object.freeze(Object.fromEntries(BUS_FEED_REGISTRY.feeds.map(feed => [feed.id, Object.freeze(feed)])))\n`
}

export function renderAppConfig(registry) {
  const ids = registry.feeds.map(feed => JSON.stringify(feed.id)).join(' | ')
  return `// config/bus-feeds.json から生成。直接編集しないでください。\nexport type BusFeedId = ${ids}\n\nexport const BUS_FEED_DEFINITIONS = ${JSON.stringify(registry.feeds, null, 2)} as const\n\nexport const BUS_FEED_DEFINITION_BY_ID = Object.fromEntries(\n  BUS_FEED_DEFINITIONS.map(feed => [feed.id, feed])\n) as Record<BusFeedId, (typeof BUS_FEED_DEFINITIONS)[number]>\n`
}

export function generateBusFeedConfig() {
  const registry = validateBusFeedRegistry(JSON.parse(readFileSync(SOURCE, 'utf8')))
  for (const [file, contents] of [
    [NODE_OUTPUT, renderNodeConfig(registry)],
    [APP_OUTPUT, renderAppConfig(registry)]
  ]) {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, contents, 'utf8')
    console.log(`generated: ${file}`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) generateBusFeedConfig()
