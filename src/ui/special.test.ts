import { describe, it, expect } from 'vitest'
import notice from '../../public/data/special/notice.json'
import johgyeon from '../../public/data/special/johgyeon.json'
import gradeConv from '../../public/data/special/gradeConv.json'
import trend from '../../public/data/special/trend.json'
import caseChart from '../../public/data/special/caseChart.json'
import { filterCaseRows } from '../engine/caseChartFilter.ts'
import type { CaseAggRow, CaseDefaults } from '../data/loadCaseChart.ts'

type Table = { title: string | null; columns: string[]; rows: (string | number | null)[][] }
type Special = { sheet: string; key: string; intro: string[]; tables: Table[] }
type CaseChart = { sheet: string; key: string; intro: string[]; options: unknown; defaults: CaseDefaults; rows: CaseAggRow[] }

describe('특수 탭 추출 골든', () => {
  it('안내필독: intro 텍스트만, 표 없음', () => {
    const d = notice as Special
    expect(d.sheet).toBe('안내필독')
    expect(d.tables.length).toBe(0)
    expect(d.intro.length).toBeGreaterThan(20)
  })

  it('백분위조견표: 표 3개 + 첫 행 골든', () => {
    const d = johgyeon as Special
    expect(d.tables.length).toBe(3)
    expect(d.tables[0].columns).toEqual(['대학명', '최대', '중앙값', '최소', '평균'])
    expect(d.tables[0].rows[0][0]).toBe('서울대')
    expect(Math.abs((d.tables[0].rows[0][1] as number) - 99.0666)).toBeLessThan(0.01)
    expect(d.tables[2].columns[0]).toBe('대학명(세부)')
  })

  it('등급변환표: 변환결과 4행 세로전개', () => {
    const d = gradeConv as Special
    const conv = d.tables.find((t) => (t.title ?? '').includes('변환 결과'))!
    expect(conv).toBeTruthy()
    expect(conv.columns).toEqual(['교과조합', '25%-75% 범위', '변환 등급'])
    expect(conv.rows.length).toBe(4)
    expect(conv.rows[0]).toEqual(['전과목', '2.64 - 2.78', 2.72])
  })

  it('지원경향: 결과표 2개', () => {
    const d = trend as Special
    expect(d.tables.length).toBe(2)
    expect(d.tables[0].title).toBe('모집단위 기준')
    expect(d.tables[0].rows[0][2]).toBe('경기대')
    expect(d.tables[1].title).toBe('세부전형 기준')
    expect(d.tables[0].rows.length).toBeGreaterThan(3)
  })

  it('사례차트: 기본 필터가 캐시된 22행을 재현', () => {
    const d = caseChart as CaseChart
    expect(d.sheet).toBe('사례차트')
    expect(d.rows.length).toBeGreaterThan(1000)
    const res = filterCaseRows(d.rows, d.defaults)
    expect(res.length).toBe(22)
    expect(res[0].univ).toBe('성균관대')
    expect(res[0].jh).toBe('탐구형')
    expect(res[0].cases).toBe(54)
    expect(Math.abs((res[0].c70 as number) - 2.21)).toBeLessThan(0.01)
    // 70%컷 오름차순
    expect((res[0].c70 as number) <= (res[1].c70 as number)).toBe(true)
  })
})
