#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateTimetable } from '../timetable/build-public-timetable.mjs'

const file = join(process.cwd(), 'gtfs', 'raw', 'air', 'jal_oki_timetable.json')
const trips = JSON.parse(readFileSync(file, 'utf8'))
validateTimetable(trips)
const names = new Set(trips.map(trip => trip.name))
for (const name of ['JAL_OKI_ITAMI', 'JAL_OKI_IZUMO']) {
  if (!names.has(name)) throw new Error(`JAL時刻表に必須路線がありません: ${name}`)
}
console.log(`JAL入力検証 OK: trips=${trips.length}, routes=${[...names].sort().join(',')}`)
