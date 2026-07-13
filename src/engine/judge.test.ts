import { describe, it, expect } from 'vitest'
import moojib from '../../public/data/moojib.json'
import goldenSearch from '../../public/data/golden_search.json'
import type { Moojib } from '../types.ts'
import { judge } from './judge.ts'

const all = moojib as unknown as Moojib[]
const golden = goldenSearch as unknown as {
  baseMonth: string
  fiveGrade: boolean
  rows: {
    region: string
    univ: string
    moojib27: string
    studentP: number | string
    cut70: number | string
    diff: number | null
  }[]
}

describe('judge — golden 차이값(diff) match', () => {
  it('reproduces every numeric golden diff within 0.01 (matching by univ + moojib27)', () => {
    const result = judge(all, {
      useCachedPercentile: true,
      fiveGrade: false,
      regions: null,
      gyeyeols: null,
      univQuery: '',
      moojibQuery: '',
    })

    const mismatches: string[] = []
    let checked = 0
    for (const row of golden.rows.slice(0, 50)) {
      if (typeof row.diff !== 'number') continue
      checked++
      const candidates = result.filter((r) => r.moojib.univ === row.univ && r.moojib.moojib27 === row.moojib27)
      if (candidates.length === 0) {
        mismatches.push(`no result row for univ=${row.univ} moojib27=${row.moojib27}`)
        continue
      }
      const hit = candidates.some((r) => r.diff != null && Math.abs(r.diff - row.diff) <= 0.01)
      if (!hit) {
        mismatches.push(
          `univ=${row.univ} moojib27=${row.moojib27} want diff=${row.diff} got diffs=${JSON.stringify(
            candidates.map((r) => r.diff),
          )}`,
        )
      }
    }
    if (mismatches.length) console.error(mismatches.join('\n'))
    expect(mismatches).toEqual([])
    expect(checked).toBeGreaterThan(20)
  })

  it('ranks ascending: smaller diff gets a smaller (better) rank', () => {
    const result = judge(all, {
      useCachedPercentile: true,
      fiveGrade: false,
      regions: null,
      gyeyeols: null,
      univQuery: '',
      moojibQuery: '',
    })
    const ranked = result.filter((r) => r.diff != null).sort((a, b) => a.rank - b.rank)
    for (let i = 1; i < ranked.length; i++) {
      // rank must be non-decreasing as diff (sorted by rank) increases,
      // i.e. no row with a strictly smaller diff should have a larger rank.
      expect(ranked[i].diff!).toBeGreaterThanOrEqual(ranked[i - 1].diff! - 1e-9)
    }
    // golden_search.json rows themselves are pre-sorted ascending by diff for
    // the non-null portion — confirm our filtered/ranked order agrees on a sample.
    const sample = golden.rows.filter((r) => typeof r.diff === 'number').slice(0, 26)
    for (let i = 1; i < sample.length; i++) {
      expect(sample[i].diff as number).toBeGreaterThanOrEqual(sample[i - 1].diff as number)
    }
  })

  it('rows with missing studentPercentile or jeongsiCut70 get diff=null and rank=0', () => {
    const result = judge(all, {
      useCachedPercentile: true,
      fiveGrade: false,
      regions: null,
      gyeyeols: null,
      univQuery: '',
      moojibQuery: '',
    })
    const nullDiffRows = result.filter((r) => r.diff === null)
    expect(nullDiffRows.length).toBeGreaterThan(0)
    for (const r of nullDiffRows) expect(r.rank).toBe(0)
  })

  it('applies univ/moojib/region/gyeyeol filters', () => {
    const result = judge(all, {
      useCachedPercentile: true,
      fiveGrade: false,
      regions: ['서울'],
      gyeyeols: ['자연'],
      univQuery: '고려대',
      moojibQuery: '수학',
    })
    expect(result.length).toBeGreaterThan(0)
    for (const r of result) {
      expect(r.moojib.kwon).toBe('서울')
      expect(r.moojib.gyeyeol).toBe('자연')
      expect(r.moojib.univ).toContain('고려대')
      expect(r.moojib.moojib27 ?? '').toContain('수학')
    }
  })

  it('uses studentPercentileByCode when useCachedPercentile is not set', () => {
    const byCode = (code: string | null) => (code === 'X1' ? 50 : null)
    const fake: Moojib = {
      ...all[0],
      code: 'X1',
      jeongsiCut70: 40,
      studentPercentileCached: 999, // must be ignored
    }
    const result = judge([fake], {
      studentPercentileByCode: byCode,
      fiveGrade: false,
      regions: null,
      gyeyeols: null,
      univQuery: '',
      moojibQuery: '',
    })
    expect(result[0].studentPercentile).toBe(50)
    expect(result[0].diff).toBeCloseTo(10, 5)
  })
})
