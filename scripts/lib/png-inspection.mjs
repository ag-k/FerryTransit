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
