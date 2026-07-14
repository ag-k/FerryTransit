const DOCUMENT_TYPES = ['timetable', 'fare', 'status', 'notice', 'map', 'other']
const FILTER_TYPES = ['all', ...DOCUMENT_TYPES]
const REVIEW_FILTERS = ['all', 'unreviewed', 'unnecessary', 'required']
const GTFS_ROUTE_TYPES = [
  { value: '3', label: '3 バス' },
  { value: '4', label: '4 船舶' },
  { value: '0', label: '0 路面電車' },
  { value: '1', label: '1 地下鉄' },
  { value: '2', label: '2 鉄道' },
  { value: '5', label: '5 ケーブルカー' },
  { value: '6', label: '6 ロープウェイ' },
  { value: '7', label: '7 鋼索鉄道' }
]
const GTFS_ROUTE_STATUSES = ['draft', 'needs-review', 'ready', 'excluded']
const VIEW_STATE_KEY = 'oki-transport-dashboard:view-state'
const VIEW_STATE_MAX_AGE_MS = 60 * 60 * 1000
const restoredViewState = loadViewState()
const initialTab = initialMainTab(restoredViewState)

let pendingScrollRestore = Boolean(restoredViewState?.scroll)
let saveViewStateFrame = null

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

const state = {
  snapshot: null,
  gtfs: null,
  codex: null,
  activeTab: initialTab,
  group: restoredViewState?.group || 'すべて',
  type: FILTER_TYPES.includes(restoredViewState?.type) ? restoredViewState.type : 'all',
  review: REVIEW_FILTERS.includes(restoredViewState?.review) ? restoredViewState.review : 'all',
  query: typeof restoredViewState?.query === 'string' ? restoredViewState.query : ''
}

const elements = {
  groupNav: document.querySelector('#groupNav'),
  refreshBtn: document.querySelector('#refreshBtn'),
  saveBtn: document.querySelector('#saveBtn'),
  downloadBtn: document.querySelector('#downloadBtn'),
  mainTabs: document.querySelectorAll('[data-main-tab]'),
  tabPanels: document.querySelectorAll('[data-tab-panel]'),
  searchInput: document.querySelector('#searchInput'),
  segments: document.querySelectorAll('[data-filter-type]'),
  reviewSegments: document.querySelectorAll('[data-filter-review]'),
  sourceCount: document.querySelector('#sourceCount'),
  sourceStatus: document.querySelector('#sourceStatus'),
  documentCount: document.querySelector('#documentCount'),
  documentStatus: document.querySelector('#documentStatus'),
  changedCount: document.querySelector('#changedCount'),
  changedStatus: document.querySelector('#changedStatus'),
  noticeCount: document.querySelector('#noticeCount'),
  noticeStatus: document.querySelector('#noticeStatus'),
  lastFetched: document.querySelector('#lastFetched'),
  errorBanner: document.querySelector('#errorBanner'),
  sourcePanelMeta: document.querySelector('#sourcePanelMeta'),
  noticeMeta: document.querySelector('#noticeMeta'),
  pageMeta: document.querySelector('#pageMeta'),
  documentMeta: document.querySelector('#documentMeta'),
  sourceCards: document.querySelector('#sourceCards'),
  noticeFeed: document.querySelector('#noticeFeed'),
  pageLog: document.querySelector('#pageLog'),
  documentRows: document.querySelector('#documentRows'),
  gtfsMeta: document.querySelector('#gtfsMeta'),
  gtfsDraftScope: document.querySelector('#gtfsDraftScope'),
  gtfsCreateDraftBtn: document.querySelector('#gtfsCreateDraftBtn'),
  gtfsExportBtn: document.querySelector('#gtfsExportBtn'),
  gtfsDownloadLink: document.querySelector('#gtfsDownloadLink'),
  gtfsWorkflow: document.querySelector('#gtfsWorkflow'),
  gtfsCurrentMeta: document.querySelector('#gtfsCurrentMeta'),
  gtfsDraftMeta: document.querySelector('#gtfsDraftMeta'),
  gtfsFeeds: document.querySelector('#gtfsFeeds'),
  gtfsDraftEditor: document.querySelector('#gtfsDraftEditor'),
  gtfsTaskLog: document.querySelector('#gtfsTaskLog'),
  gtfsRouteMeta: document.querySelector('#gtfsRouteMeta'),
  gtfsRouteRows: document.querySelector('#gtfsRouteRows'),
  codexAppServerMeta: document.querySelector('#codexAppServerMeta'),
  codexAppServerBody: document.querySelector('#codexAppServerBody')
}

elements.refreshBtn.addEventListener('click', () => collect({ save: false, download: false }))
elements.saveBtn.addEventListener('click', () => collect({ save: true, download: false }))
elements.downloadBtn.addEventListener('click', () => collect({ save: true, download: true }))
elements.gtfsCreateDraftBtn.addEventListener('click', createGtfsDraft)
elements.gtfsExportBtn.addEventListener('click', exportGtfs)
elements.mainTabs.forEach((button) => {
  button.addEventListener('click', () => setActiveTab(button.dataset.mainTab, { scrollTop: true }))
})
elements.searchInput.addEventListener('input', (event) => {
  state.query = event.target.value.trim().toLowerCase()
  render()
})
elements.segments.forEach((button) => {
  button.addEventListener('click', () => {
    elements.segments.forEach((item) => item.classList.remove('active'))
    button.classList.add('active')
    state.type = button.dataset.filterType
    render()
  })
})
elements.reviewSegments.forEach((button) => {
  button.addEventListener('click', () => {
    elements.reviewSegments.forEach((item) => item.classList.remove('active'))
    button.classList.add('active')
    state.review = button.dataset.filterReview
    render()
  })
})

elements.searchInput.value = state.query
window.addEventListener('scroll', scheduleSaveViewState, { passive: true })
window.addEventListener('pagehide', saveViewState)
window.addEventListener('beforeunload', saveViewState)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveViewState()
})
document.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('a[href]')) saveViewState()
}, true)
window.addEventListener('hashchange', () => {
  const tab = tabFromHash(location.hash)
  if (tab) setActiveTab(tab)
})

renderTabs()

loadLatest()
loadGtfs()

async function loadLatest() {
  setBusy(true)
  try {
    const snapshot = await fetchJson('/api/latest')
    state.snapshot = snapshot.summary ? snapshot : null
    if (!state.snapshot) {
      await collect({ save: false, download: false })
      return
    }
    render()
  } catch (error) {
    showError(error.message)
  } finally {
    setBusy(false)
  }
}

async function collect({ save, download }) {
  setBusy(true)
  hideError()
  try {
    const params = new URLSearchParams()
    if (save) params.set('save', '1')
    if (download) params.set('download', '1')
    const snapshot = await fetchJson(`/api/collect?${params.toString()}`)
    state.snapshot = snapshot
    render()
  } catch (error) {
    showError(error.message)
  } finally {
    setBusy(false)
  }
}

async function loadGtfs() {
  setGtfsBusy(true)
  try {
    const [gtfs, codex] = await Promise.all([
      fetchJson('/api/gtfs'),
      fetchJson('/api/codex-app-server/status')
    ])
    state.gtfs = gtfs
    state.codex = codex
    renderGtfs()
  } catch (error) {
    showError(error.message)
  } finally {
    setGtfsBusy(false)
  }
}

async function createGtfsDraft() {
  setGtfsBusy(true)
  hideError()
  try {
    const result = await fetchJson('/api/gtfs/draft/from-latest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scope: elements.gtfsDraftScope.value, snapshot: state.snapshot })
    })
    state.gtfs = result.dashboard
    showGtfsTaskLog(`GTFS下書きを作成しました: ${result.draft.summary.routeCount} route候補`)
    recomputeSnapshotState()
    renderGtfs()
    render()
  } catch (error) {
    showError(error.message)
  } finally {
    setGtfsBusy(false)
  }
}

