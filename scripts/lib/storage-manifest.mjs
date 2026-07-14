import { sha256 } from './transport-data.mjs'
import { FIREBASE_STORAGE_BUCKETS } from './firebase-publish-target.mjs'

export const STORAGE_MANIFEST_PATHS = Object.freeze({
  timetable: 'data/manifests/public-timetable.json',
  gtfs: 'data/manifests/gtfs-public-data.json'
})

export const firebaseObjectUrl = (bucket, path) => (
  `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(path)}?alt=media`
)

export async function downloadStorageObject(target, path, fetchImpl = fetch) {
  const bucket = FIREBASE_STORAGE_BUCKETS[target]
  if (!bucket) throw new Error(`不正なStorage環境です: ${target}`)
  const response = await fetchImpl(firebaseObjectUrl(bucket, path))
  if (!response.ok) throw new Error(`Storage取得失敗: ${target}/${path} HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

export function validateStorageManifest(manifest, { environment, gitSha } = {}) {
  if (manifest?.version !== 1 || !manifest.sourceId || !Array.isArray(manifest.objects) || manifest.objects.length === 0) {
    throw new Error('manifestの形式が不正です')
  }
  if (environment && manifest.environment !== environment) {
    throw new Error(`manifestの環境が一致しません: expected=${environment}, actual=${manifest.environment}`)
  }
  if (gitSha && manifest.gitSha !== gitSha) {
    throw new Error(`manifestのGit SHAが一致しません: expected=${gitSha}, actual=${manifest.gitSha || 'null'}`)
  }
  const paths = new Set()
  for (const object of manifest.objects) {
    if (!object.path || !/^[a-f0-9]{64}$/.test(object.sha256) || !Number.isInteger(object.bytes) || object.bytes < 0) {
      throw new Error(`manifestのobjectが不正です: ${object.path || '(pathなし)'}`)
    }
    if (paths.has(object.path)) throw new Error(`manifestのpathが重複しています: ${object.path}`)
    paths.add(object.path)
  }
  return manifest
}

export async function downloadAndVerifyManifestObjects(target, manifest, fetchImpl = fetch) {
  validateStorageManifest(manifest, { environment: target })
  const objects = []
  for (const expected of manifest.objects) {
    const contents = await downloadStorageObject(target, expected.path, fetchImpl)
    const actualHash = sha256(contents)
    if (actualHash !== expected.sha256 || contents.byteLength !== expected.bytes) {
      throw new Error(`公開物がmanifestと一致しません: ${expected.path}`)
    }
    objects.push({ ...expected, contents })
  }
  return objects
}
