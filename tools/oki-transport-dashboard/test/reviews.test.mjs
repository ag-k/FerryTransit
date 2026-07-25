import assert from 'node:assert/strict'
import { test } from 'node:test'
import { attachReviewState, summarizeReviewStatuses } from '../src/reviews.mjs'

test('資料 URL にレビュー状態を合成できる', () => {
  const snapshot = {
    documents: [
      { url: 'https://example.test/a.pdf', sourceId: 'a' },
      { url: 'https://example.test/b.pdf', sourceId: 'a' },
      { url: 'https://example.test/c.pdf', sourceId: 'b' }
    ],
    sources: [
      {
        id: 'a',
        documents: [
          { url: 'https://example.test/a.pdf', sourceId: 'a' },
          { url: 'https://example.test/b.pdf', sourceId: 'a' }
        ]
      },
      {
        id: 'b',
        documents: [
          { url: 'https://example.test/c.pdf', sourceId: 'b' }
        ]
      }
    ]
  }
  const result = attachReviewState(snapshot, {
    records: {
      'https://example.test/a.pdf': { status: 'required', updatedAt: '2026-06-05T00:00:00.000Z' },
      'https://example.test/b.pdf': { status: 'unnecessary', updatedAt: '2026-06-05T00:00:00.000Z' }
    }
  })
  assert.deepEqual(result.documents.map((document) => document.reviewStatus), ['required', 'unnecessary', 'unreviewed'])
  assert.deepEqual(result.sources[0].documents.map((document) => document.reviewStatus), ['required', 'unnecessary'])
  assert.deepEqual(result.reviewSummary, { total: 3, unreviewed: 1, unnecessary: 1, required: 1 })
  assert.deepEqual(result.sources[0].reviewCounts, { total: 2, unreviewed: 0, unnecessary: 1, required: 1 })
})

test('レビュー状態の件数を集計できる', () => {
  const summary = summarizeReviewStatuses([
    { reviewStatus: 'required' },
    { reviewStatus: 'required' },
    { reviewStatus: 'unnecessary' },
    {}
  ])
  assert.deepEqual(summary, { total: 4, unreviewed: 1, unnecessary: 1, required: 2 })
})