async function exportGtfs() {
  setGtfsBusy(true)
  hideError()
  try {
    const result = await fetchJson('/api/gtfs/draft/export', { method: 'POST' })
    state.gtfs = result.dashboard
    showGtfsTaskLog(`GTFSファイルを生成しました: ${result.export.fileCount} files / ${formatBytes(result.export.zipBytes)}`)
    renderGtfs()
  } catch (error) {
    showError(error.message)
  } finally {
    setGtfsBusy(false)
  }
}

async function runGtfsFeedTask(button) {
  const { feedId, sourceId, mode, action } = button.dataset
  setGtfsBusy(true)
  hideError()
  showGtfsTaskLog(`${gtfsTaskLabel(action)}を実行中: ${feedId}`)
  try {
    const result = await fetchJson('/api/gtfs/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feedId, sourceId, mode, action })
    })
    state.gtfs = result.dashboard
    const task = result.task
    showGtfsTaskLog([
      `${task.ok ? '完了' : '失敗'}: ${task.command}`,
      task.stdout,
      task.stderr
    ].filter(Boolean).join('\n\n'))
    renderGtfs()
  } catch (error) {
    showError(error.message)
  } finally {
    setGtfsBusy(false)
  }
}

async function saveGtfsFeedInfo() {
  const draft = state.gtfs?.draft
  if (!draft) return
  setGtfsBusy(true)
  hideError()
  try {
    const result = await fetchJson('/api/gtfs/draft', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        feedInfo: {
          feed_publisher_name: document.querySelector('#gtfsPublisherName')?.value,
          feed_publisher_url: document.querySelector('#gtfsPublisherUrl')?.value,
          feed_start_date: document.querySelector('#gtfsFeedStartDate')?.value,
          feed_end_date: document.querySelector('#gtfsFeedEndDate')?.value,
          feed_version: document.querySelector('#gtfsFeedVersion')?.value
        }
      })
    })
    state.gtfs = result.dashboard
    showGtfsTaskLog('GTFS下書き設定を保存しました')
    renderGtfs()
  } catch (error) {
    showError(error.message)
  } finally {
    setGtfsBusy(false)
  }
}

async function saveGtfsRoute(button) {
  const row = button.closest('tr')
  const routeId = row?.dataset.routeId
  if (!routeId) return
  setGtfsBusy(true)
  hideError()
  try {
    const result = await fetchJson('/api/gtfs/draft', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        route: {
          route_id: routeId,
          status: row.querySelector('[data-gtfs-route-field="status"]')?.value,
          route_type: row.querySelector('[data-gtfs-route-field="route_type"]')?.value,
          route_short_name: row.querySelector('[data-gtfs-route-field="route_short_name"]')?.value,
          route_long_name: row.querySelector('[data-gtfs-route-field="route_long_name"]')?.value,
          notes: row.querySelector('[data-gtfs-route-field="notes"]')?.value
        }
      })
    })
    state.gtfs = result.dashboard
    showGtfsTaskLog(`routeを保存しました: ${routeId}`)
    recomputeSnapshotState()
    renderGtfs()
    render()
  } catch (error) {
    showError(error.message)
  } finally {
    setGtfsBusy(false)
  }
}

async function createCodexGtfsJob(button) {
  const row = button.closest('tr')
  const routeId = row?.dataset.routeId
  if (!routeId) return
  setGtfsBusy(true)
  hideError()
  showGtfsTaskLog(`Codex App Serverジョブを作成中: ${routeId}`)
  try {
    const result = await fetchJson('/api/codex-app-server/gtfs-jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ routeId })
    })
    state.gtfs = result.dashboard || state.gtfs
    state.codex = result.codex || state.codex
    showGtfsTaskLog(formatCodexJobLog(result.job))
    renderGtfs()
  } catch (error) {
    showError(error.message)
  } finally {
    setGtfsBusy(false)
  }
}

async function sendCodexJob(button) {
  const jobId = button.dataset.sendCodexJob
  if (!jobId) return
  setGtfsBusy(true)
  hideError()
  try {
    const result = await fetchJson('/api/codex-app-server/jobs/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jobId })
    })
    state.codex = result.codex || state.codex
    showGtfsTaskLog(formatCodexJobLog(result.job))
    renderGtfs()
  } catch (error) {
    showError(error.message)
  } finally {
    setGtfsBusy(false)
  }
}

async function updateCodexJob(button) {
  const jobId = button.dataset.updateCodexJob
  const status = button.dataset.status
  if (!jobId || !status) return
  setGtfsBusy(true)
  hideError()
  try {
    const result = await fetchJson('/api/codex-app-server/jobs', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jobId, status })
    })
    state.codex = result.codex || state.codex
    showGtfsTaskLog(`Codex App Serverジョブを${codexJobStatusLabel(status)}に更新しました: ${jobId}`)
    renderGtfs()
  } catch (error) {
    showError(error.message)
  } finally {
    setGtfsBusy(false)
  }
}

async function copyCodexPrompt(button) {
  const jobId = button.dataset.copyCodexPrompt
  const job = (state.codex?.jobs || []).find((item) => item.id === jobId)
  if (!job?.prompt) return
  try {
    await navigator.clipboard.writeText(job.prompt)
    showGtfsTaskLog(`Codexプロンプトをコピーしました: ${jobId}`)
  } catch (error) {
    showError(`コピーできませんでした: ${error.message}`)
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function render() {
  const snapshot = state.snapshot
  if (!snapshot) return
  renderTabs()
  const summary = snapshot.summary
  const groups = ['すべて', ...new Set(snapshot.sources.map((source) => source.group))]
  if (!groups.includes(state.group)) state.group = 'すべて'

  renderGroups(groups, snapshot.sources)
  renderSummary(summary)

  const visibleSources = filterSources(snapshot.sources)
  const visibleDocuments = filterDocuments(snapshot.documents || [])
  const visibleNotices = filterNotices(snapshot.notices || [])
  const visiblePages = filterPages(snapshot.pages || [])

  elements.sourcePanelMeta.textContent = `${visibleSources.length}件`
  elements.noticeMeta.textContent = `${visibleNotices.length}件`
  elements.pageMeta.textContent = `${visiblePages.length}ページ`
  elements.documentMeta.textContent = `${visibleDocuments.length}件`

  renderSources(visibleSources)
  renderNotices(visibleNotices)
  renderPages(visiblePages)
  renderDocuments(visibleDocuments)
  syncFilterControls()
  if (state.gtfs) renderGtfsWorkflow()
  if (pendingScrollRestore) {
    restoreScrollAfterRender()
  } else {
    saveViewState()
  }
}

function renderGroups(groups, sources) {
  elements.groupNav.innerHTML = groups.map((group) => {
    const count = group === 'すべて' ? sources.length : sources.filter((source) => source.group === group).length
    const active = state.group === group ? 'active' : ''
    return `<button class="group-button ${active}" type="button" data-group="${escapeAttr(group)}">
      <span>${escapeHtml(group)}</span><span>${count}</span>
    </button>`
  }).join('')
  elements.groupNav.querySelectorAll('[data-group]').forEach((button) => {
    button.addEventListener('click', () => {
      state.group = button.dataset.group
      render()
    })
  })
}

function renderTabs() {
  elements.mainTabs.forEach((button) => {
    const active = button.dataset.mainTab === state.activeTab
    button.classList.toggle('active', active)
    button.setAttribute('aria-selected', active ? 'true' : 'false')
  })
  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.tabPanel === state.activeTab)
  })
}

