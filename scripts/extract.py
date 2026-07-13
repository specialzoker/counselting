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

if __name__ == "__main__":
    extract_moojib()
