# 수시 NAVI — 남은 특수 탭 4종(정적 표) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원본 엑셀의 안내필독·백분위조견표·등급변환표·지원경향 시트를, 엑셀 인터랙션 없이 원본 데이터를 그대로 보여주는 정적 표/텍스트 탭 4종으로 추가한다.

**Architecture:** `scripts/extract.py`에 시트별 맞춤 추출기(`extract_special`)를 더해 통일 스키마 JSON(`public/data/special/*.json`)을 만들고, 신규 프레젠테이션 컴포넌트 `DataTable` + 컨테이너 `SpecialTab`이 이를 렌더한다. 기존 `RefTable`/판정 로직/`App.css`는 건드리지 않는다(회귀 위험 0). 표 스타일은 전역 CSS 클래스(`.table-scroll`, `table`, `thead th` sticky)를 재사용해 자동 상속.

**Tech Stack:** Python+openpyxl(추출), React+Vite+TypeScript(UI), Vitest(데이터 골든 검증).

**설계 문서:** `docs/superpowers/specs/2026-07-13-susi-navi-special-tabs-design.md`

**환경 주의:** 이 PC는 node/npm이 PATH에 없음. PowerShell에서 먼저:
`$env:PATH = "C:\Users\user\AppData\Local\OpenAI\Codex\runtimes\cua_node\1b23c930bdf84ed6\bin;" + $env:PATH`
Python은 PATH에 있음(`python scripts/extract.py`).

**원본 파일:** `C:\Users\user\Downloads\경기도교육청_2027수시NAVI_수시나비__260707_보호해제.xlsx`

---

## 파일 구조

```
scripts/extract.py                     # (수정) extract_special() 추가 + 'special' 인자
public/data/special/
  notice.json  johgyeon.json  gradeConv.json  trend.json  index.json   # (생성물)
src/data/loadSpecial.ts                # (신규) fetch + 타입
src/ui/DataTable.tsx                   # (신규) 순수 표 프레젠테이션
src/ui/SpecialTab.tsx                  # (신규) intro 문단 + DataTable 스택
src/ui/special.test.ts                 # (신규) 생성 JSON 골든 구조 검증
src/App.tsx                            # (수정) SPECIAL_TABS 탭 배선
src/App.css                            # (수정) .special-intro/.special-heading 소폭 추가
```

**확정 컬럼 매핑(엑셀 확인 완료):**
- 백분위조견표: 헤더 row10, 데이터 row11~136. 패널① 대학명=B, 최대=O, 중앙=P, 최소=Q, 평균=R / 패널② 대학명=CY, 최대=DO, 중앙=DP, 최소=DQ, 평균=DR / 세부 대학명=FE, 계열=FG, 70%컷=FH, 정원=FI, 경쟁률=FJ, 충원율=FK.
- 등급변환표: 변환결과 데이터 row16 — 5등급값=B, 전과목(범위=G,변환=I), 국수영사과(J,L), 국수영과(M,O), 국수영사(P,R). `<표1>` 헤더 row29·데이터 row30~52(5등급=B,9등급=F). `<표2>`(5등급=K, 5등급_석차=L, 5등급_석차누적비=M, 9등급=O, 9등급_석차=P, 9등급_석차누적비=Q).
- 지원경향: 헤더 row17, 데이터 row18~615. 기준 셀 row8(대학=C, 전형=D, 세부전형=E, 모집단위=G). 표①(모집단위 기준) A~K. 표②(세부전형 기준) M~S.

---

## Task 1: 추출기 + 골든 검증

**Files:**
- Modify: `scripts/extract.py` (파일 끝 `if __name__` 블록 앞에 함수 추가, 그리고 `__main__` 분기 수정)
- Create(생성물): `public/data/special/{notice,johgyeon,gradeConv,trend,index}.json`
- Test: `src/ui/special.test.ts`

- [ ] **Step 1: 골든 검증 테스트 작성 (실패 예정)**

