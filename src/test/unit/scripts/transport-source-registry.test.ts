import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const moduleUrl = pathToFileURL(resolve('scripts/lib/transport-source-registry.mjs')).href
const { loadTransportSourceRegistry } = await import(moduleUrl)

describe('transport source registry', () => {
  it('監視元・GTFSメタ情報・変換タスクをsource idで関連付ける', () => {
    const registry = loadTransportSourceRegistry(resolve('.'))
    expect(registry.sources).toHaveLength(10)
    expect(registry.feeds).toHaveLength(6)
    expect(registry.feedById.ama).toMatchObject({
      id: 'ama',
      sourceId: 'ama-town',
      acquisitionTask: 'npm run gtfs:acquire:ama:r8',
      conversionTask: 'npm run gtfs:convert:ama:r8',
      currentPath: 'gtfs/current/bus/ama'
    })
    expect(registry.byId['jal-oki-flights']).toMatchObject({
      acquisitionTask: 'npm run timetable:fetch:jal',
      buildTask: 'npm run timetable:build'
    })
    expect(registry.feedById.hatsumi_bus_connection).toMatchObject({
      id: 'hatsumi_bus_connection',
      sourceId: 'oki-kouiki-bus',
      conversionTask: 'npm run gtfs:convert:hatsumi:2026',
      currentPath: 'gtfs/current/bus/hatsumi_bus_connection'
    })
  })
})
