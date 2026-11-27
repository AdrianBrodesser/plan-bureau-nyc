// Direction checks: each lever should move its own indicator the expected way (no events, same seed).
const M = require('../build/model.js');
function end(setup) { const s = M.newGame({ seed: 11 }); s.mode = 'sandbox'; if (setup) setup(s); for (let i = 0; i < 20; i++) M.step(s, { events: false }); return s.hist[s.hist.length - 1]; }
const allSites = s => M.SITES.forEach(x => M.proposeSite(s, x.id));
const base = end();
const T = [
  ['build → shortage down', s => s.plan.cap.build = 6, 'shortage', -1],
  ['eff → emissions down', s => s.plan.cap.eff = 2, 'ghg', -1],
  ['wind → emissions down', s => s.plan.cap.wind = 2, 'ghg', -1],
  ['fleet → transport emissions down', s => s.plan.cap.fleet = 1.5, 'ghgT', -1],
  ['transit → commute down', s => s.plan.cap.transit = 3, 'commute', -1],
  ['g2 → emissions down', s => s.pol.carbon = 'g2', 'ghg', -1],
  ['g2 → electrified heat up', s => s.pol.carbon = 'g2', 'elecShare', 1],
  ['g3 → transport emissions down', s => s.pol.carbon = 'g3', 'ghgT', -1],
  ['build → embodied carbon up', s => { allSites(s); s.plan.cap.build = 6; }, 'ghgEmb', 1],
  ['no proposed sites → land runs out', s => { s.plan.cap.build = 6; }, 'noLand', 1],
  ['citywide road charge → less transport emissions', s => s.pol.road = 'r2', 'ghgT', -1],
  ['hospital beds → fewer beds short', s => s.plan.cap.hosp = 1, 'bedShort', -1],
  ['scrap toll → more transport emissions', s => s.pol.road = 'r3', 'ghgT', 1],
  ['fund class size law → more compliant classes', s => s.pol.classsize = 'cs1', 'classComp', 1],
  ['hospital beds → more beds per person', s => s.plan.cap.hosp = 1, 'beds1000', 1],
  ['coastal protection → lower flood premiums', s => s.plan.cap.coast = 3, 'floodPrem', -1],
  ['audit → leak down', s => s.plan.audit = 0.4, 'leak', -1],
  ['borrow-heavy spending → debt up', s => s.plan.cap.build = 10, 'debt', 1],
  ['more police → fewer murders', s => s.plan.police = 1.5, 'murder', -1],
  ['more police → more low-level arrests', s => s.plan.police = 1.5, 'lowlevel', 1],
  ['prevention → fewer murders', s => s.plan.prevent = 2, 'murder', -1],
  ['treatment not jail → smaller jail', s => s.pol.drugs = 'x2', 'jail', -1],
  ['prevention centers → fewer overdoses', s => s.pol.drugs = 'x1', 'od', -1],
  ['no eviction into street → fewer evictions', s => s.pol.evict = 'v2', 'evict', -1],
  ['fewer evictions → fewer in shelter', s => s.pol.evict = 'v2', 'shelter', -1],
  ['higher corporate tax → fewer businesses', s => s.tax.corp = 11.5, 'biz', -1],
  ['transit investment → less crowded worst line', s => s.plan.cap.transit = 3, 'subMax', -1],
  ['audits → smaller cost overruns', s => s.plan.audit = 0.4, 'ovr', -1],
  ['rent freeze → fewer displaced', s => s.pol.housing = 'h1', 'dispYr', -1],
  ['electric heat law → higher winter peak', s => s.pol.carbon = 'g2', 'peakW', 1],
  ['rent freeze → more flats kept off market', s => s.pol.housing = 'h1', 'whExtra', 1],
  ['rent freeze → more buildings losing money', s => s.pol.housing = 'h1', 'distress', 1],
  ['millionaire tax → more tax avoidance', s => s.tax.mill = 4, 'avoidB', 1],
  ['millionaire tax → more households leave', s => s.tax.mill = 4, 'leftUnits', 1],
  ['free transit and care → more move in', s => { s.pol.transit = 't2'; s.plan.cap.care = 6; }, 'migYr', 1],
  ['big building plan → materials dearer', s => { s.plan.cap.build = 15; s.plan.cap.coast = 3; }, 'mat', 1],
  ['big building plan → slower permits', s => { allSites(s); s.plan.cap.build = 15; s.plan.cap.eff = 5; }, 'revDays', 1],
  ['batteries beyond installers → backlog', s => { s.plan.cap.storage = 4; s.plan.cap.eff = 5; }, 'instWait', 1],
];
// lever against a non-zero baseline: energy-trades training shortens the installer backlog
{ const big = s => { s.plan.cap.storage = 4; s.plan.cap.eff = 5; }; T.push(['energy trades → shorter install backlog', s => { big(s); s.plan.train.elec = 10000; }, 'instWait', -1, big]); }
let fail = 0;
for (const [n, f, k, dir, b0] of T) { const bb = b0 ? end(b0) : base; const e = end(f); const d = e[k] - bb[k]; const ok = Math.sign(d) === dir && Math.abs(d) > 1e-6; if (!ok) fail++; console.log((ok ? 'ok  ' : 'FAIL') + ' ' + n.padEnd(36) + k.padEnd(10) + bb[k].toFixed(2) + ' → ' + e[k].toFixed(2)); }
if (fail) { console.error(fail + ' direction checks failed'); process.exit(1); }
console.log('all direction checks passed');
