#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const legacySingleOutputDir = process.env.APPSTORE_SIM_SCREENSHOT_DIR
const outputRootDir = resolve(
  process.cwd(),
  process.env.APPSTORE_SIM_SCREENSHOT_ROOT_DIR ?? 'output/appstore-screenshots'
)
const derivedDataPath = resolve(
  process.cwd(),
  process.env.IOS_SIM_DERIVED_DATA_PATH ?? 'ios/build/appstore-screenshots'
)
const workspacePath = resolve(process.cwd(), 'ios/App/App.xcworkspace')
const scheme = process.env.IOS_SIM_SCHEME ?? 'App'
const staticRoot = process.env.APPSTORE_STATIC_ROOT ?? '.output/public'
const skipCapBuild = process.env.IOS_SIM_SKIP_CAP_BUILD === '1'
const skipXcodeBuild = process.env.IOS_SIM_SKIP_XCODEBUILD === '1'
const explicitAppPath = process.env.IOS_SIM_APP_PATH
  ? resolve(process.cwd(), process.env.IOS_SIM_APP_PATH)
  : ''

const iPhonePreferredDeviceNames = (
  process.env.IOS_SIM_DEVICE_CANDIDATES ??
  'iPhone 16 Pro Max,iPhone 15 Pro Max,iPhone 16 Plus,iPhone 15 Plus'
)
  .split(',')
  .map(name => name.trim())
  .filter(Boolean)

const iPadPreferredDeviceNames = (
  process.env.IOS_SIM_IPAD_DEVICE_CANDIDATES ??
  [
    'iPad Pro 13-inch (M4)',
    'iPad Pro 12.9-inch (6th generation)',
    'iPad Pro (12.9-inch) (6th generation)',
    'iPad Air 13-inch (M2)',
    'iPad Air (5th generation)',
    'iPad (10th generation)'
  ].join(',')
)
  .split(',')
  .map(name => name.trim())
  .filter(Boolean)

const timetableDeparture = process.env.APPSTORE_TIMETABLE_DEPARTURE ?? 'BEPPU'
const timetableArrival = process.env.APPSTORE_TIMETABLE_ARRIVAL ?? 'KURI'
const transitArrival = process.env.APPSTORE_TRANSIT_ARRIVAL ?? 'HISHIURA'
const transitDeparture = process.env.APPSTORE_TRANSIT_DEPARTURE ?? 'HONDO'
const searchTime = process.env.APPSTORE_SEARCH_TIME ?? '08:00'
const fallbackSearchDate = '2026-01-15'

const APPSTORE_PROFILES = {
  'iphone-ja': {
    id: 'iphone-ja',
    family: 'iphone',
    locale: 'ja',
    localePrefix: '',
    outputSubDir: 'ios-sim-6.7-ja'
  },
  'iphone-en': {
    id: 'iphone-en',
    family: 'iphone',
    locale: 'en',
    localePrefix: '/en',
    outputSubDir: 'ios-sim-6.7-en'
  },
  'ipad-ja': {
    id: 'ipad-ja',
    family: 'ipad',
    locale: 'ja',
    localePrefix: '',
    outputSubDir: 'ios-sim-ipad-13-ja'
  },
  'ipad-en': {
    id: 'ipad-en',
    family: 'ipad',
    locale: 'en',
    localePrefix: '/en',
    outputSubDir: 'ios-sim-ipad-13-en'
  }
}

const ALL_PROFILE_IDS = ['iphone-ja', 'iphone-en', 'ipad-ja', 'ipad-en']

const parseRequestedProfileIds = () => {
  const raw = process.env.APPSTORE_SIM_VARIANTS?.trim()
  if (!raw) {
    return legacySingleOutputDir ? ['iphone-ja'] : ALL_PROFILE_IDS
  }

  const profileIds = raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  if (profileIds.length === 0) {
    throw new Error('APPSTORE_SIM_VARIANTS が空です。例: iphone-ja,iphone-en,ipad-ja,ipad-en')
  }

  for (const profileId of profileIds) {
    if (!APPSTORE_PROFILES[profileId]) {
      throw new Error(`APPSTORE_SIM_VARIANTS に不正な値があります: ${profileId}`)
    }
  }

  return profileIds
}

const normalizeLocalePrefix = (value) => {
  if (!value) return ''
  const trimmed = value.trim().replace(/^\/+/, '').replace(/\/+$/, '')
  return trimmed ? `/${trimmed}` : ''
}