function setActiveTab(tab, options = {}) {
  if (!['documents', 'gtfs'].includes(tab)) return
  state.activeTab = tab
  renderTabs()
  saveViewState()
  if (options.scrollTop) {
    document.querySelector('.main-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function renderSummary(summary) {
  const reviewSummary = state.snapshot.reviewSummary || {}
  const reflectionSummary = computeReflectionSummary(state.snapshot.documents || [])
  elements.sourceCount.textContent = summary.sourceCount
  elements.sourceStatus.textContent = `OK ${summary.okSources} / 注意 ${summary.warningSources} / 失敗 ${summary.errorSources}`
  elements.documentCount.textContent = summary.documentCount
  elements.documentStatus.textContent = `必要 ${reviewSummary.required ?? 0} / 要反映 ${reflectionSummary.needsReflection} / 反映済み ${reflectionSummary.reflected}`
  elements.changedCount.textContent = summary.changedDocuments + summary.changedPages
  elements.changedStatus.textContent = `資料 ${summary.changedDocuments} / ページ ${summary.changedPages}`
  elements.noticeCount.textContent = summary.noticeCount
  elements.noticeStatus.textContent = `新着 ${summary.newNotices}`
  elements.lastFetched.textContent = `取得: ${formatDateTime(summary.collectedAt)}`
}

function renderSources(sources) {
  if (!sources.length) {
    elements.sourceCards.innerHTML = '<div class="empty">該当するソースはありません</div>'
    return
  }
  elements.sourceCards.innerHTML = sources.map((source) => {
    const changedClass = source.pageChanged || source.documentChanged ? 'changed' : ''
    const pageChips = source.pages.map((page) => {
      const title = `${page.label}: ${page.error || page.statusCode || ''}`
      return `<span class="page-chip ${page.status}" title="${escapeAttr(title)}">${escapeHtml(page.label)}</span>`
    }).join('')
    const changeBadge = source.pageChanged || source.documentChanged
      ? '<span class="badge changed">差分</span>'
      : `<span class="badge ${source.status}">${statusLabel(source.status)}</span>`
    return `<article class="source-card ${changedClass} ${source.status}">
      <div class="source-title">
        <div>
          <h4>${escapeHtml(source.name)}</h4>
          <p>${escapeHtml(source.operator)} / ${escapeHtml(source.area)}</p>
        </div>
        ${changeBadge}
      </div>
      <div class="source-stats">
        <div><strong>${source.counts.documents}</strong><span>資料</span></div>
        <div><strong>${source.reviewCounts?.required ?? 0}</strong><span>必要</span></div>
        <div><strong>${sourceReflectionCounts(source).needsReflection}</strong><span>要反映</span></div>
      </div>
      <div class="page-chips">${pageChips}</div>
      <div class="card-links">
        <span>${escapeHtml(source.updatedText || source.lastModified || '更新日未検出')}</span>
        <a href="${escapeAttr(source.officialUrl)}" target="_blank" rel="noreferrer">公式</a>
      </div>
    </article>`
  }).join('')
}

function renderNotices(notices) {
  const items = notices.slice(0, 18)
  if (!items.length) {
    elements.noticeFeed.innerHTML = '<div class="empty">該当するお知らせはありません</div>'
    return
  }
  elements.noticeFeed.innerHTML = items.map((notice) => `
    <div class="notice-item">
      <a href="${escapeAttr(notice.url)}" target="_blank" rel="noreferrer">${escapeHtml(notice.title)}</a>
      <div class="item-meta">
        <span>${escapeHtml(notice.sourceName)}</span>
        <span>${escapeHtml(notice.dateText || '日付未検出')}</span>
        <span>${escapeHtml(changeLabel(notice.changeStatus))}</span>
      </div>
    </div>
  `).join('')
}

function renderPages(pages) {
  const sorted = [...pages].sort((a, b) => statusRank(a.status) - statusRank(b.status))
  elements.pageLog.innerHTML = sorted.map((page) => `
    <div class="log-item">
      <a href="${escapeAttr(page.url)}" target="_blank" rel="noreferrer">${escapeHtml(page.sourceName)} / ${escapeHtml(page.label)}</a>
      <div class="item-meta">
        <span class="badge ${page.status}">${statusLabel(page.status)}</span>
        <span>${escapeHtml(page.error || page.contentType || 'content-typeなし')}</span>
        <span>${formatBytes(page.sizeBytes)}</span>
      </div>
    </div>
  `).join('')
}

function renderDocuments(documents) {
  const documentsWithReflection = documents.map((document) => ({
    ...document,
    ...documentReflectionState(document)
  }))
  const rows = documentsWithReflection.slice(0, 250).map((document) => `
    <tr>
      <td><span class="badge ${document.changeStatus}">${changeLabel(document.changeStatus)}</span></td>
      <td>
        <select class="review-select ${document.reviewStatus || 'unreviewed'}" data-review-url="${escapeAttr(document.url)}" aria-label="レビュー状態">
          ${reviewOptions(document.reviewStatus)}
        </select>
      </td>
      <td>
        <span class="badge reflection ${escapeAttr(document.reflectionStatus)}" title="${escapeAttr(document.reflectionReason)}">${escapeHtml(reflectionLabel(document.reflectionStatus))}</span>
        ${document.reflectionRouteIds?.length ? `<div class="item-meta"><span>${escapeHtml(document.reflectionRouteIds.join(', '))}</span></div>` : ''}
      </td>
      <td>
        <select class="type-select ${document.type || 'other'} ${document.manualType ? 'manual' : 'auto'}" data-type-url="${escapeAttr(document.url)}" aria-label="資料種別" title="${escapeAttr(typeSelectTitle(document))}">
          ${typeOptions(document)}
        </select>
      </td>
      <td>
        <a href="${escapeAttr(documentViewerUrl(document))}" data-document-link="true">${escapeHtml(document.title)}</a>
        <div class="item-meta"><span>${escapeHtml(document.extension.toUpperCase())}</span><span>${escapeHtml(document.pageLabel || '')}</span></div>
      </td>
      <td>${escapeHtml(document.sourceName)}</td>
      <td>${escapeHtml(document.dateText || '-')}</td>
      <td><a href="${escapeAttr(document.pageUrl)}" target="_blank" rel="noreferrer">ページ</a></td>
    </tr>
  `).join('')
  elements.documentRows.innerHTML = rows || '<tr><td colspan="8" class="empty">該当する資料はありません</td></tr>'
  elements.documentRows.querySelectorAll('[data-review-url]').forEach((select) => {
    select.addEventListener('change', () => updateReviewStatus(select))
  })
  elements.documentRows.querySelectorAll('[data-type-url]').forEach((select) => {
    select.addEventListener('change', () => updateDocumentType(select))
  })
}

function renderGtfs() {
  const gtfs = state.gtfs
  renderTabs()
  if (!gtfs) {
    elements.gtfsMeta.textContent = '未読込'
    elements.gtfsFeeds.innerHTML = '<div class="empty">GTFS情報を読込中です</div>'
    elements.gtfsDraftEditor.innerHTML = ''
    elements.gtfsRouteRows.innerHTML = '<tr><td colspan="6" class="empty">GTFS下書きはありません</td></tr>'
    renderCodexAppServer()
    return
  }
  const currentFeeds = gtfs.currentFeeds || []
  const draft = gtfs.draft
  elements.gtfsMeta.textContent = `採用中 ${currentFeeds.length}件 / 下書き ${draft ? 'あり' : 'なし'}`
  elements.gtfsCurrentMeta.textContent = `${gtfs.summary.currentRouteCount} routes / ${gtfs.summary.currentTripCount} trips`
  renderGtfsWorkflow()
  renderCodexAppServer()
  renderGtfsFeeds(currentFeeds)
  renderGtfsDraftEditor(draft)
  renderGtfsRouteRows(draft)
}

function renderGtfsWorkflow() {
  const gtfs = state.gtfs
  if (!gtfs) return
  const draft = gtfs.draft
  const routeCounts = countGtfsRouteStatuses(draft?.routes || [])
  const reviewSummary = state.snapshot?.reviewSummary || {}
  const timetableCount = state.snapshot?.summary?.timetableCount ?? 0
  const requiredCount = reviewSummary.required ?? 0
  const unreviewedCount = reviewSummary.unreviewed ?? 0
  const latestExport = draft?.exports?.[0]
  const validationOkCount = (gtfs.currentFeeds || []).filter((feed) => feed.lastValidation?.ok).length
  const nextStep = chooseGtfsNextStep({ draft, routeCounts, latestExport, unreviewedCount, requiredCount })

  const steps = [
    {
      key: 'review',
      label: '資料レビュー',
      status: timetableCount ? (unreviewedCount ? 'active' : 'ready') : 'pending',
      metric: `${requiredCount} 必要 / ${unreviewedCount} 未レビュー`,
      detail: `${timetableCount} 時刻表資料`,
      action: '<button class="mini-button" type="button" data-workflow-action="review-required">必要資料</button>'
    },
    {
      key: 'draft',
      label: '下書き',
      status: draft ? 'ready' : 'pending',
      metric: draft ? `${draft.summary.routeCount} route候補` : '未作成',
      detail: draft ? `scope ${draft.scope}` : 'agency / routes',
      action: '<button class="mini-button primary" type="button" data-workflow-action="create-draft">作成</button>'
    },
    {
      key: 'routes',
      label: '候補整理',
      status: draft ? (routeCounts.draft + routeCounts.needsReview > 0 ? 'active' : 'ready') : 'pending',
      metric: `${routeCounts.ready} GTFS化済み / ${routeCounts.excluded} 除外`,
      detail: `${routeCounts.needsReview} 確認中 / ${routeCounts.draft} 未変換`,
      action: '<a class="mini-button" href="#gtfsRoutesSection">route候補</a>'
    },
    {
      key: 'export',
      label: '出力',
      status: latestExport ? 'ready' : draft ? 'active' : 'pending',
      metric: latestExport ? `${formatBytes(latestExport.zipBytes)} ZIP` : '未出力',
      detail: latestExport ? formatDateTime(latestExport.exportedAt) : 'GTFS txt 一式',
      action: latestExport
        ? `<a class="mini-button" href="${escapeAttr(gtfsViewerUrl({ source: 'export', exportId: latestExport.exportId }))}">出力ビュー</a>`
        : '<button class="mini-button" type="button" data-workflow-action="export">生成</button>'
    },
    {
      key: 'current',
      label: '採用中更新',
      status: latestExport ? 'active' : 'pending',
      metric: `${gtfs.summary.currentFeedCount} feed / 検証OK ${validationOkCount}`,
      detail: 'acquire → validate → build',
      action: '<a class="mini-button" href="#gtfsFeedsCard">採用中GTFS</a>'
    },
    {
      key: 'publish',
      label: '公開・smoke',
      status: 'pending',
      metric: 'CLIでdevを明示',
      detail: 'publish → smoke / prodは昇格のみ',
      action: '<span class="item-meta">認証・承認が必要</span>'
    }
  ]

  elements.gtfsWorkflow.innerHTML = `
    <div class="workflow-next">
      <span>次</span>
      <strong>${escapeHtml(nextStep)}</strong>
    </div>
    <div class="workflow-steps">
      ${steps.map(renderGtfsWorkflowStep).join('')}
    </div>
  `
  elements.gtfsWorkflow.querySelectorAll('[data-workflow-action]').forEach((button) => {
    button.addEventListener('click', () => runGtfsWorkflowAction(button.dataset.workflowAction))
  })
}

function renderGtfsWorkflowStep(step) {
  return `<article class="workflow-step ${step.status}">
    <div class="workflow-step-top">
      <span class="workflow-dot"></span>
      <strong>${escapeHtml(step.label)}</strong>
      <span>${escapeHtml(workflowStatusLabel(step.status))}</span>
    </div>
    <div class="workflow-step-body">
      <strong>${escapeHtml(step.metric)}</strong>
      <span>${escapeHtml(step.detail)}</span>
    </div>
    <div class="workflow-step-action">${step.action}</div>
  </article>`
}

function renderCodexAppServer() {
  const codex = state.codex
  if (!elements.codexAppServerBody || !elements.codexAppServerMeta) return
  if (!codex) {
    elements.codexAppServerMeta.textContent = '未読込'
    elements.codexAppServerBody.innerHTML = '<div class="empty">Codex App Server情報を読込中です</div>'
    return
  }
  const queue = codex.queue || {}
  const config = codex.config || {}
  const cli = codex.cli || {}
  elements.codexAppServerMeta.textContent = `${codexTransportLabel(config.transport)} / ${queue.total || 0} jobs`
  const jobs = codex.jobs || []
  elements.codexAppServerBody.innerHTML = `
    <div class="codex-status-grid">
      <div>
        <span>送信先</span>
        <strong>${escapeHtml(config.serverUrl || 'ローカルキュー')}</strong>
        <small>${escapeHtml(codexTransportLabel(config.transport))}${config.hasToken ? ' / tokenあり' : ''}</small>
      </div>
      <div>
        <span>Codex CLI</span>
        <strong>${escapeHtml(cli.available ? '利用可' : cli.skipped ? '未確認' : '未検出')}</strong>
        <small>${escapeHtml(cli.version || cli.error || cli.path || '-')}</small>
      </div>
      <div>
        <span>ジョブ</span>
        <strong>${queue.total || 0}</strong>
        <small>送信済み ${queue.sent || 0} / 失敗 ${queue.failed || 0} / 未送信 ${queue.queued || 0}</small>
      </div>
    </div>
    <div class="codex-job-list">
      ${jobs.length ? jobs.map(renderCodexJob).join('') : '<div class="empty compact-empty">route候補の「CodexでGTFS化」からジョブを作成できます</div>'}
    </div>
  `
  elements.codexAppServerBody.querySelectorAll('[data-copy-codex-prompt]').forEach((button) => {
    button.addEventListener('click', () => copyCodexPrompt(button))
  })
  elements.codexAppServerBody.querySelectorAll('[data-send-codex-job]').forEach((button) => {
    button.addEventListener('click', () => sendCodexJob(button))
  })
  elements.codexAppServerBody.querySelectorAll('[data-update-codex-job]').forEach((button) => {
    button.addEventListener('click', () => updateCodexJob(button))
  })
}

function renderCodexJob(job) {
  const canResend = ['queued', 'failed'].includes(job.status)
  const canComplete = !['completed', 'cancelled'].includes(job.status)
  return `<article class="codex-job ${escapeAttr(job.status)}">
    <div class="codex-job-main">
      <div>
        <strong>${escapeHtml(job.routeName || job.routeId || job.id)}</strong>
        <div class="item-meta">
          <span>${escapeHtml(job.routeId || '-')}</span>
          <span>${escapeHtml(formatDateTime(job.createdAt))}</span>
          <span>${escapeHtml(job.delivery?.message || codexDeliveryLabel(job.delivery?.status))}</span>
        </div>
      </div>
      <span class="badge ${escapeAttr(codexJobBadgeClass(job.status))}">${escapeHtml(codexJobStatusLabel(job.status))}</span>
    </div>
    <div class="button-row">
      <button class="mini-button" type="button" data-copy-codex-prompt="${escapeAttr(job.id)}">プロンプトコピー</button>
      ${canResend ? `<button class="mini-button primary" type="button" data-send-codex-job="${escapeAttr(job.id)}">送信</button>` : ''}
      ${canComplete ? `<button class="mini-button" type="button" data-update-codex-job="${escapeAttr(job.id)}" data-status="completed">完了</button>` : ''}
      ${job.sourceDocumentUrl ? `<a class="mini-button" href="${escapeAttr(documentViewerUrl({ url: job.sourceDocumentUrl, title: job.sourceDocumentTitle || job.routeName, sourceName: job.agencyName || '', pageLabel: job.sourcePageLabel || '' }))}" data-document-link="true">資料</a>` : ''}
    </div>
    <details class="codex-prompt">
      <summary>プロンプト / JSON-RPC payload</summary>
      <pre>${escapeHtml(job.prompt || '')}</pre>
      <pre>${escapeHtml(JSON.stringify(job.appServerPayload || {}, null, 2))}</pre>
    </details>
  </article>`
}

function renderGtfsFeeds(feeds) {
  if (!feeds.length) {
    elements.gtfsFeeds.innerHTML = '<div class="empty">採用中GTFSは見つかりません</div>'
    return
  }
  elements.gtfsFeeds.innerHTML = feeds.map((feed) => {
    const validation = feed.lastValidation
    const validationBadge = validation
      ? `<span class="badge ${validation.ok ? 'ok' : 'error'}">${validation.ok ? '検証OK' : '要確認'}</span>`
      : '<span class="badge unknown">未検証</span>'
    const converterButton = feed.hasConverter
      ? `<button class="mini-button" type="button" data-gtfs-task="true" data-action="convert" data-feed-id="${escapeAttr(feed.id)}" data-source-id="${escapeAttr(feed.sourceId)}" data-mode="${escapeAttr(feed.mode || 'bus')}">変換</button>`
      : ''
    return `<article class="gtfs-feed">
      <div>
        <h5>${escapeHtml(feed.name)}</h5>
        <p>source ${escapeHtml(feed.sourceId || '-')} / feed ${escapeHtml(feed.id)} / ${escapeHtml(feed.agencyName || feed.agency_name || '')}</p>
      </div>
      <div class="gtfs-feed-stats">
        <span>${feed.summary.routeCount} route</span>
        <span>${feed.summary.stopCount} stop</span>
        <span>${feed.summary.tripCount} trip</span>
        ${validationBadge}
      </div>
      <div class="gtfs-feed-meta">
        <span>期間 ${formatGtfsDate(feed.summary.feedStartDate)} - ${formatGtfsDate(feed.summary.feedEndDate)}</span>
        <span>元データ ${escapeHtml(feed.currentRawDate || '-')}</span>
      </div>
      <div class="card-links">
        <a href="${escapeAttr(feed.sourceUrl || '#')}" target="_blank" rel="noreferrer">元資料</a>
        <div class="button-row">
          <a class="mini-button primary" href="${escapeAttr(gtfsViewerUrl({ source: 'current', mode: feed.mode || 'bus', id: feed.id }))}">ビュー</a>
          ${converterButton}
          <button class="mini-button" type="button" data-gtfs-task="true" data-action="validate" data-feed-id="${escapeAttr(feed.id)}" data-source-id="${escapeAttr(feed.sourceId)}" data-mode="${escapeAttr(feed.mode || 'bus')}">検証</button>
          <button class="mini-button" type="button" data-gtfs-task="true" data-action="build" data-feed-id="${escapeAttr(feed.id)}" data-source-id="${escapeAttr(feed.sourceId)}" data-mode="${escapeAttr(feed.mode || 'bus')}">JSON生成</button>
        </div>
      </div>
    </article>`
  }).join('')
  elements.gtfsFeeds.querySelectorAll('[data-gtfs-task]').forEach((button) => {
    button.addEventListener('click', () => runGtfsFeedTask(button))
  })
}

function renderGtfsDraftEditor(draft) {
  elements.gtfsExportBtn.disabled = !draft
  elements.gtfsDownloadLink.classList.toggle('hidden', !draft?.exports?.[0]?.href)
  if (draft?.exports?.[0]?.href) {
    elements.gtfsDownloadLink.href = draft.exports[0].href
  }
  if (!draft) {
    elements.gtfsDraftMeta.textContent = '未作成'
    elements.gtfsDraftEditor.innerHTML = '<div class="empty">「GTFS下書き作成」を押すと、検出済み時刻表から agency/routes の下書きを作成します</div>'
    return
  }
  elements.gtfsDraftScope.value = draft.scope || 'active'
  elements.gtfsDraftMeta.textContent = `${draft.summary.routeCount} route候補 / 警告 ${draft.summary.warningCount}`
  elements.gtfsDraftEditor.innerHTML = `
    <div class="gtfs-form-grid">
      <label><span>publisher</span><input id="gtfsPublisherName" value="${escapeAttr(draft.feedInfo.feed_publisher_name)}"></label>
      <label><span>URL</span><input id="gtfsPublisherUrl" value="${escapeAttr(draft.feedInfo.feed_publisher_url)}"></label>
      <label><span>開始日</span><input id="gtfsFeedStartDate" type="date" value="${escapeAttr(gtfsDateToInput(draft.feedInfo.feed_start_date))}"></label>
      <label><span>終了日</span><input id="gtfsFeedEndDate" type="date" value="${escapeAttr(gtfsDateToInput(draft.feedInfo.feed_end_date))}"></label>
      <label><span>version</span><input id="gtfsFeedVersion" value="${escapeAttr(draft.feedInfo.feed_version)}"></label>
      <button id="gtfsSaveFeedBtn" class="button" type="button">設定保存</button>
    </div>
    <div class="gtfs-validation">
      <span class="badge ${draft.validation.ok ? 'ok' : 'error'}">${draft.validation.ok ? '下書きOK' : '要修正'}</span>
      <span>issues ${draft.validation.issues.length}</span>
      <span>warnings ${draft.validation.warnings.length}</span>
      <span>最終出力 ${formatDateTime(draft.summary.lastExportedAt)}</span>
    </div>
    <div class="button-row">
      <a class="mini-button primary" href="${escapeAttr(gtfsViewerUrl({ source: 'draft' }))}">下書きビュー</a>
      ${draft.exports?.[0]?.exportId ? `<a class="mini-button" href="${escapeAttr(gtfsViewerUrl({ source: 'export', exportId: draft.exports[0].exportId }))}">直近出力ビュー</a>` : ''}
    </div>
    ${renderGtfsWarnings(draft)}
  `
  document.querySelector('#gtfsSaveFeedBtn')?.addEventListener('click', saveGtfsFeedInfo)
}

function renderGtfsRouteRows(draft) {
  const routes = draft?.routes || []
  elements.gtfsRouteMeta.textContent = routes.length ? `${routes.length}件` : '未作成'
  if (!routes.length) {
    elements.gtfsRouteRows.innerHTML = '<tr><td colspan="6" class="empty">GTFS route候補はありません</td></tr>'
    return
  }
  elements.gtfsRouteRows.innerHTML = routes.map((route) => `
    <tr data-route-id="${escapeAttr(route.route_id)}">
      <td>
        <select class="gtfs-select status-${escapeAttr(route.status)}" data-gtfs-route-field="status">
          ${gtfsStatusOptions(route.status)}
        </select>
        <div class="item-meta">${escapeHtml(route.route_id)}</div>
      </td>
      <td>
        <select class="gtfs-select" data-gtfs-route-field="route_type">
          ${gtfsRouteTypeOptions(route.route_type)}
        </select>
      </td>
      <td><input class="gtfs-input short" data-gtfs-route-field="route_short_name" value="${escapeAttr(route.route_short_name)}"></td>
      <td>
        <input class="gtfs-input" data-gtfs-route-field="route_long_name" value="${escapeAttr(route.route_long_name)}">
        <input class="gtfs-input notes" data-gtfs-route-field="notes" placeholder="メモ" value="${escapeAttr(route.notes)}">
      </td>
      <td>
        <a href="${escapeAttr(documentViewerUrl({ url: route.source_document_url, title: route.source_document_title, sourceName: '', pageLabel: route.source_page_label }))}" data-document-link="true">${escapeHtml(route.source_document_title || route.route_long_name)}</a>
        <div class="item-meta"><span>${escapeHtml(reviewLabel(route.source_review_status))}</span><span>${escapeHtml(route.source_page_label || '')}</span></div>
      </td>
      <td>
        <div class="button-stack">
          <button class="mini-button primary" type="button" data-save-gtfs-route="true">保存</button>
          ${routeActionButtons(route, draft)}
        </div>
      </td>
    </tr>
  `).join('')
  elements.gtfsRouteRows.querySelectorAll('[data-save-gtfs-route]').forEach((button) => {
    button.addEventListener('click', () => saveGtfsRoute(button))
  })
  elements.gtfsRouteRows.querySelectorAll('[data-codex-gtfs-route]').forEach((button) => {
    button.addEventListener('click', () => createCodexGtfsJob(button))
  })
}

function filterSources(sources) {
  return sources.filter((source) => {
    if (state.group !== 'すべて' && source.group !== state.group) return false
    if (!matchesQuery([source.name, source.operator, source.area, source.officialUrl])) return false
    if (state.review !== 'all' && !source.documents.some((document) => (document.reviewStatus || 'unreviewed') === state.review)) return false
    if (state.type === 'all') return true
    return source.documents.some((document) => document.type === state.type) || source.notices.some(() => state.type === 'notice')
  })
}

function countGtfsRouteStatuses(routes) {
  return routes.reduce((counts, route) => {
    const status = GTFS_ROUTE_STATUSES.includes(route.status) ? route.status : 'draft'
    const key = status === 'needs-review' ? 'needsReview' : status
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, { draft: 0, needsReview: 0, ready: 0, excluded: 0 })
}

function chooseGtfsNextStep({ draft, routeCounts, latestExport, unreviewedCount, requiredCount }) {
  if (unreviewedCount > 0 && requiredCount === 0) return '資料をレビューして「必要」を選ぶ'
  if (!draft) return 'GTFS下書きを作成'
  if (routeCounts.needsReview > 0) return '確認中のrouteを整理'
  if (routeCounts.draft > 0 && routeCounts.ready === 0) return 'routeをGTFS化済みまたは除外へ整理'
  if (!latestExport) return 'GTFSファイル生成'
  return '採用中GTFSで検証・JSON生成'
}

function workflowStatusLabel(status) {
  return { ready: '完了', active: '作業中', pending: '未着手' }[status] || status
}

function runGtfsWorkflowAction(action) {
  if (action === 'create-draft') {
    createGtfsDraft()
    return
  }
  if (action === 'export') {
    exportGtfs()
    return
  }
  if (action === 'review-required') {
    setActiveTab('documents')
    state.type = 'timetable'
    state.review = 'required'
    document.querySelector('.table-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    render()
  }
}

function filterDocuments(documents) {
  return documents.filter((document) => {
    if (state.group !== 'すべて' && document.group !== state.group) return false
    if (state.type !== 'all' && document.type !== state.type) return false
    if (state.review !== 'all' && (document.reviewStatus || 'unreviewed') !== state.review) return false
    return matchesQuery([document.title, document.sourceName, document.url, document.pageLabel])
  }).sort((a, b) => changeRank(a.changeStatus) - changeRank(b.changeStatus) || a.sourceName.localeCompare(b.sourceName, 'ja'))
}

async function updateReviewStatus(select) {
  const url = select.dataset.reviewUrl
  const status = select.value
  const document = state.snapshot.documents.find((item) => item.url === url)
  if (!document) return
  select.disabled = true
  hideError()
  try {
    await fetchJson('/api/reviews', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url,
        status,
        title: document.title,
        sourceId: document.sourceId,
        sourceName: document.sourceName
      })
    })
    document.reviewStatus = status
    document.reviewUpdatedAt = new Date().toISOString()
    recomputeSnapshotState()
    render()
  } catch (error) {
    showError(error.message)
    render()
  } finally {
    select.disabled = false
  }
}

async function updateDocumentType(select) {
  const url = select.dataset.typeUrl
  const type = select.value
  const document = state.snapshot.documents.find((item) => item.url === url)
  if (!document) return
  select.disabled = true
  hideError()
  try {
    await fetchJson('/api/document-types', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url,
        type,
        title: document.title,
        sourceId: document.sourceId,
        sourceName: document.sourceName
      })
    })
    document.manualType = type === 'auto' ? null : type
    document.type = type === 'auto' ? normalizeDocumentType(document.detectedType || document.type) : type
    document.typeUpdatedAt = type === 'auto' ? null : new Date().toISOString()
    recomputeSnapshotState()
    render()
  } catch (error) {
    showError(error.message)
    render()
  } finally {
    select.disabled = false
  }
}

