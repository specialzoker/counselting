import { LABEL_THRESHOLDS as T } from '../config'
import type { JudgeLabel } from '../types'

/** 차이값(학생백분위 − 70%컷)을 안정/적정/소신/도전 라벨로 분류. null이면 라벨 없음. */
export function labelOf(diff: number | null): JudgeLabel | null {
  if (diff == null) return null
  if (diff >= T.stable) return '안정'
  if (diff >= T.fit) return '적정'
  if (diff >= T.brave) return '소신'
  return '도전'
}
