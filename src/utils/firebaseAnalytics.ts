export const resolveFirebaseAnalyticsMeasurementId = ({
  projectId,
  measurementId,
  useEmulators,
  isCapacitorBuild = false
}: {
  projectId: string
  measurementId: string
  useEmulators: boolean
  isCapacitorBuild?: boolean
}): string => {
  if (!measurementId || useEmulators || isCapacitorBuild || projectId.endsWith('-dev')) {
    return ''
  }

  return measurementId
}