function recomputeSnapshotState() {
  if (!state.snapshot) return
  const reviewCounts = createReviewCount()
  const reflectionCounts = createReflectionCount()
  const sourceCounts = new Map()
  const sourceReflectionCounts = new Map()
  const sourceTypeCounts = new Map()
  const documentsByUrl = new Map()
  for (const document of state.snapshot.documents || []) {
    const status = document.reviewStatus || 'unreviewed'
    const type = normalizeDocumentType(document.type)
    const reflection = documentReflectionState(document)
    document.type = type
    document.detectedType = normalizeDocumentType(document.detectedType || type)
    document.reflectionStatus = reflection.reflectionStatus
    document.reflectionReason = reflection.reflectionReason
    document.reflectionRouteIds = reflection.reflectionRouteIds
    documentsByUrl.set(document.url, document)
    reviewCounts.total += 1
    reviewCounts[status] = (reviewCounts[status] || 0) + 1
    addReflectionCount(reflectionCounts, reflection.reflectionStatus)
    const sourceCount = sourceCounts.get(document.sourceId) || createReviewCount()
    sourceCount.total += 1
    sourceCount[status] = (sourceCount[status] || 0) + 1
    sourceCounts.set(document.sourceId, sourceCount)
    const sourceReflectionCount = sourceReflectionCounts.get(document.sourceId) || createReflectionCount()
    addReflectionCount(sourceReflectionCount, reflection.reflectionStatus)
    sourceReflectionCounts.set(document.sourceId, sourceReflectionCount)
    const sourceTypeCount = sourceTypeCounts.get(document.sourceId) || createDocumentTypeCount()
    sourceTypeCount.documents += 1
    sourceTypeCount[type] = (sourceTypeCount[type] || 0) + 1
    sourceTypeCounts.set(document.sourceId, sourceTypeCount)
  }
  state.snapshot.reviewSummary = reviewCounts
  state.snapshot.reflectionSummary = reflectionCounts
  state.snapshot.summary = {
    ...state.snapshot.summary,
    timetableCount: (state.snapshot.documents || []).filter((document) => document.type === 'timetable').length,
    fareCount: (state.snapshot.documents || []).filter((document) => document.type === 'fare').length,
    statusCount: (state.snapshot.documents || []).filter((document) => document.type === 'status').length,
    noticeDocumentCount: (state.snapshot.documents || []).filter((document) => document.type === 'notice').length,
    mapCount: (state.snapshot.documents || []).filter((document) => document.type === 'map').length,
    otherCount: (state.snapshot.documents || []).filter((document) => document.type === 'other').length
  }
  state.snapshot.sources = state.snapshot.sources.map((source) => {
    const typeCounts = sourceTypeCounts.get(source.id) || createDocumentTypeCount()
    return {
      ...source,
      documents: (source.documents || []).map((document) => documentsByUrl.get(document.url) || document),
      reviewCounts: sourceCounts.get(source.id) || createReviewCount(),
      reflectionCounts: sourceReflectionCounts.get(source.id) || createReflectionCount(),
      counts: {
        ...source.counts,
        ...typeCounts,
        timetables: typeCounts.timetable,
        fares: typeCounts.fare
      }
    }
  })
}

