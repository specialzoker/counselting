/// <reference types="vite/client" />

export interface RefData {
  sheet: string
  columns: string[]
  rows: (string | number)[][]
}

export async function loadRef(key: string): Promise<RefData> {
  const r = await fetch(import.meta.env.BASE_URL + `data/ref/${key}.json`)
  return r.json()
}
