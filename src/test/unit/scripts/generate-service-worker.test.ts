import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const moduleUrl = pathToFileURL(resolve('scripts/generate-service-worker.mjs')).href
const {
  collectPrecacheFiles,
  generateServiceWorker
}: typeof import('../../../../scripts/generate-service-worker.mjs') = await import(moduleUrl)

const roots: string[] = []

const createOutput = () => {
  const root = mkdtempSync(join(tmpdir(), 'ferry-sw-'))
  roots.push(root)
  mkdirSync(join(root, '_nuxt'), { recursive: true })
  mkdirSync(join(root, 'data'), { recursive: true })
  mkdirSync(join(root, 'images'), { recursive: true })
  writeFileSync(join(root, 'index.html'), '<html><script src="/_nuxt/app.js"></script></html>')
  writeFileSync(join(root, '200.html'), '<html></html>')
  writeFileSync(join(root, '_nuxt', 'app.js'), 'console.log("app")')
  writeFileSync(join(root, '_nuxt', 'app.css'), 'body{}')
  writeFileSync(join(root, 'data', 'timetable.json'), '{}')
  writeFileSync(join(root, 'images', 'ferry.jpg'), 'image')
  return root
}

afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })))

describe('generate-service-worker', () => {
  it('precaches the app shell without bundling runtime transport data', () => {
    const root = createOutput()

    expect(collectPrecacheFiles(root)).toEqual([
      '200.html',
      '_nuxt/app.css',
      '_nuxt/app.js',
      'index.html'
    ])
  })

  it('generates navigation fallback and old-cache cleanup logic', () => {
    const root = createOutput()
    const result = generateServiceWorker(root)
    const source = readFileSync(result.outputPath, 'utf8')

    expect(result.cacheEntries).toBe(4)
    expect(source).toContain("event.request.mode === 'navigate'")
    expect(source).toContain("caches.match('/index.html')")
    expect(source).toContain("cacheName.startsWith(CACHE_PREFIX)")
    expect(source).not.toContain('/data/timetable.json')
    expect(source).not.toContain('/images/ferry.jpg')
  })
})
