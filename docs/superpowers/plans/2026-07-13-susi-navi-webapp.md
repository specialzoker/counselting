# 수시 NAVI 웹앱 (1단계: 핵심 판정 엔진) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 경기도교육청 2027 수시 NAVI 엑셀의 "학생 성적 입력 → 대학 판정" 기능을, 원본 계산 결과와 값이 일치하는 React 정적 웹앱으로 재현하고 GitHub Pages로 배포한다.

**Architecture:** 엑셀에서 데이터/계산패턴을 1회성 Python 스크립트로 JSON 추출 → 브라우저에서 TypeScript로 백분위·판정 계산 → 정적 사이트로 배포. 서버·DB 없음. 원본에 캐시된 계산값(점수계산기 학생백분위 639개, 검색 결과표)을 골든 픽스처로 삼아 이식 정확도를 자동 검증한다.

**Tech Stack:** React + Vite + TypeScript, Vitest(테스트), Python+openpyxl(추출), GitHub Pages(배포).

**원본 파일:** `C:\Users\user\Downloads\경기도교육청_2027수시NAVI_수시나비__260707_보호해제.xlsx`

**설계 문서:** `docs/superpowers/specs/2026-07-13-susi-navi-webapp-design.md`

---

## 핵심 도메인 지식 (구현 전 필독)

원본 판정 흐름 (역공학 완료):

1. **`점수계산기` 시트 = 백분위 계산 엔진.** 상단 A2:E2 = 학생 모의고사 백분위(국/수/탐1/탐2/영), F2=MAX(탐1,탐2)=탐구(1), G2=AVERAGE(탐1,탐2)=탐구(2). 5행부터 각 행이 대학 반영코드(`가야대1`, `가천대1`…) 1개.
   - 각 행: `B`=반영영역 문구, `C`=반영지표(예 `표/표`=표준점수, `백/백`=백분위), `Z:AC`=원점수 가중치 → `AD:AG`=정규화 가중치(`=ROUND(Zn/SUM(Zn:ACn)*100,2)`), `AH:AK`=적용할 과목 백분위값.
   - **학생백분위 `AL` = `SUMPRODUCT(AD:AG, AH:AK) / SUM(AD:AG)`.**
   - 과목값 `AH:AK` 결정 규칙(패턴별):
     - 고정 과목: `=$A$2`(국) `=$B$2`(수) `=$G$2`(탐구2) 등 직접 참조.
     - "중 N개"(best-of): `=LARGE(($A$2,$B$2,$F$2),1)` 처럼 후보 과목 중 상위 N개 선택.
     - 영어/한국사: 등급→백분위 환산. 각 행 `H:P`에 환산표(1등급 95, 2등급 84.5 …), `Q`(배열수식)가 학생 영어등급을 이 표로 환산. `AI`/`AJ` 등이 `=$Q15` 참조.
2. **`data` 시트 = 6,368개 모집단위.** 각 행: `A`권역 `B`지역 `C`세부지역 `D`대학명 `E`26수시모집단위 `H`27수시모집단위 `I`계열. 컷: `M/N`=교과1 50/70%, `O/P`=교과1 5등급 50/70%, `S/T`·`U/V`=교과2, `Y/Z`·`AA/AB`=교과3, `AE/AF`·`AG/AH`=종합1, `AK/AL`·`AM/AN`=종합2. 전형명: `L`교과1 `R`교과2 `X`교과3 `AD`종합1 `AJ`종합2. `AS`=정시코드(점수계산기 A열과 매칭), `AT`=반영영역, `AQ`=정시70%백분위(컷), `AR`=정시영어/한국사, `AU`=학생백분위(=`INDEX(점수계산기!AL, MATCH(AS, 점수계산기!A, 0))`).
3. **`검색` 시트 = 판정 결과.** 각 후보행: `차이값 = 학생백분위(AU) − 정시70%백분위(AQ)`. 이 차이값을 `RANK(...,1)` 오름차순 + 동점보정으로 순위화. 필터: 지역(`data!A` in 검색 지역선택), 계열(`data!I`), 대학명/모집단위 부분일치(`FIND`). 5등급제 토글(`검색!V6`)이 켜지면 컷을 5등급 컬럼(O/P, U/V…)으로 교체.

**검증 자산:** 위 모든 계산에 대해 원본 파일에 현재 학생(국어 94 등) 기준 **캐시된 결과값**이 저장돼 있음 → `data_only=True`로 읽어 골든 픽스처로 사용.

