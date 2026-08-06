import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const freshnessUrl = pathToFileURL(resolve('scripts/lib/transport-source-freshness.mjs')).href
const registryUrl = pathToFileURL(resolve('scripts/lib/transport-source-registry.mjs')).href
const { collectSourceMonitorIssues, collectSourceProvenanceIssues } = await import(freshnessUrl)
const { loadTransportSourceRegistry } = await import(registryUrl)
const source = loadTransportSourceRegistry(resolve('.')).feedById.ama

describe('交通ソースの公開前ゲート', () => {
  it('採用PDF、変換記録、フィードバージョンの一致を検証する', () => {
    const feedVersion = readFileSync(resolve('gtfs/current/bus/ama/feed_info.txt'), 'utf8')
      .trim().split(/\r?\n/)[1]!.split(',').at(-1)!
    expect(collectSourceProvenanceIssues({
      root: resolve('.'),
      source,
      gtfsDir: resolve(source.currentPath),
      feedVersion
    })).toEqual([])
  })

  it('採用済みの公式ページとPDFだけなら公開可能と判定する', () => {
    const snapshot = {
      collectedAt: '2026-08-06T00:00:00.000Z',
      sources: [{
        id: 'ama-town',
        pages: [{ url: source.sourceUrl, updatedText: '更新日：2026年7月1日' }],
        documents: source.sourceDocuments.map((document: any) => ({ ...document, type: 'timetable', dateText: document.sourceDate }))
      }]
    }
    expect(collectSourceMonitorIssues({ source, snapshot, now: new Date('2026-08-07T00:00:00.000Z') })).toEqual([])
  })

  it('未採用の公式更新と新しい時刻表を公開停止理由として返す', () => {
    const snapshot = {
      collectedAt: '2026-08-06T00:00:00.000Z',
      sources: [{
        id: 'ama-town',
        pages: [{ url: source.sourceUrl, updatedText: '更新日：2026年8月6日' }],
        documents: [{
          type: 'timetable',
          dateText: '2026-08-06',
          url: 'https://example.test/new-ama-timetable.pdf'
        }]
      }]
    }
    expect(collectSourceMonitorIssues({ source, snapshot, now: new Date('2026-08-07T00:00:00.000Z') }))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'unadopted_official_page_update' }),
        expect.objectContaining({ code: 'unadopted_timetable_document' })
      ]))
  })

  it('48時間より古い監視結果を公開に使用しない', () => {
    const snapshot = {
      collectedAt: '2026-08-01T00:00:00.000Z',
      sources: [{
        id: 'ama-town',
        pages: [{ url: source.sourceUrl, updatedText: '更新日：2026年7月1日' }],
        documents: []
      }]
    }
    expect(collectSourceMonitorIssues({ source, snapshot, now: new Date('2026-08-07T00:00:00.000Z') }))
      .toContainEqual(expect.objectContaining({ code: 'stale_source_monitor_snapshot' }))
  })
})
