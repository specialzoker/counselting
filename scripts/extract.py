import openpyxl, json, sys
from pathlib import Path

_args = [a for a in sys.argv[1:] if a not in ("refs", "hapbul")]
SRC = _args[0] if _args else r"C:\Users\user\Downloads\경기도교육청_2027수시NAVI_수시나비__260707_보호해제.xlsx"
OUT = Path("public/data"); OUT.mkdir(parents=True, exist_ok=True)

def _num(v):
    """숫자 셀만 통과, 아니면(빈칸/'-' 등) None. 타입(number|null)을 정직하게 유지."""
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None

def extract_moojib():
    from openpyxl.utils import column_index_from_string
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    ws = wb["data"]
    rows = list(ws.iter_rows(min_row=2, max_row=6369, values_only=True))
    def idx(letter):
        return column_index_from_string(letter) - 1
    def cut(name_l, p50_l, p70_l, p50_5_l, p70_5_l, r):
        return {"name": r[idx(name_l)], "p50": _num(r[idx(p50_l)]), "p70": _num(r[idx(p70_l)]),
                "p50_5": _num(r[idx(p50_5_l)]), "p70_5": _num(r[idx(p70_5_l)])}
    out = []
    for r in rows:
        if r[idx("D")] is None:  # 대학명 없으면 skip
            continue
        out.append({
            "kwon": r[idx("A")], "region": r[idx("B")], "subRegion": r[idx("C")],
            "univ": r[idx("D")], "moojib26": r[idx("E")], "moojib27": r[idx("H")],
            "gyeyeol": r[idx("I")],
            "gyogwa1": cut("L","M","N","O","P", r),
            "gyogwa2": cut("R","S","T","U","V", r),
            "gyogwa3": cut("X","Y","Z","AA","AB", r),
            "jonghap1": cut("AD","AE","AF","AG","AH", r),
            "jonghap2": cut("AJ","AK","AL","AM","AN", r),
            "code": r[idx("AS")], "banyeong": r[idx("AT")],
            "jeongsiCut70": _num(r[idx("AQ")]), "jeongsiEngHan": r[idx("AR")],
            "studentPercentileCached": _num(r[idx("AU")]),
        })
    json.dump(out, open(OUT/"moojib.json","w",encoding="utf-8"), ensure_ascii=False)
    print("moojib rows:", len(out))

def _formula_str(v):
    """Normalize a cell's formula value to a plain string.
    Array-formula cells return an openpyxl ArrayFormula object (with a .text
    attribute holding the actual formula string), not a str."""
    if v is None:
        return ""
    text = getattr(v, "text", None)
    if text is not None:
        return text
    return str(v)


def extract_calc():
    # Random .cell() access on a read_only sheet is O(n) per call (re-streams),
    # so iterate the (small) 점수계산기 sheet exactly once into row lists instead.
    from openpyxl.utils import column_index_from_string as ci
    wbf = openpyxl.load_workbook(SRC, read_only=True, data_only=False)    # formulas
    wbv = openpyxl.load_workbook(SRC, read_only=True, data_only=True)     # cached values
    wf = wbf["점수계산기"]; wv = wbv["점수계산기"]
    def i(letter): return ci(letter) - 1  # 0-based index into a row tuple

    frows = [list(row) for row in wf.iter_rows(values_only=False)]  # cell objects (formulas)
    vrows = [list(row) for row in wv.iter_rows(values_only=True)]   # cached values

    def fval(row, letter):
        idx = i(letter)
        return _formula_str(row[idx].value) if idx < len(row) else ""
    def vval(row, letter):
        idx = i(letter)
        return row[idx] if idx < len(row) else None

    v2 = vrows[1]  # row 2 = student mock input
    golden = {"studentInput": {
        "kor": vval(v2,"A"), "math": vval(v2,"B"), "tam1": vval(v2,"C"),
        "tam2": vval(v2,"D"), "eng": vval(v2,"E"),
    }, "rows": []}

    patterns = []
    for ridx in range(4, len(vrows)):  # row 5 = index 4
        vrow = vrows[ridx]; frow = frows[ridx]
        code = vval(vrow, "A")
        if code in (None, ""):
            break
        patterns.append({
            "code": code,
            "banyeongText": vval(vrow, "B"),
            "metric": vval(vrow, "C"),
            "weightsRaw": [vval(vrow, c) for c in ["Z","AA","AB","AC"]],
            "subjectFormulas": [fval(frow, c) for c in ["AH","AI","AJ","AK"]],
            "convTable": [vval(vrow, c) for c in ["H","I","J","K","L","M","N","O","P"]],
            "cachedAL": vval(vrow, "AL"),
        })
        golden["rows"].append({"code": code, "al": vval(vrow, "AL")})

    json.dump(patterns, open(OUT/"calc_patterns.json","w",encoding="utf-8"), ensure_ascii=False)
    json.dump(golden, open(OUT/"golden_calc.json","w",encoding="utf-8"), ensure_ascii=False)
    print("calc patterns:", len(patterns))