---

## 파일 구조

```
navi/
  package.json, vite.config.ts, tsconfig.json, index.html
  scripts/
    extract.py              # 엑셀 → JSON 추출 (재실행 가능)
  public/data/
    moojib.json             # data 시트: 6368 모집단위 + 컷
    calc_patterns.json      # 점수계산기: 코드별 반영패턴 + 가중치 + 캐시 AL
    golden_calc.json        # 점수계산기 캐시 학생입력 + AL 639개 (검증용)
    golden_search.json      # 검색 결과표 캐시 (end-to-end 검증용)
  src/
    types.ts                # 도메인 타입
    engine/
      percentile.ts         # 점수계산기 이식: 학생백분위 계산
      percentile.test.ts    # golden_calc.json 대조
      judge.ts              # 검색 이식: 차이값·순위·필터
      judge.test.ts         # golden_search.json 대조
      label.ts              # 판정 라벨(안정/적정/소신/도전) + 경계 상수
    data/loadData.ts        # JSON fetch + 파싱
    ui/
      ScoreInput.tsx        # 내신/모의고사/월/필터/5등급 토글 입력
      ResultTable.tsx       # 판정 결과표
    App.tsx, main.tsx
    config.ts               # 라벨 경계값 등 조정 상수
```

---

## Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `navi/package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Vite React-TS 프로젝트 생성**

Run (navi 폴더에서):
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install -D vitest
```

- [ ] **Step 2: vite.config.ts에 GitHub Pages base + vitest 설정**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',                       // GitHub Pages 상대경로 배포
  test: { environment: 'node' },
})
```

- [ ] **Step 3: package.json scripts 확인/추가**

```json
"scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview", "test": "vitest run" }
```

- [ ] **Step 4: 빌드·테스트 러너 동작 확인**

Run: `npm run build`
Expected: `dist/` 생성, 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: Vite React-TS 스캐폴딩 + GitHub Pages/vitest 설정"
```

---

## Task 2: 추출 스크립트 — data 시트 → moojib.json

**Files:**
- Create: `scripts/extract.py`
- Create(생성물): `public/data/moojib.json`

- [ ] **Step 1: extract.py에 data 시트 추출 함수 작성**

원본 경로를 인자로 받고, `data` 시트 2~6369행에서 아래 컬럼을 뽑아 리스트[dict]로 저장.
```python
import openpyxl, json, sys
from pathlib import Path

SRC = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\user\Downloads\경기도교육청_2027수시NAVI_수시나비__260707_보호해제.xlsx"
OUT = Path("public/data"); OUT.mkdir(parents=True, exist_ok=True)

def col(ws, r, letter):
    from openpyxl.utils import column_index_from_string
    return ws.cell(row=r, column=column_index_from_string(letter)).value

def extract_moojib():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    ws = wb["data"]
    rows = list(ws.iter_rows(min_row=2, max_row=6369, values_only=True))
    # 0-based index: A=0 ... 세부지역=2, 대학명=3, 26수시=4, 27수시=7, 계열=8,
    # 교과1전형=11(L),50=12(M),70=13(N),5등급50=14(O),5등급70=15(P)
    # 교과2: 전형17(R),S18,T19,U20,V21 ... (letter 기준으로 index 매핑)
    def idx(letter):
        from openpyxl.utils import column_index_from_string
        return column_index_from_string(letter) - 1
    out = []
    for r in rows:
        if r[idx("D")] is None:  # 대학명 없으면 skip
            continue
        out.append({
            "kwon": r[idx("A")], "region": r[idx("B")], "subRegion": r[idx("C")],
            "univ": r[idx("D")], "moojib26": r[idx("E")], "moojib27": r[idx("H")],
            "gyeyeol": r[idx("I")],
            "gyogwa1": {"name": r[idx("L")], "p50": r[idx("M")], "p70": r[idx("N")], "p50_5": r[idx("O")], "p70_5": r[idx("P")]},
            "gyogwa2": {"name": r[idx("R")], "p50": r[idx("S")], "p70": r[idx("T")], "p50_5": r[idx("U")], "p70_5": r[idx("V")]},
            "gyogwa3": {"name": r[idx("X")], "p50": r[idx("Y")], "p70": r[idx("Z")], "p50_5": r[idx("AA")], "p70_5": r[idx("AB")]},
            "jonghap1": {"name": r[idx("AD")], "p50": r[idx("AE")], "p70": r[idx("AF")], "p50_5": r[idx("AG")], "p70_5": r[idx("AH")]},
            "jonghap2": {"name": r[idx("AJ")], "p50": r[idx("AK")], "p70": r[idx("AL")], "p50_5": r[idx("AM")], "p70_5": r[idx("AN")]},
            "code": r[idx("AS")], "banyeong": r[idx("AT")],
            "jeongsiCut70": r[idx("AQ")], "jeongsiEngHan": r[idx("AR")],
            "studentPercentileCached": r[idx("AU")],
        })
    json.dump(out, open(OUT/"moojib.json","w",encoding="utf-8"), ensure_ascii=False)
    print("moojib rows:", len(out))

