const REFLECTION_STATUSES = new Set(['undecided', 'not-needed', 'needs-reflection', 'reflected'])

export function attachReflectionState(snapshot, gtfsDraft) {
  if (!snapshot) return snapshot
  const routeStatusByDocumentUrl = buildRouteStatusByDocumentUrl(gtfsDraft?.routes || [])
  const documents = (snapshot.documents || []).map((document) => {
    const reflection = resolveDocumentReflection(document, routeStatusByDocumentUrl.get(document.url))
    return {
      ...document,
      reflectionStatus: reflection.status,
      reflectionReason: reflection.reason,
      reflectionRouteIds: reflection.routeIds
    }
  })
  const reflectionSummary = summarizeReflectionStatuses(documents)
  const documentByUrl = new Map(documents.map((document) => [document.url, document]))
  const sourceReflectionCounts = new Map()
  for (const document of documents) {
    const current = sourceReflectionCounts.get(document.sourceId) || createReflectionCount()
    current.total += 1
    current[document.reflectionStatus] += 1
    sourceReflectionCounts.set(document.sourceId, current)
  }

  return {
    ...snapshot,
    reflectionSummary,
    documents,
    sources: (snapshot.sources || []).map((source) => ({
      ...source,
      documents: (source.documents || []).map((document) => documentByUrl.get(document.url) || {
        ...document,
        reflectionStatus: 'undecided',
        reflectionReason: '資料一覧にないため判定できません',
        reflectionRouteIds: []
      }),
      reflectionCounts: sourceReflectionCounts.get(source.id) || createReflectionCount()
    }))
  }
}

export function summarizeReflectionStatuses(documents) {
  const summary = createReflectionCount()
  for (const document of documents || []) {
    const status = REFLECTION_STATUSES.has(document.reflectionStatus) ? document.reflectionStatus : 'undecided'
    summary[status] += 1
  }
  summary.total = (documents || []).length
  return summary
}

function buildRouteStatusByDocumentUrl(routes) {
  const map = new Map()
  for (const route of routes || []) {
    const url = route.source_document_url
    if (!url) continue
    const current = map.get(url) || { routeIds: [], statuses: [] }
    current.routeIds.push(route.route_id)
    current.statuses.push(route.status || 'draft')
    map.set(url, current)
  }
  return map
}

function resolveDocumentReflection(document, routeState) {
  const reviewStatus = document.reviewStatus || 'unreviewed'
  const routeIds = routeState?.routeIds || []
  const statuses = routeState?.statuses || []

  if (reviewStatus === 'unnecessary') {
    return {
      status: 'not-needed',
      reason: 'レビューで不要に設定されています',
      routeIds
    }
  }
  if (reviewStatus !== 'required') {
    return {
      status: 'undecided',
      reason: 'レビューで必要判定されていません',
      routeIds
    }
  }
  if (statuses.includes('ready')) {
    return {
      status: 'reflected',
      reason: 'GTFS route候補がGTFS化済みです',
      routeIds
    }
  }
  return {
    status: 'needs-reflection',
    reason: routeIds.length
      ? '必要資料ですがGTFS化済みrouteがありません'
      : '必要資料ですがGTFS下書きrouteがありません',
    routeIds
  }
}

function createReflectionCount() {
  return {
    total: 0,
    undecided: 0,
    'not-needed': 0,
    'needs-reflection': 0,
    reflected: 0
  }
}
