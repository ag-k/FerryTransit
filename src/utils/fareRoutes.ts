export type RouteMetadata = {
  departure: string
  arrival: string
}

type RouteRegistry = Record<string, RouteMetadata>
type AliasRegistry = Record<string, string>

const routeMetadata: RouteRegistry = {}
const routeAlias: AliasRegistry = {}

const registerRoute = (
  ids: string | string[],
  departure: string,
  arrival: string
) => {
  const list = Array.isArray(ids) ? ids : [ids]
  if (!list.length) return

  const canonical = list[0].toLowerCase()
  routeMetadata[canonical] = { departure, arrival }

  list.forEach((id) => {
    routeAlias[id.toLowerCase()] = canonical
  })
}

registerRoute(['hondo_shichirui-saigo', 'hondo-saigo'], 'HONDO_SHICHIRUI', 'SAIGO')
registerRoute(['saigo-hondo_shichirui', 'saigo-hondo'], 'SAIGO', 'HONDO_SHICHIRUI')
registerRoute(['hondo_sakaiminato-saigo', 'hondo-sakaiminato-saigo'], 'HONDO_SAKAIMINATO', 'SAIGO')
registerRoute(['saigo-hondo_sakaiminato', 'saigo-hondo-sakaiminato'], 'SAIGO', 'HONDO_SAKAIMINATO')
registerRoute(['hondo_shichirui-beppu', 'hondo-beppu'], 'HONDO_SHICHIRUI', 'BEPPU')
registerRoute(['beppu-hondo_shichirui', 'beppu-hondo'], 'BEPPU', 'HONDO_SHICHIRUI')
registerRoute(['hondo_sakaiminato-beppu'], 'HONDO_SAKAIMINATO', 'BEPPU')
registerRoute(['beppu-hondo_sakaiminato'], 'BEPPU', 'HONDO_SAKAIMINATO')
registerRoute(['hondo_shichirui-hishiura', 'hondo-hishiura'], 'HONDO_SHICHIRUI', 'HISHIURA')
registerRoute(['hishiura-hondo_shichirui', 'hishiura-hondo'], 'HISHIURA', 'HONDO_SHICHIRUI')
registerRoute(['hondo_sakaiminato-hishiura'], 'HONDO_SAKAIMINATO', 'HISHIURA')
registerRoute(['hishiura-hondo_sakaiminato'], 'HISHIURA', 'HONDO_SAKAIMINATO')
registerRoute(['hondo_shichirui-kuri', 'hondo-kuri'], 'HONDO_SHICHIRUI', 'KURI')
registerRoute(['kuri-hondo_shichirui', 'kuri-hondo'], 'KURI', 'HONDO_SHICHIRUI')
registerRoute(['hondo_sakaiminato-kuri'], 'HONDO_SAKAIMINATO', 'KURI')
registerRoute(['kuri-hondo_sakaiminato'], 'KURI', 'HONDO_SAKAIMINATO')
registerRoute(['saigo-beppu'], 'SAIGO', 'BEPPU')
registerRoute(['beppu-saigo'], 'BEPPU', 'SAIGO')
registerRoute(['saigo-hishiura'], 'SAIGO', 'HISHIURA')
registerRoute(['hishiura-saigo'], 'HISHIURA', 'SAIGO')
registerRoute(['saigo-kuri'], 'SAIGO', 'KURI')
registerRoute(['kuri-saigo'], 'KURI', 'SAIGO')
registerRoute(['beppu-hishiura'], 'BEPPU', 'HISHIURA')
registerRoute(['hishiura-beppu'], 'HISHIURA', 'BEPPU')
registerRoute(['beppu-kuri'], 'BEPPU', 'KURI')
registerRoute(['kuri-beppu'], 'KURI', 'BEPPU')
registerRoute(['hishiura-kuri'], 'HISHIURA', 'KURI')
registerRoute(['kuri-hishiura'], 'KURI', 'HISHIURA')
registerRoute(['hondo-oki'], 'HONDO_SHICHIRUI', 'SAIGO')
registerRoute(['dozen-dogo'], 'BEPPU', 'SAIGO')

export const ROUTE_METADATA: RouteRegistry = routeMetadata