function filterNotices(notices) {
  return notices.filter((notice) => {
    if (state.group !== 'すべて' && notice.group !== state.group) return false
    if (state.type !== 'all' && state.type !== 'notice' && state.type !== 'status') return false
    return matchesQuery([notice.title, notice.sourceName, notice.url])
  }).sort((a, b) => (b.dateText || '').localeCompare(a.dateText || '') || changeRank(a.changeStatus) - changeRank(b.changeStatus))
}

function filterPages(pages) {
  return pages.filter((page) => {
    if (state.group !== 'すべて') {
      const source = state.snapshot.sources.find((item) => item.id === page.sourceId)
      if (source?.group !== state.group) return false
    }
    if (state.type !== 'all' && page.role !== state.type) return false
    return matchesQuery([page.sourceName, page.label, page.url, page.title])
  })
}

function matchesQuery(values) {
  if (!state.query) return true
  return values.filter(Boolean).some((value) => String(value).toLowerCase().includes(state.query))
}

function syncFilterControls() {
  if (elements.searchInput.value !== state.query) elements.searchInput.value = state.query
  elements.segments.forEach((button) => {
    button.classList.toggle('active', button.dataset.filterType === state.type)
  })
  elements.reviewSegments.forEach((button) => {
    button.classList.toggle('active', button.dataset.filterReview === state.review)
  })
}

