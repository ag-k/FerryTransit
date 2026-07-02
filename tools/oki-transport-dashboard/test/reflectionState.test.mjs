import assert from 'node:assert/strict'
import { test } from 'node:test'
import { attachReflectionState, summarizeReflectionStatuses } from '../src/reflectionState.mjs'

test('レビュー状態とGTFS下書きrouteから反映状態を合成できる', () => {
  const snapshot = {
    documents: [
      { url: 'https://example.test/ready.pdf', sourceId: 'a', reviewStatus: 'required' },
      { url: 'https://example.test/todo.pdf', sourceId: 'a', reviewStatus: 'required' },
      { url: 'https://example.test/skip.pdf', sourceId: 'b', reviewStatus: 'unnecessary' },
      { url: 'https://example.test/new.pdf', sourceId: 'b', reviewStatus: 'unreviewed' }
    ],
    sources: [
      {
        id: 'a',
        documents: [
          { url: 'https://example.test/ready.pdf', sourceId: 'a', reviewStatus: 'required' },
          { url: 'https://example.test/todo.pdf', sourceId: 'a', reviewStatus: 'required' }
        ]
      },
      {
        id: 'b',
        documents: [
          { url: 'https://example.test/skip.pdf', sourceId: 'b', reviewStatus: 'unnecessary' },
          { url: 'https://example.test/new.pdf', sourceId: 'b', reviewStatus: 'unreviewed' }
        ]
      }
    ]
  }
  const draft = {
    routes: [
      { route_id: 'route-ready', source_document_url: 'https://example.test/ready.pdf', status: 'ready' },
      { route_id: 'route-todo', source_document_url: 'https://example.test/todo.pdf', status: 'needs-review' }
    ]
  }

  const result = attachReflectionState(snapshot, draft)

  assert.deepEqual(result.documents.map((document) => document.reflectionStatus), [
    'reflected',
    'needs-reflection',
    'not-needed',
    'undecided'
  ])
  assert.deepEqual(result.documents[0].reflectionRouteIds, ['route-ready'])
  assert.deepEqual(result.reflectionSummary, {
    total: 4,
    undecided: 1,
    'not-needed': 1,
    'needs-reflection': 1,
    reflected: 1
  })
  assert.deepEqual(result.sources[0].reflectionCounts, {
    total: 2,
    undecided: 0,
    'not-needed': 0,
    'needs-reflection': 1,
    reflected: 1
  })
})

test('反映状態の件数を集計できる', () => {
  const summary = summarizeReflectionStatuses([
    { reflectionStatus: 'reflected' },
    { reflectionStatus: 'needs-reflection' },
    { reflectionStatus: 'not-needed' },
    {}
  ])
  assert.deepEqual(summary, {
    total: 4,
    undecided: 1,
    'not-needed': 1,
    'needs-reflection': 1,
    reflected: 1
  })
})
