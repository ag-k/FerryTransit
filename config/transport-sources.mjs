export const TRANSPORT_SOURCE_OPERATIONS = Object.freeze({
  'oki-kisen': Object.freeze({ id: 'oki-kisen', sourceType: 'web', officialUrl: 'https://www.oki-kisen.co.jp/' }),
  'oki-kanko': Object.freeze({ id: 'oki-kanko', sourceType: 'web', officialUrl: 'https://www.okikankou.com/' }),
  'oki-ichibata': Object.freeze({ id: 'oki-ichibata', sourceType: 'web', officialUrl: 'https://oki.ichibata.co.jp/' }),
  'okinoshima-town': Object.freeze({
    id: 'okinoshima-town', sourceType: 'gtfs', officialUrl: 'https://www.town.okinoshima.shimane.jp/',
    sourceUrl: 'https://www.town.okinoshima.shimane.jp/kanko/tounaikoutuujouhou/7990.html',
    feedId: 'okinoshima', conversionTask: 'npm run gtfs:convert:okinoshima:2026', conversionArgs: ['--current']
  }),
  'ama-town': Object.freeze({
    id: 'ama-town', sourceType: 'gtfs', officialUrl: 'https://www.town.ama.shimane.jp/',
    sourceUrl: 'https://www.town.ama.shimane.jp/about/access',
    feedId: 'ama', conversionTask: 'npm run gtfs:convert:ama:r8', conversionArgs: ['--current']
  }),
  'nishinoshima-town': Object.freeze({
    id: 'nishinoshima-town', sourceType: 'gtfs', officialUrl: 'https://www.town.nishinoshima.shimane.jp/',
    sourceUrl: 'https://www.town.nishinoshima.shimane.jp/bunya/b_kurashi/b_kotsu/47',
    feedId: 'nishinoshima', conversionTask: 'npm run gtfs:convert:nishinoshima:2026', conversionArgs: ['--current']
  }),
  'chibu-village': Object.freeze({
    id: 'chibu-village', sourceType: 'gtfs', officialUrl: 'http://www.chibu.jp/',
    sourceUrl: 'http://www.chibu.jp/access.html',
    feedId: 'chibu', conversionTask: 'npm run gtfs:convert:chibu:2023', conversionArgs: ['--current']
  }),
  'oki-kouiki-bus': Object.freeze({ id: 'oki-kouiki-bus', sourceType: 'web', officialUrl: 'https://okikouiki.jp/' }),
  'jal-oki-flights': Object.freeze({
    id: 'jal-oki-flights', sourceType: 'timetable', officialUrl: 'https://www.jal.co.jp/jp/ja/dom/route/time/',
    timetableUrl: 'https://www.jal.co.jp/jp/ja/dom/route/time/timeTable.html',
    acquisitionTask: 'npm run timetable:fetch:jal', buildTask: 'npm run timetable:build'
  }),
  'ichibata-bus-connection': Object.freeze({
    id: 'ichibata-bus-connection', sourceType: 'gtfs', officialUrl: 'https://bus.ichibata.co.jp/oki-kisen/oki-kisen-sichirui/',
    sourceUrl: 'https://bus.ichibata.co.jp/media/oki_2026_dia.pdf',
    feedId: 'ichibata_bus_connection', conversionTask: 'npm run gtfs:convert:ichibata:2026', conversionArgs: ['--current']
  })
})

export function getTransportSourceOperation(sourceId) {
  const source = TRANSPORT_SOURCE_OPERATIONS[sourceId]
  if (!source) throw new Error(`未登録の交通ソースです: ${sourceId}`)
  return source
}

export function enrichTransportSources(sources) {
  const sourceIds = new Set(sources.map(source => source.id))
  for (const sourceId of Object.keys(TRANSPORT_SOURCE_OPERATIONS)) {
    if (!sourceIds.has(sourceId)) throw new Error(`ダッシュボードに交通ソースがありません: ${sourceId}`)
  }
  return sources.map(source => Object.freeze({
    ...source,
    ...getTransportSourceOperation(source.id),
    taskIds: Object.freeze(
      ['gtfs', 'timetable'].includes(getTransportSourceOperation(source.id).sourceType)
        ? ['acquire', 'validate', 'build']
        : []
    ),
    pages: Object.freeze(source.pages.map(page => Object.freeze(page)))
  }))
}
