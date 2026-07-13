import { useEffect, useMemo, useState } from 'react'
import type { CutSet, JudgeRow, Naeshin, NaeshinCombo } from '../types.ts'
import { comboAverage } from '../naeshin.ts'
import { gyogwaLabel } from '../engine/gyogwaJudge.ts'
import { GYOGWA_MARGIN } from '../config.ts'

interface ResultTableProps {
  rows: JudgeRow[]
  fiveGrade: boolean
  naeshin: Naeshin
}

const COMBOS: NaeshinCombo[] = ['전교과', '국수영사과', '국수영사', '국수영과']

const LABEL_CLASS: Record<string, string> = {
  안정: 'label-stable',
  적정: 'label-fit',
  소신: 'label-brave',
  도전: 'label-dare',
}

const PAGE_SIZE = 100

function round(x: number, decimals: number): number {
  const p = 10 ** decimals
  return Math.round(x * p) / p
}

function formatCut(x: number | null): string {
  if (x == null) return '-'
  return round(x, 2).toString()
}

function formatDiff(x: number | null): string {
  if (x == null) return '-'
  const r = round(x, 1)
  const sign = r > 0 ? '+' : r < 0 ? '−' : '±'
  return `${sign}${Math.abs(r).toFixed(1)}`
}

function diffClass(x: number | null): string {
  if (x == null) return ''
  return x >= 0 ? 'diff-positive' : 'diff-negative'
}

function CutGroupCells({
  cutSet,
  fiveGrade,
  naeshinGrade,
}: {
  cutSet: CutSet
  fiveGrade: boolean
  naeshinGrade: number | null
}) {
  const p50 = fiveGrade ? cutSet.p50_5 : cutSet.p50
  const p70 = fiveGrade ? cutSet.p70_5 : cutSet.p70
  // 판정은 항상 9등급 컷(p50/p70) 기준 — 학생 내신이 9등급이므로 표시 토글과 무관.
  const label = gyogwaLabel(naeshinGrade, cutSet.p50, cutSet.p70, GYOGWA_MARGIN)
  return (
    <>
      <td>
        {cutSet.name ?? '-'}
        {label && <span className={`cell-label ${LABEL_CLASS[label]}`}>{label}</span>}
      </td>
      <td>{formatCut(p50)}</td>
      <td>{formatCut(p70)}</td>
    </>
  )
}

export default function ResultTable({ rows, fiveGrade, naeshin }: ResultTableProps) {
  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.rank - b.rank), [rows])

  const [gyogwaCombo, setGyogwaCombo] = useState<NaeshinCombo>('전교과')
  const naeshinGrade = useMemo(
    () => comboAverage(naeshin[gyogwaCombo]),
    [naeshin, gyogwaCombo],
  )

  const [page, setPage] = useState(0)

  // 필터/성적이 바뀌어 결과 목록이 새로 계산되면 첫 페이지로 되돌린다.
  useEffect(() => {
    setPage(0)
  }, [sortedRows])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages - 1)
  const pageRows = sortedRows.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  return (
    <section className="panel result-table">
      <div className="result-table-header">
        <h2>판정 결과</h2>
        <label className="gyogwa-basis">
          교과·종합 판정 내신 기준
          <select value={gyogwaCombo} onChange={(e) => setGyogwaCombo(e.target.value as NaeshinCombo)}>
            {COMBOS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="gyogwa-basis-value">
            {naeshinGrade == null ? '내신 미입력' : `${round(naeshinGrade, 2)}등급`}
          </span>
        </label>
        <span className="result-count">{rows.length}건</span>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th rowSpan={2}>대학</th>
              <th rowSpan={2}>27수시 모집단위</th>
              <th rowSpan={2}>반영영역</th>
              <th rowSpan={2}>학생백분위</th>
              <th rowSpan={2}>70%컷</th>
              <th rowSpan={2}>차이값</th>
              <th rowSpan={2}>판정</th>
              <th colSpan={3} className="group-head group-gyogwa">
                교과1
              </th>
              <th colSpan={3} className="group-head group-gyogwa">
                교과2
              </th>
              <th colSpan={3} className="group-head group-gyogwa">
                교과3
              </th>
              <th colSpan={3} className="group-head group-jonghap">
                종합1
              </th>
              <th colSpan={3} className="group-head group-jonghap">
                종합2
              </th>
            </tr>
            <tr>
              <th className="group-gyogwa">전형명</th>
              <th className="group-gyogwa">50%</th>
              <th className="group-gyogwa">70%</th>
              <th className="group-gyogwa">전형명</th>
              <th className="group-gyogwa">50%</th>
              <th className="group-gyogwa">70%</th>
              <th className="group-gyogwa">전형명</th>
              <th className="group-gyogwa">50%</th>
              <th className="group-gyogwa">70%</th>
              <th className="group-jonghap">전형명</th>
              <th className="group-jonghap">50%</th>
              <th className="group-jonghap">70%</th>
              <th className="group-jonghap">전형명</th>
              <th className="group-jonghap">50%</th>
              <th className="group-jonghap">70%</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={`${r.moojib.univ}-${r.moojib.moojib27}-${r.moojib.code}-${i}`}>
                <td>{r.moojib.univ}</td>
                <td>{r.moojib.moojib27 ?? '-'}</td>
                <td>{r.moojib.banyeong ?? '-'}</td>
                <td>{formatCut(r.studentPercentile)}</td>
                <td>{formatCut(r.moojib.jeongsiCut70)}</td>
                <td className={diffClass(r.diff)}>{formatDiff(r.diff)}</td>
                <td className={r.label ? LABEL_CLASS[r.label] : ''}>{r.label ?? '-'}</td>
                <CutGroupCells cutSet={r.moojib.gyogwa1} fiveGrade={fiveGrade} naeshinGrade={naeshinGrade} />
                <CutGroupCells cutSet={r.moojib.gyogwa2} fiveGrade={fiveGrade} naeshinGrade={naeshinGrade} />
                <CutGroupCells cutSet={r.moojib.gyogwa3} fiveGrade={fiveGrade} naeshinGrade={naeshinGrade} />
                <CutGroupCells cutSet={r.moojib.jonghap1} fiveGrade={fiveGrade} naeshinGrade={naeshinGrade} />
                <CutGroupCells cutSet={r.moojib.jonghap2} fiveGrade={fiveGrade} naeshinGrade={naeshinGrade} />
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty-note">조건에 맞는 모집단위가 없습니다.</p>}
      </div>

      {rows.length > 0 && (
        <div className="pagination">
          <button type="button" onClick={() => setPage(0)} disabled={clampedPage === 0}>
            처음
          </button>
          <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={clampedPage === 0}>
            이전
          </button>
          <span className="pagination-indicator">
            {clampedPage + 1} / {totalPages} 페이지 ({sortedRows.length}건 중{' '}
            {clampedPage * PAGE_SIZE + 1}–{Math.min(sortedRows.length, (clampedPage + 1) * PAGE_SIZE)})
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={clampedPage >= totalPages - 1}
          >
            다음
          </button>
          <button
            type="button"
            onClick={() => setPage(totalPages - 1)}
            disabled={clampedPage >= totalPages - 1}
          >
            마지막
          </button>
        </div>
      )}
    </section>
  )
}
