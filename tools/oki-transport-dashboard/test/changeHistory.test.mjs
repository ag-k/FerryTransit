import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { test } from 'node:test'
import { buildChangeEvents, loadChangeHistory, recordChangeHistory } from '../src/changeHistory.mjs'

test('スナップショット差分から変更履歴イベントを作成できる', () => {
  const previousIndex = {
    pages: new Map([
      ['source-a:https://example.test/page', {
        sourceId: 'source-a',
        url: 'https://example.test/page',
        hash: 'old-page-hash',
        shortHash: 'old-page',
        sizeBytes: 100,
        status: 'ok',
        statusCode: 200
      }]
    ]),
    documents: new Map([
      ['https://example.test/doc.pdf', {
        url: 'https://example.test/doc.pdf',
        hash: 'old-doc-hash',
        shortHash: 'old-doc',
        sizeBytes: 200,
        title: '旧PDF',
        type: 'timetable'
      }]
    ]),
    notices: new Map()
  }
  const snapshot = sampleSnapshot()

  const events = buildChangeEvents(snapshot, previousIndex)

  assert.equal(events.length, 3)
  assert.deepEqual(events.map((event) => event.eventType), ['page', 'document', 'notice'])
  assert.equal(events[0].previousHash, 'old-page-hash')
  assert.equal(events[0].currentHash, 'new-page-hash')
  assert.equal(events[1].previousValue, '旧PDF')
  assert.equal(events[1].currentValue, '新PDF')
})

test('変更履歴をSQLiteへ保存して読み出せる', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'oki-change-history-'))
  const dbPath = join(dir, 'history.sqlite')
  const previousIndex = {
    pages: new Map(),
    documents: new Map(),
    notices: new Map()
  }
  const snapshot = sampleSnapshot()

  const result = await recordChangeHistory(snapshot, previousIndex, { dbPath })
  const history = await loadChangeHistory({ dbPath, limit: 10 })

  assert.equal(result.eventCount, 3)
  assert.equal(history.events.length, 3)
  assert.equal(history.events[0].collectedAt, '2026-07-04T04:00:00.000Z')
  assert.equal(history.events.some((event) => event.sourceName === 'テスト交通'), true)
})

function sampleSnapshot() {
  return {
    collectedAt: '2026-07-04T04:00:00.000Z',
    summary: {
      collectedAt: '2026-07-04T04:00:00.000Z',
      sourceCount: 1,
      okSources: 1,
      warningSources: 0,
      errorSources: 0,
      pageCount: 1,
      changedPages: 1,
      documentCount: 1,
      changedDocuments: 1,
      noticeCount: 1,
      newNotices: 1
    },
    pages: [
      {
        sourceId: 'source-a',
        sourceName: 'テスト交通',
        role: 'notices',
        label: 'お知らせ',
        title: 'お知らせ一覧',
        url: 'https://example.test/page',
        status: 'ok',
        statusCode: 200,
        hash: 'new-page-hash',
        shortHash: 'new-page',
        sizeBytes: 120,
        changeStatus: 'changed',
        keywordHits: { お知らせ: 1 }
      }
    ],
    documents: [
      {
        sourceId: 'source-a',
        sourceName: 'テスト交通',
        type: 'timetable',
        pageRole: 'timetable',
        pageLabel: '時刻表',
        pageUrl: 'https://example.test/page',
        title: '新PDF',
        url: 'https://example.test/doc.pdf',
        extension: 'pdf',
        hash: 'new-doc-hash',
        shortHash: 'new-doc',
        sizeBytes: 220,
        changeStatus: 'changed'
      }
    ],
    notices: [
      {
        sourceId: 'source-a',
        sourceName: 'テスト交通',
        title: '新しいお知らせ',
        url: 'https://example.test/news/1',
        dateText: '2026-07-04',
        type: 'notice',
        changeStatus: 'new'
      }
    ]
  }
}
