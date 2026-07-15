import { useEffect, useMemo, useState } from 'react'
import { loadHapbulChunk, loadHapbulIndex } from '../data/loadHapbul.ts'
import type { HapbulChunk, HapbulIndex } from '../data/loadHapbul.ts'

const PAGE_SIZE = 50
const ALL = '' // "(전체)" 선택을 의미하는 내부 값

// 결과표에 표시할 "타지원" 컬럼 (순서대로)
const DISPLAY_COLUMNS = ['지역', '대학', '대전형', '전형', '계열', '모집단위', '모집인원', '지원건수', '합격', '합격률']

function formatCell(v: string | number, colName: string): string {
  if (typeof v === 'number') {
    if (colName === '합격률') return v.toFixed(1)
    return Number.isInteger(v) ? String(v) : v.toFixed(2)
  }
  return v ?? ''
}

// 특정 컬럼의 rows 중 앞선 조건들을 만족하는 행에서 non-empty 값만 중복 없이 정렬해 뽑는다.
function distinctValues(rows: (string | number)[][], colIdx: number, matchIdx: number[], matchVals: string[]): string[] {
  const set = new Set<string>()
  for (const row of rows) {
    let ok = true
    for (let i = 0; i < matchIdx.length; i++) {
      if (matchVals[i] === ALL) continue
      if (String(row[matchIdx[i]] ?? '') !== matchVals[i]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const v = String(row[colIdx] ?? '')
    if (v) set.add(v)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'))
}

export default function TrendTab() {
  const [index, setIndex] = useState<HapbulIndex | null>(null)
  const [indexError, setIndexError] = useState<string | null>(null)

  const [baseFilter, setBaseFilter] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [chunks, setChunks] = useState<Map<number, HapbulChunk>>(new Map())
  const [chunkLoading, setChunkLoading] = useState(false)
  const [chunkError, setChunkError] = useState<string | null>(null)

  // 기준_* 4단 캐스케이딩 선택 (ALL = '(전체)')
  const [selDaejeonhyeong, setSelDaejeonhyeong] = useState(ALL)
  const [selJeonhyeong, setSelJeonhyeong] = useState(ALL)
  const [selGyeyeol, setSelGyeyeol] = useState(ALL)
  const [selMojib, setSelMojib] = useState(ALL)

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadHapbulIndex('byUnit')
      .then((d) => {
        if (!cancelled) setIndex(d)
      })
      .catch((err: unknown) => {
        if (!cancelled) setIndexError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

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
    setSelDaejeonhyeong(ALL)
    setSelJeonhyeong(ALL)
    setSelGyeyeol(ALL)
    setSelMojib(ALL)
    setQuery('')
    setPage(0)
    if (chunks.has(id)) return
    setChunkLoading(true)
    setChunkError(null)
    loadHapbulChunk('byUnit', id)
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
    setSelDaejeonhyeong(ALL)
    setSelJeonhyeong(ALL)
    setSelGyeyeol(ALL)
    setSelMojib(ALL)
    setQuery('')
    setPage(0)
  }

  // 기준_* 및 표시용 컬럼 인덱스를 이름으로 도출
  const col = useMemo(() => {
    if (!selectedChunk) return null
    const c = selectedChunk.columns
    const idx = (name: string) => c.indexOf(name)
    return {
      daejeonhyeong: idx('기준_대전형'),
      jeonhyeong: idx('기준_전형'),
      gyeyeol: idx('기준_계열'),
      mojib: idx('기준_모집단위'),
      display: DISPLAY_COLUMNS.map((name) => idx(name)),
    }
  }, [selectedChunk])

  const daejeonhyeongOptions = useMemo(() => {
    if (!selectedChunk || !col) return []
    return distinctValues(selectedChunk.rows, col.daejeonhyeong, [], [])
  }, [selectedChunk, col])

  const jeonhyeongOptions = useMemo(() => {
    if (!selectedChunk || !col) return []
    return distinctValues(selectedChunk.rows, col.jeonhyeong, [col.daejeonhyeong], [selDaejeonhyeong])
  }, [selectedChunk, col, selDaejeonhyeong])

  const gyeyeolOptions = useMemo(() => {
    if (!selectedChunk || !col) return []
    return distinctValues(
      selectedChunk.rows,
      col.gyeyeol,
      [col.daejeonhyeong, col.jeonhyeong],
      [selDaejeonhyeong, selJeonhyeong],
    )
  }, [selectedChunk, col, selDaejeonhyeong, selJeonhyeong])

  const mojibOptions = useMemo(() => {
    if (!selectedChunk || !col) return []
    return distinctValues(
      selectedChunk.rows,
      col.mojib,
      [col.daejeonhyeong, col.jeonhyeong, col.gyeyeol],
      [selDaejeonhyeong, selJeonhyeong, selGyeyeol],
    )
  }, [selectedChunk, col, selDaejeonhyeong, selJeonhyeong, selGyeyeol])

  const baseFilteredRows = useMemo(() => {
    if (!selectedChunk || !col) return []
    return selectedChunk.rows.filter((row) => {
      if (selDaejeonhyeong !== ALL && String(row[col.daejeonhyeong] ?? '') !== selDaejeonhyeong) return false
      if (selJeonhyeong !== ALL && String(row[col.jeonhyeong] ?? '') !== selJeonhyeong) return false
      if (selGyeyeol !== ALL && String(row[col.gyeyeol] ?? '') !== selGyeyeol) return false
      if (selMojib !== ALL && String(row[col.mojib] ?? '') !== selMojib) return false
      return true
    })
  }, [selectedChunk, col, selDaejeonhyeong, selJeonhyeong, selGyeyeol, selMojib])

  const displayRows = useMemo(() => {
    if (!col) return []
    return baseFilteredRows.map((row) => col.display.map((i) => row[i]))
  }, [baseFilteredRows, col])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return displayRows
    return displayRows.filter((row) =>
      row.some((cell, ci) => formatCell(cell, DISPLAY_COLUMNS[ci]).toLowerCase().includes(q)),
    )
  }, [displayRows, query])

  useEffect(() => {
    setPage(0)
  }, [query, selDaejeonhyeong, selJeonhyeong, selGyeyeol, selMojib])

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
        {selectedBase && <span className="result-count">{filteredRows.length}건</span>}
      </div>

      {selectedId == null || !selectedBase ? (
        <div className="hapbul-selector">
          <input
            type="text"
            className="ref-search"
            placeholder="기준 대학 검색 (예: 아주)"
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
              기준: <strong>{selectedBase.name}</strong> / {selDaejeonhyeong || '(전체)'} / {selJeonhyeong || '(전체)'} /{' '}
              {selGyeyeol || '(전체)'} / {selMojib || '(전체)'}
            </span>
            <button type="button" onClick={resetSelection}>
              다른 대학 선택
            </button>
          </div>

          {chunkError && <p className="error-note">데이터 로드 실패: {chunkError}</p>}

          {chunkLoading && !selectedChunk ? (
            <p className="loading-note">불러오는 중…</p>
          ) : selectedChunk && col ? (
            <>
              <div className="trend-cascade">
                <label>
                  기준 대전형
                  <select
                    value={selDaejeonhyeong}
                    onChange={(e) => {
                      setSelDaejeonhyeong(e.target.value)
                      setSelJeonhyeong(ALL)
                      setSelGyeyeol(ALL)
                      setSelMojib(ALL)
                    }}
                  >
                    <option value={ALL}>(전체)</option>
                    {daejeonhyeongOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  기준 전형
                  <select
                    value={selJeonhyeong}
                    onChange={(e) => {
                      setSelJeonhyeong(e.target.value)
                      setSelGyeyeol(ALL)
                      setSelMojib(ALL)
                    }}
                  >
                    <option value={ALL}>(전체)</option>
                    {jeonhyeongOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  기준 계열
                  <select
                    value={selGyeyeol}
                    onChange={(e) => {
                      setSelGyeyeol(e.target.value)
                      setSelMojib(ALL)
                    }}
                  >
                    <option value={ALL}>(전체)</option>
                    {gyeyeolOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  기준 모집단위
                  <select value={selMojib} onChange={(e) => setSelMojib(e.target.value)}>
                    <option value={ALL}>(전체)</option>
                    {mojibOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
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
                      {DISPLAY_COLUMNS.map((col, i) => (
                        <th key={i}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, i) => (
                      <tr key={clampedPage * PAGE_SIZE + i}>
                        {row.map((cell, j) => (
                          <td key={j}>{formatCell(cell, DISPLAY_COLUMNS[j])}</td>
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
