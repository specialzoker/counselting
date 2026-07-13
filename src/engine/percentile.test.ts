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
