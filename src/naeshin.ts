import type { Naeshin, NaeshinCombo, NaeshinSemester } from './types.ts'

export const NAESHIN_COMBOS: NaeshinCombo[] = ['전교과', '국수영사과', '국수영사', '국수영과']
export const NAESHIN_SEMESTERS: NaeshinSemester[] = ['1-1', '1-2', '2-1', '2-2', '3-1', '전체']

const SCORED_SEMESTERS: NaeshinSemester[] = ['1-1', '1-2', '2-1', '2-2', '3-1']

function emptyRow(): Record<NaeshinSemester, number | null> {
  return { '1-1': null, '1-2': null, '2-1': null, '2-2': null, '3-1': null, 전체: null }
}

export function emptyNaeshin(): Naeshin {
  return {
    전교과: emptyRow(),
    국수영사과: emptyRow(),
    국수영사: emptyRow(),
    국수영과: emptyRow(),
  }
}

/**
 * 학기별 등급의 평균. 1-1~3-1 중 채워진 값이 있으면 그 값들의 평균을,
 * 없으면 전체 값을, 그마저 없으면 null을 반환한다.
 */
export function comboAverage(grades: Record<NaeshinSemester, number | null>): number | null {
  const filled = SCORED_SEMESTERS.map((s) => grades[s]).filter((v): v is number => v != null)
  if (filled.length > 0) {
    const sum = filled.reduce((a, b) => a + b, 0)
    return Math.round((sum / filled.length) * 100) / 100
  }
  return grades['전체'] ?? null
}
