/// <reference types="vite/client" />

export interface SpecialTableData {
  title: string | null
  columns: string[]
  rows: (string | number | null)[][]
}

export interface SpecialData {
  sheet: string
  key: string
  intro: string[]
  tables: SpecialTableData[]
}

export async function loadSpecial(key: string): Promise<SpecialData> {
  const r = await fetch(import.meta.env.BASE_URL + `data/special/${key}.json`)
  return r.json()
}
