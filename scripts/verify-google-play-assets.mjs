import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

function calculateCrc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

export const GOOGLE_PLAY_ASSET_GROUPS = [
  {
    label: 'アプリアイコン',
    directory: 'output/google-play-assets',
    files: ['app-icon-512.png'],
    width: 512,
    height: 512,
    maxBytes: 1024 * 1024,
  },
  ...['ja', 'en'].map(locale => ({
    label: `携帯電話 (${locale})`,
    directory: `output/google-play-screenshots/android-phone-${locale}`,
    files: ['01_timetable.png', '02_transit.png', '03_status.png', '04_fare.png'],
    width: 1080,
    height: 2220,
  })),
  ...['ja', 'en'].map(locale => ({
    label: `タブレット (${locale})`,
    directory: `output/google-play-screenshots/android-tablet-${locale}`,
    files: [
      '01_timetable.png',
      '02_transit.png',
      '03_status.png',
      '04_fare.png',
      '05_about.png',
    ],
    width: 2560,
    height: 1600,
  })),
]

export function inspectPng(buffer, label = 'PNG') {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${label}: PNGシグネチャが不正です`)
  }

  let offset = 8
  let ihdr = null
  let foundIend = false

  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) {
      throw new Error(`${label}: PNGチャンクが途中で切れています`)
    }

    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const dataStart = offset + 8
    const nextOffset = dataStart + length + 4

    if (nextOffset > buffer.length) {
      throw new Error(`${label}: ${type}チャンクが途中で切れています`)
    }

    const expectedCrc = buffer.readUInt32BE(dataStart + length)
    const actualCrc = calculateCrc32(buffer.subarray(offset + 4, dataStart + length))
    if (actualCrc !== expectedCrc) {
      throw new Error(`${label}: ${type}チャンクのCRCが不正です`)
    }

    if (offset === 8 && (type !== 'IHDR' || length !== 13)) {
      throw new Error(`${label}: 先頭チャンクが有効なIHDRではありません`)
    }

    if (type === 'IHDR') {
      if (ihdr) {
        throw new Error(`${label}: IHDRチャンクが重複しています`)
      }
      ihdr = {
        width: buffer.readUInt32BE(dataStart),
        height: buffer.readUInt32BE(dataStart + 4),
        bitDepth: buffer[dataStart + 8],
        colorType: buffer[dataStart + 9],
      }
    }

    offset = nextOffset
    if (type === 'IEND') {
      if (length !== 0 || offset !== buffer.length) {
        throw new Error(`${label}: IENDチャンクまたは終端が不正です`)
      }
      foundIend = true
      break
    }
  }

  if (!ihdr || !foundIend) {
    throw new Error(`${label}: 必須PNGチャンクがありません`)
  }

  return ihdr
}

export async function verifyGooglePlayAssets({ rootDir = process.cwd() } = {}) {
  const verified = []
  const hashes = new Map()

  for (const group of GOOGLE_PLAY_ASSET_GROUPS) {
    const directory = resolve(rootDir, group.directory)
    const actualPngFiles = (await readdir(directory))
      .filter(name => name.toLowerCase().endsWith('.png'))
      .sort()
    const expectedPngFiles = [...group.files].sort()

    if (JSON.stringify(actualPngFiles) !== JSON.stringify(expectedPngFiles)) {
      throw new Error(
        `${group.label}: PNGファイル構成が不正です（期待: ${expectedPngFiles.join(', ')} / 実際: ${actualPngFiles.join(', ')}）`,
      )
    }

    for (const filename of group.files) {
      const filePath = resolve(directory, filename)
      const [buffer, fileStat] = await Promise.all([readFile(filePath), stat(filePath)])
      const label = `${group.label}/${filename}`
      const png = inspectPng(buffer, label)

      if (png.width !== group.width || png.height !== group.height) {
        throw new Error(
          `${label}: 寸法が不正です（期待: ${group.width}x${group.height} / 実際: ${png.width}x${png.height}）`,
        )
      }
      if (png.bitDepth !== 8 || png.colorType !== 6) {
        throw new Error(
          `${label}: 8-bit RGBA PNGではありません（bitDepth=${png.bitDepth}, colorType=${png.colorType}）`,
        )
      }
      if (group.maxBytes && fileStat.size > group.maxBytes) {
        throw new Error(`${label}: ファイルサイズが上限${group.maxBytes} bytesを超えています`)
      }

      const sha256 = createHash('sha256').update(buffer).digest('hex')
      const duplicate = hashes.get(sha256)
      if (duplicate) {
        throw new Error(`${label}: ${duplicate}と内容が重複しています`)
      }
      hashes.set(sha256, label)
      verified.push({
        group: group.label,
        filename,
        width: png.width,
        height: png.height,
        bytes: fileStat.size,
        sha256,
      })
    }
  }

  return verified
}

async function main() {
  const verified = await verifyGooglePlayAssets()
  const counts = new Map()
  for (const asset of verified) {
    counts.set(asset.group, (counts.get(asset.group) ?? 0) + 1)
  }

  const lines = [`Google Play提出画像 ${verified.length}件を検証しました。`]
  for (const [group, count] of counts) {
    lines.push(`- ${group}: ${count}件`)
  }
  lines.push('PNG構造、ファイル名、寸法、8-bit RGBA、重複、アイコン容量: OK')
  process.stdout.write(`${lines.join('\n')}\n`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
