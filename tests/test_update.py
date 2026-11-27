"""Offline tests for scripts/update_data.py. Responses below are shaped like the real APIs;
the numbers are made up for testing and never reach the game."""
import copy
import datetime as dt
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import update_data as U  # noqa: E402

VARS = {"variables": {
    "DP05_0001E": {"label": "Estimate!!SEX AND AGE!!Total population"},
    "DP05_0024PE": {"label": "Percent!!SEX AND AGE!!Total population!!65 years and over"},
    "DP03_0009PE": {"label": "Percent!!EMPLOYMENT STATUS!!Civilian labor force!!Unemployment Rate"},
    "DP03_0062E": {"label": "Estimate!!INCOME AND BENEFITS (IN 2025 INFLATION-ADJUSTED DOLLARS)!!Total households!!Median household income (dollars)"},
    "DP03_0128PE": {"label": "Percent!!PERCENTAGE OF FAMILIES AND PEOPLE WHOSE INCOME IN THE PAST 12 MONTHS IS BELOW THE POVERTY LEVEL!!All people"},
    "DP04_0141PE": {"label": "Percent!!GROSS RENT AS A PERCENTAGE OF HOUSEHOLD INCOME (GRAPI)!!Occupied units paying rent (excluding units where GRAPI cannot be computed)!!30.0 to 34.9 percent"},
    "DP04_0142PE": {"label": "Percent!!GROSS RENT AS A PERCENTAGE OF HOUSEHOLD INCOME (GRAPI)!!Occupied units paying rent (excluding units where GRAPI cannot be computed)!!35.0 percent or more"},
    "DP02_0068PE": {"label": "Percent!!EDUCATIONAL ATTAINMENT!!Population 25 years and over!!Bachelor's degree or higher"},
}}
COLS = ["NAME", "DP03_0009PE", "DP03_0062E", "DP03_0128PE", "DP04_0141PE", "DP04_0142PE", "DP02_0068PE", "DP05_0001E", "DP05_0024PE"]


class Fake:
    def __init__(self, fail=()):
        self.fail = fail
        self.calls = []

    def get_json(self, url, params=None, body=None, tries=3):
        self.calls.append((url, params, body))
        for f in self.fail:
            if f in url:
                raise RuntimeError("down")
        if "/2025/acs/acs5/profile/variables.json" in url:
            return VARS
        if "variables.json" in url:
            raise RuntimeError("404")
        if "api.census.gov" in url and "county" in params["for"]:
            hdr = ["NAME"] + params["get"].split(",")[1:] + ["state", "county"]
            rows = [hdr]
            for c, p in [("005", 26.9), ("047", 19.1), ("061", 16.8), ("081", 12.7), ("085", 10.9)]:
                rec = {"DP03_0009PE": "6.1", "DP03_0062E": "50000", "DP03_0128PE": str(p), "DP04_0141PE": "9", "DP04_0142PE": "40", "DP02_0068PE": "30", "DP05_0001E": "1000000", "DP05_0024PE": "14"}
                rows.append([f"{c} County"] + [rec[v] for v in hdr[1:-2]] + ["36", c])
            return rows
        if "api.census.gov" in url and "microdata" in params["for"]:
            hdr = ["NAME"] + params["get"].split(",")[1:] + ["state", "public use microdata area"]
            rec = {"DP03_0009PE": "7.0", "DP03_0062E": "40000", "DP03_0128PE": "30.0", "DP04_0141PE": "10.0", "DP04_0142PE": "44.0", "DP02_0068PE": "15.0", "DP05_0001E": "180000", "DP05_0024PE": "10.0"}
            return [hdr,
                    ["NYC-Bronx Community District 1 & 2--Hunts Point, Longwood & Melrose PUMA; New York"] + [rec[v] for v in hdr[1:-2]] + ["36", "04221"],
                    ["NYC-Manhattan Community District 12--Washington Heights & Inwood PUMA; New York"] + [rec[v] for v in hdr[1:-2]] + ["36", "04112"],
                    ["Albany County (Central)--Albany City PUMA; New York"] + [rec[v] for v in hdr[1:-2]] + ["36", "02001"]]
        if "api.bls.gov" in url:
            return {"status": "REQUEST_SUCCEEDED", "Results": {"series": [{"seriesID": "LAUCT365100000000003", "data": [
                {"year": "2026", "period": "M09", "periodName": "September", "value": "5.1"},
                {"year": "2026", "period": "M10", "periodName": "October", "value": "5.0"},
                {"year": "2025", "period": "M13", "periodName": "Annual", "value": "5.3"}]}]}}
        if "ia2d-e54m" in url:
            return [{"year": "2025", "nyc_consumption_million_gallons_per_day": "995.0"}]
        if "data.cityofnewyork.us" in url:
            if params.get("$select", "").startswith("max("):
                return [{"m": "2026-06-30T00:00:00.000"}] if "5ucz" in url else [{"m": "2025-12-31T00:00:00.000"}]
            return [{"incident_key": f"{url[-14:-5]}-{i}"} for i in range(150)] + [{"incident_key": "shared-1"}]
        raise AssertionError("unexpected url " + url)


