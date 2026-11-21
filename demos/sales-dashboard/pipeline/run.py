"""One command for the whole pipeline:

    python -m pipeline.run            # raw CSV (regenerated) -> clean CSV + report -> Excel -> web JSON
    python -m pipeline.run --raw my_export.csv   # a client's own export instead of the sample
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from . import build_excel, export_web, generate_raw
from .clean import clean, read_raw

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--raw", type=Path, help="raw export to clean (default: regenerate the sample)")
    args = ap.parse_args(argv)

    raw_path = args.raw
    if raw_path is None:
        raw_path = DATA / "raw" / "sales_export_raw.csv"
        generate_raw.write_csv(generate_raw.generate(), raw_path)
    raw = read_raw(raw_path)
    df, rep, rejected = clean(raw)
    report = rep.to_dict()

    (DATA / "clean").mkdir(parents=True, exist_ok=True)
    df.to_csv(DATA / "clean" / "sales_clean.csv", index=False, encoding="utf-8-sig")
    (DATA / "clean" / "cleaning_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    if len(rejected):
        rejected.to_csv(DATA / "clean" / "rows_to_review.csv", index=False, encoding="utf-8-sig")
    xlsx = build_excel.build(df, report, DATA / "excel" / "alfayrouz_sales_analysis.xlsx")
    js = export_web.write(export_web.build_payload(df, report, raw), DATA / "web" / "sales.json")
    print(f"raw {report['raw_rows']:,} -> clean {report['clean_rows']:,} ({len(rejected)} to review)")
    print(f"excel: {xlsx.relative_to(ROOT)} · web: {js.relative_to(ROOT)} ({js.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
