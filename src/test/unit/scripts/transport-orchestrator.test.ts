import { describe, expect, it, vi } from 'vitest'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const moduleUrl = pathToFileURL(resolve('scripts/lib/transport-orchestrator.mjs')).href
const {
  buildTransportPipeline,
  getTransportCliCommand,
  runTransportPipeline
} = await import(moduleUrl)

describe('transport orchestrator', () => {
  it('JALを明示的な5段階パイプラインへ解決する', () => {
    const pipeline = buildTransportPipeline('jal-oki-flights', { root: resolve('.'), target: 'dev' })
    expect(pipeline.scope).toBe('timetable')
    expect(Object.keys(pipeline.stages)).toEqual(['acquire', 'validate', 'build', 'publish', 'smoke'])
    expect(pipeline.stages.acquire.label).toBe('npm run timetable:fetch:jal')
    expect(pipeline.stages.publish.label).toBe('npm run timetable:publish -- --target dev')
  })

  it('GTFSの変換・検証・生成をsource IDから解決する', () => {
    const pipeline = buildTransportPipeline('ama-town', { root: resolve('.'), target: 'dev' })
    expect(pipeline.scope).toBe('gtfs')
    expect(pipeline.stages.acquire.label).toBe('npm run gtfs:convert:ama:r8 -- --current')
    expect(pipeline.stages.validate.label).toBe('npm run gtfs:validate -- bus ama --check')
    expect(pipeline.stages.build.label).toBe('npm run gtfs:build -- bus ama')
  })

  it('ダッシュボード用CLIもsource IDとtask IDから生成する', () => {
    expect(getTransportCliCommand('ama-town', 'validate').label)
      .toBe('npm run transport:check -- --source ama-town')
  })

  it('dry-runではコマンドを実行しない', () => {
    const runner = vi.fn()
    const result = runTransportPipeline({
      sourceId: 'jal-oki-flights',
      stages: ['acquire', 'validate', 'build'],
      root: resolve('.'),
      dryRun: true,
      runner
    })
    expect(runner).not.toHaveBeenCalled()
    expect(result.results.every((item: any) => item.status === 'dry-run')).toBe(true)
  })

  it('公開先の省略とprodへの直接公開を拒否する', () => {
    expect(() => runTransportPipeline({ sourceId: 'jal-oki-flights', stages: ['publish'], root: resolve('.'), dryRun: true }))
      .toThrow('--target dev|prod')
    expect(() => runTransportPipeline({ sourceId: 'jal-oki-flights', stages: ['publish'], target: 'prod', root: resolve('.'), dryRun: true }))
      .toThrow('transport:promote')
  })

  it('promote後のprod smokeは読み取り専用で許可する', () => {
    const runner = vi.fn(() => ({ status: 0 }))
    const result = runTransportPipeline({
      sourceId: 'jal-oki-flights',
      stages: ['smoke'],
      target: 'prod',
      gitSha: 'a'.repeat(40),
      root: resolve('.'),
      runner
    })

    expect(runner).toHaveBeenCalledOnce()
    expect(result.results).toEqual([
      expect.objectContaining({ stage: 'smoke', status: 'completed' })
    ])
  })

  it('指定したGit SHAを公開コマンドへ環境変数で引き渡す', () => {
    const gitSha = 'a'.repeat(40)
    const runner = vi.fn(() => ({ status: 0 }))
    runTransportPipeline({
      sourceId: 'ama-town',
      stages: ['publish'],
      target: 'dev',
      gitSha,
      root: resolve('.'),
      runner
    })
    expect(runner).toHaveBeenCalledWith('npm', expect.any(Array), expect.objectContaining({
      env: expect.objectContaining({ SOURCE_GIT_SHA: gitSha })
    }))
  })
})
