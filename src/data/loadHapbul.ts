/// <reference types="vite/client" />

export interface HapbulBase {
  id: number
  name: string
  rows: number
}

export interface HapbulIndex {
  sheet: string
  key: string
  columns: string[]
  bases: HapbulBase[]
}

export interface HapbulChunk {
  sheet: string
  base: string
  columns: string[]
  rows: (string | number)[][]
}

export async function loadHapbulIndex(key: string): Promise<HapbulIndex> {
  const r = await fetch(import.meta.env.BASE_URL + `data/hapbul/${key}_index.json`)
  return r.json()
}

export async function loadHapbulChunk(key: string, id: number): Promise<HapbulChunk> {
  const r = await fetch(import.meta.env.BASE_URL + `data/hapbul/${key}_${id}.json`)
  return r.json()
}
