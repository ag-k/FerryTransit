import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const moduleUrl = pathToFileURL(resolve('scripts/lib/transport-source-registry.mjs')).href
const { loadTransportSourceRegistry } = await import(moduleUrl)

describe('transport source registry', () => {
  it('監視元・GTFSメタ情報・変換タスクをsource idで関連付ける', () => {
    const registry = loadTransportSourceRegistry(resolve('.'))
    expect(registry.sources).toHaveLength(10)
    expect(registry.feeds).toHaveLength(5)
    expect(registry.feedById.ama).toMatchObject({
      id: 'ama',
      sourceId: 'ama-town',
      conversionTask: 'npm run gtfs:convert:ama:r8',
      currentPath: 'gtfs/current/bus/ama'
    })
    expect(registry.byId['jal-oki-flights']).toMatchObject({
      acquisitionTask: 'npm run timetable:fetch:jal',
      buildTask: 'npm run timetable:build'
    })
  })
})
