#!/usr/bin/env node

import { runTransportPipeline, TRANSPORT_STAGES } from '../lib/transport-orchestrator.mjs'

const action = process.argv[2]
const args = { sourceId: '', target: '', gitSha: '', dryRun: false }
for (let index = 3; index < process.argv.length; index++) {
  const arg = process.argv[index]
  if (arg === '--source') args.sourceId = process.argv[++index] || ''
  else if (arg.startsWith('--source=')) args.sourceId = arg.slice(9)
  else if (arg === '--target') args.target = process.argv[++index] || ''
  else if (arg.startsWith('--target=')) args.target = arg.slice(9)
  else if (arg === '--git-sha') args.gitSha = process.argv[++index] || ''
  else if (arg.startsWith('--git-sha=')) args.gitSha = arg.slice(10)
  else if (arg === '--dry-run' || arg === '--check') args.dryRun = true
  else throw new Error(`未知の引数です: ${arg}`)
}

if (!args.sourceId) throw new Error('--source <source-id> を指定してください')
const stages = action === 'update' ? TRANSPORT_STAGES : [action]
const result = runTransportPipeline({
  sourceId: args.sourceId,
  stages,
  target: args.target || undefined,
  gitSha: args.gitSha || undefined,
  dryRun: args.dryRun
})

console.log(`transport source=${result.sourceId} scope=${result.scope} target=${result.target || '-'}`)
for (const item of result.results) console.log(`${item.stage}: ${item.status}: ${item.command}`)