`src/ui/special.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import notice from '../../public/data/special/notice.json'
import johgyeon from '../../public/data/special/johgyeon.json'
import gradeConv from '../../public/data/special/gradeConv.json'
import trend from '../../public/data/special/trend.json'

type Table = { title: string | null; columns: string[]; rows: (string | number | null)[][] }
type Special = { sheet: string; key: string; intro: string[]; tables: Table[] }

describe('특수 탭 추출 골든', () => {
  it('안내필독: intro 텍스트만, 표 없음', () => {
    const d = notice as Special
    expect(d.sheet).toBe('안내필독')
    expect(d.tables.length).toBe(0)
    expect(d.intro.length).toBeGreaterThan(20)
  })

  it('백분위조견표: 표 3개 + 첫 행 골든', () => {
    const d = johgyeon as Special
    expect(d.tables.length).toBe(3)
    expect(d.tables[0].columns).toEqual(['대학명', '최대', '중앙값', '최소', '평균'])
    expect(d.tables[0].rows[0][0]).toBe('서울대')
    expect(Math.abs((d.tables[0].rows[0][1] as number) - 99.0666)).toBeLessThan(0.01)
    expect(d.tables[2].columns[0]).toBe('대학명(세부)')
  })

  it('등급변환표: 변환결과 4행 세로전개', () => {
    const d = gradeConv as Special
    const conv = d.tables.find((t) => (t.title ?? '').includes('변환 결과'))!
    expect(conv).toBeTruthy()
    expect(conv.columns).toEqual(['교과조합', '25%-75% 범위', '변환 등급'])
    expect(conv.rows.length).toBe(4)
    expect(conv.rows[0]).toEqual(['전과목', '2.64 - 2.78', 2.72])
  })

  it('지원경향: 결과표 2개', () => {
    const d = trend as Special
    expect(d.tables.length).toBe(2)
    expect(d.tables[0].title).toBe('모집단위 기준')
    expect(d.tables[0].rows[0][2]).toBe('경기대')
    expect(d.tables[1].title).toBe('세부전형 기준')
    expect(d.tables[0].rows.length).toBeGreaterThan(3)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

PowerShell:
```
$env:PATH = "C:\Users\user\AppData\Local\OpenAI\Codex\runtimes\cua_node\1b23c930bdf84ed6\bin;" + $env:PATH
npm test -- --run src/ui/special.test.ts
```
Expected: FAIL — `Cannot find module '../../public/data/special/notice.json'` (아직 미생성).

- [ ] **Step 3: `extract.py`에 `extract_special()` 추가**

`scripts/extract.py`의 `if __name__ == "__main__":` 바로 위에 삽입:
```python
# ---- 특수 탭(정적 표) 맞춤 추출 ----
def _special_notice(wb):
    ws = wb["안내필독"]
    intro = []
    for row in ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True):
        cells = [str(v).strip() for v in row if v is not None and str(v).strip() != ""]
        if cells:
            intro.append(" ".join(cells))
    return {"sheet": "안내필독", "key": "notice", "intro": intro, "tables": []}

def _special_johgyeon(wb):
    from openpyxl.utils import column_index_from_string as ci
    ws = wb["백분위조견표"]
    note = ws.cell(3, 2).value  # B3: "시트 활용 정보\n1. ...\n..."
    intro = [ln.strip() for ln in str(note).split("\n") if ln.strip()] if note else []
    def clean(v):
        if v is None:
            return ""
        if isinstance(v, str) and v.startswith("#"):  # #VALUE! 등 오류
            return ""
        return v
    def panel(name_c, val_cols, columns, title):
        rows = []
        for r in range(11, 137):
            nm = ws.cell(r, ci(name_c)).value
            if nm is None or str(nm).strip() == "":
                continue
            rows.append([str(nm).strip()] + [clean(ws.cell(r, ci(c)).value) for c in val_cols])
        return {"title": title, "columns": columns, "rows": rows}
    t1 = panel("B", ["O","P","Q","R"], ["대학명","최대","중앙값","최소","평균"], "대학별 입시결과 범위 (1)")
    t2 = panel("CY", ["DO","DP","DQ","DR"], ["대학명","최대","중앙값","최소","평균"], "대학별 입시결과 범위 (2)")
    t3 = panel("FE", ["FG","FH","FI","FJ","FK"], ["대학명(세부)","계열","70%컷","정원","경쟁률","충원율"], "의약학·교대 세부")
    return {"sheet": "백분위조견표", "key": "johgyeon", "intro": intro, "tables": [t1, t2, t3]}

