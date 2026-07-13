import type { JudgeLabel } from '../types'

/**
 * 교과·종합전형 판정: 학생 내신 등급(9등급)을 한 전형의 50%·70% 컷과 비교.
 * 등급은 낮을수록 우수하므로 부등호 방향에 주의.
 *   안정: n <= p50 (중앙값 이상 우수)
 *   적정: p50 < n <= p70
 *   소신: p70 < n <= p70 + margin
 *   도전: n > p70 + margin
 * 컷(p50/p70) 또는 내신이 없으면 null.
 */
export function gyogwaLabel(
  naeshin: number | null,
  p50: number | null,
  p70: number | null,
  margin: number,
): JudgeLabel | null {
  if (naeshin == null || p50 == null || p70 == null) return null
  if (naeshin <= p50) return '안정'
  if (naeshin <= p70) return '적정'
  if (naeshin <= p70 + margin) return '소신'
  return '도전'
}
