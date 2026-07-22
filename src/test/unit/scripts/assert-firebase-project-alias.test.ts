import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const moduleUrl = pathToFileURL(resolve('scripts/assert-firebase-project-alias.mjs')).href
const { assertFirebaseProjectAliases, readEnvValue } = await import(moduleUrl)
const roots: string[] = []

const createFixture = (projects: Record<string, string>, envProjectId = 'project-prod') => {
  const root = mkdtempSync(join(tmpdir(), 'ferry-firebase-alias-'))
  roots.push(root)
  const firebasercPath = join(root, '.firebaserc')
  const envPath = join(root, '.env.production')
  writeFileSync(firebasercPath, JSON.stringify({ projects }))
  writeFileSync(envPath, `NUXT_PUBLIC_FIREBASE_PROJECT_ID=${envProjectId}\n`)
  return { firebasercPath, envPath }
}

afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })))

describe('Firebase project alias guard', () => {
  it('reads quoted and exported env values', () => {
    expect(readEnvValue('export TARGET="project-prod"\n', 'TARGET')).toBe('project-prod')
  })

  it('accepts aliases that match the environment project', () => {
    const fixture = createFixture({ default: 'project-prod', prod: 'project-prod' })
    expect(assertFirebaseProjectAliases({
      ...fixture,
      aliases: ['prod', 'default']
    })).toBe(true)
  })

  it('rejects a missing alias', () => {
    const fixture = createFixture({ default: 'project-prod' })
    expect(() => assertFirebaseProjectAliases({
      ...fixture,
      aliases: ['prod']
    })).toThrow('Firebase aliasが定義されていません: prod')
  })

  it('rejects an alias that points at another project', () => {
    const fixture = createFixture({ prod: 'project-dev' })
    expect(() => assertFirebaseProjectAliases({
      ...fixture,
      aliases: ['prod']
    })).toThrow('Firebase aliasと環境設定のProject IDが一致しません: prod')
  })
})
