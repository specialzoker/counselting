export interface CutSet {
  name: string | null
  p50: number | null
  p70: number | null
  p50_5: number | null
  p70_5: number | null
}

export interface Moojib {
  kwon: string
  region: string
  subRegion: string
  univ: string
  moojib26: string | null
  moojib27: string | null
  gyeyeol: string
  gyogwa1: CutSet
  gyogwa2: CutSet
  gyogwa3: CutSet
  jonghap1: CutSet
  jonghap2: CutSet
  code: string | null
  banyeong: string | null
  jeongsiCut70: number | null
  jeongsiEngHan: string | null
  studentPercentileCached: number | null
}

export type NaeshinCombo = '전교과' | '국수영사과' | '국수영사' | '국수영과'
export type NaeshinSemester = '1-1' | '1-2' | '2-1' | '2-2' | '3-1' | '전체'

export type Naeshin = Record<NaeshinCombo, Record<NaeshinSemester, number | null>>

export interface StudentScores {
  kor: number | null
  math: number | null
  tam1: number | null
  tam2: number | null
  engGrade: number | null
  hanGrade: number | null
}

export interface CalcPattern {
  code: string
  banyeongText: string
  metric: string
  weightsRaw: (number | string | null)[]
  subjectFormulas: string[]
  convTable: (number | null)[]
  cachedAL: number | null
}

export type JudgeLabel = '안정' | '적정' | '소신' | '도전'

export interface JudgeRow {
  moojib: Moojib
  studentPercentile: number | null
  diff: number | null
  rank: number
  label: JudgeLabel | null
}
