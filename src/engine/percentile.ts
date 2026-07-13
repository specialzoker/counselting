import type { CalcPattern, StudentScores } from '../types.ts'

/**
 * 점수계산기 sheet port.
 *
 * Per pattern row the Excel computes:
 *   AL = SUMPRODUCT(normWeights, subjectValues) / SUM(normWeights)
 * where
 *   normWeights[i] = ROUND(weightsRaw[i] / SUM(weightsRaw) * 100, 2)
 *   subjectValues[i] = evaluate subjectFormulas[i] against the student.
 *
 * Only this responsibility lives here: turn one CalcPattern + StudentScores
 * into the student's weighted percentile for that pattern.
 */

interface EvalCtx {
  kor: number | null
  math: number | null
  tam1: number | null
  tam2: number | null
  engGrade: number | null
  convTable: (number | null)[]
}

/** Resolve a single $-reference token to its numeric value (or null if unavailable). */
function resolveRef(token: string, ctx: EvalCtx): number | null {
  const t = token.trim()

  // $Q{row} — english grade → percentile via this pattern's conversion table.
  const q = t.match(/^\$Q\d+$/)
  if (q) {
    const g = ctx.engGrade
    if (g == null || g < 1 || g > 9) return null
    const v = ctx.convTable[g - 1]
    return v == null ? null : v
  }

  // $X$row — column-letter reference. Row component is fixed (student input row 2);
  // only the letter matters here.
  const m = t.match(/^\$([A-G])\$\d+$/)
  if (m) {
    const tams = [ctx.tam1, ctx.tam2].filter((x): x is number => x != null)
    switch (m[1]) {
      case 'A':
        return ctx.kor
      case 'B':
        return ctx.math
      case 'C':
        return ctx.tam1
      case 'D':
        return ctx.tam2
      case 'E':
        return ctx.engGrade // raw english grade — never referenced directly in practice
      case 'F': // 탐구(1) = MAX(tam1, tam2)
        return tams.length ? Math.max(...tams) : null
      case 'G': // 탐구(2) = AVERAGE(tam1, tam2)
        return tams.length ? tams.reduce((a, b) => a + b, 0) / tams.length : null
    }
  }

  return null
}

/** Split a comma-separated argument list, respecting nested parentheses. */
function splitTopLevel(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim() !== '' || out.length) out.push(cur)
  return out
}

/** Evaluate one subject formula (already stripped of a leading '='). */
function evalExpr(expr: string, ctx: EvalCtx): number | null {
  const e = expr.trim()
  if (e === '') return null

  if (e.startsWith('MAX(')) {
    const inner = e.slice(4, e.lastIndexOf(')'))
    const vals = splitTopLevel(inner)
      .map((a) => evalExpr(a, ctx))
      .filter((v): v is number => v != null)
    return vals.length ? Math.max(...vals) : null
  }

  if (e.startsWith('LARGE(')) {
    // LARGE( (ref,ref,...) , k )
    const inner = e.slice(6, e.lastIndexOf(')'))
    const args = splitTopLevel(inner)
    if (args.length < 2) return null
    const k = parseInt(args[args.length - 1].trim(), 10)
    const listStr = args
      .slice(0, args.length - 1)
      .join(',')
      .trim()
      .replace(/^\(/, '')
      .replace(/\)$/, '')
    const vals = splitTopLevel(listStr)
      .map((r) => resolveRef(r, ctx))
      .filter((v): v is number => v != null)
      .sort((a, b) => b - a)
    return k >= 1 && k <= vals.length ? vals[k - 1] : null
  }

  // Bare single reference.
  return resolveRef(e, ctx)
}

/** Excel ROUND(x, 2) — round-half-away-from-zero to 2 decimals. */
function round2(x: number): number {
  const sign = x < 0 ? -1 : 1
  return (sign * Math.round(Math.abs(x) * 100)) / 100
}

function toWeight(w: number | string | null): number {
  if (typeof w === 'number') return Number.isFinite(w) ? w : 0
  if (typeof w === 'string') {
    const n = Number(w)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export function computeStudentPercentile(pattern: CalcPattern, s: StudentScores): number | null {
  const raw = pattern.weightsRaw.map(toWeight)
  const sumRaw = raw.reduce((a, b) => a + b, 0)
  if (sumRaw === 0) return null

  const norm = raw.map((w) => round2((w / sumRaw) * 100))

  const ctx: EvalCtx = {
    kor: s.kor,
    math: s.math,
    tam1: s.tam1,
    tam2: s.tam2,
    engGrade: s.engGrade,
    convTable: pattern.convTable,
  }

  let numer = 0
  let denom = 0
  for (let i = 0; i < norm.length; i++) {
    const w = norm[i]
    if (w === 0) continue
    const formula = pattern.subjectFormulas[i] ?? ''
    const val = evalExpr(formula.startsWith('=') ? formula.slice(1) : formula, ctx)
    // A weighted area with no value means the student left a required score blank.
    // Excel yields no result here — do NOT renormalize over the remaining weights,
    // which would emit a confident-looking percentile from incomplete data.
    // (A blank candidate INSIDE LARGE(...)/MAX(...) is already dropped by evalExpr,
    // below this level, so best-of tolerance is preserved.)
    if (val == null) return null
    numer += w * val
    denom += w
  }

  if (denom === 0) return null
  return numer / denom
}
