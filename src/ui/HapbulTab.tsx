import { useEffect, useMemo, useState } from 'react'
import { loadHapbulChunk, loadHapbulIndex } from '../data/loadHapbul.ts'
import type { HapbulChunk, HapbulIndex } from '../data/loadHapbul.ts'

interface HapbulTabProps {
  indexKey: 'byType' | 'byUnit'
}

const PAGE_SIZE = 50

function formatCell(v: string | number): string {
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toFixed(2)
  }
  return v ?? ''
}

export default function HapbulTab({ indexKey }: HapbulTabProps) {
  const [index, setIndex] = useState<HapbulIndex | null>(null)
  const [indexError, setIndexError] = useState<string | null>(null)

  const [baseFilter, setBaseFilter] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [chunks, setChunks] = useState<Map<number, HapbulChunk>>(new Map())
  const [chunkLoading, setChunkLoading] = useState(false)
  const [chunkError, setChunkError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  // 탭(indexKey) 전환 시 인덱스를 새로 로드하고 선택 상태를 초기화한다.
  useEffect(() => {
    let cancelled = false
    setIndex(null)
    setIndexError(null)
    setBaseFilter('')
    setSelectedId(null)
    setChunks(new Map())
    setQuery('')
    setPage(0)
    loadHapbulIndex(indexKey)
      .then((d) => {
        if (!cancelled) setIndex(d)
      })
      .catch((err: unknown) => {
        if (!cancelled) setIndexError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [indexKey])

  const filteredBases = useMemo(() => {
    if (!index) return []
    const q = baseFilter.trim().toLowerCase()
    if (!q) return index.bases
    return index.bases.filter((b) => b.name.toLowerCase().includes(q))
  }, [index, baseFilter])

  const selectedBase = useMemo(() => {
    if (!index || selectedId == null) return null
    return index.bases.find((b) => b.id === selectedId) ?? null
  }, [index, selectedId])

  const selectedChunk = selectedId != null ? (chunks.get(selectedId) ?? null) : null

  function selectBase(id: number) {
    setSelectedId(id)
    setQuery('')
    setPage(0)
    if (chunks.has(id)) return
    setChunkLoading(true)
    setChunkError(null)
    loadHapbulChunk(indexKey, id)
      .then((c) => {
        setChunks((prev) => new Map(prev).set(id, c))
      })
      .catch((err: unknown) => {
        setChunkError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        setChunkLoading(false)
      })
  }

  function resetSelection() {
    setSelectedId(null)
    setBaseFilter('')
    setQuery('')
    setPage(0)
  }

  const filteredRows = useMemo(() => {
    if (!selectedChunk) return []
    const q = query.trim().toLowerCase()
    if (!q) return selectedChunk.rows
    return selectedChunk.rows.filter((row) => row.some((cell) => formatCell(cell).toLowerCase().includes(q)))
  }, [selectedChunk, query])

  useEffect(() => {
    setPage(0)
  }, [query])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages - 1)
  const pageRows = filteredRows.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  if (indexError) {
    return <p className="error-note">데이터 로드 실패: {indexError}</p>
  }

  if (!index) {
    return <p className="loading-note">데이터 불러오는 중…</p>
  }

  return (
    <section className="panel hapbul-tab">
      <div className="result-table-header">
        <h2>{index.sheet}</h2>
        {selectedBase && <span className="result-count">{selectedBase.rows}건</span>}
      </div>

      {selectedId == null || !selectedBase ? (
        <div className="hapbul-selector">
          <input
            type="text"
            className="ref-search"
            placeholder="기준 대학 검색 (예: 가천)"
            value={baseFilter}
            onChange={(e) => setBaseFilter(e.target.value)}
          />
          <div className="hapbul-base-list">
            {filteredBases.map((b) => (
              <button type="button" key={b.id} className="hapbul-base-item" onClick={() => selectBase(b.id)}>
                <span>{b.name}</span>
                <span className="hapbul-base-rows">{b.rows}건</span>
              </button>
            ))}
            {filteredBases.length === 0 && <p className="empty-note">검색 결과가 없습니다.</p>}
          </div>
        </div>
      ) : (
        <>
          <div className="hapbul-selected-bar">
            <span>
              기준 대학: <strong>{selectedBase.name}</strong>
            </span>
            <button type="button" onClick={resetSelection}>
              다른 대학 선택
            </button>
          </div>

          {chunkError && <p className="error-note">데이터 로드 실패: {chunkError}</p>}

          {chunkLoading && !selectedChunk ? (
            <p className="loading-note">불러오는 중…</p>
          ) : selectedChunk ? (
            <>
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
                      {selectedChunk.columns.map((col, i) => (
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
            </>
          ) : null}
        </>
      )}
    </section>
  )
}
