/// <reference types="vite/client" />

// 교과조합 이름 -> [건수, 30%컷, 50%컷, 70%컷]
export type Cuts = Record<string, (number | null)[]>

// 집계표 한 행: 권역 k / 전형 j / 계열 g / 대학 u / 세부전형 s / 4교과조합 컷 c
export interface CaseAggRow {
  k: string
  j: string
  g: string
  u: string
  s: string
  c: Cuts
}

export interface CaseOptions {
  kwons: string[]
  jhs: string[]
  gyes: string[]
  gyogwas: string[]
}

export interface CaseDefaults {
  kwons: string[]
  gyes: string[]
  jh: string
  gyogwa: string
  upper: number
  lower: number
}

export interface CaseChartData {
  sheet: string
  key: string
  intro: string[]
  options: CaseOptions
  defaults: CaseDefaults
  rows: CaseAggRow[]
}

// 차트/표에 그릴 한 행(필터·정렬 결과).
export interface CaseRow {
  rank: number
  univ: string
  jh: string
  cases: number | null
  c30: number | null
  c50: number | null
  c70: number | null
}

export async function loadCaseChart(): Promise<CaseChartData> {
  const r = await fetch(import.meta.env.BASE_URL + 'data/special/caseChart.json')
  return r.json()
}
