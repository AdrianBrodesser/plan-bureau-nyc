// Smoke test: the model runs five years under several plans without NaN or a broken budget.
const M = require('../build/model.js');
let fail = 0;
const check = (name, cond) => { if (!cond) { console.error('FAIL', name); fail++; } };
function run(name, setup, events) {
  const s = M.newGame({ seed: 7 }); if (setup) setup(s);
  for (let i = 0; i < 20; i++) M.step(s, { events });
  const end = s.hist[s.hist.length - 1];
  const bad = Object.entries(end).filter(([k, v]) => typeof v === 'number' && !isFinite(v)).map(([k]) => k);
  check(name + ': no NaN (' + bad.join(',') + ')', bad.length === 0);
  check(name + ': revenue plausible', end.rev > 90 && end.rev < 250);
  check(name + ': population plausible', end.pop > 7e6 && end.pop < 1e7);
  console.log(name.padEnd(12), 'support', end.support.toFixed(1), 'deficit', end.deficit.toFixed(1), 'shortage', Math.round(end.shortage));
}
run('status quo', null, false);
run('with events', null, true);
run('ambitious', s => { Object.assign(s.pol, { housing: 'h3', energy: 'e1', care: 'c1', method: 'p3' }); Object.assign(s.plan.cap, { build: 4, storage: 0.6, eff: 0.6, coast: 1, cool: 0.3 }); }, true);
const mc = M.monteCarlo(M.newGame(), 10);
check('monte carlo', mc.ends.length === 10);
console.log('live data generated', M.LIVE.generated, 'unemployment start', M.U0());
if (fail) { console.error(fail + ' checks failed'); process.exit(1); }
console.log('all model checks passed');
