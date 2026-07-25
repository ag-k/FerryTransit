import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildCodexJsonRpcPlan, buildGtfsCodexPrompt } from '../src/codexAppServer.mjs'

test('GTFS route候補からCodex向けプロンプトを生成できる', () => {
  const draft = {
    id: 'oki-local-draft',
    feedInfo: {
      feed_start_date: '20260101',
      feed_end_date: '20261231'
    },
    summary: {
      routeCount: 1,
      stopCount: 0,
      tripCount: 0,
      stopTimeCount: 0
    }
  }
  const agency = {
    agency_id: 'agency_a',
    agency_name: '事業者A',
    agency_url: 'https://example.test/agency',
    source_id: 'agency-a'
  }
  const route = {
    route_id: 'route_a',
    agency_id: 'agency_a',
    route_short_name: 'A',
    route_long_name: 'A線',
    route_type: '3',
    route_url: 'https://example.test/route',
    source_document_url: 'https://example.test/timetable.pdf',
    source_document_title: 'A線時刻表',
    source_page_url: 'https://example.test/timetable',
    source_review_status: 'required',
    source_document_type: 'timetable',
    status: 'draft'
  }

  const prompt = buildGtfsCodexPrompt({ draft, route, agency, jobId: 'job_test' })

  assert.match(prompt, /ジョブID: job_test/)
  assert.match(prompt, /対象route_id: route_a/)
  assert.match(prompt, /https:\/\/example\.test\/timetable\.pdf/)
  assert.match(prompt, /stops\.txt/)
  assert.match(prompt, /trips\.txt/)
  assert.match(prompt, /stop_times\.txt/)
  assert.match(prompt, /npm run gtfs:validate/)
  assert.match(prompt, /回答・作業ログ・最終報告は日本語/)
})

test('Codex App Server JSON-RPC payloadを生成できる', () => {
  const plan = buildCodexJsonRpcPlan({
    jobId: 'job_test',
    prompt: 'GTFS化してください',
    cwd: '/Users/ag/works/FerryTransit'
  })

  assert.equal(plan.protocol, 'codex-app-server-jsonrpc-v2')
  assert.deepEqual(plan.requests.map((request) => request.method), [
    'initialize',
    'initialized',
    'thread/start',
    'turn/start'
  ])
  assert.equal(plan.requests[2].params.cwd, '/Users/ag/works/FerryTransit')
  assert.equal(plan.requests[2].params.runtimeWorkspaceRoots[0], '/Users/ag/works/FerryTransit')
  assert.equal(plan.requests[3].params.threadId, '<thread.id from thread/start>')
  assert.deepEqual(plan.requests[3].params.input, [
    { type: 'text', text: 'GTFS化してください' }
  ])
})
