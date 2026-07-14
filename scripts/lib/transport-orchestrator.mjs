import { spawnSync } from 'node:child_process'
import { loadTransportSourceRegistry } from './transport-source-registry.mjs'

export const TRANSPORT_STAGES = Object.freeze(['acquire', 'validate', 'build', 'publish', 'smoke'])
export const TRANSPORT_STAGE_TASKS = Object.freeze({
  acquire: 'transport:acquire',
  validate: 'transport:check',
  build: 'transport:build',
  publish: 'transport:publish',
  smoke: 'transport:smoke'
})

const npmTask = (task, args = []) => ({
  executable: 'npm',
  args: ['run', task, ...(args.length ? ['--', ...args] : [])],
  label: `npm run ${task}${args.length ? ` -- ${args.join(' ')}` : ''}`
})

const taskName = (command) => {
  const match = /^npm run ([^\s]+)$/.exec(String(command || '').trim())
  if (!match) throw new Error(`レジストリのタスク形式が不正です: ${command}`)
  return match[1]
}

export function buildTransportPipeline(sourceId, { root = process.cwd(), target, gitSha } = {}) {
  const registry = loadTransportSourceRegistry(root)
  const source = registry.byId[sourceId]
  if (!source) throw new Error(`未登録の交通ソースです: ${sourceId}`)

  if (source.sourceType === 'timetable') {
    return {
      sourceId,
      scope: 'timetable',
      stages: {
        acquire: npmTask(taskName(source.acquisitionTask)),
        validate: npmTask('transport:check:timetable'),
        build: npmTask(taskName(source.buildTask)),
        publish: target ? npmTask('timetable:publish', ['--target', target]) : null,
        smoke: target ? npmTask('transport:smoke:storage', [
          '--scope', 'timetable', '--target', target,
          ...(gitSha ? ['--git-sha', gitSha] : [])
        ]) : null
      }
    }
  }

  if (source.sourceType === 'gtfs' && source.feedId) {
    return {
      sourceId,
      scope: 'gtfs',
      stages: {
        acquire: npmTask(taskName(source.conversionTask), source.conversionArgs || []),
        validate: npmTask('gtfs:validate', ['bus', source.feedId, '--check']),
        build: npmTask('gtfs:build', ['bus', source.feedId]),
        publish: target ? npmTask('gtfs:upload', ['--target', target]) : null,
        smoke: target ? npmTask('transport:smoke:storage', [
          '--scope', 'gtfs', '--target', target,
          ...(gitSha ? ['--git-sha', gitSha] : [])
        ]) : null
      }
    }
  }

  throw new Error(`${sourceId} には実行可能なデータパイプラインが登録されていません`)
}

export function getTransportStageCommand(sourceId, stage, options = {}) {
  if (!TRANSPORT_STAGES.includes(stage)) throw new Error(`不正なステージです: ${stage}`)
  const command = buildTransportPipeline(sourceId, options).stages[stage]
  if (!command) {
    throw new Error(`${stage} には --target dev|prod の明示が必要です`)
  }
  return command
}

export function getTransportCliCommand(sourceId, stage, { target } = {}) {
  if (!TRANSPORT_STAGES.includes(stage)) throw new Error(`不正なステージです: ${stage}`)
  const args = ['--source', sourceId]
  if (target) args.push('--target', target)
  return npmTask(TRANSPORT_STAGE_TASKS[stage], args)
}

export function runTransportPipeline({
  sourceId,
  stages = TRANSPORT_STAGES,
  target,
  gitSha,
  root = process.cwd(),
  dryRun = false,
  runner = spawnSync
}) {
  if ((stages.includes('publish') || stages.includes('smoke')) && !target) {
    throw new Error('publish/smoke には --target dev|prod の明示が必要です')
  }
  if (target === 'prod') {
    throw new Error('prodへの公開はtransport:promoteだけが実行できます')
  }

  const pipeline = buildTransportPipeline(sourceId, { root, target, gitSha })
  const results = []
  for (const stage of stages) {
    const command = getTransportStageCommand(sourceId, stage, { root, target, gitSha })
    if (dryRun) {
      results.push({ stage, command: command.label, status: 'dry-run' })
      continue
    }
    const result = runner(command.executable, command.args, { cwd: root, stdio: 'inherit', env: process.env })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`${stage} に失敗しました: ${command.label} (exit=${result.status})`)
    results.push({ stage, command: command.label, status: 'completed' })
  }
  return { sourceId, scope: pipeline.scope, target: target || null, dryRun, results }
}
