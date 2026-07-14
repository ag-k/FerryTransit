#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, isAbsolute, join, resolve } from 'path'
import { pathToFileURL } from 'url'
import { chromium } from '@playwright/test'
import {
  buildJalTimetableTrips,
  parsePublicationPeriod,
  validateJalTimetableCoverage
} from './jal-timetable.mjs'

const ROOT = process.cwd()
const OFFICIAL_INDEX_URL = 'https://www.jal.co.jp/jp/ja/dom/route/time/'
const OFFICIAL_TIMETABLE_URL = 'https://www.jal.co.jp/jp/ja/dom/route/time/timeTable.html'
const DEFAULT_OUTPUT_FILE = join(ROOT, 'gtfs', 'raw', 'air', 'jal_oki_timetable.json')
const ROUTES = [
  {
    iata: 'ITM',
    airportId: 'AIRPORT_ITAMI',
    name: 'JAL_OKI_ITAMI',
    slug: 'jal_oki_itami'
  },
  {
    iata: 'IZO',
    airportId: 'AIRPORT_IZUMO',
    name: 'JAL_OKI_IZUMO',
    slug: 'jal_oki_izumo'
  }
]

const createPage = async browser => {
  const context = await browser.newContext({ locale: 'ja-JP', timezoneId: 'Asia/Tokyo' })
  const page = await context.newPage()
  return { context, page }
}

const parseArgs = argv => {
  const args = {
    outputFile: DEFAULT_OUTPUT_FILE,
    dryRun: false,
    headless: process.env.JAL_HEADLESS === '1',
    periods: []
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--headless') {
      args.headless = true
    } else if (arg === '--headed') {
      args.headless = false
    } else if (arg === '--out') {
      const value = argv[++i]
      if (!value) throw new Error('--out には出力先ファイルを指定してください')
      args.outputFile = isAbsolute(value) ? value : resolve(ROOT, value)
    } else if (arg.startsWith('--out=')) {
      const value = arg.slice('--out='.length)
      args.outputFile = isAbsolute(value) ? value : resolve(ROOT, value)
    } else if (arg === '--period') {
      const value = argv[++i]
      if (!value) throw new Error('--period には YYYYMMDD_YYYYMMDD を指定してください')
      args.periods.push(value)
    } else if (arg.startsWith('--period=')) {
      args.periods.push(arg.slice('--period='.length))
    } else {
      throw new Error(`未知の引数です: ${arg}`)
    }
  }

  return args
}

const formatTodayJst = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date())

const visit = async (page, url, readySelector) => {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
      if (/Access Denied/i.test(await page.title())) {
        throw new Error('JAL公式サイトからアクセスを拒否されました')
      }
      await page.locator(readySelector).waitFor({ state: 'visible', timeout: 45_000 })
      return
    } catch (error) {
      lastError = error
      if (attempt < 3) await page.waitForTimeout(attempt * 2_000)
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`${message}: ${url}`)
}

const loadPublishedPeriods = async (browser, requestedPeriods) => {
  if (requestedPeriods.length > 0) {
    return requestedPeriods.map(parsePublicationPeriod)
  }

  const { context, page } = await createPage(browser)
  try {
    await visit(page, OFFICIAL_INDEX_URL, '#slct_month')
    const values = await page.locator('#slct_month option').evaluateAll(options => options
      .map(option => option.value)
      .filter(value => /^\d{8}_\d{8}$/.test(value)))
    const periods = [...new Set(values)].map(parsePublicationPeriod)
    if (periods.length === 0) throw new Error('JAL公式サイトから掲載期間を取得できませんでした')
    return periods.sort((a, b) => a.startDate.localeCompare(b.startDate))
  } finally {
    await context.close()
  }
}

const extractRows = async (page, selector) => page.locator(`${selector} table tbody tr`).evaluateAll(rows => rows.map(row => {
  const cells = [...row.querySelectorAll('td')]
  return {
    flight: cells[0]?.textContent?.trim() || '',
    departureTime: cells[1]?.textContent?.trim() || '',
    arrivalTime: cells[2]?.textContent?.trim() || '',
    remarks: cells[3]?.textContent?.trim() || ''
  }
}))

const fetchObservations = async (browser, periods) => {
  const observations = []

  for (const route of ROUTES) {
    for (const period of periods) {
      const { context, page } = await createPage(browser)
      try {
        const url = new URL(OFFICIAL_TIMETABLE_URL)
        url.searchParams.set('departure', route.iata)
        url.searchParams.set('arrival', 'OKI')
        url.searchParams.set('month', period.value)
        await visit(page, url.toString(), '#JS_depArrData table')
        await page.locator('#JS_arrDepData table').waitFor({ state: 'visible', timeout: 45_000 })

        const outboundRows = await extractRows(page, '#JS_depArrData')
        const inboundRows = await extractRows(page, '#JS_arrDepData')
        if (outboundRows.length === 0 || inboundRows.length === 0) {
          throw new Error(`JAL隠岐便が見つかりません: ${route.iata} (${period.value})`)
        }

        observations.push({
          route,
          period,
          direction: { departure: route.airportId, arrival: 'AIRPORT_OKI' },
          rows: outboundRows
        }, {
          route,
          period,
          direction: { departure: 'AIRPORT_OKI', arrival: route.airportId },
          rows: inboundRows
        })
        await page.waitForTimeout(2_500)
      } finally {
        await context.close()
      }
    }
  }

  return observations.flatMap(observation => observation.rows.map(row => ({ ...observation, row })))
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const browser = await chromium.launch({ headless: args.headless })

  try {
    const periods = await loadPublishedPeriods(browser, args.periods)
    const observations = await fetchObservations(browser, periods)
    const trips = buildJalTimetableTrips(observations)
    validateJalTimetableCoverage(trips, periods, ROUTES, formatTodayJst())

    console.log('JAL公式サイトから隠岐便の時刻表を取得しました')
    console.log(`source=${OFFICIAL_INDEX_URL}`)
    console.log(`periods=${periods.map(period => period.value).join(',')}`)
    console.log(`trips=${trips.length}`)
    console.log(`flights=${[...new Set(trips.map(trip => trip.vehicle_id))].join(',')}`)

    if (args.dryRun) {
      console.log(`[dry-run] write skipped: ${args.outputFile}`)
      return
    }

    mkdirSync(dirname(args.outputFile), { recursive: true })
    writeFileSync(args.outputFile, `${JSON.stringify(trips, null, 2)}\n`, 'utf-8')
    console.log(`written=${pathToFileURL(args.outputFile).href}`)
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