const withLocalePrefix = (path, localePrefix) => {
  if (!localePrefix) return path
  if (path.startsWith('/?')) return `${localePrefix}${path}`
  if (path.startsWith('/')) return `${localePrefix}${path}`
  return `${localePrefix}/${path}`
}

const pad2 = (value) => String(value).padStart(2, '0')
const normalizeYmd = (value) => value.replace(/\//g, '-').slice(0, 10)

const parseYmdToUtcDate = (value) => {
  const normalized = normalizeYmd(value)
  const [year, month, day] = normalized.split('-').map(Number)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }
  return new Date(Date.UTC(year, month - 1, day))
}

const formatUtcDateToYmd = (date) => {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

const loadLocalTimetableRows = () => {
  const timetablePath = resolve(
    process.cwd(),
    process.env.APPSTORE_TIMETABLE_JSON_PATH ?? 'timetable.json'
  )
  if (!existsSync(timetablePath)) {
    return []
  }

  try {
    const raw = readFileSync(timetablePath, 'utf8')
    const rows = JSON.parse(raw)
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

const localTimetableRows = loadLocalTimetableRows()

const selectDateFromRanges = (ranges) => {
  if (ranges.length === 0) {
    return null
  }

  const now = new Date()
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))

  const containing = ranges.find(range => today >= range.start && today <= range.end)
  if (containing) {
    return formatUtcDateToYmd(today)
  }

  const future = ranges
    .filter(range => range.start >= today)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0]
  if (future) {
    return formatUtcDateToYmd(future.start)
  }

  const latest = ranges.sort((a, b) => b.end.getTime() - a.end.getTime())[0]
  return latest ? formatUtcDateToYmd(latest.end) : null
}

const collectDateRangesForRoute = (departure, arrival) => {
  return localTimetableRows
    .filter(item => item?.departure === departure && item?.arrival === arrival)
    .map(item => {
      const start = parseYmdToUtcDate(String(item.start_date ?? ''))
      const end = parseYmdToUtcDate(String(item.end_date ?? ''))
      if (!start || !end) {
        return null
      }
      return { start, end }
    })
    .filter(Boolean)
}

const isDateAvailableForRow = (row, dateYmd) => {
  const target = parseYmdToUtcDate(dateYmd)
  const start = parseYmdToUtcDate(String(row?.start_date ?? ''))
  const end = parseYmdToUtcDate(String(row?.end_date ?? ''))
  if (!target || !start || !end) return false
  return target >= start && target <= end
}

const resolveSearchDateFromLocalTimetable = () => {
  return (
    selectDateFromRanges(collectDateRangesForRoute(timetableDeparture, timetableArrival)) ??
    selectDateFromRanges(collectDateRangesForRoute('HONDO_SHICHIRUI', transitArrival)) ??
    selectDateFromRanges(collectDateRangesForRoute('HONDO_SAKAIMINATO', transitArrival))
  )
}

const searchDate =
  process.env.APPSTORE_SEARCH_DATE ??
  resolveSearchDateFromLocalTimetable() ??
  fallbackSearchDate

const isTransitRouteLikelyAvailable = localTimetableRows.some(item =>
  (item?.departure === 'HONDO_SHICHIRUI' || item?.departure === 'HONDO_SAKAIMINATO') &&
  item?.arrival === transitArrival &&
  isDateAvailableForRow(item, searchDate)
)

const timetableQuery = new URLSearchParams({
  departure: timetableDeparture,
  arrival: timetableArrival,
  date: searchDate
})

const transitQuery = new URLSearchParams({
  departure: transitDeparture,
  arrival: transitArrival,
  date: searchDate,
  time: searchTime,
  isArrivalMode: '0',
  autoSearch: '1'
})

const baseShots = [
  {
    fileName: '01_timetable.png',
    path: `/?${timetableQuery.toString()}`,
    waitMs: 9000
  },
  {
    fileName: '02_transit.png',
    path: `/transit?${transitQuery.toString()}`,
    waitMs: 11000
  },
  {
    fileName: '03_status.png',
    path: '/status',
    waitMs: 8000
  }
]

const run = (command, args, options = {}) => {
  console.log(`\n> ${command} ${args.join(' ')}`)
  return execFileSync(command, args, {
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: options.capture ? 'utf8' : undefined,
    cwd: process.cwd()
  })
}

