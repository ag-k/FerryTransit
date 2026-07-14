import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const moduleUrl = pathToFileURL(resolve('scripts/assert-no-bundled-timetable.mjs')).href
const { findBundledTimetableFiles } = await import(moduleUrl)
const roots: string[] = []

afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })))

describe('app timetable bundle guard', () => {
  it('通常のアプリ成果物を許可する', () => {
    const root = mkdtempSync(join(tmpdir(), 'ferry-app-'))
    roots.push(root)
    writeFileSync(join(root, 'index.html'), '<html></html>')
    expect(findBundledTimetableFiles(root)).toEqual([])
  })

  it('時刻表・GTFSデータの同梱を拒否する', () => {
    const root = mkdtempSync(join(tmpdir(), 'ferry-app-'))
    roots.push(root)
    mkdirSync(join(root, 'data'), { recursive: true })
    writeFileSync(join(root, 'data', 'timetable.json'), '[]')
    expect(findBundledTimetableFiles(root)).toEqual(['data/timetable.json'])
  })
})
