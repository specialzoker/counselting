import type { JudgeRow } from '../types.ts'

interface ResultTableProps {
  rows: JudgeRow[]
}

const LABEL_CLASS: Record<string, string> = {
  안정: 'label-stable',
  적정: 'label-fit',
  소신: 'label-brave',
  도전: 'label-dare',
}

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

export default function ResultTable({ rows }: ResultTableProps) {
  return (
    <section className="panel result-table">
      <div className="result-table-header">
        <h2>판정 결과</h2>
        <span className="result-count">{rows.length}건</span>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>대학</th>
              <th>27수시 모집단위</th>
              <th>반영영역</th>
              <th>70%컷</th>
              <th>차이값</th>
              <th>판정</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.moojib.univ}-${r.moojib.moojib27}-${r.moojib.code}-${i}`}>
                <td>{r.moojib.univ}</td>
                <td>{r.moojib.moojib27 ?? '-'}</td>
                <td>{r.moojib.banyeong ?? '-'}</td>
                <td>{formatCut(r.moojib.jeongsiCut70)}</td>
                <td className={diffClass(r.diff)}>{formatDiff(r.diff)}</td>
                <td className={r.label ? LABEL_CLASS[r.label] : ''}>{r.label ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty-note">조건에 맞는 모집단위가 없습니다.</p>}
      </div>
    </section>
  )
}
