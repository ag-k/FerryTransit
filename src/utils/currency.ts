const ROUNDING_EPSILON = 1e-9

export const roundUpToTen = (value: number): number => {
  if (!Number.isFinite(value)) {
    return value
  }
  if (value === 0) {
    return 0
  }
  return Math.ceil((value - ROUNDING_EPSILON) / 10) * 10
}
