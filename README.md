# Plan Bureau NYC

An interactive simulation: run New York City on a five-year plan, using real starting data.
The whole game is one static page (`dist/index.html`), so it can be hosted anywhere. This repository
also refreshes its own data every month and redeploys the site with GitHub Actions and GitHub Pages.

## Put it online (about 15 minutes, free)

1. **Create a repository.** On github.com click **New repository**, give it a name
   (for example `plan-bureau-nyc`), make it **Public**, and create it without a README.
2. **Upload the files.** On the new repository's page choose **uploading an existing file**, then drag
   in everything from this folder (including the hidden `.github` folder; on a Mac press
   `Cmd+Shift+.` in Finder to see it). Commit.
   *Or, from a terminal:* `git init && git add . && git commit -m "Plan Bureau NYC" && git branch -M main && git remote add origin https://github.com/YOU/plan-bureau-nyc.git && git push -u origin main`
3. **Turn on Pages.** Settings → Pages → *Build and deployment* → Source: **GitHub Actions**.
4. **Add the Census key.** Get a free key at <https://api.census.gov/data/key_signup.html> (arrives by
   email in minutes). Settings → Secrets and variables → Actions → **New repository secret**:
   name `CENSUS_API_KEY`, value = your key.
   Optional, same place: `BLS_API_KEY` (<https://data.bls.gov/registrationEngine/>) and
   `SOCRATA_APP_TOKEN` (NYC Open Data account → Developer settings). Both work without, with lower limits.
5. **Run it once.** Actions → *Update data and deploy* → **Run workflow**. After 1–2 minutes the site is
   live at `https://YOU.github.io/plan-bureau-nyc/`. The run's summary shows the link.

Custom domain: Settings → Pages → Custom domain, then add the DNS record GitHub shows you.

## Plan submissions

Players can submit their plan from the "Submit your plan" button. Set where submissions go in `data/site.json`:

```json
{ "submitEmail": "plans@example.org", "githubRepo": "YOU/plan-bureau-nyc", "siteUrl": "https://YOU.github.io/plan-bureau-nyc/" }
```

- `submitEmail`: the "Send by email" button opens the player's mail program with a filled-in proposal (idea, laws, taxes, plan, results, and a link that reopens the plan). Nothing is sent without the player pressing send.
- `githubRepo` (optional): adds "Post publicly on GitHub", which opens a pre-filled issue labelled `proposal` in your repository, a public proposal board.
- `siteUrl`: the public address used in shared links.

Players can also copy a link to their plan or download a full JSON snapshot. Links look like `…/#plan=…` and open the same laws, taxes and plan at the start of 2027.

## What updates itself

Every month (3rd, 06:17 UTC) the workflow runs `scripts/update_data.py`, which fetches:

| Figures | Source | Needs |
|---|---|---|
| Poverty, unemployment, median income for the 5 boroughs | US Census Bureau, ACS 5-year data profiles | `CENSUS_API_KEY` |
| Poverty, unemployment, rent burden, age 65+, degrees, population for the 59 community districts | ACS 5-year by PUMA (Census areas named after the districts; some cover two) | `CENSUS_API_KEY` |
| NYC unemployment rate, latest month | US Bureau of Labor Statistics, LAUS | nothing |
| Water use | NYC Open Data, DEP water consumption | nothing |
| Shooting incidents, last 12 months | NYC Open Data, NYPD shooting datasets | nothing |

Safety rules: a new value is only accepted if it lies within sane bounds and has not jumped too far
from the previous one. Anything else keeps the last good value and is listed in
`data/update_report.md`, which is committed with every run. If a source is down, the site still
deploys with the previous data. If a big jump is real (for example a new Census vintage), run
`python scripts/update_data.py --accept-jumps` locally and commit.

The ACS publishes a new 5-year release each December, so most figures change once a year; the
monthly run picks it up automatically, because variables are found by their label, not their
number.

## What is checked by hand

Budget, taxes, union contracts, Council make-up and many other starting figures come from reports,
not data feeds. Each one is listed in `data/manual.json` with the date it was last verified and how
often it should be rechecked (6 or 12 months). When checks fall due, the workflow opens a GitHub issue
titled **Figures due for a check** with a checklist and links. The Sources tab in the game shows the
same dates and marks overdue figures.

## Work on it locally

```
python scripts/build.py        # -> dist/index.html (open it in a browser)
python tests/test_update.py    # updater tests (offline, recorded responses)
node tests/test_model.js && node tests/test_directions.js       # model smoke test
CENSUS_API_KEY=... python scripts/update_data.py --dry-run   # see what would change
```

Layout: `src/` game code (model and interface), `data/` live and manual figures, `geo/` community
district boundaries (NYC Department of City Planning; `scripts/simplify_geo.py` makes the compact
version), `scripts/` updater, checks and build, `.github/workflows/` the monthly job.
