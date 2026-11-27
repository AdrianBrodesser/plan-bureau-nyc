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
// Council: deals, 2029 seats, charter commission
{
  const g = (prim, sup) => { const s = M.newGame({ seed: 3 }); M.cnOf(s).prim = prim; for (let i = 0; i < 13; i++) { s.support = sup; M.step(s, { events: false }); } return s; };
  const lo = g('none', 35), hi = g('none', 62), hiP = g('broad', 62);
  check('council: seats always sum to 51', [lo, hi, hiP].every(s => s.cn.seats.prog + s.cn.seats.main + s.cn.seats.cs === 51));
  check('council: popular mayor gains Progressive seats in 2029', hi.cn.seats.prog > 24 && lo.cn.seats.prog < 24);
  check('council: primary campaign adds seats', hiP.cn.seats.prog > hi.cn.seats.prog);
  const s = M.newGame({ seed: 3 }); s.mode = 'real'; const e2 = M.LAWS.find(l => l.id === 'energy').opts.find(o => o.id === 'e2'), q = M.dealQuote(s, e2);
  check('council: near-miss law can be bought', q && q.cost > 0 && q.votes <= M.DEAL_MAX);
  const r0 = s.b.exp; M.makeDeal(s, 'energy', 'e2'); check('council: deal puts law in force and costs money', s.pol.energy === 'e2' && M.dealCost(s) > 0.2);
  const c = M.newGame({ seed: 3 }); c.mode = 'real'; c.support = 60; M.startCRC(c, 'method', 'p3'); for (let i = 0; i < 4; i++) { c.support = 60; M.step(c, { events: false }); }
  check('council: charter amendment passes with popular mayor', c.pol.method === 'p3' && c.cn.crcLog[0].res === 'passed');
}
const mc = M.monteCarlo(M.newGame(), 10);
check('monte carlo', mc.ends.length === 10);
console.log('live data generated', M.LIVE.generated, 'unemployment start', M.U0());
if (fail) { console.error(fail + ' checks failed'); process.exit(1); }
console.log('all model checks passed');
