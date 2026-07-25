import assert from 'node:assert/strict'
import { test } from 'node:test'
import { attachDocumentTypeState } from '../src/documentTypes.mjs'

test('資料 URL に手動種別を合成できる', () => {
  const snapshot = {
    summary: {
      documentCount: 3,
      timetableCount: 1,
      fareCount: 1,
      statusCount: 0
    },
    documents: [
      { url: 'https://example.test/a.pdf', sourceId: 'a', type: 'timetable' },
      { url: 'https://example.test/b.pdf', sourceId: 'a', type: 'fare' },
      { url: 'https://example.test/c.pdf', sourceId: 'b', type: 'status' }
    ],
    sources: [
      {
        id: 'a',
        counts: { documents: 2, timetables: 1, fares: 1 },
        documents: [
          { url: 'https://example.test/a.pdf', sourceId: 'a', type: 'timetable' },
          { url: 'https://example.test/b.pdf', sourceId: 'a', type: 'fare' }
        ]
      },
      {
        id: 'b',
        counts: { documents: 1, timetables: 0, fares: 0 },
        documents: [
          { url: 'https://example.test/c.pdf', sourceId: 'b', type: 'status' }
        ]
      }
    ]
  }

  const result = attachDocumentTypeState(snapshot, {
    records: {
      'https://example.test/a.pdf': { type: 'map', updatedAt: '2026-06-05T00:00:00.000Z' },
      'https://example.test/b.pdf': { type: 'notice', updatedAt: '2026-06-05T00:00:00.000Z' }
    }
  })

  assert.deepEqual(result.documents.map((document) => document.type), ['map', 'notice', 'status'])
  assert.deepEqual(result.documents.map((document) => document.detectedType), ['timetable', 'fare', 'status'])
  assert.deepEqual(result.documents.map((document) => document.manualType), ['map', 'notice', null])
  assert.deepEqual(result.sources[0].documents.map((document) => document.type), ['map', 'notice'])
  assert.equal(result.summary.timetableCount, 0)
  assert.equal(result.summary.fareCount, 0)
  assert.equal(result.summary.statusCount, 1)
  assert.equal(result.summary.noticeDocumentCount, 1)
  assert.equal(result.summary.mapCount, 1)
  assert.deepEqual(result.sources[0].counts, {
    documents: 2,
    timetables: 0,
    fares: 0,
    timetable: 0,
    fare: 0,
    status: 0,
    notice: 1,
    map: 1,
    other: 0
  })
})