const runSafe = (command, args) => {
  try {
    run(command, args)
    return true
  } catch (error) {
    console.warn(`コマンド失敗を許容して続行します: ${command} ${args.join(' ')}`)
    console.warn(error instanceof Error ? error.message : String(error))
    return false
  }
}

const sleep = (ms) => new Promise(resolveSleep => setTimeout(resolveSleep, ms))

const parseRuntimeVersion = (runtimeKey) => {
  const match = runtimeKey.match(/iOS-(\d+)-(\d+)/)
  if (!match) return { major: 0, minor: 0 }
  return { major: Number(match[1]), minor: Number(match[2]) }
}

const listAvailableSimulators = () => {
  const raw = run('xcrun', ['simctl', 'list', 'devices', 'available', '-j'], { capture: true })
  const parsed = JSON.parse(raw)
  const candidates = []

  for (const [runtime, devices] of Object.entries(parsed.devices ?? {})) {
    const { major, minor } = parseRuntimeVersion(runtime)
    for (const device of devices) {
      if (!device.isAvailable) continue
      candidates.push({
        udid: device.udid,
        name: device.name,
        state: device.state,
        runtime,
        major,
        minor
      })
    }
  }

  return candidates
}

const selectSimulator = ({
  candidates,
  family,
  exactName,
  preferredNames
}) => {
  const familyCandidates = candidates.filter(item => {
    if (family === 'ipad') return item.name.includes('iPad')
    if (family === 'iphone') return item.name.includes('iPhone')
    return true
  })

  if (familyCandidates.length === 0) {
    throw new Error(`利用可能な ${family} シミュレータが見つかりません`)
  }

  if (exactName) {
    const exact = familyCandidates.find(item => item.name === exactName)
    if (!exact) {
      throw new Error(`指定デバイスが見つかりません (${family}): ${exactName}`)
    }
    return exact
  }

  for (const preferred of preferredNames) {
    const matched = familyCandidates
      .filter(item => item.name === preferred)
      .sort((a, b) => (b.major - a.major) || (b.minor - a.minor))[0]
    if (matched) {
      return matched
    }
  }

  return familyCandidates
    .sort((a, b) => (b.major - a.major) || (b.minor - a.minor))[0]
}

const getBundleId = (appPath) => {
  const infoPlistPath = join(appPath, 'Info.plist')
  const output = run('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleIdentifier', infoPlistPath], { capture: true })
  return output.trim()
}

const applyStatusBarOverride = (udid) => {
  try {
    run('xcrun', [
      'simctl', 'status_bar', udid, 'override',
      '--time', '9:41',
      '--dataNetwork', 'wifi',
      '--wifiMode', 'active',
      '--wifiBars', '3',
      '--cellularMode', 'active',
      '--cellularBars', '4',
      '--batteryState', 'charged',
      '--batteryLevel', '100'
    ])
  } catch (error) {
    console.warn('ステータスバー固定に失敗しました。処理を継続します。', error instanceof Error ? error.message : String(error))
  }
}

const clearStatusBarOverride = (udid) => {
  try {
    run('xcrun', ['simctl', 'status_bar', udid, 'clear'])
  } catch {
    // ignore
  }
}

const prepareProfileShots = (profile) => {
  return baseShots.map(shot => ({
    ...shot,
    startPath: withLocalePrefix(shot.path, profile.localePrefix)
  }))
}

const bootSimulator = (simulator) => {
  runSafe('xcrun', ['simctl', 'boot', simulator.udid])
  run('xcrun', ['simctl', 'bootstatus', simulator.udid, '-b'])
  run('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', simulator.udid])
}

const buildProfiles = (simulatorsByFamily) => {
  const requestedProfileIds = parseRequestedProfileIds()
  const profiles = requestedProfileIds.map(profileId => {
    const profile = APPSTORE_PROFILES[profileId]
    const simulator = simulatorsByFamily[profile.family]
    if (!simulator) {
      throw new Error(`プロファイル ${profileId} に必要な ${profile.family} シミュレータが未解決です`)
    }

    const outputDir = legacySingleOutputDir && requestedProfileIds.length === 1
      ? resolve(process.cwd(), legacySingleOutputDir)
      : resolve(outputRootDir, profile.outputSubDir)

    return {
      ...profile,
      simulator,
      outputDir,
      shots: prepareProfileShots(profile)
    }
  })

  return profiles
}

