import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  extractMarkdownSection,
  verifyStoreMetadataContents,
} from '../../../../scripts/verify-store-metadata.mjs'

const APP_STORE_PATH = resolve('docs/reports/app-store-metadata-v2.4.md')
const GOOGLE_PLAY_PATH = resolve('docs/reports/google-play-metadata-v2.4.md')

describe('verifyStoreMetadataContents', () => {
  it('現在の日英ストアメタデータが文字数・URL制約を満たす', async () => {
    const [appStore, googlePlay] = await Promise.all([
      readFile(APP_STORE_PATH, 'utf8'),
      readFile(GOOGLE_PLAY_PATH, 'utf8'),
    ])

    expect(verifyStoreMetadataContents({ appStore, googlePlay })).toEqual({
      appStore: {
        jaSubtitle: 17,
        enSubtitle: 25,
        jaDescription: 414,
        enDescription: 1042,
        jaKeywordsBytes: 90,
        enKeywordsBytes: 65,
        jaWhatsNew: 173,
        enWhatsNew: 376,
      },
      googlePlay: {
        jaShort: 42,
        enShort: 72,
        jaFull: 414,
        enFull: 1042,
      },
    })
  })

  it('見出し配下の本文だけを抽出する', () => {
    expect(extractMarkdownSection('### First\nvalue\n\n### Second\nnext', 'First')).toBe('value')
  })

  it('Google Playの短い説明が80文字を超える場合は拒否する', async () => {
    const [appStore, googlePlay] = await Promise.all([
      readFile(APP_STORE_PATH, 'utf8'),
      readFile(GOOGLE_PLAY_PATH, 'utf8'),
    ])
    const tooLong = googlePlay.replace(
      /### 短い説明\n\n[^\n]+/,
      `### 短い説明\n\n${'長'.repeat(81)}`,
    )

    expect(() => verifyStoreMetadataContents({ appStore, googlePlay: tooLong }))
      .toThrow('Google Play日本語短い説明が80文字を超えています')
  })
})