if __name__ == "__main__":
    extract_moojib()
```

- [ ] **Step 2: 실행 및 건수 검증**

Run: `python scripts/extract.py`
Expected: `moojib rows: 6368`

- [ ] **Step 3: 샘플 값 눈으로 확인**

`public/data/moojib.json` 첫 항목이 `가야대 / 간호학과 / 자연 / 교과1 p70=3.5` 등 원본과 일치하는지 확인.

- [ ] **Step 4: Commit**

```bash
git add scripts/extract.py public/data/moojib.json && git commit -m "feat: data 시트 추출 → moojib.json (6368 모집단위)"
```

---

## Task 3: 추출 — 점수계산기 반영패턴 + 골든값

**Files:**
- Modify: `scripts/extract.py`
- Create(생성물): `public/data/calc_patterns.json`, `public/data/golden_calc.json`

- [ ] **Step 1: 점수계산기 코드테이블 추출 함수 추가**

5행부터 A열이 채워진 마지막 행까지, 각 행의 반영패턴 정보를 추출.
```python
def extract_calc():
    wbf = openpyxl.load_workbook(SRC, data_only=False)   # 수식(과목선택 규칙)
    wbv = openpyxl.load_workbook(SRC, read_only=True, data_only=True)  # 캐시값
    wf = wbf["점수계산기"]; wv = wbv["점수계산기"]
    from openpyxl.utils import get_column_letter, column_index_from_string
    def L(letter): return column_index_from_string(letter)
    patterns = []
    golden = {"studentInput": {  # 캐시된 현재 학생 모의고사 입력
        "kor": wv.cell(2, L("A")).value, "math": wv.cell(2, L("B")).value,
        "tam1": wv.cell(2, L("C")).value, "tam2": wv.cell(2, L("D")).value,
        "eng": wv.cell(2, L("E")).value,
    }, "rows": []}
    r = 5
    while wf.cell(r, 1).value not in (None, ""):
        code = wf.cell(r, 1).value
        # 가중치 Z:AC (원점수), 정규화 AD:AG, 과목선택 수식 AH:AK, 반영지표 C, 문구 B
        weights_raw = [wf.cell(r, L(c)).value for c in ["Z","AA","AB","AC"]]
        subj_formulas = [wf.cell(r, L(c)).value for c in ["AH","AI","AJ","AK"]]
        conv_table = [wv.cell(r, L(c)).value for c in ["H","I","J","K","L","M","N","O","P"]]  # 등급환산표
        patterns.append({
            "code": code,
            "banyeongText": wf.cell(r, L("B")).value,
            "metric": wf.cell(r, L("C")).value,           # 표/표, 백/백 등
            "weightsRaw": weights_raw,
            "subjectFormulas": [str(f) for f in subj_formulas],  # 원본 수식 문자열(이식 참고)
            "convTable": conv_table,
            "cachedAL": wv.cell(r, L("AL")).value,        # 골든 학생백분위
        })
        golden["rows"].append({"code": code, "al": wv.cell(r, L("AL")).value})
        r += 1
    json.dump(patterns, open(OUT/"calc_patterns.json","w",encoding="utf-8"), ensure_ascii=False)
    json.dump(golden, open(OUT/"golden_calc.json","w",encoding="utf-8"), ensure_ascii=False)
    print("calc patterns:", len(patterns))
