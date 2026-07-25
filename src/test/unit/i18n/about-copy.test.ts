import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readLocale = (locale: 'ja' | 'en') => JSON.parse(readFileSync(
  resolve(process.cwd(), `i18n/locales/${locale}.json`),
  'utf8',
)) as Record<string, string>

describe('About画面の交通モード説明', () => {
  it('日本語で船・バス・航空の時刻表と乗換案内を説明する', () => {
    const messages = readLocale('ja')

    expect(messages.TIMETABLE_DESC).toContain('船・バス・航空')
    expect(messages.TRANSIT_DESC).toContain('船・バス・航空')
    expect(messages.STATUS_DESC).toContain('船')
  })

  it('英語でferry、bus、flightの時刻表と乗換案内を説明する', () => {
    const messages = readLocale('en')

    for (const mode of ['ferry', 'bus', 'flight']) {
      expect(messages.TIMETABLE_DESC.toLowerCase()).toContain(mode)
    }
    for (const mode of ['ferries', 'buses', 'flights']) {
      expect(messages.TRANSIT_DESC.toLowerCase()).toContain(mode)
    }
    expect(messages.STATUS_DESC.toLowerCase()).toContain('ferry')
  })
})
