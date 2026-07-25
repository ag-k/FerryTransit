#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ID_KEY = 'NUXT_PUBLIC_FIREBASE_PROJECT_ID'

export function readEnvValue(envText, key) {
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match || match[1] !== key) continue

    const value = match[2]?.trim() || ''
    if (
      value.length >= 2
      && ((value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'")))
    ) {
      return value.slice(1, -1)
    }
    return value
  }
  return undefined
}

export function assertFirebaseProjectAliases({
  firebasercPath,
  envPath,
  aliases
}) {
  if (!existsSync(firebasercPath)) {
    throw new Error(`Firebase alias設定が見つかりません: ${firebasercPath}`)
  }
  if (!existsSync(envPath)) {
    throw new Error(`環境設定が見つかりません: ${envPath}`)
  }
  if (!aliases.length) {
    throw new Error('検証するFirebase aliasを1件以上指定してください')
  }

  let firebaseConfig
  try {
    firebaseConfig = JSON.parse(readFileSync(firebasercPath, 'utf8'))
  } catch {
    throw new Error(`Firebase alias設定をJSONとして読み取れません: ${firebasercPath}`)
  }

  const expectedProjectId = readEnvValue(
    readFileSync(envPath, 'utf8'),
    PROJECT_ID_KEY
  )
  if (!expectedProjectId) {
    throw new Error(`${envPath} に ${PROJECT_ID_KEY} がありません`)
  }

  for (const alias of aliases) {
    const aliasedProjectId = firebaseConfig.projects?.[alias]
    if (!aliasedProjectId) {
      throw new Error(`Firebase aliasが定義されていません: ${alias}`)
    }
    if (aliasedProjectId !== expectedProjectId) {
      throw new Error(`Firebase aliasと環境設定のProject IDが一致しません: ${alias}`)
    }
  }

  return true
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const envPath = resolve(process.cwd(), process.argv[2] || '.env.production')
  const aliases = process.argv.slice(3)
  const firebasercPath = resolve(process.cwd(), '.firebaserc')

  assertFirebaseProjectAliases({ firebasercPath, envPath, aliases })
  console.log(`Firebase project alias check OK: ${aliases.join(', ')}`)
}