def extract_search_golden():
    # 검색 결과표(현재 필터 상태의 캐시된 판정 결과)를 종단 검증용 골든으로 추출.
    from openpyxl.utils import column_index_from_string as ci
    wbv = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    ws = wbv["검색"]
    def i(letter): return ci(letter) - 1
    rows_all = [list(r) for r in ws.iter_rows(min_row=1, max_row=517, values_only=True)]
    def cell(rownum, letter):
        row = rows_all[rownum - 1]
        idx = i(letter)
        return row[idx] if idx < len(row) else None
    out = []
    for rownum in range(17, 517):
        row = rows_all[rownum - 1]
        univ = row[i("E")] if i("E") < len(row) else None
        if univ in (None, "", "*"):
            continue
        out.append({
            "region": row[i("C")], "univ": univ, "moojib27": row[i("G")],
            "studentP": row[i("P")], "cut70": row[i("Q")], "diff": row[i("S")],
        })
    # 5등급제 토글은 검색!AK5 (판정 수식 IF($AK$5=TRUE,...)의 스위치). V6는 라벨이라 사용하지 않음.
    golden = {"baseMonth": cell(7, "N"), "fiveGrade": bool(cell(5, "AK")), "rows": out}
    json.dump(golden, open(OUT/"golden_search.json","w",encoding="utf-8"), ensure_ascii=False)
    print("search golden rows:", len(out))


def survey_formulas():
    import re, collections
    pats = json.load(open(OUT/"calc_patterns.json",encoding="utf-8"))
    c = collections.Counter()
    for p in pats:
        for f in p["subjectFormulas"]:
            key = re.sub(r"\d+", "N", f)
            c[key] += 1
    with open("scripts/formula_kinds.txt","w",encoding="utf-8") as fh:
        for k,v in c.most_common(): fh.write(f"{v}\t{k}\n")


# ---- 참고 데이터 탭 범용 추출 ----
REF_CONFIGS = [
    # (시트명, 파일키, 헤더행들(1-based), 데이터시작행, 스킵마커행유무)
    ("전형일정", "schedule", [5], 7, True),
    ("전공자율", "jayul", [5], 7, True),
    ("교과반영", "gyogwaBanyeong", [5, 6], 8, True),
    ("특별전형", "special", [6, 7], 9, True),
    ("종합", "jonghap", [6], 8, True),
    ("2028대입", "y2028", [5], 9, True),
]

def _ffill(row):
    """가로 병합셀 대비: None을 왼쪽 값으로 채운다."""
    out, last = [], None
    for v in row:
        if v is not None and str(v).strip() != "":
            last = v
        out.append(last)
    return out