```
그리고 `__main__`에서 `extract_calc()`도 호출.

- [ ] **Step 2: 실행 및 건수 확인**

Run: `python scripts/extract.py`
Expected: `calc patterns: 639` (대략), golden_calc.json에 studentInput + 639 rows.

- [ ] **Step 3: 과목선택 수식 종류 목록화**

`subjectFormulas`에 등장하는 서로 다른 패턴(`=$A$2`, `=LARGE(($A$2,$B$2,$F$2),1)`, `=$Q15` 등)을 스크립트로 집계해 `scripts/formula_kinds.txt`로 출력. → Task 6에서 이식할 규칙 목록의 근거.

```python
def survey_formulas():
    import re, collections
    pats = json.load(open(OUT/"calc_patterns.json",encoding="utf-8"))
    c = collections.Counter()
    for p in pats:
        for f in p["subjectFormulas"]:
            key = re.sub(r"\d+", "N", f)   # 행번호 제거
            c[key] += 1
    with open("scripts/formula_kinds.txt","w",encoding="utf-8") as fh:
        for k,v in c.most_common(): fh.write(f"{v}\t{k}\n")
```
Run: 위 함수 호출 추가 후 `python scripts/extract.py`, 그리고 `scripts/formula_kinds.txt` 확인.

- [ ] **Step 4: Commit**

```bash
git add scripts/extract.py public/data/calc_patterns.json public/data/golden_calc.json scripts/formula_kinds.txt && git commit -m "feat: 점수계산기 반영패턴/골든값 추출 + 수식종류 집계"
```

---

## Task 4: 추출 — 검색 결과 골든 픽스처 (end-to-end)

**Files:**
- Modify: `scripts/extract.py`
- Create(생성물): `public/data/golden_search.json`

- [ ] **Step 1: 검색 결과표 + 현재 필터 상태 추출**

`검색` 시트에서 현재 캐시된 결과(17~516행)의 대학/모집단위/차이값/순위와, 현재 필터 상태(지역·계열·5등급 토글 `V6`, 기준월 `N7`)를 뽑는다. Task 7 판정 로직의 종단 검증용.
```python
def extract_search_golden():
    wv = openpyxl.load_workbook(SRC, read_only=True, data_only=True)["검색"]
    from openpyxl.utils import column_index_from_string as ci
    def c(r, letter): return wv.cell(r, ci(letter)).value
    rows = []
    for r in range(17, 517):
        univ = c(r, "E")
        if univ in (None, "", "*"): continue
        rows.append({
            "region": c(r,"C"), "univ": univ, "moojib27": c(r,"G"),
            "studentP": c(r,"P"), "cut70": c(r,"Q"), "diff": c(r,"S"),
        })
    golden = {
        "baseMonth": c(7,"N"), "fiveGrade": c(6,"V"),
        "rows": rows,
    }
    json.dump(golden, open(OUT/"golden_search.json","w",encoding="utf-8"), ensure_ascii=False)
    print("search golden rows:", len(rows))
```

- [ ] **Step 2: 실행 및 확인**

Run: `python scripts/extract.py`
Expected: `search golden rows: > 0`, 차이값·컷이 숫자.

- [ ] **Step 3: Commit**

```bash
git add scripts/extract.py public/data/golden_search.json && git commit -m "feat: 검색 결과 골든 픽스처 추출"
```

---

## Task 5: 도메인 타입

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: 타입 정의**

```ts
export interface CutSet { name: string | null; p50: number | null; p70: number | null; p50_5: number | null; p70_5: number | null }
export interface Moojib {
  kwon: string; region: string; subRegion: string; univ: string;
  moojib26: string | null; moojib27: string | null; gyeyeol: string;
  gyogwa1: CutSet; gyogwa2: CutSet; gyogwa3: CutSet; jonghap1: CutSet; jonghap2: CutSet;
  code: string | null; banyeong: string | null;
  jeongsiCut70: number | null; jeongsiEngHan: string | null;
  studentPercentileCached: number | null;
}
export interface StudentScores { kor: number|null; math: number|null; tam1: number|null; tam2: number|null; engGrade: number|null; hanGrade: number|null }
export interface CalcPattern {
  code: string; banyeongText: string; metric: string;
  weightsRaw: (number|string|null)[]; subjectFormulas: string[];
  convTable: (number|null)[]; cachedAL: number|null;
}
export type JudgeLabel = "안정" | "적정" | "소신" | "도전";
export interface JudgeRow { moojib: Moojib; studentPercentile: number|null; diff: number|null; rank: number; label: JudgeLabel|null }
```

- [ ] **Step 2: 타입 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts && git commit -m "feat: 도메인 타입 정의"
```

