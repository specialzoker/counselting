import { describe, it, expect } from 'vitest'
import calcPatterns from '../../public/data/calc_patterns.json'
import goldenCalc from '../../public/data/golden_calc.json'
import type { CalcPattern, StudentScores } from '../types.ts'
import { computeStudentPercentile } from './percentile.ts'

const patterns = calcPatterns as unknown as CalcPattern[]
const golden = goldenCalc as unknown as {
  studentInput: { kor: number; math: number; tam1: number; tam2: number; eng: number }
  rows: { code: string; al: number | null }[]
}

const student: StudentScores = {
  kor: golden.studentInput.kor,
  math: golden.studentInput.math,
  tam1: golden.studentInput.tam1,
  tam2: golden.studentInput.tam2,
  engGrade: golden.studentInput.eng,
  hanGrade: null,
}

describe('computeStudentPercentile — golden values', () => {
  it('reproduces every cached AL within 0.01', () => {
    const mismatches: string[] = []
    let checked = 0
    for (const p of patterns) {
      if (typeof p.cachedAL !== 'number') continue
      checked++
      const got = computeStudentPercentile(p, student)
      if (got === null || Math.abs(got - p.cachedAL) > 0.01) {
        mismatches.push(
          `code=${p.code} metric=${p.metric} banyeong=${p.banyeongText} ` +
            `formulas=${JSON.stringify(p.subjectFormulas)} weights=${JSON.stringify(p.weightsRaw)} ` +
            `conv=${JSON.stringify(p.convTable)} got=${got} want=${p.cachedAL}`,
        )
      }
    }
    if (mismatches.length) {
      // Surface the first several so failures are actionable.
      console.error(`\n${mismatches.length}/${checked} mismatches:\n` + mismatches.slice(0, 15).join('\n'))
    }
    expect(mismatches).toEqual([])
    expect(checked).toBeGreaterThan(600)
  })

  it('returns null when a subject with nonzero weight is blank (no partial average)', () => {
    // Pattern 1 uses a plain weighted 국어 ref "=$A$2" with weight 25.
    const p = patterns.find((x) => x.subjectFormulas[0] === '=$A$2' && x.subjectFormulas.length === 4)
    expect(p).toBeDefined()
    const noKor: StudentScores = { ...student, kor: null }
    expect(computeStudentPercentile(p!, noKor)).toBeNull()
  })

  it('still returns a number when one candidate INSIDE a LARGE(...) is blank but enough remain', () => {
    // Real pattern: every slot is LARGE(($A$2,$B$2,$Q26,$F$2), k) for k=1,2,3.
    // Dropping the 영어(Q) candidate still leaves 3 candidates {국,수,탐(1)} for k=1..3.
    const p = patterns.find((x) => x.subjectFormulas[0] === '=LARGE(($A$2,$B$2,$Q26,$F$2),1)')
    expect(p).toBeDefined()
    const noEng: StudentScores = { ...student, engGrade: null }
    const got = computeStudentPercentile(p!, noEng)
    expect(got).not.toBeNull()
    // LARGE over {kor 94, math 96, 탐(1)=max(68,83)=83} → 96,94,83, equal 33.33 weights → 91.0
    expect(got!).toBeCloseTo(91.0, 2)
  })

  it('matches golden_calc.rows[].al exactly', () => {
    const byCode = new Map(patterns.map((p) => [p.code, p]))
    const mismatches: string[] = []
    for (const row of golden.rows) {
      if (typeof row.al !== 'number') continue
      const p = byCode.get(row.code)
      if (!p) {
        mismatches.push(`no pattern for code=${row.code}`)
        continue
      }
      const got = computeStudentPercentile(p, student)
      if (got === null || Math.abs(got - row.al) > 0.01) {
        mismatches.push(`code=${row.code} got=${got} want=${row.al}`)
      }
    }
    if (mismatches.length) console.error(mismatches.slice(0, 15).join('\n'))
    expect(mismatches).toEqual([])
  })
})
