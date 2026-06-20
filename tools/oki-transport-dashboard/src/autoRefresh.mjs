export const DEFAULT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000
export const DEFAULT_RETRY_DELAY_MS = 60 * 60 * 1000

const MAX_TIMER_DELAY_MS = 2_147_483_647

export function parseRefreshIntervalMs(value, fallback = DEFAULT_REFRESH_INTERVAL_MS) {
  if (value === undefined || value === null || value === '') return fallback
  const hours = Number(value)
  if (!Number.isFinite(hours) || hours <= 0) return fallback
  return hours * 60 * 60 * 1000
}

export function getSnapshotCollectedAtMs(snapshot) {
  const value = snapshot?.summary?.collectedAt || snapshot?.collectedAt
  if (!value) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}

export function isSnapshotDue(snapshot, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now()
  const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : DEFAULT_REFRESH_INTERVAL_MS
  const collectedAt = getSnapshotCollectedAtMs(snapshot)
  if (collectedAt === null) return true
  return now - collectedAt >= intervalMs
}

export function getNextRefreshDelayMs(snapshot, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now()
  const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : DEFAULT_REFRESH_INTERVAL_MS
  const collectedAt = getSnapshotCollectedAtMs(snapshot)
  if (collectedAt === null) return 0
  return Math.max(0, Math.min(collectedAt + intervalMs - now, MAX_TIMER_DELAY_MS))
}

export function createDailySnapshotRefresh(options) {
  const {
    collectAll,
    loadLatestSnapshot,
    intervalMs = DEFAULT_REFRESH_INTERVAL_MS,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    download = false,
    logger = console,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    now = () => Date.now()
  } = options

  if (typeof collectAll !== 'function') {
    throw new Error('collectAll が指定されていません')
  }
  if (typeof loadLatestSnapshot !== 'function') {
    throw new Error('loadLatestSnapshot が指定されていません')
  }

  let started = false
  let timer = null
  let refreshPromise = null
  let scheduleToken = 0
  let nextRunAt = null
  let lastError = null

  async function ensureFresh(reason = 'request') {
    const latest = await loadLatestSnapshot()
    if (!isSnapshotDue(latest, { now: now(), intervalMs })) {
      return latest
    }

    try {
      return await refresh(reason)
    } catch (error) {
      if (latest) return latest
      throw error
    }
  }

  async function refresh(reason) {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      logger.info?.(`[oki-transport-dashboard] 日次更新を開始します: ${reason}`)
      try {
        const snapshot = await collectAll({ save: true, download, autoRefresh: true })
        lastError = null
        logger.info?.(`[oki-transport-dashboard] 日次更新が完了しました: ${snapshot.summary?.collectedAt || snapshot.collectedAt}`)
        return snapshot
      } catch (error) {
        lastError = {
          reason,
          message: error.message,
          at: new Date(now()).toISOString()
        }
        logger.error?.(`[oki-transport-dashboard] 日次更新に失敗しました: ${error.message}`)
        throw error
      } finally {
        const retry = lastError ? retryDelayMs : null
        refreshPromise = null
        void scheduleNext(retry)
      }
    })()

    return refreshPromise
  }

  async function scheduleNext(delayOverrideMs = null) {
    if (!started) return
    const token = ++scheduleToken
    if (timer) {
      clearTimeoutFn(timer)
      timer = null
    }

    let delayMs = delayOverrideMs
    if (!Number.isFinite(delayMs)) {
      try {
        const latest = await loadLatestSnapshot()
        delayMs = getNextRefreshDelayMs(latest, { now: now(), intervalMs })
      } catch (error) {
        lastError = {
          reason: 'schedule',
          message: error.message,
          at: new Date(now()).toISOString()
        }
        delayMs = retryDelayMs
      }
    }

    if (!started || token !== scheduleToken) return
    const boundedDelayMs = Math.max(0, Math.min(delayMs, MAX_TIMER_DELAY_MS))
    nextRunAt = new Date(now() + boundedDelayMs).toISOString()
    timer = setTimeoutFn(() => {
      timer = null
      refresh('timer').catch(() => {})
    }, boundedDelayMs)
    timer?.unref?.()
  }

  function start() {
    if (started) return
    started = true
    void scheduleNext()
  }

  function stop() {
    started = false
    scheduleToken += 1
    nextRunAt = null
    if (timer) {
      clearTimeoutFn(timer)
      timer = null
    }
  }

  function reschedule() {
    void scheduleNext()
  }

  function getStatus() {
    return {
      enabled: started,
      intervalMs,
      retryDelayMs,
      download,
      running: Boolean(refreshPromise),
      nextRunAt,
      lastError
    }
  }

  return {
    ensureFresh,
    getStatus,
    reschedule,
    start,
    stop
  }
}