---

## Task 6: 백분위 계산 엔진 이식 (점수계산기) — 골든 대조 TDD

> 이 태스크가 정확도의 핵심. `scripts/formula_kinds.txt`에 나온 과목선택 수식 종류를 하나씩 이식하고, 639개 캐시 AL과 전부 일치할 때까지 반복한다.

**Files:**
- Create: `src/engine/percentile.ts`, `src/engine/percentile.test.ts`

- [ ] **Step 1: 실패 테스트 작성 — 골든 전체 대조**

```ts
import { describe, it, expect } from "vitest"
import patterns from "../../public/data/calc_patterns.json"
import golden from "../../public/data/golden_calc.json"
import { computeStudentPercentile } from "./percentile"

describe("점수계산기 이식", () => {
  it("639개 캐시 학생백분위와 일치", () => {
    const s = golden.studentInput
    const student = { kor: s.kor, math: s.math, tam1: s.tam1, tam2: s.tam2, engGrade: null, hanGrade: null }
    const mismatches: string[] = []
    for (const p of patterns as any[]) {
      if (p.cachedAL == null || p.cachedAL === "-") continue
      const got = computeStudentPercentile(p, student as any)
      if (got == null || Math.abs(got - p.cachedAL) > 0.01) mismatches.push(`${p.code}: got ${got} want ${p.cachedAL}`)
    }
    expect(mismatches).toEqual([])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL (computeStudentPercentile 미정의).

- [ ] **Step 3: 엔진 최소 구현 — SUMPRODUCT 코어 + 고정과목 패턴부터**

과목값 결정: 학생 백분위에서 `탐구(1)=MAX(탐1,탐2)`, `탐구(2)=AVG(탐1,탐2)` 파생. 각 `subjectFormula`를 파싱해 값 배열을 만들고 정규화 가중치와 SUMPRODUCT.
```ts
import type { CalcPattern, StudentScores } from "../types"

function subjectValue(formula: string, s: StudentScores): number | null {
  // $A$2=국,$B$2=수,$C$2=탐1,$D$2=탐2,$E$2=영(등급→환산은 Q 참조 시 별도),$F$2=탐(1),$G$2=탐(2)
  const map: Record<string, number|null> = {
    "$A$2": s.kor, "$B$2": s.math, "$C$2": s.tam1, "$D$2": s.tam2,
    "$F$2": maxN(s.tam1, s.tam2), "$G$2": avgN(s.tam1, s.tam2),
  }
  const f = formula.replace(/^=/, "")
  if (f in map) return map[f]
  const large = f.match(/^LARGE\(\((.+)\),(\d)\)$/)   // 중 N개
  if (large) {
    const cands = large[1].split(",").map(t => map[t.trim()]).filter(v => v != null) as number[]
    const k = Number(large[2])
    return cands.sort((a,b)=>b-a)[k-1] ?? null
  }
  // Q 참조(영어/한국사 등급환산)는 Step 5에서 처리
  return null
}
const maxN = (a:number|null,b:number|null) => a==null?b:b==null?a:Math.max(a,b)
const avgN = (a:number|null,b:number|null) => (a==null||b==null)?null:(a+b)/2
const round2 = (n:number) => Math.round(n*100)/100