const main = async () => {
  const staticEntryPath = resolve(process.cwd(), staticRoot, 'index.html')
  if (!existsSync(staticEntryPath)) {
    throw new Error(`静的成果物が見つかりません: ${staticRoot}/index.html\n先に "npm run generate" を実行してください。`)
  }

  if (!skipCapBuild) {
    run('npm', ['run', 'cap:ios:build'])
  } else {
    console.log('\nIOS_SIM_SKIP_CAP_BUILD=1 のため cap:ios:build をスキップします。')
  }

  const availableSimulators = listAvailableSimulators()
  const iPhoneSimulator = selectSimulator({
    candidates: availableSimulators,
    family: 'iphone',
    exactName: process.env.IOS_SIM_DEVICE_NAME?.trim(),
    preferredNames: iPhonePreferredDeviceNames
  })
  const iPadSimulator = selectSimulator({
    candidates: availableSimulators,
    family: 'ipad',
    exactName: process.env.IOS_SIM_IPAD_DEVICE_NAME?.trim(),
    preferredNames: iPadPreferredDeviceNames
  })

  const profiles = buildProfiles({
    iphone: iPhoneSimulator,
    ipad: iPadSimulator
  })

  console.log('\nCapture Profiles:')
  for (const profile of profiles) {
    console.log(`- ${profile.id}: ${profile.simulator.name} (${profile.simulator.runtime}) -> ${profile.outputDir}`)
  }
  console.log(`Timetable preset: ${timetableDeparture} -> ${timetableArrival} (${searchDate})`)
  console.log(`Transit preset: ${transitDeparture} -> ${transitArrival} (${searchDate} ${searchTime})`)
  if (!isTransitRouteLikelyAvailable) {
    console.log('Transit note: HONDO 直指定で有効便を確認できませんでした（画面上は結果なしになる可能性があります）。')
  }

  const buildTargetSimulator = profiles[0]?.simulator ?? iPhoneSimulator
  bootSimulator(buildTargetSimulator)

  if (!skipXcodeBuild) {
    run('xcodebuild', [
      '-workspace', workspacePath,
      '-scheme', scheme,
      '-configuration', 'Release',
      '-destination', `id=${buildTargetSimulator.udid}`,
      '-derivedDataPath', derivedDataPath,
      'CODE_SIGNING_ALLOWED=NO',
      'CODE_SIGNING_REQUIRED=NO',
      'build'
    ])
  } else {
    console.log('\nIOS_SIM_SKIP_XCODEBUILD=1 のため xcodebuild をスキップします。')
  }

  const appPath = explicitAppPath || resolve(derivedDataPath, 'Build/Products/Release-iphonesimulator/App.app')
  if (!existsSync(appPath)) {
    throw new Error(`ビルド済みアプリが見つかりません: ${appPath}`)
  }

  const bundleId = getBundleId(appPath)
  console.log(`Bundle ID: ${bundleId}`)

  const completedOutputs = []

  for (const profile of profiles) {
    mkdirSync(profile.outputDir, { recursive: true })

    console.log(`\n=== Capturing profile: ${profile.id} ===`)
    console.log(`Device: ${profile.simulator.name} (${profile.simulator.udid})`)
    console.log(`Locale: ${profile.locale}`)

    bootSimulator(profile.simulator)

    runSafe('xcrun', ['simctl', 'terminate', profile.simulator.udid, bundleId])
    runSafe('xcrun', ['simctl', 'uninstall', profile.simulator.udid, bundleId])
    run('xcrun', ['simctl', 'install', profile.simulator.udid, appPath])

    applyStatusBarOverride(profile.simulator.udid)

    try {
      for (const shot of profile.shots) {
        console.log(`\nCapturing: ${profile.id}/${shot.fileName}`)
        runSafe('xcrun', ['simctl', 'terminate', profile.simulator.udid, bundleId])
        run('xcrun', [
          'simctl',
          'launch',
          profile.simulator.udid,
          bundleId,
          '--appstore-path',
          shot.startPath
        ])
        await sleep(shot.waitMs)

        const outputPath = join(profile.outputDir, shot.fileName)
        run('xcrun', ['simctl', 'io', profile.simulator.udid, 'screenshot', '--type=png', outputPath])
      }
    } finally {
      clearStatusBarOverride(profile.simulator.udid)
    }

    completedOutputs.push(profile.outputDir)
  }

  console.log('\nスクリーンショット生成が完了しました。')
  for (const outputPath of completedOutputs) {
    console.log(`Output: ${outputPath}`)
  }
}

main().catch((error) => {
  console.error('\nスクリーンショット生成に失敗しました。')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
