import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { ROUTES_DATA } from '@/data/ports'
import type { RoutesDataFile } from '@/types/route'

describe('routes data coverage', () => {
  it('公開JSONに必要な航路がすべて含まれていること', () => {
    const currentFilePath = fileURLToPath(import.meta.url)
    const routesFilePath = resolve(dirname(currentFilePath), '../../../public/data/routes/ferry-routes.json')
    const raw = readFileSync(routesFilePath, 'utf-8')
    const data = JSON.parse(raw) as RoutesDataFile

    const providedRoutes = new Set(data.routes.map(route => `${route.from}->${route.to}`))
    const configuredRoutes = ROUTES_DATA.map(route => `${route.from}->${route.to}`)

    const missing = configuredRoutes.filter(key => !providedRoutes.has(key))

    expect(missing, `不足している航路: ${missing.join(', ') || 'なし'}`).toEqual([])
  })
})
