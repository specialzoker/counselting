import { useEffect, useMemo, useState } from 'react'
import { loadRef } from '../data/loadRef.ts'
import type { RefData } from '../data/loadRef.ts'

interface RefTableProps {
  tabKey: string
}

const PAGE_SIZE = 50

function formatCell(v: string | number): string {
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toFixed(2)
  }
  return v ?? ''
}

export default function RefTable({ tabKey }: RefTableProps) {
  const [data, setData] = useState<RefData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)
    setQuery('')
    setPage(0)
    loadRef(tabKey)
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

  const filteredRows = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    if (!q) return data.rows
    return data.rows.filter((row) => row.some((cell) => formatCell(cell).toLowerCase().includes(q)))
  }, [data, query])

  useEffect(() => {
    setPage(0)
  }, [query])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages - 1)
  const pageRows = filteredRows.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  if (error) {
    return <p className="error-note">데이터 로드 실패: {error}</p>
  }

  if (!data) {
    return <p className="loading-note">데이터 불러오는 중…</p>
  }

  return (
    <section className="panel ref-table">
      <div className="result-table-header">
        <h2>{data.sheet}</h2>
        <span className="result-count">{filteredRows.length}건</span>
      </div>

      <input
        type="text"
        className="ref-search"
        placeholder="검색어 입력 (대학명, 전형명 등)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {data.columns.map((col, i) => (
                <th key={i}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={clampedPage * PAGE_SIZE + i}>
                {row.map((cell, j) => (
                  <td key={j}>{formatCell(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 && <p className="empty-note">검색 결과가 없습니다.</p>}
      </div>

      {filteredRows.length > 0 && (
        <div className="pagination">
          <button type="button" onClick={() => setPage(0)} disabled={clampedPage === 0}>
            처음
          </button>
          <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={clampedPage === 0}>
            이전
          </button>
          <span className="pagination-indicator">
            {clampedPage + 1} / {totalPages} 페이지 ({filteredRows.length}건 중{' '}
            {clampedPage * PAGE_SIZE + 1}–{Math.min(filteredRows.length, (clampedPage + 1) * PAGE_SIZE)})
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
