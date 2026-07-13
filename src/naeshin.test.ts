import { describe, it, expect } from 'vitest'
import { comboAverage, emptyNaeshin } from './naeshin'

describe('내신 평균 계산', () => {
  it('채워진 1-1~3-1 학기만 평균한다 (전체 값은 무시)', () => {
    const grades = { '1-1': 1.0, '1-2': 2.0, '2-1': null, '2-2': null, '3-1': null, 전체: 9.0 }
    expect(comboAverage(grades)).toBe(1.5)
  })

  it('학기 칸이 모두 비어 있으면 전체 값을 사용한다', () => {
    const grades = { '1-1': null, '1-2': null, '2-1': null, '2-2': null, '3-1': null, 전체: 3.25 }
    expect(comboAverage(grades)).toBe(3.25)
  })

  it('아무 값도 없으면 null을 반환한다', () => {
    const grades = { '1-1': null, '1-2': null, '2-1': null, '2-2': null, '3-1': null, 전체: null }
    expect(comboAverage(grades)).toBeNull()
  })
})

describe('emptyNaeshin', () => {
  it('4개 교과조합 × 6개 학기 모두 null로 초기화한다', () => {
    const n = emptyNaeshin()
    expect(Object.keys(n)).toEqual(['전교과', '국수영사과', '국수영사', '국수영과'])
    expect(n.전교과['1-1']).toBeNull()
    expect(n.전교과['전체']).toBeNull()
    expect(comboAverage(n.국수영과)).toBeNull()
  })
})
