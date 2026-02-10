import { createLogger } from '~/utils/logger'

const logger = createLogger('TimetableInfoApi')

export default defineEventHandler(async () => {
  try {
    // 時刻表データを取得
    const timetableResponse = await $fetch('/api/timetable')

    // ユニークな港リストを抽出
    const ports = new Set<string>()
    const routes = new Set<string>()

    timetableResponse.forEach((trip: any) => {
      ports.add(trip.departure)
      ports.add(trip.arrival)
      routes.add(`${trip.departure}-${trip.arrival}`)
    })

    // 港情報を整形
    const portList = Array.from(ports).map(port => ({
      code: port,
      name: getPortName(port),
      routes: Array.from(routes).filter(route => 
        route.startsWith(`${port}-`) || route.endsWith(`-${port}`)
      ).length
    })).sort((a, b) => a.code.localeCompare(b.code))

    // 路線情報を整形
    const routeList = Array.from(routes).map(route => {
      const [departure, arrival] = route.split('-')
      return {
        code: route,
        departure: {
          code: departure,
          name: getPortName(departure)
        },
        arrival: {
          code: arrival,
          name: getPortName(arrival)
        }
      }
    }).sort((a, b) => a.code.localeCompare(b.code))

    // 船種一覧
    const ships = new Set<string>()
    timetableResponse.forEach((trip: any) => {
      ships.add(trip.name)
    })

    const shipList = Array.from(ships).map(ship => ({
      name: ship,
      type: getShipType(ship)
    })).sort((a, b) => a.name.localeCompare(b.name))

    return {
      success: true,
      data: {
        ports: portList,
        routes: routeList,
        ships: shipList,
        summary: {
          totalPorts: portList.length,
          totalRoutes: routeList.length,
          totalShips: shipList.length
        }
      }
    }

  } catch (error) {
    logger.error('Timetable info API error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: '時刻表情報の取得に失敗しました'
    })
  }
})

// 港コードから日本語名を取得
function getPortName(portCode: string): string {
  const portNames: Record<string, string> = {
    'BEPPU': '別府',
    'HISHIURA': '菱浦',
    'KURI': '来居',
    'SAIGO': '西郷',
    'HONDO': '本土',
    'SHICHIRUI': '七類',
    'DOZEN': '西ノ島',
    'DOGO': '知夫',
    'NISHINOSHIMA': '西ノ島',
    'CHIBU': '知夫里',
    'AMA': '海士',
    'OKI': '隠岐'
  }
  
  return portNames[portCode] || portCode
}

// 船名から船種を判定
function getShipType(shipName: string): string {
  if (shipName.includes('RAINBOW')) return 'highspeed'
  if (shipName.includes('FERRY')) return 'ferry'
  return 'local'
}
