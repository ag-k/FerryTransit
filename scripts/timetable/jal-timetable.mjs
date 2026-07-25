const DATE_VALUE_PATTERN = /^(\d{4})(\d{2})(\d{2})_(\d{4})(\d{2})(\d{2})$/
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/
const DATE_EFFECT_PATTERN = /((?:\d{1,2}月[0-9～〜\-・、,]+日(?:[・、,]?))+)(?:(\d+)時間)?(?:(\d+)分)?(早発|遅発|早着|遅着|運休|運航)/g

const pad2 = value => String(value).padStart(2, '0')

const formatUtcDate = date => [
  date.getUTCFullYear(),
  pad2(date.getUTCMonth() + 1),
  pad2(date.getUTCDate())
].join('-')

const parseYmd = value => {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) throw new Error(`日付の形式が不正です: ${value}`)

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (formatUtcDate(date) !== value) throw new Error(`存在しない日付です: ${value}`)
  return date
}

const addDays = (value, days) => {
  const date = parseYmd(value)
  date.setUTCDate(date.getUTCDate() + days)
  return formatUtcDate(date)
}

const listDates = (startDate, endDate) => {
  if (startDate > endDate) throw new Error(`期間の開始日が終了日より後です: ${startDate} > ${endDate}`)

  const dates = []
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    dates.push(date)
  }
  return dates
}

const parseTime = value => {
  const match = String(value).trim().match(TIME_PATTERN)
  if (!match) throw new Error(`時刻の形式が不正です: ${value}`)

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) throw new Error(`時刻の値が不正です: ${value}`)
  return hours * 60 + minutes
}

const shiftTime = (value, offsetMinutes) => {
  const shifted = parseTime(value) + offsetMinutes
  if (shifted < 0 || shifted >= 24 * 60) {
    throw new Error(`日付をまたぐ時刻変更には対応していません: ${value} (${offsetMinutes}分)`)
  }
  return `${pad2(Math.floor(shifted / 60))}:${pad2(shifted % 60)}`
}

export const parsePublicationPeriod = value => {
  const match = String(value).match(DATE_VALUE_PATTERN)
  if (!match) throw new Error(`JAL掲載期間の形式が不正です: ${value}`)

  const startDate = `${match[1]}-${match[2]}-${match[3]}`
  const endDate = `${match[4]}-${match[5]}-${match[6]}`
  parseYmd(startDate)
  parseYmd(endDate)
  if (startDate > endDate) throw new Error(`JAL掲載期間の開始日が終了日より後です: ${value}`)

  return { value: String(value), startDate, endDate }
}

const resolveDateYear = (month, day, period) => {
  const startYear = Number(period.startDate.slice(0, 4))
  const endYear = Number(period.endDate.slice(0, 4))

  for (let year = startYear; year <= endYear; year++) {
    const value = `${year}-${pad2(month)}-${pad2(day)}`
    try {
      parseYmd(value)
    } catch {
      continue
    }
    if (value >= period.startDate && value <= period.endDate) return value
  }

  throw new Error(`備考の日付が掲載期間外です: ${month}月${day}日 (${period.value})`)
}

