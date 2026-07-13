import type { JudgeLabel, JudgeRow, Moojib } from '../types.ts'

/**
 * 검색 sheet port.
 *
 * Per moojib row:
 *   diff = studentPercentile − jeongsiCut70 (정시70%컷)
 * Rows are filtered (region/계열/univ/moojib name, all AND), then ranked
 * ascending by diff (most negative = rank 1, matching Excel's
 * RANK(diff, range, 1)). Rows without a computable diff keep rank 0 and
 * are still returned. `label` is left null — filled in by Task 8.
 */

export interface JudgeOptions {
  useCachedPercentile?: boolean
  studentPercentileByCode?: (code: string | null) => number | null
  fiveGrade: boolean
  regions: string[] | null
  gyeyeols: string[] | null
  univQuery: string
  moojibQuery: string
}

function matchesFilters(m: Moojib, opt: JudgeOptions): boolean {
  if (opt.regions && opt.regions.length > 0 && !opt.regions.includes(m.kwon)) return false
  if (opt.gyeyeols && opt.gyeyeols.length > 0 && !opt.gyeyeols.includes(m.gyeyeol)) return false

  const univQuery = opt.univQuery.trim()
  if (univQuery !== '' && !m.univ.includes(univQuery)) return false

  const moojibQuery = opt.moojibQuery.trim()
  if (moojibQuery !== '' && !(m.moojib27 ?? '').includes(moojibQuery)) return false

  return true
}

// The source workbook renders empty cells as "-"; some moojib.json rows carry
// that literal string through fields typed as `number | null`. Guard at the
// boundary rather than trusting the declared type.
function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function resolveStudentPercentile(m: Moojib, opt: JudgeOptions): number | null {
  if (opt.useCachedPercentile) return asNumber(m.studentPercentileCached)
  if (opt.studentPercentileByCode) return asNumber(opt.studentPercentileByCode(m.code))
  return null
}

export function judge(all: Moojib[], opt: JudgeOptions): JudgeRow[] {
  const rows: JudgeRow[] = all.filter((m) => matchesFilters(m, opt)).map((m) => {
    const studentPercentile = resolveStudentPercentile(m, opt)
    const cut = asNumber(m.jeongsiCut70)
    const diff = studentPercentile != null && cut != null ? studentPercentile - cut : null
    return { moojib: m, studentPercentile, diff, rank: 0, label: null as JudgeLabel | null }
  })

  const ranked = rows
    .filter((r): r is JudgeRow & { diff: number } => r.diff != null)
    .sort((a, b) => a.diff - b.diff)

  let rank = 0
  let lastDiff: number | null = null
  for (const r of ranked) {
    if (lastDiff === null || r.diff !== lastDiff) {
      rank += 1
      lastDiff = r.diff
    }
    r.rank = rank
  }

  return rows
}
