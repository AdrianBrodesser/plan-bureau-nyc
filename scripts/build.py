#!/usr/bin/env python3
"""Assemble the single-page site: src/ + data/ + geo/ -> dist/index.html (and build/model.js for tests)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    src, data, geo = ROOT / "src", ROOT / "data", ROOT / "geo"
    live = json.loads((data / "live.json").read_text())
    manual = json.loads((data / "manual.json").read_text())
    site = json.loads((data / "site.json").read_text()) if (data / "site.json").exists() else {}
    shell = (src / "shell.html").read_text()
    model = (src / "model_head.js").read_text() + (src / "model_body.js").read_text()
    cd_fallback = json.dumps(live.get("cd") or {}, separators=(",", ":"))
    ui = (src / "ui.js").read_text().replace("/*CDGEO*/", (geo / "cd_simpl.json").read_text().strip()).replace("/*CDDATA*/", cd_fallback)
    inject = "const LIVE_DATA = " + json.dumps(live, separators=(",", ":"), ensure_ascii=False) + ";\nconst MANUAL_DATA = " + json.dumps(manual, separators=(",", ":"), ensure_ascii=False) + ";\nconst SITE_CONFIG = " + json.dumps(site) + ";\n"
    html = shell.replace("/*MODEL*/", inject + model).replace("/*UI*/", ui)
    (ROOT / "dist").mkdir(exist_ok=True)
    (ROOT / "dist" / "index.html").write_text(html)
    (ROOT / "dist" / ".nojekyll").write_text("")
    (ROOT / "build").mkdir(exist_ok=True)
    (ROOT / "build" / "model.js").write_text(model)
    print(f"dist/index.html {len(html) // 1024} KB, data generated {live.get('generated')}")


if __name__ == "__main__":
    main()
