import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  APP_STORE_ASSET_GROUPS,
  verifyAppStoreAssets,
} from '../../../../scripts/verify-app-store-assets.mjs'

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
  const rootDir = await mkdtemp(join(tmpdir(), 'app-store-assets-'))
  temporaryRoots.push(rootDir)

  for (const group of APP_STORE_ASSET_GROUPS) {
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

describe('verifyAppStoreAssets', () => {
  it('iPhone・iPadの日英画像12件を検証する', async () => {
    const verified = await verifyAppStoreAssets({ rootDir: await createCompleteFixture() })

    expect(verified).toHaveLength(12)
    expect(new Set(verified.map(asset => asset.sha256))).toHaveLength(12)
  })

  it('不足・余分なPNGを拒否する', async () => {
    const rootDir = await createCompleteFixture()
    await writeFile(
      resolve(rootDir, 'output/appstore-screenshots/ios-sim-6.7-ja/old.png'),
      png(1320, 2868, 'extra'),
    )

    await expect(verifyAppStoreAssets({ rootDir })).rejects.toThrow('PNGファイル構成が不正です')
  })

  it('寸法が異なる画像を拒否する', async () => {
    const rootDir = await createCompleteFixture()
    await writeFile(
      resolve(rootDir, 'output/appstore-screenshots/ios-sim-ipad-13-ja/01_timetable.png'),
      png(1320, 2868, 'wrong-size'),
    )

    await expect(verifyAppStoreAssets({ rootDir })).rejects.toThrow('寸法が不正です')
  })

  it('内容が重複した画像を拒否する', async () => {
    const rootDir = await createCompleteFixture()
    const duplicate = png(1320, 2868, 'duplicate')
    await Promise.all([
      writeFile(resolve(rootDir, 'output/appstore-screenshots/ios-sim-6.7-en/01_timetable.png'), duplicate),
      writeFile(resolve(rootDir, 'output/appstore-screenshots/ios-sim-6.7-en/02_transit.png'), duplicate),
    ])

    await expect(verifyAppStoreAssets({ rootDir })).rejects.toThrow('内容が重複しています')
  })
})