def seed():
    return json.loads((ROOT / "data" / "live.json").read_text())


class T(unittest.TestCase):
    def run_all(self, fake, live=None, key="k"):
        live = live or seed()
        u = U.Updater(live, fake, today=dt.date(2026, 12, 3))
        u.acs(key)
        u.bls("")
        u.water("")
        u.shootings("")
        return live, u

    def test_puma_names(self):
        self.assertEqual(U.puma_to_cds("NYC-Bronx Community District 1 & 2--Hunts Point PUMA; New York"), ["201", "202"])
        self.assertEqual(U.puma_to_cds("NYC-Staten Island Community District 3--Tottenville PUMA"), ["503"])
        self.assertEqual(U.puma_to_cds("Albany County--Albany City PUMA"), [])

    def test_full_update(self):
        live, u = self.run_all(Fake())
        v = live["values"]
        self.assertEqual(v["bor.BX.pov"]["v"], 26.9)
        self.assertEqual(v["bor.BX.pov"]["method"], "auto")
        self.assertEqual(v["bor.BX.pov"]["asOf"], "ACS 2021–2025 5-year")
        self.assertEqual(v["city.unemp"]["v"], 5.0)  # October beats September and the annual average
        self.assertEqual(v["city.water"]["v"], 995.0)
        self.assertEqual(live["cd"]["201"]["burd"], 54.0)
        self.assertEqual(live["cd"]["112"]["pov"], 30.0)
        self.assertEqual(live["cd"]["202"]["pov"], 30.0)
        # population of a shared PUMA is split by the old district populations
        self.assertEqual(live["cd"]["201"]["pop"] + live["cd"]["202"]["pop"], 180000)
        self.assertEqual(live["cdMeta"]["districts"], 3)
        self.assertIn("updated", u.report())

    def test_shootings_distinct(self):
        live, u = self.run_all(Fake())
        # each answering dataset returns 150 own keys plus one shared key
        alive = 4
        self.assertEqual(live["values"]["city.shoot"]["v"], 150 * alive + 1)

    def test_missing_key_keeps_values(self):
        before = seed()
        live, u = self.run_all(Fake(), live=copy.deepcopy(before), key="")
        self.assertEqual(live["values"]["bor.BX.pov"], before["values"]["bor.BX.pov"])
        self.assertIn("CENSUS_API_KEY not set", u.report())

    def test_source_down_keeps_values(self):
        before = seed()
        live, u = self.run_all(Fake(fail=("api.bls.gov", "ia2d-e54m")), live=copy.deepcopy(before))
        self.assertEqual(live["values"]["city.unemp"], before["values"]["city.unemp"])
        self.assertEqual(live["values"]["city.water"], before["values"]["city.water"])
        self.assertIn("failed", u.report())

    def test_jump_rejected(self):
        live = seed()
        live["values"]["bor.BX.pov"]["v"] = 10.0  # 26.9 would be a 169% jump
        live, u = self.run_all(Fake(), live=live)
        self.assertEqual(live["values"]["bor.BX.pov"]["v"], 10.0)
        self.assertIn("rejected: jump", u.report())

    def test_out_of_bounds(self):
        u = U.Updater(seed(), Fake())
        self.assertFalse(u.set_value("city.water", "city.water", 5000, "2025", "x", "y"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
