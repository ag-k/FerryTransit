import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const moduleUrl = pathToFileURL(resolve('scripts/lib/storage-manifest.mjs')).href
const { validateStorageManifest } = await import(moduleUrl)

const manifest = {
  version: 1,
  sourceId: 'public-timetable',
  environment: 'dev',
  gitSha: 'a'.repeat(40),
  generatedAt: null,
  objects: [{ path: 'data/timetable.json', sha256: 'b'.repeat(64), bytes: 123 }]
}

describe('storage manifest', () => {
  it('環境・Git SHA・公開物を検証する', () => {
    expect(validateStorageManifest(manifest, { environment: 'dev', gitSha: 'a'.repeat(40) })).toBe(manifest)
  })

  it('異なるGit SHAと重複パスを拒否する', () => {
    expect(() => validateStorageManifest(manifest, { gitSha: 'c'.repeat(40) })).toThrow('Git SHA')
    expect(() => validateStorageManifest({ ...manifest, objects: [...manifest.objects, ...manifest.objects] }))
      .toThrow('重複')
  })
})