export function computeStudentPercentile(p: CalcPattern, s: StudentScores): number | null {
  const raw = p.weightsRaw.map(w => typeof w === "number" ? w : (w==null||w===""?0:Number(w)) )
  const sum = raw.reduce((a,b)=>a+(b||0),0)
  if (!sum) return null
  const weights = raw.map(w => round2((w||0)/sum*100))
  const vals = p.subjectFormulas.map(f => subjectValue(f, s))
  let num = 0, wsum = 0
  for (let i=0;i<weights.length;i++){ if (vals[i]!=null && weights[i]) { num += weights[i]*(vals[i] as number); wsum += weights[i] } }
  if (!wsum) return null
  return num / wsum
}
```

- [ ] **Step 4: 테스트 실행 — 불일치 목록 확인**

Run: `npm test`
Expected: 처음엔 일부 코드 불일치(영어환산 `$Q` 참조, 표준점수 metric 등). 불일치 메시지의 code를 `calc_patterns.json`에서 찾아 원인 패턴을 파악.

- [ ] **Step 5: 남은 패턴 이식 (영어/한국사 등급환산 + metric 처리)**

`subjectFormula`가 `=$Q{row}` 형태면 등급환산: 학생 영어등급(`s.engGrade`)을 `p.convTable`(1등급=index0 …)로 환산. `한` 문구 패턴은 한국사 등급 사용. `metric`이 표준점수(`표/표`)인 경우 원본이 백분위칸에 이미 환산해 둔 값을 쓰는지 확인 후 동일 처리. 각 수정 후 `npm test`로 불일치가 줄어드는지 확인, **불일치 0이 될 때까지 반복**.

> 주의: 골든은 현재 학생의 영어/한국사 등급이 특정 값으로 이미 반영돼 있음. `golden_calc.json`에 영어등급이 없으면 Task 3 추출에 `검색!H10`(한국사)·영어등급 셀을 추가로 뽑아 studentInput에 포함시킬 것.

- [ ] **Step 6: 전체 통과 확인**

Run: `npm test`
Expected: PASS (mismatches 빈 배열).

- [ ] **Step 7: Commit**

```bash
git add src/engine/percentile.ts src/engine/percentile.test.ts && git commit -m "feat: 백분위 계산 엔진 이식 — 639개 골든값 전부 일치"
```

---

## Task 7: 판정·순위 로직 이식 (검색) — 골든 대조 TDD

**Files:**
- Create: `src/engine/judge.ts`, `src/engine/judge.test.ts`, `src/data/loadData.ts`

- [ ] **Step 1: 실패 테스트 — golden_search 대조**

```ts
import { describe, it, expect } from "vitest"
import moojib from "../../public/data/moojib.json"
import golden from "../../public/data/golden_search.json"
import { judge } from "./judge"