def _header_names(allrows, header_rows, ncol):
    filled = []
    for hr in header_rows:
        raw = allrows[hr - 1]
        row = [raw[c] if c < len(raw) else None for c in range(ncol)]
        filled.append(_ffill(row))
    names = []
    for c in range(ncol):
        parts = []
        for f in filled:
            v = f[c]
            if v is not None and str(v).strip() != "" and str(v) not in parts:
                parts.append(str(v).replace("\n", " ").strip())
        names.append(" · ".join(parts) if parts else f"col{c+1}")
    return names

def extract_refs():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    outdir = OUT / "ref"; outdir.mkdir(parents=True, exist_ok=True)
    index = []
    for sheet, key, header_rows, data_start, skip_marker in REF_CONFIGS:
        ws = wb[sheet]
        allrows = list(ws.iter_rows(values_only=True))
        maxrow = len(allrows)
        # 실제 열 개수: 헤더행 중 가장 넓은 것
        ncol = 0
        for hr in header_rows:
            row = allrows[hr - 1]
            for i, v in enumerate(row):
                if v is not None and str(v).strip() != "":
                    ncol = max(ncol, i + 1)
        names = _header_names(allrows, header_rows, ncol)
        rows = []
        for r in range(data_start, maxrow + 1):
            row = allrows[r - 1]
            cells = [row[c] if c < len(row) else None for c in range(ncol)]
            if all(v is None or str(v).strip() == "" for v in cells):
                continue
            if skip_marker and all((v == "*" or v is None) for v in cells):
                continue
            rows.append([("" if v is None else v) for v in cells])
        # 헤더 없는 자동생성 열(colN = 스페이서/행번호 인덱스)은 제거
        keep = [c for c in range(ncol)
                if not (names[c].startswith("col") and names[c][3:].isdigit())]
        names = [names[c] for c in keep]
        rows = [[row[c] for c in keep] for row in rows]
        import json as _json
        _json.dump({"sheet": sheet, "columns": names, "rows": rows},
                   open(outdir / f"{key}.json", "w", encoding="utf-8"), ensure_ascii=False)
        index.append({"key": key, "sheet": sheet, "columns": len(names), "rows": len(rows)})
        print(f"ref {sheet}: {len(rows)} rows x {len(names)} cols")
    import json as _json
    _json.dump(index, open(outdir / "index.json", "w", encoding="utf-8"), ensure_ascii=False)



# ---- 합불사례(전형별/모집단위별) 기준대학별 청크 추출 ----
HAPBUL_CONFIGS = [
    ("전형별", "byType"),
    ("모집단위별", "byUnit"),
]

def extract_hapbul():
    import json as _json
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    outdir = OUT / "hapbul"; outdir.mkdir(parents=True, exist_ok=True)
    for sheet, key in HAPBUL_CONFIGS:
        ws = wb[sheet]
        it = ws.iter_rows(values_only=True)
        header = [str(h) if h is not None else "" for h in next(it)]
        groups = {}
        order = []
        for r in it:
            base = r[0]
            if base is None:
                continue
            if base not in groups:
                groups[base] = []
                order.append(base)
            groups[base].append([("" if v is None else v) for v in r])
        index = []
        for i, base in enumerate(order):
            rows = groups[base]
            _json.dump({"sheet": sheet, "base": base, "columns": header, "rows": rows},
                       open(outdir / f"{key}_{i}.json", "w", encoding="utf-8"), ensure_ascii=False)
            index.append({"id": i, "name": base, "rows": len(rows)})
        _json.dump({"sheet": sheet, "key": key, "columns": header, "bases": index},
                   open(outdir / f"{key}_index.json", "w", encoding="utf-8"), ensure_ascii=False)
        print(f"hapbul {sheet}: {len(order)} bases, {sum(len(g) for g in groups.values())} rows")



if __name__ == "__main__":
    if "refs" in sys.argv:
        extract_refs()
    elif "hapbul" in sys.argv:
        extract_hapbul()
    else:
        extract_moojib()
        extract_calc()
        extract_search_golden()
        survey_formulas()
