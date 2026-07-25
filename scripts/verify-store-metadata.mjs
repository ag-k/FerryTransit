import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const REQUIRED_URLS = [
  'https://transit.oki-digilab.com/',
  'https://transit.oki-digilab.com/privacy',
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

export function extractMarkdownSection(markdown, heading) {
  const marker = `### ${heading}`
  const markerIndex = markdown.indexOf(marker)
  assert(markerIndex >= 0, `見出し「${heading}」がありません`)

  const start = markerIndex + marker.length
  const remaining = markdown.slice(start).replace(/^\s*\n/, '')
  const nextHeading = remaining.search(/\n#{1,3} /)
  const value = (nextHeading >= 0 ? remaining.slice(0, nextHeading) : remaining).trim()
  assert(value.length > 0, `見出し「${heading}」の内容が空です`)
  return value
}

function unicodeLength(value) {
  return [...value].length
}

function assertMaxLength(value, max, label) {
  const length = unicodeLength(value)
  assert(length <= max, `${label}が${max}文字を超えています: ${length}`)
  return length
}

export function verifyStoreMetadataContents({ appStore, googlePlay }) {
  const appStoreFields = {
    jaSubtitle: extractMarkdownSection(appStore, 'サブタイトル'),
    jaDescription: extractMarkdownSection(appStore, '説明'),
    jaKeywords: extractMarkdownSection(appStore, 'キーワード'),
    jaWhatsNew: extractMarkdownSection(appStore, 'このバージョンの新機能'),
    enSubtitle: extractMarkdownSection(appStore, 'Subtitle'),
    enDescription: extractMarkdownSection(appStore, 'Description'),
    enKeywords: extractMarkdownSection(appStore, 'Keywords'),
    enWhatsNew: extractMarkdownSection(appStore, "What's New in This Version"),
  }
  const googlePlayFields = {
    jaShort: extractMarkdownSection(googlePlay, '短い説明'),
    jaFull: extractMarkdownSection(googlePlay, '詳細な説明'),
    enShort: extractMarkdownSection(googlePlay, 'Short description'),
    enFull: extractMarkdownSection(googlePlay, 'Full description'),
  }

  const summary = {
    appStore: {
      jaSubtitle: assertMaxLength(appStoreFields.jaSubtitle, 30, 'App Store日本語サブタイトル'),
      enSubtitle: assertMaxLength(appStoreFields.enSubtitle, 30, 'App Store英語サブタイトル'),
      jaDescription: assertMaxLength(appStoreFields.jaDescription, 4000, 'App Store日本語説明'),
      enDescription: assertMaxLength(appStoreFields.enDescription, 4000, 'App Store英語説明'),
      jaKeywordsBytes: Buffer.byteLength(appStoreFields.jaKeywords),
      enKeywordsBytes: Buffer.byteLength(appStoreFields.enKeywords),
      jaWhatsNew: assertMaxLength(appStoreFields.jaWhatsNew, 4000, 'App Store日本語新機能'),
      enWhatsNew: assertMaxLength(appStoreFields.enWhatsNew, 4000, 'App Store英語新機能'),
    },
    googlePlay: {
      jaShort: assertMaxLength(googlePlayFields.jaShort, 80, 'Google Play日本語短い説明'),
      enShort: assertMaxLength(googlePlayFields.enShort, 80, 'Google Play英語短い説明'),
      jaFull: assertMaxLength(googlePlayFields.jaFull, 4000, 'Google Play日本語詳細説明'),
      enFull: assertMaxLength(googlePlayFields.enFull, 4000, 'Google Play英語詳細説明'),
    },
  }

  assert(summary.appStore.jaKeywordsBytes <= 100, `App Store日本語キーワードが100 bytesを超えています: ${summary.appStore.jaKeywordsBytes}`)
  assert(summary.appStore.enKeywordsBytes <= 100, `App Store英語キーワードが100 bytesを超えています: ${summary.appStore.enKeywordsBytes}`)

  for (const url of REQUIRED_URLS) {
    assert(appStore.includes(url), `App Storeメタデータに必須URLがありません: ${url}`)
    assert(googlePlay.includes(url), `Google Playメタデータに必須URLがありません: ${url}`)
  }

  return summary
}

export async function verifyStoreMetadata(rootDir = process.cwd()) {
  const [appStore, googlePlay] = await Promise.all([
    readFile(resolve(rootDir, 'docs/reports/app-store-metadata-v2.4.md'), 'utf8'),
    readFile(resolve(rootDir, 'docs/reports/google-play-metadata-v2.4.md'), 'utf8'),
  ])
  return verifyStoreMetadataContents({ appStore, googlePlay })
}

async function main() {
  const result = await verifyStoreMetadata()
  process.stdout.write([
    'ストアメタデータの制約を検証しました。',
    `- App Store subtitle: ja ${result.appStore.jaSubtitle}/30, en ${result.appStore.enSubtitle}/30`,
    `- App Store keywords: ja ${result.appStore.jaKeywordsBytes}/100 bytes, en ${result.appStore.enKeywordsBytes}/100 bytes`,
    `- App Store description: ja ${result.appStore.jaDescription}/4000, en ${result.appStore.enDescription}/4000`,
    `- App Store What's New: ja ${result.appStore.jaWhatsNew}/4000, en ${result.appStore.enWhatsNew}/4000`,
    `- Google Play short: ja ${result.googlePlay.jaShort}/80, en ${result.googlePlay.enShort}/80`,
    `- Google Play full: ja ${result.googlePlay.jaFull}/4000, en ${result.googlePlay.enFull}/4000`,
    '- サポート・マーケティング・プライバシーURL: 記載あり',
    '',
  ].join('\n'))
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
