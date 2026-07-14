import { useEffect, useState } from 'react'
import { loadSpecial } from '../data/loadSpecial.ts'
import type { SpecialData } from '../data/loadSpecial.ts'
import DataTable from './DataTable.tsx'

// intro 문단 중 '소제목'을 굵게. 숫자/★/▶/·/(/-/공백으로 시작하지 않고, 짧고,
// 마침표로 끝나지 않으며, 콜론(정의·불릿 문장)이 없는 줄.
function isHeading(line: string): boolean {
  if (!line) return false
  const c = line[0]
  if (/[0-9★▶·(\-]/.test(c) || c === ' ') return false
  if (line.includes(':') || line.includes('：')) return false
  return line.length <= 24 && !line.endsWith('.')
}

interface SpecialTabProps {
  tabKey: string
}

export default function SpecialTab({ tabKey }: SpecialTabProps) {
  const [data, setData] = useState<SpecialData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)
    loadSpecial(tabKey)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [tabKey])

  if (error) {
    return <p className="error-note">데이터 로드 실패: {error}</p>
  }
  if (!data) {
    return <p className="loading-note">데이터 불러오는 중…</p>
  }

  return (
    <section className="panel special-tab">
      <div className="result-table-header">
        <h2>{data.sheet}</h2>
      </div>

      {data.intro.length > 0 && (
        <div className="special-intro">
          {data.intro.map((line, i) =>
            isHeading(line) ? (
              <h3 key={i} className="special-heading">
                {line}
              </h3>
            ) : (
              <p key={i}>{line}</p>
            ),
          )}
        </div>
      )}

      {data.tables.map((t, i) => (
        <DataTable key={i} title={t.title} columns={t.columns} rows={t.rows} />
      ))}
    </section>
  )
}
