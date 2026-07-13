/// <reference types="vite/client" />
import type { CalcPattern, Moojib } from '../types.ts'

export async function loadMoojib(): Promise<Moojib[]> {
  const r = await fetch(import.meta.env.BASE_URL + 'data/moojib.json')
  return r.json()
}

export async function loadCalcPatterns(): Promise<CalcPattern[]> {
  const r = await fetch(import.meta.env.BASE_URL + 'data/calc_patterns.json')
  return r.json()
}