function loadViewState() {
  try {
    const raw = sessionStorage.getItem(VIEW_STATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > VIEW_STATE_MAX_AGE_MS) return null
    return parsed
  } catch {
    return null
  }
}

function initialMainTab(restored) {
  const fromHash = tabFromHash(location.hash)
  if (fromHash) return fromHash
  return restored?.activeTab === 'gtfs' ? 'gtfs' : 'documents'
}

function tabFromHash(hash) {
  if (['#gtfsRoutesSection', '#gtfsFeedsCard', '#gtfsTabPanel'].includes(hash)) return 'gtfs'
  if (hash === '#documentsTabPanel') return 'documents'
  return null
}

function saveViewState() {
  try {
    const tableWrap = document.querySelector('.table-wrap')
    sessionStorage.setItem(VIEW_STATE_KEY, JSON.stringify({
      activeTab: state.activeTab,
      group: state.group,
      type: state.type,
      review: state.review,
      query: state.query,
      savedAt: Date.now(),
      scroll: {
        x: window.scrollX,
        y: window.scrollY,
        tableLeft: tableWrap?.scrollLeft || 0
      }
    }))
  } catch {
    // sessionStorage が使えない環境ではブラウザ標準の挙動に任せます。
  }
}

function scheduleSaveViewState() {
  if (saveViewStateFrame) return
  saveViewStateFrame = requestAnimationFrame(() => {
    saveViewStateFrame = null
    saveViewState()
  })
}

