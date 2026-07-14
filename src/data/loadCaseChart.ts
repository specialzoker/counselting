/// <reference types="vite/client" />

export interface CaseRow {
  rank: number | null
  univ: string
  jh: string
  cases: number | null
  c30: number | null
  c50: number | null
  c70: number | null
}

export interface CaseChartData {
  sheet: string
  key: string
  intro: string[]
  criteria: string
  rows: CaseRow[]
}

export async function loadCaseChart(): Promise<CaseChartData> {
  const r = await fetch(import.meta.env.BASE_URL + 'data/special/caseChart.json')
  return r.json()
}
