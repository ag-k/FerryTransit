export const FIREBASE_STORAGE_BUCKETS = Object.freeze({
  dev: 'oki-ferryguide-dev.firebasestorage.app',
  prod: 'oki-ferryguide.firebasestorage.app'
})

const normalizeBucket = (value) => String(value || '')
  .trim()
  .replace(/^gs:\/\//, '')
  .replace(/\/+$/, '')

export const resolveFirebasePublishTarget = ({ target, bucket } = {}) => {
  if (target && !Object.hasOwn(FIREBASE_STORAGE_BUCKETS, target)) {
    throw new Error(`--target は dev または prod を指定してください: ${target}`)
  }

  const explicitBucket = normalizeBucket(bucket)
  if (target && explicitBucket && explicitBucket !== FIREBASE_STORAGE_BUCKETS[target]) {
    throw new Error(
      `--target ${target} と --bucket ${explicitBucket} が一致しません（期待値: ${FIREBASE_STORAGE_BUCKETS[target]}）`
    )
  }

  const bucketName = explicitBucket || (target ? FIREBASE_STORAGE_BUCKETS[target] : '')
  if (!bucketName) {
    throw new Error('公開先を --target dev|prod または --bucket <bucket-name> で明示してください')
  }

  if (bucketName.includes('/')) {
    throw new Error(`--bucket にはパスを含めずバケット名だけを指定してください: ${bucketName}`)
  }

  return {
    target: target || 'custom',
    bucketName
  }
}

