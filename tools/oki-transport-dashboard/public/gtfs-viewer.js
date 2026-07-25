const TABLE_RENDER_LIMIT = 500
const ROUTE_TYPE_LABELS = {
  0: '路面電車',
  1: '地下鉄',
  2: '鉄道',
  3: 'バス',
  4: '船舶',
  5: 'ケーブルカー',
  6: 'ロープウェイ',
  7: '鋼索鉄道',
  11: 'トロリーバス',
  12: 'モノレール'
}

const state = {
  view: null,
  tab: 'routes',
  query: '',
  rawTable: 'routes',
  focusRouteId: ''
}

const elements = {
  title: document.querySelector('#viewerTitle'),
  subtitle: document.querySelector('#viewerSubtitle'),
  downloadLink: document.querySelector('#viewerDownloadLink'),
  error: document.querySelector('#viewerError'),
  metricRoutes: document.querySelector('#metricRoutes'),
  metricRouteSub: document.querySelector('#metricRouteSub'),
  metricStops: document.querySelector('#metricStops'),
  metricStopSub: document.querySelector('#metricStopSub'),
  metricTrips: document.querySelector('#metricTrips'),
  metricTripSub: document.querySelector('#metricTripSub'),
  metricServices: document.querySelector('#metricServices'),
  metricFeedSub: document.querySelector('#metricFeedSub'),
  search: document.querySelector('#viewerSearch'),
  tabs: document.querySelectorAll('[data-view-tab]'),
  rawTableControl: document.querySelector('.raw-table-control'),
  rawTableSelect: document.querySelector('#rawTableSelect'),
  routePreviewPanel: document.querySelector('#routePreviewPanel'),
  sectionTitle: document.querySelector('#viewerSectionTitle'),
  sectionMeta: document.querySelector('#viewerSectionMeta'),
  table: document.querySelector('#viewerTable'),
  tableHead: document.querySelector('#viewerTableHead'),
  tableBody: document.querySelector('#viewerTableBody')
}

elements.search.addEventListener('input', (event) => {
  state.query = event.target.value.trim().toLowerCase()
  renderTable()
})

elements.tabs.forEach((button) => {
  button.addEventListener('click', () => {
    state.tab = button.dataset.viewTab
    elements.tabs.forEach((item) => item.classList.toggle('active', item === button))
    renderTable()
  })
})

elements.rawTableSelect.addEventListener('change', () => {
  state.rawTable = elements.rawTableSelect.value
  renderTable()
})

load()

