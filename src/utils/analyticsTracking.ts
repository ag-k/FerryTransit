export const shouldTrackAnalyticsPath = ({
  path,
  isTestMode,
  isCapacitorBuild
}: {
  path?: string
  isTestMode: boolean
  isCapacitorBuild: boolean
}) => {
  if (!path || isTestMode) {
    return false
  }

  if (isCapacitorBuild) {
    return true
  }

  return !path.startsWith('/admin')
}