export const LEGACY_ROUTE_NAME_MAP: Record<string, string> = {
  '本土七類 ⇔ 西郷': 'hondo_shichirui-saigo',
  '西郷 ⇔ 本土七類': 'saigo-hondo_shichirui',
  '本土境港 ⇔ 西郷': 'hondo_sakaiminato-saigo',
  '西郷 ⇔ 本土境港': 'saigo-hondo_sakaiminato',
  '本土七類 ⇔ 菱浦': 'hondo_shichirui-hishiura',
  '菱浦 ⇔ 本土七類': 'hishiura-hondo_shichirui',
  '本土七類 ⇔ 別府': 'hondo_shichirui-beppu',
  '別府 ⇔ 本土七類': 'beppu-hondo_shichirui',
  '本土境港 ⇔ 別府': 'hondo_sakaiminato-beppu',
  '別府 ⇔ 本土境港': 'beppu-hondo_sakaiminato',
  '菱浦 ⇔ 別府': 'hishiura-beppu',
  '別府 ⇔ 菱浦': 'beppu-hishiura',
  '菱浦 ⇔ 来居': 'hishiura-kuri',
  '来居 ⇔ 菱浦': 'kuri-hishiura',
  '来居 ⇔ 別府': 'kuri-beppu',
  '別府 ⇔ 来居': 'beppu-kuri',
  '西郷 ⇔ 別府': 'saigo-beppu',
  '別府 ⇔ 西郷': 'beppu-saigo',
  '西郷 ⇔ 菱浦': 'saigo-hishiura',
  '菱浦 ⇔ 西郷': 'hishiura-saigo',
  '西郷 ⇔ 来居': 'saigo-kuri',
  '来居 ⇔ 西郷': 'kuri-saigo'
}

export const HIGHSPEED_ROUTE_TRANSLATION_KEYS: Record<string, string> = {
  'hondo-oki': 'HONDO_OKI',
  'dozen-dogo': 'DOZEN_DOGO',
  'beppu-hishiura': 'BEPPU_HISHIURA',
  'hishiura-kuri': 'HISHIURA_KURI',
  'kuri-beppu': 'KURI_BEPPU'
}

const ROUTE_LABELS: Record<string, string> = Object.entries(LEGACY_ROUTE_NAME_MAP).reduce(
  (acc, [label, routeId]) => {
    if (!acc[routeId]) {
      acc[routeId] = label
    }
    return acc
  },
  {} as Record<string, string>
)

const normalizePortCode = (value: string): string =>
  value.replace(/-/g, '_').replace(/\s+/g, '_').toUpperCase()

const MAINLAND_PORTS = new Set(['HONDO', 'HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'])
const DOZEN_PORTS = new Set(['BEPPU', 'HISHIURA', 'KURI'])
const DOGO_PORTS = new Set(['SAIGO'])

const HIGH_SPEED_CANONICAL = new Set([
  'hondo-oki',
  'dozen-dogo',
  'beppu-hishiura',
  'hishiura-kuri',
  'kuri-beppu'
])

export const mapHighspeedPortsToCanonicalRoute = (
  departure: string,
  arrival: string
): string | null => {
  const dep = normalizePortCode(departure)
  const arr = normalizePortCode(arrival)

  if (dep === arr) {
    return null
  }

  const depMainland = MAINLAND_PORTS.has(dep)
  const arrMainland = MAINLAND_PORTS.has(arr)
  const depDozen = DOZEN_PORTS.has(dep)
  const arrDozen = DOZEN_PORTS.has(arr)
  const depDogo = DOGO_PORTS.has(dep)
  const arrDogo = DOGO_PORTS.has(arr)

  if (
    (dep === 'BEPPU' && arr === 'HISHIURA') ||
    (dep === 'HISHIURA' && arr === 'BEPPU')
  ) {
    return 'beppu-hishiura'
  }

  if (
    (dep === 'HISHIURA' && arr === 'KURI') ||
    (dep === 'KURI' && arr === 'HISHIURA')
  ) {
    return 'hishiura-kuri'
  }

  if (
    (dep === 'KURI' && arr === 'BEPPU') ||
    (dep === 'BEPPU' && arr === 'KURI')
  ) {
    return 'kuri-beppu'
  }

  if (
    (depMainland && arrDogo) ||
    (depDogo && arrMainland) ||
    (depMainland && arrDozen) ||
    (depDozen && arrMainland)
  ) {
    return 'hondo-oki'
  }

  if ((depDozen && arrDogo) || (depDogo && arrDozen)) {
    return 'dozen-dogo'
  }

  return null
}

