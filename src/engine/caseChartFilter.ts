import type { CaseAggRow, CaseRow } from '../data/loadCaseChart.ts'

export interface CaseFilter {
  kwons: string[]
  gyes: string[]
  jh: string
  gyogwa: string
  upper: number
  lower: number
}

// 집계표를 권역·전형·계열·교과조합·등급범위로 필터하고 선택 교과조합의 70%컷 오름차순 정렬.
// 원본 사례차트와 동일: 등급 상한(upper) ~ 하한(lower) 사이의 70%컷만, 오름차순.
// kwons/gyes가 비면(선택 없음) 해당 축은 필터하지 않는다(= 전체).
export function filterCaseRows(rows: CaseAggRow[], f: CaseFilter): CaseRow[] {
  const out: CaseRow[] = []
  for (const r of rows) {
    if (f.kwons.length > 0 && !f.kwons.includes(r.k)) continue
    if (f.gyes.length > 0 && !f.gyes.includes(r.g)) continue
    if (r.j !== f.jh) continue
    const cut = r.c[f.gyogwa]
    if (!cut) continue
    const c70 = cut[3]
    if (typeof c70 !== 'number') continue
    if (c70 < f.upper || c70 > f.lower) continue
    out.push({ rank: 0, univ: r.u, jh: r.s, cases: cut[0], c30: cut[1], c50: cut[2], c70 })
  }
  out.sort((a, b) => (a.c70 as number) - (b.c70 as number))
  out.forEach((r, i) => (r.rank = i + 1))
  return out
}
