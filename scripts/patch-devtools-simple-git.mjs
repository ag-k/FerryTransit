// Temporary compatibility fix for the pinned DevTools 3 release and simple-git 4.
// Remove this script when a stable DevTools release supports the named export.
import { createHash } from 'node:crypto'
import { readFile, realpath, rename, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const originalHash = 'eb173297451cf62ba3438fed0551c5a566447516c9ea07da073d319fe77d3657'
const patchedHash = '7f797646c0bf0724fe93e123ba460fccb5fe1c7593b51b24acf42d1f4a33e31a'
const oldImport = "import Git from 'simple-git';"
const newImport = "import { simpleGit as Git } from 'simple-git';"
const digest = value => createHash('sha256').update(value).digest('hex')

export async function patchDevtoolsSimpleGit (projectRoot) {
  const root = await realpath(projectRoot)
  async function containedPath (path) {
    const actual = await realpath(resolve(root, path))
    const child = relative(root, actual)
    if (isAbsolute(child) || child === '..' || child.startsWith(`..${sep}`)) {
      throw new Error('DevTools compatibility patch refuses files outside the project')
    }
    return actual
  }
  async function packageVersion (path) {
    return JSON.parse(await readFile(await containedPath(path), 'utf8')).version
  }
  const devtools = await packageVersion('node_modules/@nuxt/devtools/package.json')
  const git = await packageVersion('node_modules/simple-git/package.json')
  if (devtools !== '3.4.0' || git !== '4.0.2') {
    throw new Error(`Unsupported compatibility pair: DevTools ${devtools}, simple-git ${git}`)
  }
  const target = await containedPath('node_modules/@nuxt/devtools/dist/chunks/module-main.mjs')
  const source = await readFile(target, 'utf8')
  const hash = digest(source)
  if (hash === patchedHash) { return 'already-patched' }
  if (hash !== originalHash || source.split(oldImport).length !== 2) {
    throw new Error('Unexpected DevTools source; review the upstream file before updating this patch')
  }
  const result = source.replace(oldImport, newImport)
  if (digest(result) !== patchedHash) { throw new Error('DevTools patch integrity check failed') }
  const temporary = `${target}.${process.pid}.tmp`
  await writeFile(temporary, result, { flag: 'wx' })
  await rename(temporary, target)
  return 'patched'
}

const main = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
if (main) {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  console.log(`DevTools/simple-git compatibility: ${await patchDevtoolsSimpleGit(projectRoot)}`)
}
