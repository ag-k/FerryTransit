import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_REFRESH_INTERVAL_MS,
  createDailySnapshotRefresh,
  getNextRefreshDelayMs,
  isSnapshotDue,
  parseRefreshIntervalMs
} from '../src/autoRefresh.mjs'

const NOW = Date.parse('2026-06-18T09:00:00.000Z')
const silentLogger = {
  info() {},
  error() {}
}

test('更新間隔は時間指定からミリ秒に変換できる', () => {
  assert.equal(parseRefreshIntervalMs('12'), 12 * 60 * 60 * 1000)
  assert.equal(parseRefreshIntervalMs('0'), DEFAULT_REFRESH_INTERVAL_MS)
  assert.equal(parseRefreshIntervalMs('invalid'), DEFAULT_REFRESH_INTERVAL_MS)
})

test('保存済みスナップショットが24時間以上古い場合だけ更新対象にする', () => {
  const fresh = { summary: { collectedAt: '2026-06-17T10:00:00.000Z' } }
  const stale = { summary: { collectedAt: '2026-06-17T08:59:59.000Z' } }

  assert.equal(isSnapshotDue(fresh, { now: NOW }), false)
  assert.equal(isSnapshotDue(stale, { now: NOW }), true)
  assert.equal(isSnapshotDue(null, { now: NOW }), true)
  assert.equal(getNextRefreshDelayMs(fresh, { now: NOW }), 60 * 60 * 1000)
})

test('古いスナップショットは保存付きで日次更新する', async () => {
  let latest = { summary: { collectedAt: '2026-06-17T08:00:00.000Z' } }
  const calls = []
  const refreshed = { summary: { collectedAt: '2026-06-18T09:00:00.000Z' } }
  const dailyRefresh = createDailySnapshotRefresh({
    logger: silentLogger,
    now: () => NOW,
    loadLatestSnapshot: async () => latest,
    collectAll: async (options) => {
      calls.push(options)
      latest = refreshed
      return refreshed
    }
  })

  const snapshot = await dailyRefresh.ensureFresh('test')

  assert.equal(snapshot, refreshed)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], { save: true, download: false, autoRefresh: true })
})

test('新しいスナップショットは再収集しない', async () => {
  const latest = { summary: { collectedAt: '2026-06-18T08:00:00.000Z' } }
  let calls = 0
  const dailyRefresh = createDailySnapshotRefresh({
    logger: silentLogger,
    now: () => NOW,
    loadLatestSnapshot: async () => latest,
    collectAll: async () => {
      calls += 1
      return latest
    }
  })

  const snapshot = await dailyRefresh.ensureFresh('test')

  assert.equal(snapshot, latest)
  assert.equal(calls, 0)
})

test('日次更新に失敗した場合は既存スナップショットを返してエラーを記録する', async () => {
  const latest = { summary: { collectedAt: '2026-06-17T08:00:00.000Z' } }
  const dailyRefresh = createDailySnapshotRefresh({
    logger: silentLogger,
    now: () => NOW,
    loadLatestSnapshot: async () => latest,
    collectAll: async () => {
      throw new Error('network failed')
    }
  })

  const snapshot = await dailyRefresh.ensureFresh('test')
  const status = dailyRefresh.getStatus()

  assert.equal(snapshot, latest)
  assert.equal(status.lastError.message, 'network failed')
  assert.equal(status.lastError.reason, 'test')
})
