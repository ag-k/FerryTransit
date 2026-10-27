// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const scopes = [
  ['root', 'package.json'],
  ['functions', 'src/functions/package.json']
] as const

describe.each(scopes)('%s dependency regressions', (_scope, manifest) => {
  it('survives a small compressed body with trailing bytes and parses the next valid body', () => {
    const result = spawnSync(process.execPath, [
      resolve('src/test/fixtures/security/body-parser-trailing-bytes.mjs'), resolve(manifest)
    ], { encoding: 'utf8', timeout: 7000 })
    expect(result.error).toBeUndefined()
    expect(result.signal).toBeNull()
    expect(result.status, result.stderr).toBe(0)
    const probe = JSON.parse(result.stdout) as { followingStatus: number; payloadBytes: number }
    expect(probe.followingStatus).toBe(200)
    expect(probe.payloadBytes).toBeLessThan(128)
  })

  it('stringifies comma arrays with a non-callable own toString without throwing', () => {
    const require = createRequire(resolve(manifest))
    const qs = require('qs') as { stringify: (value: unknown, options: { arrayFormat: string }) => string }
    const value = { items: [{ toString: 'not callable' }] }
    let output = ''
    expect(() => { output = qs.stringify(value, { arrayFormat: 'comma' }) }).not.toThrow()
    expect(typeof output).toBe('string')
    expect(output).toContain('items=')
  })
})