describe("검색 판정 이식", () => {
  it("차이값·순위가 골든과 일치", () => {
    // 골든은 캐시된 학생백분위(moojib.studentPercentileCached)를 사용해 종단 비교
    const rows = judge(moojib as any, {
      useCachedPercentile: true,
      fiveGrade: !!golden.fiveGrade,
      regions: null, gyeyeols: null, univQuery: "", moojibQuery: "",
    })
    // 골든 각 행의 diff와 매칭
    for (const g of golden.rows.slice(0, 50)) {
      const m = rows.find(r => r.moojib.univ === g.univ && r.moojib.moojib27 === g.moojib27)
      expect(m, `${g.univ} ${g.moojib27}`).toBeTruthy()
      if (g.diff != null && typeof g.diff === "number")
        expect(Math.abs((m!.diff ?? -999) - g.diff)).toBeLessThan(0.01)
    }
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL (judge 미정의).

- [ ] **Step 3: judge 구현 — 차이값·필터·순위**

```ts
import type { Moojib, JudgeRow } from "../types"

export interface JudgeOptions {
  useCachedPercentile?: boolean
  studentPercentileByCode?: (code: string|null) => number|null  // Task6 엔진 연결용
  fiveGrade: boolean
  regions: string[] | null; gyeyeols: string[] | null; univQuery: string; moojibQuery: string
}

export function judge(all: Moojib[], opt: JudgeOptions): JudgeRow[] {
  const filtered = all.filter(m => {
    if (opt.regions && !opt.regions.includes(m.kwon)) return false
    if (opt.gyeyeols && !opt.gyeyeols.includes(m.gyeyeol)) return false
    if (opt.univQuery && !(m.univ ?? "").includes(opt.univQuery)) return false
    if (opt.moojibQuery && !((m.moojib27 ?? "").includes(opt.moojibQuery))) return false
    return true
  })
  const withDiff = filtered.map(m => {
    const sp = opt.useCachedPercentile ? m.studentPercentileCached
              : opt.studentPercentileByCode?.(m.code) ?? null
    const cut = m.jeongsiCut70
    const diff = (sp != null && cut != null) ? sp - cut : null
    return { moojib: m, studentPercentile: sp, diff, rank: 0, label: null } as JudgeRow
  })
  // 순위: 차이값 오름차순(원본 RANK(...,1)) — null은 최하위로
  const sortable = withDiff.filter(r => r.diff != null).sort((a,b)=> (a.diff! - b.diff!))
  sortable.forEach((r,i)=> r.rank = i+1)
  return withDiff
}
```

- [ ] **Step 4: 통과 확인 (순위 정렬 방향 검증)**

Run: `npm test`
Expected: diff 일치. 만약 순위 방향이 골든과 반대면 정렬 부호를 원본 `RANK(...,1)`(오름차순) 기준으로 맞추고, 동점보정(`COUNTIF` 누적)도 원본과 대조해 구현.

- [ ] **Step 5: Commit**

```bash
git add src/engine/judge.ts src/engine/judge.test.ts src/data/loadData.ts && git commit -m "feat: 검색 판정·순위 이식 — 골든 차이값 일치"
```

---

## Task 8: 판정 라벨

**Files:**
- Create: `src/engine/label.ts`, `src/config.ts`, `src/engine/label.test.ts`

- [ ] **Step 1: 경계 상수 + 실패 테스트**

`src/config.ts`:
```ts
export const LABEL_THRESHOLDS = { stable: 5, fit: 0, brave: -3 } // 차이값 기준(조정 가능)
```
`label.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { labelOf } from "./label"
describe("판정 라벨", () => {
  it("경계값대로 분류", () => {
    expect(labelOf(6)).toBe("안정"); expect(labelOf(2)).toBe("적정")
    expect(labelOf(-1)).toBe("소신"); expect(labelOf(-5)).toBe("도전")
    expect(labelOf(null)).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test` → FAIL.

- [ ] **Step 3: 구현**

```ts
import { LABEL_THRESHOLDS as T } from "../config"
import type { JudgeLabel } from "../types"
export function labelOf(diff: number|null): JudgeLabel|null {
  if (diff == null) return null
  if (diff >= T.stable) return "안정"
  if (diff >= T.fit) return "적정"
  if (diff >= T.brave) return "소신"
  return "도전"
}
```
그리고 `judge()` 결과에 `label = labelOf(r.diff)` 채우기(judge.ts 수정 + judge.test 여전히 통과 확인).

- [ ] **Step 4: 통과·Commit**

Run: `npm test` → PASS.
```bash
git add src/engine/label.ts src/config.ts src/engine/label.test.ts src/engine/judge.ts && git commit -m "feat: 판정 라벨(안정/적정/소신/도전) + 조정 가능한 경계값"
```

---

## Task 9: 입력 UI (ScoreInput)

**Files:**
- Create: `src/ui/ScoreInput.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 입력 컴포넌트 작성**

props: `value: StudentScores`, `onChange`, 그리고 필터(지역·계열 다중선택), 기준월 select(3/5/6/7/9/10/11), 5등급 토글. 내신은 1단계에선 직접 입력(학기별 등급) 필드로 시작(내신 시트 연동은 후속). 모의고사 백분위 6칸(국·수·탐1·탐2·영등급·한국사등급).

```tsx
import type { StudentScores } from "../types"
export function ScoreInput(props: {
  scores: StudentScores; onScores: (s: StudentScores)=>void;
  regions: string[]; onRegions:(r:string[])=>void;
  gyeyeols: string[]; onGyeyeols:(g:string[])=>void;
  fiveGrade: boolean; onFiveGrade:(b:boolean)=>void;
}) {
  const set = (k: keyof StudentScores) => (e: any) =>
    props.onScores({ ...props.scores, [k]: e.target.value === "" ? null : Number(e.target.value) })
  return (
    <section>
      <h2>학생 성적 입력</h2>
      <label>국어 <input type="number" value={props.scores.kor ?? ""} onChange={set("kor")} /></label>
      <label>수학 <input type="number" value={props.scores.math ?? ""} onChange={set("math")} /></label>
      <label>탐구1 <input type="number" value={props.scores.tam1 ?? ""} onChange={set("tam1")} /></label>
      <label>탐구2 <input type="number" value={props.scores.tam2 ?? ""} onChange={set("tam2")} /></label>
      <label>영어등급 <input type="number" value={props.scores.engGrade ?? ""} onChange={set("engGrade")} /></label>
      <label>한국사등급 <input type="number" value={props.scores.hanGrade ?? ""} onChange={set("hanGrade")} /></label>
      <label><input type="checkbox" checked={props.fiveGrade} onChange={e=>props.onFiveGrade(e.target.checked)} /> 5등급제 변환</label>
    </section>
  )
}
```

- [ ] **Step 2: App에서 상태 배선 + 빌드 확인**

Run: `npm run build`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/ui/ScoreInput.tsx src/App.tsx && git commit -m "feat: 성적 입력 UI"
```

---

## Task 10: 결과표 UI (ResultTable) + 앱 연결

**Files:**
- Create: `src/ui/ResultTable.tsx`
- Modify: `src/App.tsx`, `src/data/loadData.ts`

- [ ] **Step 1: 데이터 로더 + 엔진 연결**

`loadData.ts`에서 moojib.json·calc_patterns.json을 fetch. App에서 입력 변경 시 각 code별 `computeStudentPercentile`로 학생백분위 맵을 만들고 → `judge(..., { studentPercentileByCode })` 호출 → 결과를 ResultTable에 전달.

- [ ] **Step 2: 결과표 컴포넌트**

목업대로 컬럼: 대학 / 27수시 모집단위 / 전형 / 70%컷 / 차이값 / 판정 라벨. 차이값 부호에 따라 색, 라벨 색칠. 정렬은 rank순.
```tsx
import type { JudgeRow } from "../types"
const COLORS: Record<string,string> = { 안정:"#0f6e56", 적정:"#185fa5", 소신:"#854f0b", 도전:"#a32d2d" }
export function ResultTable({ rows }: { rows: JudgeRow[] }) {
  const sorted = [...rows].filter(r=>r.diff!=null).sort((a,b)=>a.rank-b.rank)
  return (
    <table>
      <thead><tr><th>대학</th><th>모집단위</th><th>반영</th><th>70%컷</th><th>차이값</th><th>판정</th></tr></thead>
      <tbody>
        {sorted.map((r,i)=>(
          <tr key={i}>
            <td>{r.moojib.univ}</td><td>{r.moojib.moojib27}</td><td>{r.moojib.banyeong}</td>
            <td>{r.moojib.jeongsiCut70}</td>
            <td>{r.diff==null?"-":(r.diff>0?"+":"")+r.diff.toFixed(1)}</td>
            <td style={{color: r.label?COLORS[r.label]:undefined}}>{r.label ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: dev 서버로 수동 확인**

Run: `npm run dev` → 브라우저에서 값 입력 시 결과표가 갱신되는지 확인.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: 결과표 UI + 엔진 연결"
```

---

## Task 11: 종단 검증 (원본 엑셀 대조)

**Files:**
- Create: `src/engine/e2e.test.ts`

- [ ] **Step 1: 실제 엔진 경로로 골든 재현 테스트**

캐시가 아닌 **실제 computeStudentPercentile → judge** 경로로 golden_search를 재현하는지 검증(골든 학생입력 사용). 차이값이 golden_search.rows와 0.01 이내 일치해야 함.

- [ ] **Step 2: 통과 확인**

Run: `npm test`
Expected: 전체 PASS. 불일치 시 systematic-debugging으로 원인(과목 파생/등급환산/필터) 추적.

- [ ] **Step 3: Commit**

```bash
git add src/engine/e2e.test.ts && git commit -m "test: 실제 엔진 경로 종단 검증 (원본 골든 재현)"
```

---

## Task 12: GitHub Pages 배포

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: GitHub Actions 배포 워크플로 작성**

```yaml
name: Deploy
on: { push: { branches: [main] } }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 원격 저장소 생성·푸시 (사용자와 함께)**

> 공개 저장소면 원본 데이터가 공개됨 — 배포 전 사용자에게 재확인. `gh repo create` 및 push는 사용자 승인 후 진행. GitHub 저장소 Settings→Pages에서 Source=GitHub Actions 설정.

- [ ] **Step 3: 배포 URL 동작 확인**

Actions 성공 후 `https://<user>.github.io/<repo>/` 접속해 입력·판정 동작 확인.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml && git commit -m "ci: GitHub Pages 배포 워크플로"
```

---

## 자체 검토 메모

- **스펙 커버리지:** 입력(Task9)·백분위엔진(Task6)·판정순위(Task7)·5등급토글(Task2/7)·판정라벨(Task8)·결과표(Task10)·정확도검증(Task6/7/11)·배포(Task12) 모두 태스크 존재.
- **미해결 의존성:** Task6 Step5에서 영어/한국사 등급환산에 학생 등급값이 필요 → Task3 추출에 해당 셀 포함 필요(메모됨). 내신 시트 연동은 1단계 비범위(직접입력으로 시작).
- **타입 일관성:** `computeStudentPercentile(pattern, scores)`, `judge(moojib[], options)`, `labelOf(diff)` 시그니처가 Task 전반에서 일치.
