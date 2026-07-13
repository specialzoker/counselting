import { describe, it, expect } from 'vitest'
import moojib from '../../public/data/moojib.json'
import patterns from '../../public/data/calc_patterns.json'
import goldenCalc from '../../public/data/golden_calc.json'
import goldenSearch from '../../public/data/golden_search.json'
import { computeStudentPercentile } from './percentile'
import { judge } from './judge'
import type { CalcPattern, Moojib, StudentScores } from '../types'

// 종단 검증: 실제 엔진 경로(computeStudentPercentile → judge)가 원본 엑셀의 판정을
// 재현하는지 확인한다. 캐시값이 아니라 실제 계산으로 검증한다.

const student: StudentScores = {
  kor: goldenCalc.studentInput.kor,
  math: goldenCalc.studentInput.math,
  tam1: goldenCalc.studentInput.tam1,
  tam2: goldenCalc.studentInput.tam2,
  engGrade: goldenCalc.studentInput.eng,
  hanGrade: null,
}

const patternByCode = new Map<string, CalcPattern>()
for (const p of patterns as CalcPattern[]) patternByCode.set(p.code, p)

function computedPercentile(code: string | null): number | null {
  if (code == null) return null
  const p = patternByCode.get(code)
  return p ? computeStudentPercentile(p, student) : null
}

describe('종단 검증 (실제 엔진 경로)', () => {
  it('실제 계산 학생백분위가 캐시된 studentPercentileCached와 전부 일치 (6368행)', () => {
    const mismatches: string[] = []
    for (const m of moojib as Moojib[]) {
      if (m.code == null || typeof m.studentPercentileCached !== 'number') continue
      const got = computedPercentile(m.code)
      if (got == null || Math.abs(got - m.studentPercentileCached) > 0.01) {
        mismatches.push(`${m.code}: got ${got} want ${m.studentPercentileCached}`)
      }
    }
    expect(mismatches.slice(0, 20)).toEqual([])
  })

  it('judge 결과의 차이값이 검색 결과 골든과 일치 (39행)', () => {
    const rows = judge(moojib as Moojib[], {
      studentPercentileByCode: computedPercentile,
      fiveGrade: goldenSearch.fiveGrade,
      regions: null,
      gyeyeols: null,
      univQuery: '',
      moojibQuery: '',
    })
    const misses: string[] = []
    for (const g of goldenSearch.rows) {
      if (typeof g.diff !== 'number') continue
      // 같은 (대학, 27수시모집단위) 후보 중 골든 차이값과 일치하는 행이 있으면 OK
      // (동일 대학/학과에 복수 전형코드가 있어 1:1 식별이 불가하므로 후보 매칭)
      const candidates = rows.filter(
        (r) => r.moojib.univ === g.univ && r.moojib.moojib27 === g.moojib27 && r.diff != null,
      )
      const hit = candidates.some((r) => Math.abs((r.diff as number) - g.diff) < 0.01)
      if (!hit) misses.push(`${g.univ} ${g.moojib27}: want diff ${g.diff}`)
    }
    expect(misses).toEqual([])
  })
})
