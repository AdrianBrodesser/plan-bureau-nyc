#!/usr/bin/env python3
"""Refresh the live figures that Plan Bureau NYC starts from.

Sources (all public):
  * US Census Bureau, American Community Survey 5-year data profiles (boroughs and the
    community-district PUMAs). Needs a free key in the CENSUS_API_KEY environment variable.
  * US Bureau of Labor Statistics, LAUS: New York City unemployment rate, latest month.
    BLS_API_KEY is optional (without it the API allows 25 requests a day).
  * NYC Open Data (Socrata): water consumption and NYPD shooting incidents.
    SOCRATA_APP_TOKEN is optional.

Safety rules: a figure is only replaced when the new value is inside sane bounds and has not
jumped too far from the previous value. Anything that fails keeps its old value and is listed
in data/update_report.md. The script never exits with an error because a source is down,
so the site keeps deploying with the last good data.

Usage:
  python scripts/update_data.py              # fetch and update data/live.json
  python scripts/update_data.py --dry-run    # fetch and report, write nothing
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIVE_PATH = ROOT / "data" / "live.json"
REPORT_PATH = ROOT / "data" / "update_report.md"
UA = "PlanBureauNYC-data-updater/1.0 (+https://github.com/)"

BOROS = {"005": "BX", "047": "BK", "061": "MN", "081": "QN", "085": "SI"}
BORO_DIGIT = {"Manhattan": "1", "Bronx": "2", "Brooklyn": "3", "Queens": "4", "Staten Island": "5"}

# Lowest and highest values we will accept, and the largest relative change from the old value.
BOUNDS = {
    "bor.pov": (3, 45, 0.35), "bor.unemp": (1, 20, 0.6), "bor.inc": (20000, 250000, 0.35),
    "city.unemp": (1.5, 20, 0.8), "city.water": (700, 1400, 0.2), "city.shoot": (100, 3000, 0.6),
    "cd.pov": (1, 60, 0.7), "cd.unemp": (0.5, 25, 1.0), "cd.burd": (10, 80, 0.5), "cd.o65": (2, 40, 0.6),
    "cd.bach": (3, 95, 0.6), "cd.pop": (20000, 400000, 0.5),
}

# ACS data-profile variables are found by label, not number, because the Census Bureau
# renumbers them between years. "{Y}" stands for the survey year in inflation-adjusted labels.
ACS_LABELS = {
    "pop": "Estimate!!SEX AND AGE!!Total population",
    "unemp": "Percent!!EMPLOYMENT STATUS!!Civilian labor force!!Unemployment Rate",
    "inc": "Estimate!!INCOME AND BENEFITS (IN {Y} INFLATION-ADJUSTED DOLLARS)!!Total households!!Median household income (dollars)",
    "pov": "Percent!!PERCENTAGE OF FAMILIES AND PEOPLE WHOSE INCOME IN THE PAST 12 MONTHS IS BELOW THE POVERTY LEVEL!!All people",
    "rent30": "Percent!!GROSS RENT AS A PERCENTAGE OF HOUSEHOLD INCOME (GRAPI)!!Occupied units paying rent (excluding units where GRAPI cannot be computed)!!30.0 to 34.9 percent",
    "rent35": "Percent!!GROSS RENT AS A PERCENTAGE OF HOUSEHOLD INCOME (GRAPI)!!Occupied units paying rent (excluding units where GRAPI cannot be computed)!!35.0 percent or more",
    "o65": "Percent!!SEX AND AGE!!Total population!!65 years and over",
    "bach": "Percent!!EDUCATIONAL ATTAINMENT!!Population 25 years and over!!Bachelor's degree or higher",
}


def norm(label):
    return re.sub(r"\s+", " ", label.replace(":", "")).strip().lower()


class Fetcher:
    """Thin HTTP layer; tests replace it with recorded responses."""

    def get_json(self, url, params=None, body=None, tries=3):
        if params:
            url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(params, safe=":,*'$ ")
        data = json.dumps(body).encode() if body is not None else None
        headers = {"User-Agent": UA, "Accept": "application/json"}
        if body is not None:
            headers["Content-Type"] = "application/json"
        last = None
        for i in range(tries):
            try:
                req = urllib.request.Request(url.replace(" ", "%20"), data=data, headers=headers)
                with urllib.request.urlopen(req, timeout=90) as r:
                    return json.loads(r.read().decode("utf-8"))
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
                last = e
                time.sleep(2 * (i + 1))
        raise RuntimeError(f"{url[:120]}: {last}")


class Updater:
    def __init__(self, live, fetch, today=None, accept_jumps=False):
        self.live = live
        self.f = fetch
        self.today = today or dt.date.today()
        self.accept = accept_jumps
        self.rows = []  # report rows

    # --- bookkeeping ---
    def _check(self, kind, old, new):
        lo, hi, jump = BOUNDS[kind]
        if new is None or not (lo <= new <= hi):
            return f"rejected: {new} outside {lo}–{hi}"
        if old not in (None, 0) and not self.accept and abs(new - old) / abs(old) > jump:
            return f"rejected: jump from {old} to {new} (> {int(jump * 100)}%), rerun with --accept-jumps if correct"
        return None

    def set_value(self, key, kind, v, as_of, src, url):
        vals = self.live.setdefault("values", {})
        old = vals.get(key, {}).get("v")
        v = round(float(v), 2)
        why = self._check(kind, old, v)
        if why:
            self.rows.append((key, old, v, why, as_of))
            return False
        vals[key] = {"v": v, "asOf": as_of, "src": src, "url": url, "method": "auto", "fetched": self.today.isoformat()}
        self.rows.append((key, old, v, "updated" if old != v else "unchanged", as_of))
        return True

    def fail(self, what, err):
        self.rows.append((what, None, None, f"failed: {str(err)[:160]}", ""))

    # --- Census ACS ---
    def acs(self, key):
        if not key:
            self.fail("ACS (boroughs and districts)", "CENSUS_API_KEY not set; get a free key at https://api.census.gov/data/key_signup.html")
            return
        year, vars_ = None, None
        for y in range(self.today.year - 1, self.today.year - 5, -1):
            try:
                meta = self.f.get_json(f"https://api.census.gov/data/{y}/acs/acs5/profile/variables.json")
                if meta and "variables" in meta:
                    year, vars_ = y, meta["variables"]
                    break
            except Exception:
                continue
        if not year:
            self.fail("ACS", "no ACS 5-year data profile found for recent years")
            return
        want = {k: norm(lbl.replace("{Y}", str(year))) for k, lbl in ACS_LABELS.items()}
        found = {}
        for name in sorted(vars_):
            if not re.match(r"^DP0\d_\d{4}P?E$", name):
                continue
            lab = norm(vars_[name].get("label", ""))
            for k, w in want.items():
                if k not in found and lab == w:
                    found[k] = name
        missing = [k for k in want if k not in found]
        if missing:
            self.fail(f"ACS {year} labels", f"could not find variables for {missing}; check ACS_LABELS")
            if any(k in missing for k in ("pov", "unemp")):
                return
        names = list(found.values())
        as_of = f"ACS {year - 4}–{year} 5-year"
        url = f"https://api.census.gov/data/{year}/acs/acs5/profile"
        # boroughs (counties)
        try:
            rows = self.f.get_json(url, {"get": "NAME," + ",".join(names), "for": "county:005,047,061,081,085", "in": "state:36", "key": key})
            hdr = rows[0]
            for r in rows[1:]:
                rec = dict(zip(hdr, r))
                b = BOROS.get(rec.get("county"))
                if not b:
                    continue
                for k in ("pov", "unemp", "inc"):
                    if k in found and rec.get(found[k]) not in (None, ""):
                        self.set_value(f"bor.{b}.{k}", f"bor.{k}", float(rec[found[k]]), as_of, "US Census Bureau, ACS data profile", url)
        except Exception as e:
            self.fail("ACS boroughs", e)
        # community districts (via PUMAs named after them)
        try:
            rows = self.f.get_json(url, {"get": "NAME," + ",".join(names), "for": "public use microdata area:*", "in": "state:36", "key": key})
            hdr = rows[0]
            cd = self.live.setdefault("cd", {})
            covered = set()
            for r in rows[1:]:
                rec = dict(zip(hdr, r))
                cds = puma_to_cds(rec.get("NAME", ""))
                if not cds:
                    continue
                vals = {}
                for k in ("pov", "unemp", "o65", "bach"):
                    if k in found and rec.get(found[k]) not in (None, ""):
                        vals[k] = float(rec[found[k]])
                if "rent30" in found and "rent35" in found and rec.get(found["rent30"]) and rec.get(found["rent35"]):
                    vals["burd"] = float(rec[found["rent30"]]) + float(rec[found["rent35"]])
                ppop = float(rec[found["pop"]]) if "pop" in found and rec.get(found["pop"]) else None
                old_pops = [cd.get(c, {}).get("pop") or 0 for c in cds]
                tot_old = sum(old_pops) or len(cds)
                for i, c in enumerate(cds):
                    d = cd.setdefault(c, {})
                    newv = dict(vals)
                    if ppop:
                        newv["pop"] = round(ppop * ((old_pops[i] / tot_old) if sum(old_pops) else 1 / len(cds)))
                    ok = True
                    for k, v in newv.items():
                        why = self._check("cd." + k, d.get(k), round(v, 1))
                        if why:
                            ok = False
                            self.rows.append((f"cd.{c}.{k}", d.get(k), round(v, 1), why, as_of))
                    if ok:
                        for k, v in newv.items():
                            d[k] = round(v, 1) if k != "pop" else int(v)
                        covered.add(c)
            meta = self.live.setdefault("cdMeta", {})
            if covered:
                meta.update({"asOf": as_of, "src": "US Census Bureau ACS data profiles by PUMA (PUMAs approximate community districts; some cover two districts)", "url": url, "fetched": self.today.isoformat(), "districts": len(covered)})
            self.rows.append(("cd.* (districts)", None, len(covered), f"updated {len(covered)} of 59 districts", as_of))
        except Exception as e:
            self.fail("ACS districts", e)

    # --- BLS unemployment ---
    def bls(self, key):
        series = "LAUCT365100000000003"  # New York city, NY: unemployment rate, not seasonally adjusted
        url = "https://api.bls.gov/publicAPI/v2/timeseries/data/"
        try:
            body = {"seriesid": [series]}
            if key:
                body["registrationkey"] = key
            res = self.f.get_json(url, body=body)
            if res.get("status") != "REQUEST_SUCCEEDED":
                raise RuntimeError(res.get("message") or res.get("status"))
            data = [d for d in res["Results"]["series"][0]["data"] if d["period"].startswith("M") and d["period"] != "M13" and d["value"] not in ("-", "")]
            data.sort(key=lambda d: (int(d["year"]), int(d["period"][1:])), reverse=True)
            d = data[0]
            self.set_value("city.unemp", "city.unemp", float(d["value"]), f"{d['periodName']} {d['year']}", "US Bureau of Labor Statistics, LAUS (New York city, not seasonally adjusted)", f"https://data.bls.gov/timeseries/{series}")
        except Exception as e:
            self.fail("BLS unemployment", e)

    # --- NYC Open Data ---
    def soda(self, ds, params, token):
        p = dict(params)
        if token:
            p["$$app_token"] = token
        return self.f.get_json(f"https://data.cityofnewyork.us/resource/{ds}.json", p)

    def water(self, token):
        try:
            rows = self.soda("ia2d-e54m", {"$order": "year DESC", "$limit": "1"}, token)
            r = rows[0]
            self.set_value("city.water", "city.water", float(r["nyc_consumption_million_gallons_per_day"]), r["year"], "NYC Open Data: Water Consumption in the City of New York (DEP)", "https://data.cityofnewyork.us/d/ia2d-e54m")
        except Exception as e:
            self.fail("Water consumption", e)

    def shootings(self, token):
        # NYPD publishes shootings in several datasets that are replaced from time to time.
        # Use every candidate that answers, find the latest incident date, and count distinct
        # incidents in the 365 days up to it.
        cands = ["5ucz-vwe8", "98wc-x49t", "833y-fyy4", "833y-fsy8"]
        latest, alive = None, []
        for ds in cands:
            try:
                r = self.soda(ds, {"$select": "max(occur_date) as m"}, token)
                m = r[0].get("m")
                if m:
                    alive.append(ds)
                    d = dt.date.fromisoformat(m[:10])
                    latest = max(latest, d) if latest else d
            except Exception:
                continue
        if not latest:
            self.fail("Shootings", "no NYPD shooting dataset answered")
            return
        start = latest - dt.timedelta(days=364)
        keys = set()
        for ds in alive:
            try:
                rows = self.soda(ds, {"$select": "incident_key", "$where": f"occur_date between '{start.isoformat()}T00:00:00' and '{latest.isoformat()}T23:59:59'", "$group": "incident_key", "$limit": "50000"}, token)
                keys.update(r["incident_key"] for r in rows if r.get("incident_key"))
            except Exception as e:
                self.fail(f"Shootings {ds}", e)
        if keys:
            self.set_value("city.shoot", "city.shoot", len(keys), f"12 months to {latest.isoformat()}", "NYC Open Data: NYPD shooting incidents", "https://data.cityofnewyork.us/browse?q=NYPD%20shooting")

    # --- report ---
    def report(self):
        lines = [f"# Data update report, {self.today.isoformat()}", "", "| Figure | Old | New | Result | As of |", "|---|---|---|---|---|"]
        for k, o, n, s, a in self.rows:
            lines.append(f"| {k} | {'' if o is None else o} | {'' if n is None else n} | {s} | {a} |")
        return "\n".join(lines) + "\n"


def puma_to_cds(name):
    """'NYC-Bronx Community District 1 & 2--Hunts Point...' -> ['201', '202']"""
    m = re.match(r"NYC-(Manhattan|Bronx|Brooklyn|Queens|Staten Island) Community Districts? ([0-9 ,&and]+?)\s*--", name)
    if not m:
        return []
    nums = re.findall(r"\d+", m.group(2))
    return [BORO_DIGIT[m.group(1)] + f"{int(n):02d}" for n in nums if 1 <= int(n) <= 18]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--accept-jumps", action="store_true")
    a = ap.parse_args()
    live = json.loads(LIVE_PATH.read_text()) if LIVE_PATH.exists() else {"values": {}, "cd": {}}
    u = Updater(live, Fetcher(), accept_jumps=a.accept_jumps)
    u.acs(os.environ.get("CENSUS_API_KEY", "").strip())
    u.bls(os.environ.get("BLS_API_KEY", "").strip())
    tok = os.environ.get("SOCRATA_APP_TOKEN", "").strip()
    u.water(tok)
    u.shootings(tok)
    live["generated"] = dt.date.today().isoformat()
    rep = u.report()
    print(rep)
    if not a.dry_run:
        LIVE_PATH.write_text(json.dumps(live, indent=1, ensure_ascii=False) + "\n")
        REPORT_PATH.write_text(rep)
    return 0


if __name__ == "__main__":
    sys.exit(main())
