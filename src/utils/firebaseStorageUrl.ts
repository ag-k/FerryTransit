type FirebasePublicConfig = {
  storageBucket?: string
  useEmulators?: boolean
  emulatorHost?: string
  ports?: {
    storage?: number | string
  }
}

const STORAGE_PUBLIC_ORIGIN = 'https://firebasestorage.googleapis.com'
const DEFAULT_STORAGE_EMULATOR_HOST = '127.0.0.1'
const DEFAULT_STORAGE_EMULATOR_PORT = 9199

const normalizePath = (path: string): string => path.replace(/^\/+/, '')

const toStoragePort = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return DEFAULT_STORAGE_EMULATOR_PORT
}

const toEmulatorBucket = (bucket: string): string => {
  if (!bucket) {
    return bucket
  }

  if (bucket.endsWith('.firebasestorage.app')) {
    return bucket.replace(/\.firebasestorage\.app$/, '.appspot.com')
  }

  return bucket
}

const getStorageOrigin = (firebase: FirebasePublicConfig): string => {
  if (process.dev && firebase.useEmulators) {
    const port = toStoragePort(firebase.ports?.storage)
    return `http://${DEFAULT_STORAGE_EMULATOR_HOST}:${port}`
  }

  return STORAGE_PUBLIC_ORIGIN
}

export const buildStorageObjectDownloadUrl = (
  firebase: FirebasePublicConfig,
  path: string
): string => {
  const bucket = process.dev && firebase.useEmulators
    ? toEmulatorBucket(firebase.storageBucket || '')
    : (firebase.storageBucket || '')
  const encodedPath = encodeURIComponent(normalizePath(path))
  return `${getStorageOrigin(firebase)}/v0/b/${bucket}/o/${encodedPath}?alt=media`
}
