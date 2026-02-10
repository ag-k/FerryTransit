// フェリー航路の詳細経路データ
export interface RoutePoint {
  lat: number
  lng: number
}

export interface DetailedRoute {
  from: string
  to: string
  waypoints: RoutePoint[]  // 中間点の配列
}

// 実際のフェリールートに基づいた中間点を含む航路データ
export const FERRY_ROUTE_PATHS: DetailedRoute[] = [
  // 七類港 → 西郷港（本土から島後へ）
  {
    from: 'HONDO_SHICHIRUI',
    to: 'SAIGO',
    waypoints: [
      { lat: 35.5714, lng: 133.2298 },  // 七類港（出発）
      { lat: 35.65, lng: 133.28 },      // 北上
      { lat: 35.75, lng: 133.35 },      // 北東へ
      { lat: 35.85, lng: 133.42 },      // さらに北東
      { lat: 35.95, lng: 133.45 },      // 北東
      { lat: 36.05, lng: 133.43 },      // 東へ
      { lat: 36.12, lng: 133.40 },      // 南東へ
      { lat: 36.2035, lng: 133.3351 }   // 西郷港（到着）
    ]
  },
  
  // 七類港 → 菱浦港（本土から島前へ）
  {
    from: 'HONDO_SHICHIRUI',
    to: 'HISHIURA',
    waypoints: [
      { lat: 35.5714, lng: 133.2298 },  // 七類港（出発）
      { lat: 35.62, lng: 133.20 },      // 北西へ
      { lat: 35.70, lng: 133.15 },      // 北西
      { lat: 35.80, lng: 133.10 },      // 北
      { lat: 35.90, lng: 133.08 },      // 北
      { lat: 36.00, lng: 133.077 },     // 北
      { lat: 36.1049, lng: 133.0769 }   // 菱浦港（到着）
    ]
  },
  
  // 境港 → 西郷港
  {
    from: 'HONDO_SAKAIMINATO',
    to: 'SAIGO',
    waypoints: [
      { lat: 35.5454, lng: 133.2226 },  // 境港（出発）
      { lat: 35.64, lng: 133.28 },      // 北東へ
      { lat: 35.74, lng: 133.35 },      // 北東
      { lat: 35.84, lng: 133.41 },      // 北東
      { lat: 35.94, lng: 133.44 },      // 北東
      { lat: 36.04, lng: 133.42 },      // 東
      { lat: 36.12, lng: 133.39 },      // 南東
      { lat: 36.2035, lng: 133.3351 }   // 西郷港（到着）
    ]
  },
  
  // 境港 → 菱浦港
  {
    from: 'HONDO_SAKAIMINATO',
    to: 'HISHIURA',
    waypoints: [
      { lat: 35.5454, lng: 133.2226 },  // 境港（出発）
      { lat: 35.61, lng: 133.19 },      // 北西へ
      { lat: 35.69, lng: 133.14 },      // 北西
      { lat: 35.79, lng: 133.09 },      // 北
      { lat: 35.89, lng: 133.08 },      // 北
      { lat: 35.99, lng: 133.077 },     // 北
      { lat: 36.1049, lng: 133.0769 }   // 菱浦港（到着）
    ]
  },
  
  // 西郷港 → 菱浦港（島後から島前へ）
  {
    from: 'SAIGO',
    to: 'HISHIURA',
    waypoints: [
      { lat: 36.2035, lng: 133.3351 },  // 西郷港（出発）
      { lat: 36.18, lng: 133.28 },      // 西へ
      { lat: 36.16, lng: 133.22 },      // 西
      { lat: 36.14, lng: 133.16 },      // 西
      { lat: 36.12, lng: 133.12 },      // 西
      { lat: 36.1049, lng: 133.0769 }   // 菱浦港（到着）
    ]
  },
  
  // 西郷港 → 別府港
  {
    from: 'SAIGO',
    to: 'BEPPU',
    waypoints: [
      { lat: 36.2035, lng: 133.3351 },  // 西郷港（出発）
      { lat: 36.18, lng: 133.27 },      // 西へ
      { lat: 36.16, lng: 133.20 },      // 西
      { lat: 36.14, lng: 133.13 },      // 西
      { lat: 36.12, lng: 133.08 },      // 西
      { lat: 36.1077, lng: 133.0416 }   // 別府港（到着）
    ]
  },
  
  // 菱浦港 → 来居港（島前内）
  {
    from: 'HISHIURA',
    to: 'KURI',
    waypoints: [
      { lat: 36.1049, lng: 133.0769 },  // 菱浦港（出発）
      { lat: 36.085, lng: 133.065 },    // 南西へ
      { lat: 36.065, lng: 133.055 },    // 南西
      { lat: 36.045, lng: 133.047 },    // 南
      { lat: 36.0250, lng: 133.0393 }   // 来居港（到着）
    ]
  },
  
  // 別府港 → 来居港（島前内）
  {
    from: 'BEPPU',
    to: 'KURI',
    waypoints: [
      { lat: 36.1077, lng: 133.0416 },  // 別府港（出発）
      { lat: 36.085, lng: 133.040 },    // 南へ
      { lat: 36.065, lng: 133.040 },    // 南
      { lat: 36.045, lng: 133.040 },    // 南
      { lat: 36.0250, lng: 133.0393 }   // 来居港（到着）
    ]
  },
  
  // 別府港 → 菱浦港（島前内）
  {
    from: 'BEPPU',
    to: 'HISHIURA',
    waypoints: [
      { lat: 36.1077, lng: 133.0416 },  // 別府港（出発）
      { lat: 36.107, lng: 133.050 },    // 東へ
      { lat: 36.106, lng: 133.060 },    // 東
      { lat: 36.105, lng: 133.070 },    // 東
      { lat: 36.1049, lng: 133.0769 }   // 菱浦港（到着）
    ]
  },
  
  // 来居港 → 七類港（島前から本土へ）
  {
    from: 'KURI',
    to: 'HONDO_SHICHIRUI',
    waypoints: [
      { lat: 36.0250, lng: 133.0393 },  // 来居港（出発）
      { lat: 35.99, lng: 133.077 },     // 南へ
      { lat: 35.90, lng: 133.08 },      // 南
      { lat: 35.80, lng: 133.10 },      // 南
      { lat: 35.70, lng: 133.15 },      // 南東
      { lat: 35.62, lng: 133.20 },      // 南東
      { lat: 35.5714, lng: 133.2298 }   // 七類港（到着）
    ]
  },
  
  // 来居港 → 境港（島前から本土へ）
  {
    from: 'KURI',
    to: 'HONDO_SAKAIMINATO',
    waypoints: [
      { lat: 36.0250, lng: 133.0393 },  // 来居港（出発）
      { lat: 35.99, lng: 133.077 },     // 南へ
      { lat: 35.89, lng: 133.08 },      // 南
      { lat: 35.79, lng: 133.09 },      // 南
      { lat: 35.69, lng: 133.14 },      // 南東
      { lat: 35.61, lng: 133.19 },      // 南東
      { lat: 35.5454, lng: 133.2226 }   // 境港（到着）
    ]
  },
  
  // 境港 → 別府港（本土から島前へ）
  {
    from: 'HONDO_SAKAIMINATO',
    to: 'BEPPU',
    waypoints: [
      { lat: 35.5454, lng: 133.2226 },  // 境港（出発）
      { lat: 35.61, lng: 133.19 },      // 北西へ
      { lat: 35.69, lng: 133.14 },      // 北西
      { lat: 35.79, lng: 133.09 },      // 北
      { lat: 35.89, lng: 133.07 },      // 北
      { lat: 35.99, lng: 133.06 },      // 北
      { lat: 36.1077, lng: 133.0416 }   // 別府港（到着）
    ]
  },
  
  // 別府港 → 七類港（島前から本土へ）
  {
    from: 'BEPPU',
    to: 'HONDO_SHICHIRUI',
    waypoints: [
      { lat: 36.1077, lng: 133.0416 },  // 別府港（出発）
      { lat: 36.00, lng: 133.077 },     // 南へ
      { lat: 35.90, lng: 133.08 },      // 南
      { lat: 35.80, lng: 133.10 },      // 南
      { lat: 35.70, lng: 133.15 },      // 南東
      { lat: 35.62, lng: 133.20 },      // 南東
      { lat: 35.5714, lng: 133.2298 }   // 七類港（到着）
    ]
  }
]

