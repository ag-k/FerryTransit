import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const moduleUrl = pathToFileURL(resolve('scripts/gtfs/acquire-ama-r8.mjs')).href
const { extractDocumentLinks, extractUpdatedDate, validateOfficialPage } = await import(moduleUrl)
const source = JSON.parse(readFileSync(resolve('gtfs/sources/ama.bus.json'), 'utf8'))

describe('海士町バス公式資料の取得', () => {
  it('公式ページの更新日とPDFリンクを抽出する', () => {
    const html = `
      <p>更新日：2026年7月1日</p>
      ${source.sourceDocuments.map((document: any) => `<a href="${document.url}">${document.title}</a>`).join('')}
    `
    expect(extractUpdatedDate(html)).toBe('2026-07-01')
    expect(extractDocumentLinks(html, source.sourceUrl)).toEqual(new Set(source.sourceDocuments.map((document: any) => document.url)))
    expect(validateOfficialPage(html, source).updatedAt).toBe('2026-07-01')
  })

  it('採用日より新しい公式ページと消えたPDFリンクを拒否する', () => {
    expect(() => validateOfficialPage('<p>更新日：2026年7月2日</p>', source)).toThrow(/未反映の更新/)
    expect(() => validateOfficialPage('<p>更新日：2026年7月1日</p>', source)).toThrow(/公式PDF/)
  })

  it('保存済みPDFがコード管理されたSHA-256と一致する', () => {
    for (const document of [...source.legacySourceDocuments, ...source.sourceDocuments]) {
      const hash = createHash('sha256').update(readFileSync(resolve(document.file))).digest('hex')
      expect(hash, document.file).toBe(document.sha256)
    }
  })
})
