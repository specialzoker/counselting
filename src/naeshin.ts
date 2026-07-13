import type { Naeshin, NaeshinCombo } from './types.ts'

export const NAESHIN_COMBOS: NaeshinCombo[] = ['전교과', '국수영사과', '국수영사', '국수영과']

export function emptyNaeshin(): Naeshin {
  return { 전교과: null, 국수영사과: null, 국수영사: null, 국수영과: null }
}
