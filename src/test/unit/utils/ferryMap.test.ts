import { describe, expect, it } from 'vitest'
import {
  expandMainlandPortId,
  findMatchingRouteForSegment,
  findRoutesForSelection,
  getFerryRouteStyle,
  getPortLabelVariant
} from '@/utils/ferryMap'
import type { RouteData } from '@/types/route'

const makeRoute = (overrides: Partial<RouteData>): RouteData => ({
  id: overrides.id || 'route-1',
  from: overrides.from || 'HONDO_SHICHIRUI',
  to: overrides.to || 'SAIGO',
  fromName: overrides.fromName || '七類港',
  toName: overrides.toName || '西郷港',
  path: overrides.path || [
    { lat: 35.5714, lng: 133.2298 },
    { lat: 36.2035, lng: 133.3351 }
  ],
  distance: overrides.distance,
  duration: overrides.duration,
  source: overrides.source || 'overpass_osm',
  geodesic: overrides.geodesic ?? true,
  createdAt: overrides.createdAt || '2026-03-30T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-03-30T00:00:00.000Z'
})

describe('ferryMap utilities', () => {
  it('HONDO を本土2港へ展開する', () => {
    expect(expandMainlandPortId('HONDO')).toEqual(['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'])
    expect(expandMainlandPortId('SAIGO')).toEqual(['SAIGO'])
  })

  it('選択ルートに一致する複数の本土航路を返す', () => {
    const routes = [
      makeRoute({ id: 'shichirui', from: 'HONDO_SHICHIRUI', to: 'SAIGO' }),
      makeRoute({ id: 'sakaiminato', from: 'HONDO_SAKAIMINATO', to: 'SAIGO' }),
      makeRoute({ id: 'ignored', from: 'SAIGO', to: 'HISHIURA' })
    ]

    expect(findRoutesForSelection(routes, { from: 'HONDO', to: 'SAIGO' }).map(route => route.id)).toEqual([
      'shichirui',
      'sakaiminato'
    ])
  })

  it('逆向きに保存された航路でもセグメントに一致させる', () => {
    const routes = [
      makeRoute({
        id: 'reverse',
        from: 'SAIGO',
        to: 'HONDO_SHICHIRUI',
        path: [
          { lat: 36.2035, lng: 133.3351 },
          { lat: 35.5714, lng: 133.2298 }
        ]
      })
    ]

    const matched = findMatchingRouteForSegment(routes, { from: 'HONDO', to: 'SAIGO' })

    expect(matched?.route.id).toBe('reverse')
    expect(matched?.reversed).toBe(true)
    expect(matched?.path[0]).toEqual({ lat: 35.5714, lng: 133.2298 })
    expect(matched?.path.at(-1)).toEqual({ lat: 36.2035, lng: 133.3351 })
  })

  it('ソースごとに Leaflet 用スタイルを返す', () => {
    expect(getFerryRouteStyle('overpass_osm')).toMatchObject({
      color: '#2563EB',
      weight: 4
    })
    expect(getFerryRouteStyle('google_driving')).toMatchObject({
      color: '#FF8C00',
      dashArray: '10 6'
    })
  })

  it('港バッジ文言をラベルの見た目バリアントに変換する', () => {
    expect(getPortLabelVariant('海士町')).toBe('ama')
    expect(getPortLabelVariant('Sakaiminato')).toBe('mainland')
    expect(getPortLabelVariant('')).toBe('default')
  })
})
