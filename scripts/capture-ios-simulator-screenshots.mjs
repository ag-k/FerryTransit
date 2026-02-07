#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const outputDir = resolve(
  process.cwd(),
  process.env.APPSTORE_SIM_SCREENSHOT_DIR ?? 'output/appstore-screenshots/ios-sim-6.7-ja'
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
const explicitAppPath = process.env.IOS_SIM_APP_PATH ? resolve(process.cwd(), process.env.IOS_SIM_APP_PATH) : ''

const preferredDeviceNames = (
  process.env.IOS_SIM_DEVICE_CANDIDATES ??
  'iPhone 16 Pro Max,iPhone 15 Pro Max,iPhone 16 Plus,iPhone 15 Plus'
)
  .split(',')
  .map(name => name.trim())
  .filter(Boolean)

const searchDeparture = process.env.APPSTORE_SEARCH_DEPARTURE ?? 'HONDO_SHICHIRUI'
const searchArrival = process.env.APPSTORE_SEARCH_ARRIVAL ?? 'SAIGO'
const searchTime = process.env.APPSTORE_SEARCH_TIME ?? '08:00'
const fallbackSearchDate = '2026-01-15'

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

const resolveSearchDateFromLocalTimetable = () => {
  const timetablePath = resolve(
    process.cwd(),
    process.env.APPSTORE_TIMETABLE_JSON_PATH ?? 'timetable.json'
  )
  if (!existsSync(timetablePath)) {
    return null
  }

  try {
    const raw = readFileSync(timetablePath, 'utf8')
    const rows = JSON.parse(raw)
    if (!Array.isArray(rows)) {
      return null
    }

    const ranges = rows
      .filter(item => item?.departure === searchDeparture && item?.arrival === searchArrival)
      .map(item => {
        const start = parseYmdToUtcDate(String(item.start_date ?? ''))
        const end = parseYmdToUtcDate(String(item.end_date ?? ''))
        if (!start || !end) {
          return null
        }
        return { start, end }
      })
      .filter(Boolean)

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
  } catch {
    return null
  }
}

const searchDate =
  process.env.APPSTORE_SEARCH_DATE ??
  resolveSearchDateFromLocalTimetable() ??
  fallbackSearchDate

const timetableQuery = new URLSearchParams({
  departure: searchDeparture,
  arrival: searchArrival,
  date: searchDate
})

const transitQuery = new URLSearchParams({
  departure: searchDeparture,
  arrival: searchArrival,
  date: searchDate,
  time: searchTime,
  isArrivalMode: '0',
  autoSearch: '1'
})

const shots = [
  {
    fileName: '01_timetable.png',
    startPath: `/?${timetableQuery.toString()}`,
    waitMs: 9000
  },
  {
    fileName: '02_transit.png',
    startPath: `/transit?${transitQuery.toString()}`,
    waitMs: 11000
  },
  {
    fileName: '03_status.png',
    startPath: '/status',
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

const selectSimulator = () => {
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

  const exactName = process.env.IOS_SIM_DEVICE_NAME?.trim()
  if (exactName) {
    const exact = candidates.find(item => item.name === exactName)
    if (!exact) {
      throw new Error(`指定デバイスが見つかりません: ${exactName}`)
    }
    return exact
  }

  for (const preferred of preferredDeviceNames) {
    const matched = candidates
      .filter(item => item.name === preferred)
      .sort((a, b) => (b.major - a.major) || (b.minor - a.minor))[0]
    if (matched) return matched
  }

  const fallback = candidates.sort((a, b) => (b.major - a.major) || (b.minor - a.minor))[0]
  if (!fallback) {
    throw new Error('利用可能な iOS シミュレータが見つかりません')
  }
  return fallback
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

const main = async () => {
  mkdirSync(outputDir, { recursive: true })

  const simulator = selectSimulator()
  let statusBarApplied = false
  console.log(`\nUsing simulator: ${simulator.name} (${simulator.runtime})`)
  console.log(`UDID: ${simulator.udid}`)
  console.log(`Search preset: ${searchDeparture} -> ${searchArrival} (${searchDate} ${searchTime})`)

  if (!existsSync(resolve(process.cwd(), staticRoot, 'index.html'))) {
    throw new Error(`静的成果物が見つかりません: ${staticRoot}/index.html\n先に "npm run generate" を実行してください。`)
  }

  if (!skipCapBuild) {
    run('npm', ['run', 'cap:ios:build'])
  } else {
    console.log('\nIOS_SIM_SKIP_CAP_BUILD=1 のため cap:ios:build をスキップします。')
  }

  runSafe('xcrun', ['simctl', 'boot', simulator.udid])
  run('xcrun', ['simctl', 'bootstatus', simulator.udid, '-b'])
  run('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', simulator.udid])

  if (!skipXcodeBuild) {
    run('xcodebuild', [
      '-workspace', workspacePath,
      '-scheme', scheme,
      '-configuration', 'Release',
      '-destination', `id=${simulator.udid}`,
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

  run('xcrun', ['simctl', 'install', simulator.udid, appPath])
  applyStatusBarOverride(simulator.udid)
  statusBarApplied = true

  try {
    for (const shot of shots) {
      console.log(`\nCapturing: ${shot.fileName}`)
      runSafe('xcrun', ['simctl', 'terminate', simulator.udid, bundleId])
      run('xcrun', [
        'simctl',
        'launch',
        simulator.udid,
        bundleId,
        '--appstore-path',
        shot.startPath
      ])
      await sleep(shot.waitMs)

      const outputPath = join(outputDir, shot.fileName)
      run('xcrun', ['simctl', 'io', simulator.udid, 'screenshot', '--type=png', outputPath])
    }
  } finally {
    if (statusBarApplied) {
      clearStatusBarOverride(simulator.udid)
    }
  }

  console.log('\nスクリーンショット生成が完了しました。')
  console.log(`Output: ${outputDir}`)
}

main().catch((error) => {
  console.error('\nスクリーンショット生成に失敗しました。')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