async function load() {
  hideError()
  try {
    const params = new URLSearchParams(location.search)
    if (!params.get('source')) params.set('source', 'current')
    state.tab = normalizeTab(params.get('tab') || state.tab)
    state.focusRouteId = String(params.get('routeId') || '').trim()
    state.query = state.focusRouteId
    elements.search.value = state.query
    elements.tabs.forEach((item) => item.classList.toggle('active', item.dataset.viewTab === state.tab))
    const response = await fetch(`/api/gtfs/view?${params.toString()}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    state.view = await response.json()
    state.rawTable = state.view.tables.routes ? 'routes' : Object.keys(state.view.tables)[0]
    render()
  } catch (error) {
    showError(error.message)
  }
}

function render() {
  const view = state.view
  if (!view) return
  document.title = `${view.title} - GTFSビューア`
  elements.title.textContent = view.title
  elements.subtitle.textContent = view.subtitle || sourceLabel(view.source)
  renderDownloadLink(view)
  renderSummary(view)
  renderRawTableOptions(view)
  renderFocusedRoute(view)
  renderTable()
}

function renderSummary(view) {
  const summary = view.summary || {}
  elements.metricRoutes.textContent = formatNumber(summary.routeCount)
  elements.metricRouteSub.textContent = `${formatNumber(summary.agencyCount)} agency`
  elements.metricStops.textContent = formatNumber(summary.stopCount)
  elements.metricStopSub.textContent = `${formatNumber(summary.stopTimeCount)} stop_times`
  elements.metricTrips.textContent = formatNumber(summary.tripCount)
  elements.metricTripSub.textContent = `${formatNumber(summary.serviceCount)} service`
  elements.metricServices.textContent = summary.feedVersion || '-'
  elements.metricFeedSub.textContent = `${formatGtfsDate(summary.feedStartDate)} - ${formatGtfsDate(summary.feedEndDate)}`
}

function renderDownloadLink(view) {
  const href = view.meta?.exports?.[0]?.href || (view.source === 'export' && view.meta?.exportId
    ? `/api/gtfs/artifacts/${encodeURIComponent(view.meta.exportId)}/gtfs.zip`
    : null)
  elements.downloadLink.classList.toggle('hidden', !href)
  if (href) elements.downloadLink.href = href
}

function renderRawTableOptions(view) {
  elements.rawTableSelect.innerHTML = Object.values(view.tables).map((table) => {
    const selected = table.key === state.rawTable ? ' selected' : ''
    return `<option value="${escapeAttr(table.key)}"${selected}>${escapeHtml(table.fileName)} (${table.rowCount})</option>`
  }).join('')
}

function renderTable() {
  const view = state.view
  if (!view) return
  elements.rawTableControl.classList.toggle('hidden', state.tab !== 'tables')
  if (state.tab === 'routes') {
    renderRows({
      title: 'Routes',
      rows: view.routeStats || [],
      headers: ['route', 'type', 'trips', 'stops', 'time', 'service', 'sample'],
      rowRenderer: routeRow
    })
    return
  }
  if (state.tab === 'stops') {
    renderRows({
      title: 'Stops',
      rows: view.stopStats || [],
      headers: ['stop', 'location', 'routes', 'trips', 'route names'],
      rowRenderer: stopRow
    })
    return
  }
  if (state.tab === 'trips') {
    renderRows({
      title: 'Trips',
      rows: view.tripStats || [],
      headers: ['trip', 'route', 'service', 'headsign', 'time', 'stops'],
      rowRenderer: tripRow
    })
    return
  }
  const table = view.tables[state.rawTable] || view.tables.routes
  renderRows({
    title: table.fileName,
    rows: table.rows || [],
    headers: table.headers || [],
    rowRenderer: (row, headers) => headers.map((header) => `<td>${escapeHtml(row[header] || '')}</td>`).join(''),
    rowCount: table.rowCount,
    truncated: table.truncated
  })
}

function renderFocusedRoute(view) {
  const routeId = state.focusRouteId
  const route = routeId ? (view.routeStats || []).find((item) => item.route_id === routeId) : null
  elements.routePreviewPanel.classList.toggle('hidden', !route)
  if (!route) {
    elements.routePreviewPanel.innerHTML = ''
    return
  }
  const name = route.route_short_name || route.route_long_name || route.route_id
  const sampleStops = route.sampleStops?.length
    ? `${route.sampleStops.join(' → ')}${route.sampleStopOverflow ? ` +${route.sampleStopOverflow}` : ''}`
    : '停留所データなし'
  elements.routePreviewPanel.innerHTML = `
    <div>
      <p class="eyeline">route preview</p>
      <h2>${escapeHtml(name)}</h2>
      <div class="item-meta">
        <span>${escapeHtml(route.route_id)}</span>
        <span>${escapeHtml(route.route_desc || '')}</span>
      </div>
    </div>
    <div class="route-preview-stats">
      <div><strong>${formatNumber(route.tripCount)}</strong><span>trips</span></div>
      <div><strong>${formatNumber(route.stopCount)}</strong><span>stops</span></div>
      <div><strong>${escapeHtml(formatTimeRange(route.firstTime, route.lastTime))}</strong><span>time</span></div>
      <div><strong>${escapeHtml(route.route_type)}</strong><span>${escapeHtml(ROUTE_TYPE_LABELS[route.route_type] || 'route_type')}</span></div>
    </div>
    <div class="route-preview-path">${escapeHtml(sampleStops)}</div>
    <div class="button-row">
      ${route.route_url ? `<a class="mini-button" href="${escapeAttr(route.route_url)}" target="_blank" rel="noreferrer">資料を開く</a>` : ''}
      <button id="clearRouteFocusBtn" class="mini-button" type="button">絞り込み解除</button>
    </div>
  `
  document.querySelector('#clearRouteFocusBtn')?.addEventListener('click', () => {
    state.focusRouteId = ''
    state.query = ''
    elements.search.value = ''
    history.replaceState(null, '', removeRouteIdFromLocation())
    render()
  })
}

function renderRows({ title, rows, headers, rowRenderer, rowCount = rows.length, truncated = false }) {
  const filtered = filterRows(rows)
  const visible = filtered.slice(0, TABLE_RENDER_LIMIT)
  elements.sectionTitle.textContent = title
  elements.sectionMeta.textContent = `${formatNumber(filtered.length)} / ${formatNumber(rowCount)}件${truncated ? ' / API上限あり' : ''}${filtered.length > TABLE_RENDER_LIMIT ? ` / 表示 ${TABLE_RENDER_LIMIT}件` : ''}`
  elements.tableHead.innerHTML = `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>`
  elements.tableBody.innerHTML = visible.length
    ? visible.map((row) => `<tr>${rowRenderer(row, headers)}</tr>`).join('')
    : `<tr><td colspan="${headers.length}" class="empty">該当するGTFSレコードはありません</td></tr>`
}

function routeRow(route) {
  const name = route.route_short_name || route.route_long_name || route.route_id
  const sampleStops = route.sampleStops?.length
    ? `${route.sampleStops.join(' → ')}${route.sampleStopOverflow ? ` +${route.sampleStopOverflow}` : ''}`
    : '-'
  return `
    <td><strong>${escapeHtml(name)}</strong><div class="item-meta">${escapeHtml(route.route_id)}</div></td>
    <td><span class="type-pill">${escapeHtml(route.route_type)} ${escapeHtml(ROUTE_TYPE_LABELS[route.route_type] || '')}</span></td>
    <td>${formatNumber(route.tripCount)}</td>
    <td>${formatNumber(route.stopCount)}</td>
    <td>${escapeHtml(formatTimeRange(route.firstTime, route.lastTime))}</td>
    <td>${escapeHtml((route.serviceIds || []).join(', ') || '-')}</td>
    <td>${escapeHtml(sampleStops)}</td>
  `
}

function stopRow(stop) {
  const location = [stop.stop_lat, stop.stop_lon].filter(Boolean).join(', ') || '-'
  return `
    <td><strong>${escapeHtml(stop.stop_name || stop.stop_id)}</strong><div class="item-meta">${escapeHtml(stop.stop_id)}</div></td>
    <td>${escapeHtml(location)}</td>
    <td>${formatNumber(stop.routeCount)}</td>
    <td>${formatNumber(stop.tripCount)}</td>
    <td>${escapeHtml((stop.routeNames || []).join(', ') || '-')}</td>
  `
}

function tripRow(trip) {
  return `
    <td><strong>${escapeHtml(trip.trip_id)}</strong><div class="item-meta">${escapeHtml(trip.route_id)}</div></td>
    <td>${escapeHtml(trip.routeName || '-')}</td>
    <td>${escapeHtml(trip.service_id || '-')}</td>
    <td>${escapeHtml(trip.trip_headsign || '-')}</td>
    <td>${escapeHtml(formatTimeRange(trip.firstTime, trip.lastTime))}</td>
    <td>${escapeHtml(`${trip.firstStopName || '-'} → ${trip.lastStopName || '-'} (${trip.stopCount})`)}</td>
  `
}

function filterRows(rows) {
  if (!state.query) return rows
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(state.query))
}

function normalizeTab(tab) {
  return ['routes', 'stops', 'trips', 'tables'].includes(tab) ? tab : 'routes'
}

function removeRouteIdFromLocation() {
  const params = new URLSearchParams(location.search)
  params.delete('routeId')
  return `${location.pathname}?${params.toString()}`
}

function sourceLabel(source) {
  return { current: '採用中GTFS', draft: 'GTFS下書き', export: 'GTFS出力' }[source] || source
}

function formatTimeRange(start, end) {
  if (!start && !end) return '-'
  if (start && end) return `${start} - ${end}`
  return start || end
}

function formatGtfsDate(value) {
  const raw = String(value || '')
  if (!/^\d{8}$/.test(raw)) return '-'
  return `${raw.slice(0, 4)}/${raw.slice(4, 6)}/${raw.slice(6, 8)}`
}

function formatNumber(value) {
  return new Intl.NumberFormat('ja-JP').format(Number(value) || 0)
}

function showError(message) {
  elements.error.textContent = message
  elements.error.classList.remove('hidden')
}

function hideError() {
  elements.error.textContent = ''
  elements.error.classList.add('hidden')
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