export const parseJapaneseDateExpression = (expression, period) => {
  const normalized = String(expression)
    .replace(/[０-９]/g, char => String(char.charCodeAt(0) - 0xFEE0))
    .replace(/〜/g, '～')
    .replace(/\s+/g, '')

  const dates = new Set()
  const matchedParts = []
  const monthPattern = /(\d{1,2})月([0-9～\-・、,]+)日/g
  let match

  while ((match = monthPattern.exec(normalized)) !== null) {
    matchedParts.push(match[0])
    const month = Number(match[1])
    const dayParts = match[2].split(/[・、,]/).filter(Boolean)

    for (const part of dayParts) {
      const range = part.match(/^(\d{1,2})[～-](\d{1,2})$/)
      if (range) {
        const startDay = Number(range[1])
        const endDay = Number(range[2])
        if (startDay > endDay) throw new Error(`備考の日付範囲が不正です: ${part}`)
        for (let day = startDay; day <= endDay; day++) {
          dates.add(resolveDateYear(month, day, period))
        }
        continue
      }

      if (!/^\d{1,2}$/.test(part)) throw new Error(`備考の日付指定に対応していません: ${part}`)
      dates.add(resolveDateYear(month, Number(part), period))
    }
  }

  const remainder = matchedParts.reduce((value, part) => value.replace(part, ''), normalized)
    .replace(/[・、,]/g, '')
  if (dates.size === 0 || remainder) {
    throw new Error(`備考の日付指定に対応していません: ${expression}`)
  }

  return [...dates].sort()
}

export const parseTimetableEffects = (remarks, period) => {
  const normalized = String(remarks || '').replace(/\s+/g, '')
  const effects = []
  let match

  DATE_EFFECT_PATTERN.lastIndex = 0
  while ((match = DATE_EFFECT_PATTERN.exec(normalized)) !== null) {
    const hours = Number(match[2] || 0)
    const minutes = Number(match[3] || 0)
    effects.push({
      dates: parseJapaneseDateExpression(match[1], period),
      action: match[4],
      minutes: hours * 60 + minutes
    })
  }

  const remainder = normalized
    .replace(DATE_EFFECT_PATTERN, '')
    .replace(/(?:JAL|J-AIR|JAC|HAC|RAC|JTA)運航/g, '')
    .replace(/[（）()・、,。]/g, '')

  if (remainder) {
    throw new Error(`JAL時刻表の未対応の備考です: ${remarks}`)
  }

  return effects
}

const normalizeFlightNumber = value => {
  const match = String(value).match(/JAL\s*(\d{3,4})/i)
  if (!match) throw new Error(`JAL便名を判定できません: ${value}`)
  return match[1]
}

const expandObservation = observation => {
  const flightNumber = normalizeFlightNumber(observation.row.flight)
  const baseDepartureTime = String(observation.row.departureTime).trim()
  const baseArrivalTime = String(observation.row.arrivalTime).trim()
  parseTime(baseDepartureTime)
  parseTime(baseArrivalTime)

  const effects = parseTimetableEffects(observation.row.remarks, observation.period)
  const hasOperationDates = effects.some(effect => effect.action === '運航')
  const states = new Map(listDates(observation.period.startDate, observation.period.endDate).map(date => [date, {
    active: !hasOperationDates,
    departureTime: baseDepartureTime,
    arrivalTime: baseArrivalTime
  }]))

  for (const effect of effects) {
    for (const date of effect.dates) {
      const state = states.get(date)
      if (!state) throw new Error(`備考の日付が掲載期間外です: ${date}`)

      if (effect.action === '運航') {
        state.active = true
      } else if (effect.action === '運休') {
        state.active = false
      } else if (effect.action === '早発' || effect.action === '遅発') {
        const direction = effect.action === '早発' ? -1 : 1
        state.departureTime = shiftTime(state.departureTime, direction * effect.minutes)
        state.arrivalTime = shiftTime(state.arrivalTime, direction * effect.minutes)
      } else if (effect.action === '早着' || effect.action === '遅着') {
        const direction = effect.action === '早着' ? -1 : 1
        state.arrivalTime = shiftTime(state.arrivalTime, direction * effect.minutes)
      }
    }
  }

  return [...states.entries()]
    .filter(([, state]) => state.active)
    .map(([date, state]) => ({
      date,
      flightNumber,
      departureTime: state.departureTime,
      arrivalTime: state.arrivalTime,
      routeName: observation.route.name,
      routeSlug: observation.route.slug,
      departure: observation.direction.departure,
      arrival: observation.direction.arrival
    }))
}

