import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOGLE_PLAY_ASSET_GROUPS,
  inspectPng,
  verifyGooglePlayAssets,
} from '../../../../scripts/verify-google-play-assets.mjs'

const temporaryRoots: string[] = []

function calculateCrc32(buffer: Buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data = Buffer.alloc(0)) {
  const result = Buffer.alloc(12 + data.length)
  result.writeUInt32BE(data.length, 0)
  result.write(type, 4, 4, 'ascii')
  data.copy(result, 8)
  result.writeUInt32BE(calculateCrc32(result.subarray(4, 8 + data.length)), 8 + data.length)
  return result
}

function png(width: number, height: number, uniqueText = '') {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('tEXt', Buffer.from(uniqueText)),
    chunk('IEND'),
  ])
}

async function createCompleteFixture() {
  const rootDir = await mkdtemp(join(tmpdir(), 'google-play-assets-'))
  temporaryRoots.push(rootDir)

  for (const group of GOOGLE_PLAY_ASSET_GROUPS) {
    const directory = resolve(rootDir, group.directory)
    await mkdir(directory, { recursive: true })
    for (const filename of group.files) {
      await writeFile(
        resolve(directory, filename),
        png(group.width, group.height, `${group.directory}/${filename}`),
      )
    }
  }

  return rootDir
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('inspectPng', () => {
  it('8-bit RGBA PNGの寸法を読み取る', () => {
    expect(inspectPng(png(1080, 2220))).toEqual({
      width: 1080,
      height: 2220,
      bitDepth: 8,
      colorType: 6,
    })
  })

  it('途中で切れたPNGを拒否する', () => {
    const truncated = png(512, 512).subarray(0, -1)
    expect(() => inspectPng(truncated)).toThrow('途中で切れています')
  })
})

describe('verifyGooglePlayAssets', () => {
  it('アイコン1件・携帯8件・タブレット10件を検証する', async () => {
    const rootDir = await createCompleteFixture()
    const verified = await verifyGooglePlayAssets({ rootDir })

    expect(verified).toHaveLength(19)
    expect(new Set(verified.map(asset => asset.sha256))).toHaveLength(19)
  })

  it('不足・余分なPNGを拒否する', async () => {
    const rootDir = await createCompleteFixture()
    const extra = resolve(rootDir, 'output/google-play-assets/old-icon.png')
    await writeFile(extra, png(512, 512, 'extra'))

    await expect(verifyGooglePlayAssets({ rootDir })).rejects.toThrow('PNGファイル構成が不正です')
  })

  it('内容が重複した画像を拒否する', async () => {
    const rootDir = await createCompleteFixture()
    const duplicate = png(1080, 2220, 'duplicate')
    await Promise.all([
      writeFile(resolve(rootDir, 'output/google-play-screenshots/android-phone-ja/01_timetable.png'), duplicate),
      writeFile(resolve(rootDir, 'output/google-play-screenshots/android-phone-ja/02_transit.png'), duplicate),
    ])

    await expect(verifyGooglePlayAssets({ rootDir })).rejects.toThrow('内容が重複しています')
  })
})
