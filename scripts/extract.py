import openpyxl, json, sys
from pathlib import Path

SRC = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\user\Downloads\경기도교육청_2027수시NAVI_수시나비__260707_보호해제.xlsx"
OUT = Path("public/data"); OUT.mkdir(parents=True, exist_ok=True)

def extract_moojib():
    from openpyxl.utils import column_index_from_string
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    ws = wb["data"]
    rows = list(ws.iter_rows(min_row=2, max_row=6369, values_only=True))
    def idx(letter):
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


if __name__ == "__main__":
    extract_moojib()
    extract_calc()
    survey_formulas()