def _special_grade_conv(wb):
    from openpyxl.utils import column_index_from_string as ci
    ws = wb["등급변환표"]
    def b(r):  # col B 텍스트 한 줄
        v = ws.cell(r, 2).value
        return str(v).strip() if v is not None and str(v).strip() != "" else None
    intro = [t for t in (b(r) for r in list(range(3, 10)) + list(range(18, 27))) if t]
    # 변환 결과(예시 성적): row16을 조합당 한 행으로 세로 전개
    def cell(r, letter):
        return ws.cell(r, ci(letter)).value
    conv_rows = [
        ["전과목", cell(16, "G"), cell(16, "I")],
        ["국수영사과", cell(16, "J"), cell(16, "L")],
        ["국수영과", cell(16, "M"), cell(16, "O")],
        ["국수영사", cell(16, "P"), cell(16, "R")],
    ]
    conv_rows = [[("" if v is None else v) for v in row] for row in conv_rows]
    grade5 = cell(16, "B")
    conv = {"title": f"변환 결과 (예시: 5등급 {grade5})",
            "columns": ["교과조합", "25%-75% 범위", "변환 등급"], "rows": conv_rows}
    # <표1> 5등급→9등급 샘플 (row30~52)
    t1_rows = []
    for r in range(30, 53):
        a, c = cell(r, "B"), cell(r, "F")
        if (a is None or str(a).strip() == "") and (c is None or str(c).strip() == ""):
            continue
        t1_rows.append([("" if a is None else a), ("" if c is None else c)])
    table1 = {"title": "<표1> 5등급→9등급 (샘플)", "columns": ["5등급", "9등급"], "rows": t1_rows}
    # <표2> 석차누적비 샘플
    t2_cols = ["K", "L", "M", "O", "P", "Q"]
    t2_rows = []
    for r in range(30, 53):
        k = cell(r, "K")
        if k is None or str(k).strip() == "":
            continue
        t2_rows.append([("" if cell(r, c) is None else cell(r, c)) for c in t2_cols])
    table2 = {"title": "<표2> 석차누적비 (샘플)",
              "columns": ["5등급", "5등급_석차", "5등급_석차누적비", "9등급", "9등급_석차", "9등급_석차누적비"],
              "rows": t2_rows}
    return {"sheet": "등급변환표", "key": "gradeConv", "intro": intro, "tables": [conv, table1, table2]}

def _special_trend(wb):
    from openpyxl.utils import column_index_from_string as ci
    ws = wb["지원경향"]
    def c8(letter):
        v = ws.cell(8, ci(letter)).value
        return "" if v is None else str(v).strip()
    intro = [f"기준: {c8('C')} / {c8('D')} / {c8('E')} / {c8('G')}"]
    def table(anchor_c, cols, columns, title):
        rows = []
        for r in range(18, 616):
            nm = ws.cell(r, ci(anchor_c)).value
            if nm is None or str(nm).strip() == "":
                continue
            rows.append([("" if ws.cell(r, ci(c)).value is None else ws.cell(r, ci(c)).value) for c in cols])
        return {"title": title, "columns": columns, "rows": rows}
    t1 = table("C", ["A","B","C","D","E","F","G","H","I","J","K"],
               ["순번","권역","대학","전형","세부전형","계열","모집단위","모집인원","지원사례수","합격사례수","합격률(%)"],
               "모집단위 기준")
    t2 = table("M", ["M","N","O","P","Q","R","S"],
               ["대학","전형","세부전형","계열","지원사례수","합격사례수","합격률(%)"],
               "세부전형 기준")
    return {"sheet": "지원경향", "key": "trend", "intro": intro, "tables": [t1, t2]}

def extract_special():
    import json as _json
    wb = openpyxl.load_workbook(SRC, data_only=True)  # 랜덤 셀 접근 위해 non-read_only
    outdir = OUT / "special"; outdir.mkdir(parents=True, exist_ok=True)
    builders = [_special_notice, _special_johgyeon, _special_grade_conv, _special_trend]
    index = []
    for build in builders:
        d = build(wb)
        _json.dump(d, open(outdir / f"{d['key']}.json", "w", encoding="utf-8"), ensure_ascii=False)
        index.append({"key": d["key"], "sheet": d["sheet"],
                      "tables": len(d["tables"]), "introLines": len(d["intro"])})
        print(f"special {d['sheet']}: {len(d['tables'])} tables, {len(d['intro'])} intro lines")
    _json.dump(index, open(outdir / "index.json", "w", encoding="utf-8"), ensure_ascii=False)
```

- [ ] **Step 4: `__main__` 분기에 `special` 추가**

`scripts/extract.py` 맨 아래 블록을 아래처럼 수정(기존 `refs`/`hapbul` 분기 유지, `special` 추가):
```python
if __name__ == "__main__":
    if "refs" in sys.argv:
        extract_refs()
    elif "hapbul" in sys.argv:
        extract_hapbul()
    elif "special" in sys.argv:
        extract_special()
    else:
        extract_moojib()
        extract_calc()
        extract_search_golden()
        survey_formulas()