function restoreScrollAfterRender() {
  const scroll = restoredViewState?.scroll
  pendingScrollRestore = false
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const tableWrap = document.querySelector('.table-wrap')
      if (tableWrap && Number.isFinite(scroll?.tableLeft)) {
        tableWrap.scrollLeft = scroll.tableLeft
      }
      window.scrollTo({
        left: Number.isFinite(scroll?.x) ? scroll.x : 0,
        top: Number.isFinite(scroll?.y) ? scroll.y : 0,
        behavior: 'auto'
      })
      saveViewState()
    })
  })
}

function setBusy(isBusy) {
  elements.refreshBtn.disabled = isBusy
  elements.saveBtn.disabled = isBusy
  elements.downloadBtn.disabled = isBusy
}

function setGtfsBusy(isBusy) {
  elements.gtfsCreateDraftBtn.disabled = isBusy
  elements.gtfsExportBtn.disabled = isBusy || !state.gtfs?.draft
  elements.gtfsDraftScope.disabled = isBusy
  elements.gtfsFeeds.querySelectorAll('button').forEach((button) => {
    button.disabled = isBusy
  })
  elements.gtfsRouteRows.querySelectorAll('button, input, select').forEach((control) => {
    control.disabled = isBusy
  })
  elements.gtfsWorkflow.querySelectorAll('button').forEach((button) => {
    button.disabled = isBusy
  })
  elements.codexAppServerBody?.querySelectorAll('button').forEach((button) => {
    button.disabled = isBusy
  })
}

function showError(message) {
  elements.errorBanner.textContent = message
  elements.errorBanner.classList.remove('hidden')
}

function hideError() {
  elements.errorBanner.classList.add('hidden')
  elements.errorBanner.textContent = ''
}

function statusLabel(status) {
  return { ok: 'OK', warning: '注意', error: '失敗' }[status] || status
}

function changeLabel(status) {
  return { new: '新規', changed: '変更', unchanged: '既存', unknown: '不明' }[status] || status
}

function typeLabel(type) {
  return { timetable: '時刻表', fare: '料金', status: '運航', notice: 'お知らせ', map: '地図', other: 'その他' }[type] || type
}

function gtfsStatusLabel(status) {
  return { draft: '未変換', 'needs-review': '確認中', ready: 'GTFS化済み', excluded: '除外' }[status] || status
}

function gtfsTaskLabel(action) {
  return { convert: '変換', validate: '検証', build: 'JSON生成' }[action] || action
}

function gtfsStatusOptions(currentStatus = 'draft') {
  return GTFS_ROUTE_STATUSES.map((status) => {
    const selected = status === currentStatus ? ' selected' : ''
    return `<option value="${escapeAttr(status)}"${selected}>${escapeHtml(gtfsStatusLabel(status))}</option>`
  }).join('')
}

function gtfsRouteTypeOptions(currentType = '3') {
  return GTFS_ROUTE_TYPES.map((type) => {
    const selected = type.value === String(currentType) ? ' selected' : ''
    return `<option value="${escapeAttr(type.value)}"${selected}>${escapeHtml(type.label)}</option>`
  }).join('')
}

function renderGtfsWarnings(draft) {
  const warnings = draft.validation.warnings || []
  if (!warnings.length) return ''
  return `<ul class="gtfs-warning-list">
    ${warnings.slice(0, 3).map((warning) => `<li>${escapeHtml(warning.message || warning.code)}</li>`).join('')}
  </ul>`
}

function showGtfsTaskLog(message) {
  elements.gtfsTaskLog.textContent = message
  elements.gtfsTaskLog.classList.remove('hidden')
}

function formatCodexJobLog(job) {
  if (!job) return 'Codex App Serverジョブを作成しました'
  return [
    'Codex App Serverジョブを作成しました',
    `ID: ${job.id}`,
    `route_id: ${job.routeId}`,
    `状態: ${codexJobStatusLabel(job.status)}`,
    `送信: ${job.delivery?.message || codexDeliveryLabel(job.delivery?.status)}`,
    'プロンプトは Codex App Server パネルから表示・コピーできます。'
  ].filter(Boolean).join('\n')
}

function documentViewerUrl(document) {
  const params = new URLSearchParams({
    url: document.url,
    title: document.title || document.url,
    source: document.sourceName || '',
    page: document.pageLabel || ''
  })
  return `/viewer.html?${params.toString()}`
}