export const mapHighspeedToCanonicalRoute = (
  routeId: string | null | undefined
): string | null => {
  if (!routeId) return null
  const lower = routeId.trim().toLowerCase()
  if (!lower) return null

  const alias = routeAlias[lower]
  if (alias && HIGH_SPEED_CANONICAL.has(alias)) {
    return alias
  }

  if (HIGH_SPEED_CANONICAL.has(lower)) {
    return lower
  }

  const metadata = ROUTE_METADATA[alias ?? lower]
  if (metadata) {
    return mapHighspeedPortsToCanonicalRoute(metadata.departure, metadata.arrival)
  }

  const [depRaw, arrRaw] = lower.split('-')
  if (depRaw && arrRaw) {
    return mapHighspeedPortsToCanonicalRoute(
      normalizePortCode(depRaw),
      normalizePortCode(arrRaw)
    )
  }

  return null
}

export const normalizeRouteId = (value?: string | null): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()

  if (routeAlias[lower]) {
    return routeAlias[lower]
  }

  if (LEGACY_ROUTE_NAME_MAP[trimmed]) {
    return LEGACY_ROUTE_NAME_MAP[trimmed]
  }

  if (LEGACY_ROUTE_NAME_MAP[lower]) {
    return LEGACY_ROUTE_NAME_MAP[lower]
  }

  const normalized = lower.replace(/\s+/g, '_')
  if (routeAlias[normalized]) {
    return routeAlias[normalized]
  }

  if (ROUTE_METADATA[normalized]) {
    return normalized
  }

  const [depRaw, arrRaw] = lower.split('-')
  if (depRaw && arrRaw) {
    const canonical = mapHighspeedPortsToCanonicalRoute(
      normalizePortCode(depRaw),
      normalizePortCode(arrRaw)
    )
    if (canonical) {
      return canonical
    }
  }

  return lower
}

export const resolveRouteLabel = (
  routeId: string | null | undefined
): string | null => {
  if (!routeId) return null
  const canonical = normalizeRouteId(routeId)
  if (!canonical) return null
  return ROUTE_LABELS[canonical] ?? null
}

export const getHighspeedRouteLabel = (
  routeId: string | null | undefined
): string | null => {
  const canonical = mapHighspeedToCanonicalRoute(routeId)
  if (!canonical) return null

  const directLabels: Record<string, string> = {
    'hondo-oki': '本土〜隠岐',
    'dozen-dogo': '島前〜島後',
    'beppu-hishiura': '別府〜菱浦',
    'hishiura-kuri': '菱浦〜来居',
    'kuri-beppu': '来居〜別府'
  }

  return directLabels[canonical] ?? canonical
}

export const resolveHighspeedRouteInfo = (
  fare: {
    route?: unknown
    routeName?: unknown
    displayName?: unknown
  }
): { routeId: string | null; label: string } => {
  const routeCandidates = [
    typeof fare.route === 'string' ? fare.route : null,
    typeof fare.routeName === 'string' ? fare.routeName : null,
    typeof fare.displayName === 'string' ? fare.displayName : null
  ]

  for (const candidate of routeCandidates) {
    if (!candidate) continue
    const normalized = normalizeRouteId(candidate)
    if (normalized) {
      const canonical = mapHighspeedToCanonicalRoute(normalized)
      if (canonical) {
        const label = getHighspeedRouteLabel(canonical) ?? canonical
        return { routeId: canonical, label }
      }
    }
  }

  const fallback = typeof fare.route === 'string' ? fare.route : null
  const canonical = fallback ? mapHighspeedToCanonicalRoute(fallback) : null
  const label = fallback ?? '不明な路線'
  return {
    routeId: canonical,
    label
  }
}

export const getRouteMetadata = (
  routeId: string | null | undefined
): RouteMetadata | null => {
  if (!routeId) return null
  const canonical = normalizeRouteId(routeId)
  if (!canonical) return null
  return ROUTE_METADATA[canonical] ?? null
}