```
또한 파일 상단의 `_args` 필터에 `"special"`도 추가:
```python
_args = [a for a in sys.argv[1:] if a not in ("refs", "hapbul", "special")]
```

- [ ] **Step 5: 추출 실행**

```
python scripts/extract.py special
```
Expected(대략):
```
special 안내필독: 0 tables, 30+ intro lines
special 백분위조견표: 3 tables, N intro lines
special 등급변환표: 3 tables, 12+ intro lines
special 지원경향: 2 tables, 1 intro lines
```
`public/data/special/`에 5개 json 생성 확인.

- [ ] **Step 6: 골든 테스트 통과 확인**

```
npm test -- --run src/ui/special.test.ts
```
Expected: PASS (4 tests). 실패 시 불일치 값을 원본과 대조해 컬럼 매핑 수정 후 재실행.

- [ ] **Step 7: 전체 테스트 회귀 확인**

```
npm test -- --run
```
Expected: 기존 엔진 테스트 + 신규 4개 전부 PASS.

- [ ] **Step 8: Commit**

```
git add scripts/extract.py public/data/special src/ui/special.test.ts
git commit -m "feat: 특수 탭 4종 추출(extract_special) + 골든 검증"
```

---

## Task 2: 로더 + DataTable 컴포넌트

**Files:**
- Create: `src/data/loadSpecial.ts`
- Create: `src/ui/DataTable.tsx`

- [ ] **Step 1: `loadSpecial.ts` 작성**

`src/data/loadSpecial.ts`:
```ts
/// <reference types="vite/client" />

export interface SpecialTableData {
  title: string | null
  columns: string[]
  rows: (string | number | null)[][]
}

export interface SpecialData {
  sheet: string
  key: string
  intro: string[]
  tables: SpecialTableData[]
}

export async function loadSpecial(key: string): Promise<SpecialData> {
  const r = await fetch(import.meta.env.BASE_URL + `data/special/${key}.json`)
  return r.json()
}
```

- [ ] **Step 2: `DataTable.tsx` 작성**

`src/ui/DataTable.tsx` (전역 `.table-scroll`/`table` 클래스로 sticky·고정높이 상속. `formatCell` 규칙은 RefTable과 동일):
```tsx
interface DataTableProps {
  columns: string[]
  rows: (string | number | null)[][]
  title?: string | null
}

function formatCell(v: string | number | null): string {
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toFixed(2)
  }
  return v ?? ''
}