function gtfsViewerUrl(input) {
  const params = new URLSearchParams({ source: input.source || 'current' })
  if (input.mode) params.set('mode', input.mode)
  if (input.id) params.set('id', input.id)
  if (input.exportId) params.set('exportId', input.exportId)
  if (input.routeId) params.set('routeId', input.routeId)
  if (input.tab) params.set('tab', input.tab)
  return `/gtfs-viewer.html?${params.toString()}`
}

function routeActionButtons(route, draft) {
  if (route.status === 'excluded') {
    return '<span class="preview-muted">除外</span>'
  }
  return [
    routePreviewLink(route, draft),
    `<button class="mini-button" type="button" data-codex-gtfs-route="true">${route.status === 'ready' ? 'Codexで再生成' : 'CodexでGTFS化'}</button>`
  ].filter(Boolean).join('')
}

function routePreviewLink(route, draft) {
  if (route.status !== 'ready') return ''
  const latestExport = draft?.exports?.[0]?.exportId
  const href = gtfsViewerUrl(latestExport
    ? { source: 'export', exportId: latestExport, routeId: route.route_id, tab: 'routes' }
    : { source: 'draft', routeId: route.route_id, tab: 'routes' })
  const title = latestExport ? '直近出力GTFSでプレビュー' : '下書きGTFSでプレビュー'
  return `<a class="mini-button" href="${escapeAttr(href)}" title="${escapeAttr(title)}">プレビュー</a>`
}

function typeOptions(document) {
  const detectedType = normalizeDocumentType(document.detectedType || document.type)
  const currentType = document.manualType || 'auto'
  const options = [
    { value: 'auto', label: `自動: ${typeLabel(detectedType)}` },
    ...DOCUMENT_TYPES.map((type) => ({ value: type, label: typeLabel(type) }))
  ]
  return options.map((option) => {
    const selected = option.value === currentType ? ' selected' : ''
    return `<option value="${escapeAttr(option.value)}"${selected}>${escapeHtml(option.label)}</option>`
  }).join('')
}

function typeSelectTitle(document) {
  const detectedType = normalizeDocumentType(document.detectedType || document.type)
  return document.manualType ? `自動判定: ${typeLabel(detectedType)}` : '自動判定を使用中'
}

function reviewLabel(status) {
  return { unreviewed: '未レビュー', unnecessary: '不要', required: '必要' }[status] || '未レビュー'
}

function reflectionLabel(status) {
  return {
    undecided: '未判定',
    'not-needed': '対象外',
    'needs-reflection': '要反映',
    reflected: '反映済み'
  }[status] || '未判定'
}

function documentReflectionState(document) {
  const draftRoutes = state.gtfs?.draft?.routes
  if (!draftRoutes) {
    return {
      reflectionStatus: document.reflectionStatus || 'undecided',
      reflectionReason: document.reflectionReason || 'GTFS下書き未読込のため判定できません',
      reflectionRouteIds: document.reflectionRouteIds || []
    }
  }
  const routes = draftRoutes.filter((route) => route.source_document_url === document.url)
  const routeIds = routes.map((route) => route.route_id).filter(Boolean)
  if ((document.reviewStatus || 'unreviewed') === 'unnecessary') {
    return {
      reflectionStatus: 'not-needed',
      reflectionReason: 'レビューで不要に設定されています',
      reflectionRouteIds: routeIds
    }
  }
  if ((document.reviewStatus || 'unreviewed') !== 'required') {
    return {
      reflectionStatus: 'undecided',
      reflectionReason: 'レビューで必要判定されていません',
      reflectionRouteIds: routeIds
    }
  }
  if (routes.some((route) => route.status === 'ready')) {
    return {
      reflectionStatus: 'reflected',
      reflectionReason: 'GTFS route候補がGTFS化済みです',
      reflectionRouteIds: routeIds
    }
  }
  return {
    reflectionStatus: 'needs-reflection',
    reflectionReason: routeIds.length
      ? '必要資料ですがGTFS化済みrouteがありません'
      : '必要資料ですがGTFS下書きrouteがありません',
    reflectionRouteIds: routeIds
  }
}

function computeReflectionSummary(documents) {
  const counts = createReflectionCount()
  for (const document of documents || []) {
    const reflection = documentReflectionState(document)
    addReflectionCount(counts, reflection.reflectionStatus)
  }
  return counts
}

function sourceReflectionCounts(source) {
  if (state.gtfs?.draft?.routes) {
    return computeReflectionSummary(source.documents || [])
  }
  return normalizeReflectionCount(source.reflectionCounts)
}

function normalizeReflectionCount(counts) {
  return {
    total: counts?.total || 0,
    undecided: counts?.undecided || 0,
    notNeeded: counts?.['not-needed'] || counts?.notNeeded || 0,
    needsReflection: counts?.['needs-reflection'] || counts?.needsReflection || 0,
    reflected: counts?.reflected || 0,
    'not-needed': counts?.['not-needed'] || counts?.notNeeded || 0,
    'needs-reflection': counts?.['needs-reflection'] || counts?.needsReflection || 0
  }
}

function addReflectionCount(counts, status) {
  counts.total += 1
  counts[status] = (counts[status] || 0) + 1
  if (status === 'not-needed') counts.notNeeded += 1
  if (status === 'needs-reflection') counts.needsReflection += 1
}

function codexTransportLabel(transport) {
  return {
    'local-queue': 'ローカルキュー',
    websocket: 'WebSocket送信',
    http: 'HTTP送信',
    stdio: 'stdio手動',
    unix: 'unix手動',
    invalid: 'URL不正'
  }[transport] || transport || '不明'
}

function codexJobStatusLabel(status) {
  return {
    queued: '未送信',
    sent: '送信済み',
    running: '実行中',
    completed: '完了',
    failed: '送信失敗',
    cancelled: '取消'
  }[status] || status || '不明'
}

function codexDeliveryLabel(status) {
  return {
    not_sent: '未送信',
    not_configured: '送信先未設定',
    unsupported_transport: '手動送信',
    queued: '送信待ち',
    sent: '送信済み',
    failed: '送信失敗'
  }[status] || status || '未送信'
}

function codexJobBadgeClass(status) {
  return {
    queued: 'unknown',
    sent: 'ok',
    running: 'warning',
    completed: 'ok',
    failed: 'error',
    cancelled: 'unknown'
  }[status] || 'unknown'
}

function reviewOptions(currentStatus = 'unreviewed') {
  return ['unreviewed', 'unnecessary', 'required'].map((status) => {
    const selected = status === currentStatus ? ' selected' : ''
    return `<option value="${status}"${selected}>${reviewLabel(status)}</option>`
  }).join('')
}

function createReviewCount() {
  return {
    total: 0,
    unreviewed: 0,
    unnecessary: 0,
    required: 0
  }
}

function createReflectionCount() {
  return {
    total: 0,
    undecided: 0,
    'not-needed': 0,
    'needs-reflection': 0,
    notNeeded: 0,
    needsReflection: 0,
    reflected: 0
  }
}

function createDocumentTypeCount() {
  return {
    documents: 0,
    timetable: 0,
    fare: 0,
    status: 0,
    notice: 0,
    map: 0,
    other: 0
  }
}

function normalizeDocumentType(type) {
  return DOCUMENT_TYPES.includes(type) ? type : 'other'
}

function changeRank(status) {
  return { changed: 0, new: 1, unknown: 2, unchanged: 3 }[status] ?? 4
}

function statusRank(status) {
  return { error: 0, warning: 1, ok: 2 }[status] ?? 3
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

function formatGtfsDate(value) {
  const raw = String(value || '')
  if (!/^\d{8}$/.test(raw)) return '-'
  return `${raw.slice(0, 4)}/${raw.slice(4, 6)}/${raw.slice(6, 8)}`
}

function gtfsDateToInput(value) {
  const raw = String(value || '')
  if (!/^\d{8}$/.test(raw)) return ''
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '-'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char])
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;')
}
