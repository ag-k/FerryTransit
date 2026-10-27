// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { patchDevtoolsSimpleGit } from '../../../../scripts/patch-devtools-simple-git.mjs'

const roots: string[] = []
const modulePath = 'node_modules/@nuxt/devtools/dist/chunks/module-main.mjs'
const originalImport = "import Git from 'simple-git';"
const patchedImport = "import { simpleGit as Git } from 'simple-git';"
async function fixture () {
  const root = await mkdtemp(join(tmpdir(), 'ferry-devtools-patch-'))
  roots.push(root)
  await mkdir(join(root, 'node_modules/@nuxt/devtools/dist/chunks'), { recursive: true })
  await mkdir(join(root, 'node_modules/simple-git'), { recursive: true })
  await writeFile(join(root, 'node_modules/@nuxt/devtools/package.json'), JSON.stringify({ version: '3.4.0' }))
  await writeFile(join(root, 'node_modules/simple-git/package.json'), JSON.stringify({ version: '4.0.2' }))
  const installed = await readFile(resolve(modulePath), 'utf8')
  const original = installed.replace(patchedImport, originalImport)
  await writeFile(join(root, modulePath), original)
  return { root, original }
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})
describe('pinned DevTools/simple-git compatibility patch', () => {
  it('changes only the Git import and is idempotent', async () => {
    const { root, original } = await fixture()
    expect(await patchDevtoolsSimpleGit(root)).toBe('patched')
    expect(await readFile(join(root, modulePath), 'utf8')).toBe(original.replace(originalImport, patchedImport))
    expect(await patchDevtoolsSimpleGit(root)).toBe('already-patched')
  })
  it.each(['@nuxt/devtools', 'simple-git'])('refuses an unexpected %s version', async (name) => {
    const { root, original } = await fixture()
    await writeFile(join(root, `node_modules/${name}/package.json`), JSON.stringify({ version: '99.0.0' }))
    await expect(patchDevtoolsSimpleGit(root)).rejects.toThrow('Unsupported compatibility pair')
    expect(await readFile(join(root, modulePath), 'utf8')).toBe(original)
  })
  it('refuses changed upstream content before writing', async () => {
    const { root, original } = await fixture()
    const changed = original + '\n// unexpected upstream edit\n'
    await writeFile(join(root, modulePath), changed)
    await expect(patchDevtoolsSimpleGit(root)).rejects.toThrow('Unexpected DevTools source')
    expect(await readFile(join(root, modulePath), 'utf8')).toBe(changed)
  })
  it('refuses a module symlink outside the project', async () => {
    const { root, original } = await fixture()
    const outside = await mkdtemp(join(tmpdir(), 'ferry-devtools-outside-'))
    roots.push(outside)
    const target = join(outside, 'module-main.mjs')
    await writeFile(target, original)
    await rm(join(root, modulePath))
    await symlink(target, join(root, modulePath))
    await expect(patchDevtoolsSimpleGit(root)).rejects.toThrow('outside the project')
    expect(await readFile(target, 'utf8')).toBe(original)
  })
})
