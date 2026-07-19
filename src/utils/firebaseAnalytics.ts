export const resolveFirebaseAnalyticsMeasurementId = ({
  projectId,
  measurementId,
  useEmulators
}: {
  projectId: string
  measurementId: string
  useEmulators: boolean
}): string => {
  if (!measurementId || useEmulators || projectId.endsWith('-dev')) {
    return ''
  }

  return measurementId
}