export default function DataTable({ columns, rows, title }: DataTableProps) {
  return (
    <div className="data-table">
      {title && <h3 className="data-table-title">{title}</h3>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{formatCell(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty-note">표시할 데이터가 없습니다.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 타입 컴파일 확인**

```
npx tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```
git add src/data/loadSpecial.ts src/ui/DataTable.tsx
git commit -m "feat: SpecialData 로더 + DataTable 프레젠테이션 컴포넌트"
```

---

## Task 3: SpecialTab 컴포넌트 + 스타일

**Files:**
- Create: `src/ui/SpecialTab.tsx`
- Modify: `src/App.css` (파일 끝에 추가)

- [ ] **Step 1: `SpecialTab.tsx` 작성**

`src/ui/SpecialTab.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { loadSpecial } from '../data/loadSpecial.ts'
import type { SpecialData } from '../data/loadSpecial.ts'
import DataTable from './DataTable.tsx'

// intro 문단 중 '소제목'을 굵게. 숫자/★/▶/·/(/-/공백으로 시작하지 않고, 짧고, 마침표로 끝나지 않는 줄.
function isHeading(line: string): boolean {
  if (!line) return false
  const c = line[0]
  if (/[0-9★▶·(\-]/.test(c) || c === ' ') return false
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
```

- [ ] **Step 2: `App.css` 끝에 스타일 추가**

`src/App.css` 파일 맨 끝에 추가:
```css
/* 특수 탭(정적 표) */
.special-intro {
  margin-bottom: 1rem;
  font-size: 0.9rem;
  line-height: 1.5;
}

.special-intro p {
  margin: 0.15rem 0;
  color: var(--text-muted, inherit);
}

.special-heading {
  margin: 0.9rem 0 0.35rem;
  font-size: 1rem;
  font-weight: 700;
}

.data-table {
  margin-bottom: 1.5rem;
}

.data-table-title {
  margin: 0 0 0.4rem;
  font-size: 0.95rem;
  font-weight: 700;
}
```

- [ ] **Step 3: 타입 컴파일 확인**

```
npx tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```
git add src/ui/SpecialTab.tsx src/App.css
git commit -m "feat: SpecialTab(intro 문단 + 표 스택) + 특수 탭 스타일"
```

---

## Task 4: App.tsx 탭 배선 + 검증

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: import 추가**

`src/App.tsx`에서 `import HapbulTab ...` 다음 줄에 추가:
```tsx
import SpecialTab from './ui/SpecialTab.tsx'
```

- [ ] **Step 2: SPECIAL_TABS 상수 추가 + TABS에 삽입**

`HAPBUL_TABS` 선언 블록 다음, `const TABS = ...` 앞에 추가:
```tsx
// 특수 탭(정적 표): key는 public/data/special/<key>.json 파일명과 일치.
const SPECIAL_TABS: { key: string; label: string }[] = [
  { key: 'notice', label: '안내필독' },
  { key: 'johgyeon', label: '백분위조견표' },
  { key: 'gradeConv', label: '등급변환표' },
  { key: 'trend', label: '지원경향' },
]
```
그리고 `const TABS` 줄을 아래로 교체(특수 4탭을 참고 뒤·합불 앞에):
```tsx
const TABS = [{ key: 'judge', label: '판정' }, ...REF_TABS, ...SPECIAL_TABS, ...HAPBUL_TABS]
```

- [ ] **Step 3: 렌더 블록 추가**

`REF_TABS.filter(...).map(...)` 블록(RefTable 렌더)과 `HAPBUL_TABS.filter(...)` 블록 사이에 삽입:
```tsx
      {SPECIAL_TABS.filter((tab) => visitedTabs.has(tab.key)).map((tab) => (
        <div key={tab.key} style={{ display: activeTab === tab.key ? undefined : 'none' }}>
          <main>
            <SpecialTab tabKey={tab.key} />
          </main>
        </div>
      ))}
```

- [ ] **Step 4: 빌드 확인**

```
$env:PATH = "C:\Users\user\AppData\Local\OpenAI\Codex\runtimes\cua_node\1b23c930bdf84ed6\bin;" + $env:PATH
npm run build
```
Expected: tsc + vite 빌드 에러 없음, `dist/` 생성.

- [ ] **Step 5: dev 서버 육안 확인**

```
npm run dev
```
확인 항목:
- 상단 탭에 안내필독·백분위조견표·등급변환표·지원경향 4개가 참고 탭 뒤에 노출.
- 안내필독: 문단 렌더, 소제목(사용법-선행작업 등) 굵게.
- 백분위조견표: 표 3개, 첫 행 서울대 99.07/96.50/92.40/96.18. 고정 높이·sticky 헤더 동작.
- 등급변환표: intro + 변환결과 4행(전과목/국수영사과/국수영과/국수영사) + 표1/표2.
- 지원경향: 기준 문구 + 표 2개, 세로 스크롤.
- 콘솔 에러 없음. 기존 판정/참고 탭 전환해 회귀 없음 확인.

- [ ] **Step 6: Commit**

```
git add src/App.tsx
git commit -m "feat: 특수 탭 4종 네비게이션 배선 (안내필독·백분위조견표·등급변환표·지원경향)"
```

---

## 자체 검토 메모

- **스펙 커버리지:** 안내필독(Task1 _special_notice + Task3 소제목 강조), 백분위조견표 3표(Task1 _special_johgyeon), 등급변환표 다중섹션(Task1 _special_grade_conv: intro+변환결과 세로전개+표1/표2), 지원경향 2표(Task1 _special_trend), DataTable 독립화·RefTable 미수정(Task2), SpecialTab intro+표(Task3), 탭 배선(Task4), 표시 규칙 formatCell 동일(Task2), 검증(Task1 골든 + Task4 빌드/육안) — 모두 태스크 존재.
- **비범위 준수:** 등급변환 계산기·지원경향 필터·백분위 차트 없음(정적만). 특수 탭엔 검색/페이지네이션 없음(스크롤로 충분).
- **타입 일관성:** `SpecialData{sheet,key,intro,tables}` / `SpecialTableData{title,columns,rows}` / `loadSpecial(key)` / `DataTable{columns,rows,title?}` / `SpecialTab{tabKey}` — Task 2~4 전반 일치. JSON `title`은 항상 문자열로 생성되지만 타입은 `string|null` 허용(DataTable에서 falsy 처리).
- **회귀 안전:** RefTable.tsx·판정 로직·기존 App.css 규칙 미변경. App.css는 파일 끝 append만. App.tsx는 상수/블록 추가만.
