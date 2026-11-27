#!/usr/bin/env python3
"""List hand-maintained figures whose scheduled check is due (data/manual.json).
Prints a Markdown issue body, or nothing when everything is current."""
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def add_months(d, m):
    y, mo = divmod(d.month - 1 + m, 12)
    return dt.date(d.year + y, mo + 1, min(d.day, 28))


def main(today=None):
    today = today or dt.date.today()
    man = json.loads((ROOT / "data" / "manual.json").read_text())
    due = []
    for k, m in man.items():
        if not m.get("reviewMonths"):
            continue
        when = add_months(dt.date.fromisoformat(m["verified"]), m["reviewMonths"])
        if when <= today:
            due.append((when, k, m))
    if not due:
        return ""
    due.sort()
    lines = ["These starting figures are past their scheduled check. For each one: open the source, confirm or correct it (search `src/` for the number quoted in the label, and update the label in `SOURCES` in `src/model_head.js`), then set `verified` to today's date in `data/manual.json`.", ""]
    for when, k, m in due:
        lines.append(f"- [ ] **{k}** (due {when.isoformat()}): [{m['label']}]({m['url']})")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    print(main(), end="")
