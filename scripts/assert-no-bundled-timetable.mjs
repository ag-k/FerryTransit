#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function findBundledTimetableFiles(outputRoot) {
  if (!existsSync(outputRoot)) throw new Error(`アプリ成果物が見つかりません: ${outputRoot}`)
  const violations = []
  const visit = (dir) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = resolve(dir, entry)
      if (statSync(fullPath).isDirectory()) {
        visit(fullPath)
        continue
      }
      const path = relative(outputRoot, fullPath).split('\\').join('/')
      if (/^(?:data\/)?(?:timetable\.json|gtfs\/|bus-search\/)/i.test(path)) {
        violations.push(path)
        continue
      }
      if (path.endsWith('.json')) {
        const text = readFileSync(fullPath, 'utf8')
        if (/"trip_id"\s*:/.test(text) && /"departure_time"\s*:/.test(text)) violations.push(path)
      }
    }
  }
  visit(outputRoot)
  return violations.sort()
}

export function assertNoBundledTimetable(outputRoot) {
  const violations = findBundledTimetableFiles(outputRoot)
  if (violations.length > 0) {
    throw new Error(`アプリ成果物に時刻表データが含まれています:\n${violations.join('\n')}`)
  }
  return true
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const outputRoot = resolve(process.cwd(), process.argv[2] || '.output/public')
  assertNoBundledTimetable(outputRoot)
  console.log(`時刻表データ非同梱チェック OK: ${outputRoot}`)
}