// 航路キーから詳細経路を取得するヘルパー関数
export function getRoutePath(from: string, to: string): RoutePoint[] | null {
  // 双方向検索（A→B または B→A）
  const route = FERRY_ROUTE_PATHS.find(r => 
    (r.from === from && r.to === to) || 
    (r.from === to && r.to === from)
  )
  
  if (!route) return null
  
  // 逆方向の場合は配列を反転
  if (route.from === to && route.to === from) {
    return [...route.waypoints].reverse()
  }
  
  return route.waypoints
}

// 中間点を滑らかに補間する関数（オプション）
export function smoothPath(waypoints: RoutePoint[], segments: number = 100): RoutePoint[] {
  if (waypoints.length < 2) return waypoints
  
  const smoothed: RoutePoint[] = []
  const totalPoints = waypoints.length
  
  // 各セグメント間を補間
  for (let i = 0; i < totalPoints - 1; i++) {
    const start = waypoints[i]
    const end = waypoints[i + 1]
    
    const segmentSteps = Math.floor(segments / (totalPoints - 1))
    
    for (let j = 0; j < segmentSteps; j++) {
      const t = j / segmentSteps
      smoothed.push({
        lat: start.lat + (end.lat - start.lat) * t,
        lng: start.lng + (end.lng - start.lng) * t
      })
    }
  }
  
  // 最後の点を追加
  smoothed.push(waypoints[waypoints.length - 1])
  
  return smoothed
}