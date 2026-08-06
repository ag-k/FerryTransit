import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const freshnessUrl = pathToFileURL(resolve('scripts/lib/transport-source-freshness.mjs')).href
const registryUrl = pathToFileURL(resolve('scripts/lib/transport-source-registry.mjs')).href
const { collectSourceMonitorIssues, collectSourceProvenanceIssues } = await import(freshnessUrl)
const { loadTransportSourceRegistry } = await import(registryUrl)
const registry = loadTransportSourceRegistry(resolve('.'))
const source = registry.feedById.ama

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

  it('全バスフィードで公式資料と変換記録を公開前に検証する', () => {
    for (const feed of registry.feeds) {
      const feedVersion = readFileSync(resolve(feed.currentPath, 'feed_info.txt'), 'utf8')
        .trim().split(/\r?\n/)[1]!.split(',').at(-1)!
      expect(feed.sourceDocuments?.length, feed.id).toBeGreaterThan(0)
      expect(collectSourceProvenanceIssues({
        root: resolve('.'),
        source: feed,
        gtfsDir: resolve(feed.currentPath),
        feedVersion
      }), feed.id).toEqual([])
    }
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

  it('同じURLの公式資料が差し替わった場合はハッシュ不一致で公開を止める', () => {
    const document = source.sourceDocuments[0]
    const snapshot = {
      collectedAt: '2026-08-06T00:00:00.000Z',
      sources: [{
        id: 'ama-town',
        pages: [{ url: source.sourceUrl, updatedText: '更新日：2026年7月1日' }],
        documents: [{ ...document, type: 'timetable', hash: 'different-hash' }]
      }]
    }
    expect(collectSourceMonitorIssues({ source, snapshot, now: new Date('2026-08-07T00:00:00.000Z') }))
      .toContainEqual(expect.objectContaining({ code: 'official_document_hash_mismatch' }))
  })

  it('現行フィード終了後に開始する次年度資料は現行公開を止めない', () => {
    const nishinoshima = registry.feedById.nishinoshima
    const snapshot = {
      collectedAt: '2026-08-06T00:00:00.000Z',
      sources: [{
        id: nishinoshima.sourceId,
        pages: [{ url: nishinoshima.sourceUrl, updatedText: null }],
        documents: [{
          type: 'timetable',
          dateText: '2027-01-01',
          url: 'https://example.test/nishinoshima-2027.pdf'
        }]
      }]
    }
    expect(collectSourceMonitorIssues({
      source: nishinoshima,
      snapshot,
      now: new Date('2026-08-07T00:00:00.000Z'),
      feedEndDate: '2026-12-31'
    })).toEqual([])
  })
})