const groupDailyTrips = dailyTrips => {
  const groups = new Map()

  for (const trip of dailyTrips) {
    const key = [
      trip.flightNumber,
      trip.routeName,
      trip.departure,
      trip.arrival,
      trip.departureTime,
      trip.arrivalTime
    ].join('|')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(trip)
  }

  const ranges = []
  for (const trips of groups.values()) {
    trips.sort((a, b) => a.date.localeCompare(b.date))
    let current = null

    for (const trip of trips) {
      if (current && addDays(current.endDate, 1) === trip.date) {
        current.endDate = trip.date
      } else {
        current = { ...trip, startDate: trip.date, endDate: trip.date }
        ranges.push(current)
      }
    }
  }

  return ranges
}

export const buildJalTimetableTrips = observations => {
  const dailyByKey = new Map()

  for (const observation of observations) {
    for (const dailyTrip of expandObservation(observation)) {
      const key = [dailyTrip.flightNumber, dailyTrip.departure, dailyTrip.arrival, dailyTrip.date].join('|')
      const existing = dailyByKey.get(key)
      if (existing && (
        existing.departureTime !== dailyTrip.departureTime ||
        existing.arrivalTime !== dailyTrip.arrivalTime
      )) {
        throw new Error(`JAL時刻表の掲載期間が矛盾しています: ${key}`)
      }
      dailyByKey.set(key, dailyTrip)
    }
  }

  const ranges = groupDailyTrips([...dailyByKey.values()])
    .sort((a, b) => a.flightNumber.localeCompare(b.flightNumber) || a.startDate.localeCompare(b.startDate))
  const segmentIndexes = new Map()

  return ranges.map(range => {
    const segmentIndex = (segmentIndexes.get(range.flightNumber) || 0) + 1
    if (segmentIndex > 99) throw new Error(`JAL便の期間分割数が上限を超えました: ${range.flightNumber}`)
    segmentIndexes.set(range.flightNumber, segmentIndex)

    const startCompact = range.startDate.replace(/-/g, '')
    const endCompact = range.endDate.replace(/-/g, '')
    return {
      trip_id: String(8_000_000 + Number(range.flightNumber) * 100 + segmentIndex),
      start_date: range.startDate,
      end_date: range.endDate,
      active_days: [0, 1, 2, 3, 4, 5, 6],
      name: range.routeName,
      mode: 'AIR',
      operator_id: 'JAL',
      service_id: `${range.routeSlug}_${startCompact}_${endCompact}`,
      vehicle_id: `JAL${range.flightNumber}`,
      departure: range.departure,
      departure_type: 'AIRPORT',
      departure_time: range.departureTime,
      arrival: range.arrival,
      arrival_type: 'AIRPORT',
      arrival_time: range.arrivalTime,
      status: 0
    }
  })
}

export const validateJalTimetableCoverage = (trips, periods, routes, today) => {
  if (!Array.isArray(trips) || trips.length < routes.length * 2) {
    throw new Error(`JAL隠岐便が不足しています: ${trips?.length || 0}件`)
  }
  if (!periods.some(period => period.startDate <= today && today <= period.endDate)) {
    throw new Error(`JAL公式時刻表に本日を含む掲載期間がありません: ${today}`)
  }

  const publishedDates = periods.flatMap(period => listDates(period.startDate, period.endDate))
  for (const route of routes) {
    const directions = [
      [route.airportId, 'AIRPORT_OKI'],
      ['AIRPORT_OKI', route.airportId]
    ]
    for (const [departure, arrival] of directions) {
      for (const date of publishedDates) {
        const covered = trips.some(trip =>
          trip.name === route.name &&
          trip.departure === departure &&
          trip.arrival === arrival &&
          trip.start_date <= date &&
          date <= trip.end_date
        )
        if (!covered) throw new Error(`JAL時刻表に未掲載日があります: ${departure} -> ${arrival} (${date})`)
      }
    }
  }
}
