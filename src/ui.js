{
const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => [...r.querySelectorAll(q)];
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'planbureau-nyc-v3';
let S = null, undoStack = [], tab = 'overview', selKpi = 'shortage', mapLayer = 'pov', selBor = 'BX', mode = 'real', projCache = null, mcCache = null, showBand = false, solveRes = null, solving = false;

// ---------- formatting ----------
const n0 = v => Math.round(v).toLocaleString('en-US');
const k1 = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : Math.abs(v) >= 1e4 ? Math.round(v / 1e3) + 'k' : n0(v);
const pct = (v, d = 1) => (+v).toFixed(d) + '%';
const bn = v => (v < 0 ? '−$' : '$') + Math.abs(v).toFixed(1) + 'B';
const tLab = t => `Q${(t % 4) + 1} '${27 + Math.floor(t / 4)}`;

const KPIS = [
  { k: 'shortage', name: 'Housing shortage', f: k1, unit: 'homes', better: -1, goal: s => s.goals.shortage, gtxt: g => `goal ≤ ${k1(g)}` },
  { k: 'shelter', name: 'People in shelters', f: k1, better: -1, goal: s => s.goals.shelter, gtxt: g => `goal ≤ ${k1(g)}` },
  { k: 'insec', name: 'Food insecure', f: v => pct(v), better: -1, goal: s => s.goals.insec, gtxt: g => `goal ≤ ${g}%` },
  { k: 'margin', name: 'Summer power margin', f: v => (v > 0 ? '+' : '') + n0(v) + ' MW', better: 1, goal: s => s.goals.margin, gtxt: g => `goal ≥ +${g} MW` },
  { k: 'ghg', name: 'Emissions (Mt CO₂e/yr)', f: v => v.toFixed(1), better: -1, goal: s => 49 * (1 - s.goals.ghg / 100), gtxt: g => `1.5 °C path ≤ ${g.toFixed(1)}` },
  { k: 'unemp', name: 'Unemployment', f: v => pct(v), better: -1, goal: s => s.goals.unemp, gtxt: g => `goal ≤ ${g}%` },
  { k: 'life', name: 'Life expectancy', f: v => v.toFixed(2) + ' y', better: 1, goal: s => s.goals.life, gtxt: g => `goal ≥ ${g}` },
  { k: 'care', name: 'Child-care coverage', f: v => pct(v, 0), better: 1, goal: s => s.goals.care, gtxt: g => `goal ≥ ${g}%` },
  { k: 'support', name: 'Public support', f: v => pct(v, 0), better: 1, goal: s => s.goals.support, gtxt: g => `goal ≥ ${g}%` },
  { k: 'deficit', name: 'Budget balance', f: v => bn(v) + '/yr', better: 1, goal: () => 0, gtxt: () => 'goal ≥ $0' },
  { k: 'vote', name: 'Projected 2029 vote', f: v => pct(v, 1), better: 1 },
  { k: 'rent', name: 'Rent index (2027=100)', f: v => v.toFixed(1), better: -1 },
  { k: 'shoot', name: 'Shootings (rate/yr)', f: v => n0(v), better: -1 },
  { k: 'aides', name: 'Home-care aides vs need', f: v => pct(v, 0), better: 1 },
  { k: 'gcp', name: 'City output (GDP)', f: v => '$' + v.toFixed(0) + 'B', better: 1 },
  { k: 'pop', name: 'Population', f: v => (v / 1e6).toFixed(3) + 'M', better: 1 },
  { k: 'breaks', name: 'Water main breaks (rate/yr)', f: v => n0(v), better: -1 },
  { k: 'divert', name: 'Waste diverted', f: v => pct(v), better: 1 },
  { k: 's65', name: 'Residents 65+', f: k1, better: 0 },
  { k: 'k04', name: 'Children under 5', f: k1, better: 0 },
  { k: 'enroll', name: 'Public school enrollment', f: k1, better: 0 },
  { k: 'top', name: 'Top earners (index)', f: v => v.toFixed(0), better: 1 },
  { k: 'done', name: 'Homes completed (rate/yr)', f: k1, better: 1 },
  { k: 'info', name: 'Planning information', f: v => pct(v, 0), better: 1 },
  { k: 'pov', name: 'Poverty rate', f: v => pct(v), better: -1 },
  { k: 'taxRev', name: 'City tax revenue', f: v => bn(v), better: 1 },
  { k: 'rev', name: 'Total revenue', f: v => bn(v), better: 1 },
  { k: 'exp', name: 'Total spending', f: v => bn(v), better: 0 },
  { k: 'reserves', name: 'Reserves', f: v => bn(v), better: 1 },
  { k: 'debt', name: 'Plan bonds issued', f: v => bn(v), better: -1 },
  { k: 'bondRate', name: 'Interest on new bonds', f: v => pct(v, 2), better: -1 },
  { k: 'notch', name: 'Rating notches lost', f: v => v.toFixed(0), better: -1 },
  { k: 'rateTop', name: 'Local tax rate, top 1%', f: v => pct(v), better: 0 },
  { k: 'rateLow', name: 'Local tax rate, bottom 30%', f: v => pct(v), better: -1 },
  { k: 'wage', name: 'Union raise pattern', f: v => pct(v, 2), better: 0 },
  { k: 'capUse', name: 'Agency load', f: v => pct(v, 0), better: -1 },
  { k: 'commuters', name: 'Commuters into the city', f: k1, better: 1 },
  { k: 'moved', name: 'Jobs moved out', f: k1, better: -1 },
  { k: 'heat', name: 'Heat deaths (rate/yr)', f: v => n0(v), better: -1 },
  { k: 'protect', name: 'Waterfront protected', f: v => pct(v, 0), better: 1 },
  { k: 'waitlist', name: 'Public housing waiting list', f: k1, better: -1 },
  { k: 'waitYears', name: 'Wait for public housing (years)', f: v => v.toFixed(0) + ' y', better: -1 },
  { k: 'lottery', name: 'Lottery applications per home', f: v => n0(v), better: -1 },
  { k: 'queueMin', name: 'Queue at city stores (min)', f: v => v.toFixed(0) + ' min', better: -1 },
  { k: 'informal', name: 'Informal economy', f: v => pct(v), better: -1 },
  { k: 'leak', name: 'Spending lost to waste & graft', f: v => pct(v), better: -1 },
  { k: 'late', name: 'Contracts registered late', f: v => pct(v, 0), better: -1 },
  { k: 'stalled', name: 'Public homes stalled', f: k1, better: -1 },
  { k: 'crowd', name: 'Transit crowding (2025=100)', f: v => v.toFixed(0), better: -1 },
  { k: 'commute', name: 'Average commute (min)', f: v => v.toFixed(1) + ' min', better: -1 },
  { k: 'protest', name: 'Protest pressure (0–100)', f: v => v.toFixed(0), better: -1 },
  { k: 'dataGap', name: 'Data gap (reports vs reality)', f: v => pct(v), better: -1 },
  { k: 'quality', name: 'Quality of public output', f: v => v.toFixed(0), better: 1 },
  { k: 'subsidy', name: 'Enterprise losses covered', f: v => bn(v), better: -1 },
  { k: 'phantom', name: 'Phantom completions', f: k1, better: -1 },
  { k: 'peWeight', name: 'Economy run by public enterprises', f: v => pct(v, 0), better: 0 },
  { k: 'dispYr', name: 'Households displaced or evicted (this year)', f: v => n0(v), better: -1 },
  { k: 'biz', name: 'Businesses in the city', f: v => n0(v), better: 1 },
  { k: 'bizMoved', name: 'Businesses moving away (quarter)', f: v => n0(v), better: -1 },
  { k: 'landOk', name: 'Homes possible on approved sites (not yet started)', f: v => n0(v), better: 1 },
  { k: 'noLand', name: 'Public building money with no site', f: v => pct(v, 0), better: -1 },
  { k: 'veh', name: 'Vehicles entering the congestion zone a day', f: v => n0(v), better: -1 },
  { k: 'mtaRev', name: 'Road pricing money for transit ($/yr)', f: v => bn(v), better: 1 },
  { k: 'classComp', name: 'Classes within the class size caps', f: v => pct(v, 0), better: 1 },
  { k: 'beds1000', name: 'Hospital beds per 1,000 people', f: v => v.toFixed(2), better: 1 },
  { k: 'bedShort', name: 'Hospital beds short in under-served boroughs', f: v => n0(v), better: -1 },
  { k: 'seaCm', name: 'Sea level rise since 1995–2014 (cm)', f: v => v.toFixed(1), better: -1 },
  { k: 'floodPrem', name: 'Average federal flood insurance premium', f: v => '$' + n0(v), better: -1 },
  { k: 'migYr', name: 'People moving in because of policy (per year, − = out)', f: v => (v < 0 ? '−' : '+') + n0(Math.abs(v)), better: 0 },
  { k: 'commAll', name: 'Commuters into the city', f: v => n0(v), better: 0 },
  { k: 'revDays', name: 'Days from permit filing to approval', f: v => n0(v), better: -1 },
  { k: 'mat', name: 'Building price premium from extra demand', f: v => pct(v, 1), better: -1 },
  { k: 'instWait', name: 'Energy projects waiting for installers (MW)', f: v => n0(v), better: -1 },
  { k: 'whExtra', name: 'Extra controlled flats kept off the market', f: v => n0(v), better: -1 },
  { k: 'distress', name: 'Stabilized flats in loss-making buildings', f: v => pct(v, 0), better: -1 },
  { k: 'avoidB', name: 'Tax lost to growing avoidance ($/yr)', f: v => bn(v), better: -1 },
  { k: 'peakW', name: 'Winter evening power peak (MW)', f: v => n0(v), better: -1 },
  { k: 'marginW', name: 'Winter power margin (MW)', f: v => n0(v), better: 1 },
  { k: 'subMax', name: 'Most crowded subway line (% of guideline)', f: v => v.toFixed(0) + '%', better: -1 },
  { k: 'projLate3', name: 'Projects 3+ years late', f: v => pct(v, 0), better: -1 },
  { k: 'ovr', name: 'Average project cost overrun', f: v => pct(v, 0), better: -1 },
  { k: 'heatYr', name: 'Heat deaths (last summer)', f: v => n0(v), better: -1 },
  { k: 'felony', name: 'Major felonies a year', f: v => n0(v), better: -1 },
  { k: 'murder', name: 'Murders a year', f: v => n0(v), better: -1 },
  { k: 'jail', name: 'People in city jails', f: v => n0(v), better: -1 },
  { k: 'od', name: 'Overdose deaths a year', f: v => n0(v), better: -1 },
  { k: 'evict', name: 'Evictions a year', f: v => n0(v), better: -1 },
  { k: 'trust', name: 'Trust in public safety (index)', f: v => v.toFixed(0), better: 1 },
  { k: 'officers', name: 'Police officers', f: v => n0(v), better: 0 },
  { k: 'ghgB', name: 'Emissions from buildings (Mt)', f: v => v.toFixed(1), better: -1 },
  { k: 'ghgT', name: 'Emissions from transport (Mt)', f: v => v.toFixed(1), better: -1 },
  { k: 'ghgEmb', name: 'Embodied carbon of new homes (Mt)', f: v => v.toFixed(2), better: -1 },
  { k: 'budgetLeft', name: 'City share of 1.5 °C budget left (Mt)', f: v => v.toFixed(0), better: 1 },
  { k: 'elecShare', name: 'Building heat that is electric', f: v => pct(v, 0), better: 1 },
  { k: 'evShare', name: 'Vehicle travel that is electric', f: v => pct(v, 0), better: 1 },
];
const KP = Object.fromEntries(KPIS.map(x => [x.k, x]));
const GOALK = ['shortage', 'shelter', 'insec', 'margin', 'ghg', 'unemp', 'life', 'care', 'support', 'deficit'];
const met = (s, k, v) => { const d = KP[k]; const g = d.goal(s); return d.better < 0 ? v <= g : v >= g; };

// ---------- charts ----------
function lineChart(el, series, o = {}) {
  if (el._ro) el._ro.disconnect();
  el.innerHTML = '<svg role="img"></svg><div class="tt"></div>';
  const svg = el.firstChild, tt = el.lastChild;
  const xf = o.xf || tLab, yf = o.yf || (v => k1(v));
  const draw = () => {
    const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
    const m = { l: 56, r: o.rlab ? 96 : 16, t: 12, b: 26 };
    const all = series.flatMap(s => s.pts); if (!all.length) return;
    let x0 = Math.min(...all.map(p => p[0])), x1 = Math.max(...all.map(p => p[0]));
    if (x1 === x0) x1 = x0 + 1;
    let ys = all.map(p => p[1]); if (o.goal != null) ys.push(o.goal);
    series.forEach(s => (s.band || []).forEach(b => { ys.push(b[1], b[2]); }));
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (o.zero && y0 > 0) y0 = 0;
    if (o.ymax != null) y1 = Math.max(y1, o.ymax); const pad = (y1 - y0) * 0.12 || Math.abs(y1) * 0.1 || 1; const dmin = y0; y0 -= pad; y1 += pad; if (o.zero && dmin >= 0 && y0 < 0) y0 = 0;
    const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r), Y = y => m.t + (1 - (y - y0) / (y1 - y0)) * (H - m.t - m.b);
    const ticks = []; const step = nice((y1 - y0) / 4); for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) ticks.push(v);
    let g = ticks.map(v => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${esc(yf(v))}</text>`).join('');
    const xs = [...new Set(all.map(p => p[0]))].sort((a, b) => a - b);
    const every = Math.max(1, Math.ceil(xs.length / Math.max(2, Math.floor((W - m.l - m.r) / 64))));
    g += xs.filter((x, i) => i % every === 0).map(x => `<text x="${X(x)}" y="${H - 6}" text-anchor="middle">${esc(xf(x))}</text>`).join('');
    if (o.goal != null) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(o.goal)}" y2="${Y(o.goal)}" stroke="var(--good)" stroke-dasharray="2 4" stroke-width="2"/><text x="${W - m.r - 4}" y="${Y(o.goal) - 5}" text-anchor="end" style="fill:var(--good)">${esc(o.goalLab || 'goal')}</text>`;
    if (o.zeroLine && y0 < 0 && y1 > 0) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink2)" stroke-width="1"/>`;
    const labs = [];
    series.forEach(s => { if (s.band && s.band.length) { const up = s.band.map((b, i) => (i ? 'L' : 'M') + X(b[0]).toFixed(1) + ',' + Y(b[2]).toFixed(1)).join(''); const dn = s.band.slice().reverse().map(b => 'L' + X(b[0]).toFixed(1) + ',' + Y(b[1]).toFixed(1)).join(''); g += `<path d="${up}${dn}Z" fill="${s.color}" opacity=".16"/>`; } });
    series.forEach(s => {
      if (!s.pts.length) return;
      const d = s.pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join('');
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.w || 2}" ${s.dash ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
      const last = s.pts[s.pts.length - 1];
      if (s.dot !== false) g += `<circle cx="${X(last[0])}" cy="${Y(last[1])}" r="4" fill="${s.color}" stroke="var(--panel)" stroke-width="2"/>`;
      if (o.rlab && s.name && s.lab !== false) labs.push({ x: X(last[0]) + 8, y: Y(last[1]) + 4, t: s.name });
    });
    labs.sort((a, b) => a.y - b.y); for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 14) labs[i].y = labs[i - 1].y + 14;
    g += labs.map(l => `<text x="${l.x}" y="${l.y}" style="fill:var(--ink)">${esc(l.t)}</text>`).join('');
    g += `<line id="cx" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" stroke="var(--ink2)" stroke-width="1" visibility="hidden"/>`;
    svg.innerHTML = g;
    svg.onmousemove = e => {
      const r = svg.getBoundingClientRect(); const px = e.clientX - r.left;
      let best = xs[0]; xs.forEach(x => { if (Math.abs(X(x) - px) < Math.abs(X(best) - px)) best = x; });
      const cx = svg.querySelector('#cx'); cx.setAttribute('x1', X(best)); cx.setAttribute('x2', X(best)); cx.setAttribute('visibility', 'visible');
      const rows = series.map(s => { const p = s.pts.find(p => p[0] === best); return p ? `<div><span style="color:${s.color}">■</span> ${esc(s.name || '')} ${esc(yf(p[1]))}</div>` : ''; }).join('');
      tt.innerHTML = `<b>${esc(xf(best))}</b>${rows}`; tt.style.display = 'block';
      const left = Math.min(W - tt.offsetWidth - 4, Math.max(0, X(best) + 10)); tt.style.left = left + 'px'; tt.style.top = '6px';
    };
    svg.onmouseleave = () => { tt.style.display = 'none'; const cx = svg.querySelector('#cx'); if (cx) cx.setAttribute('visibility', 'hidden'); };
  };
  el._ro = new ResizeObserver(draw); el._ro.observe(el); draw();
}
function nice(x) { const p = Math.pow(10, Math.floor(Math.log10(Math.abs(x) || 1))); const f = x / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }
function spark(vals, proj, color) {
  const all = vals.concat(proj); const lo = Math.min(...all), hi = Math.max(...all), n = all.length - 1 || 1;
  const X = i => i / n * 200, Y = v => 30 - (hi === lo ? 15 : (v - lo) / (hi - lo) * 26) - 2;
  const a = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join('');
  const b = proj.length ? 'M' + X(vals.length - 1) + ',' + Y(vals[vals.length - 1]) + proj.map((v, i) => 'L' + X(vals.length + i).toFixed(1) + ',' + Y(v).toFixed(1)).join('') : '';
  return `<svg viewBox="0 0 200 32" preserveAspectRatio="none" aria-hidden="true"><path d="${a}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/><path d="${b}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4 3" opacity=".6" vector-effect="non-scaling-stroke"/></svg>`;
}
function hbars(rows, color, f) {
  const mx = Math.max(...rows.map(r => Math.abs(r[1]))) || 1;
  return rows.map(r => `<div class="hbar"><span>${esc(r[0])}</span><span class="tr"><i style="width:${Math.abs(r[1]) / mx * 100}%;background:${r[1] < 0 ? 'var(--red)' : (r[2] || color)}"></i></span><span class="val">${esc(f(r[1]))}</span></div>`).join('');
}

// ---------- projection ----------
function proj() { if (!projCache) projCache = project(S, Math.max(4, 20 - S.t)); return projCache; }
function mc() { if (!mcCache) mcCache = monteCarlo(S, 40); return mcCache; }
function series(k) { return S.hist.map(h => [h.t, h[k]]); }
function pseries(k) { const p = proj(); return p.map(h => [h.t, h[k]]); }

// ---------- header ----------
function header() {
  $('#qtr').textContent = qLabel(S);
  $('#prog').innerHTML = Array.from({ length: 20 }, (_, i) => `<span class="${i < S.t ? 'on' : i === S.t ? 'now' : ''}"></span>`).join('');
  const d = S.b.deficit;
  $('#chips').innerHTML = `<span class="chip">Support <b>${pct(S.support, 0)}</b></span><span class="chip">Budget <b>${esc(bn(d))}</b>/yr</span><span class="chip opt2">Legal risk <b>${S.legal.toFixed(0)}</b></span><span class="chip opt2">Info <b>${pct(S.info * 100, 0)}</b></span><span class="chip opt2">Rating <b>${esc(ratingName(S.fin.notch).replace(' (S&P scale)', ''))}</b></span>${S.decision ? '<button class="chip" id="decChip" style="border:0;background:var(--warn);color:#000;cursor:pointer">Contract talks <b>decide</b></button>' : ''}${S.el2029 ? `<span class="chip" style="${S.el2029.won ? '' : 'background:var(--red);color:#fff'}">${S.el2029.won ? 'Re-elected' : 'Voted out'} <b>${pct(S.el2029.share)}</b></span>` : `<span class="chip">Nov 2029 vote <b>${pct(voteShare(S))}</b></span>`}${S.b.fcb ? '<span class="chip" style="background:var(--red);color:#fff">State control</span>' : ''}${S.mode === 'sandbox' ? '<span class="chip">Sandbox</span>' : ''}`;
  { const n = S.decBase ? decChanges().length : 0; const q = $('#queued'); if (q) { q.hidden = false; q.innerHTML = n ? `Decisions <b>${n}</b>` : 'Decisions'; q.title = n ? `${n} change${n > 1 ? 's' : ''} queued for this quarter` : 'Every choice for this quarter on one page'; q.classList.toggle('has', n > 0); q.onclick = () => { tab = 'decide'; render(); window.scrollTo({ top: 0 }); }; } }
  $('#undo').disabled = !undoStack.length;
  const dc = $('#decChip'); if (dc) dc.onclick = decisionModal;
  document.documentElement.style.setProperty('--barh', $('#bar').offsetHeight + 'px');
}

// ---------- overview ----------
function finding() {
  const h = S.hist[S.hist.length - 1];
  const parts = [`${k1(h.shortage)} homes short`, `${k1(h.shelter)} people in shelters`, `${pct(h.insec, 1)} food insecure`];
  const bud = h.deficit >= -0.05 ? 'budget balanced' : `a ${bn(-h.deficit)} yearly deficit`;
  return `${qLabel(S)}: ${parts.join(', ')}, ${bud}.`;
}
function goalProg(k, v) {
  const d = KP[k], g = d.goal(S), start = S.hist[0][k];
  if (met(S, k, v)) return 1;
  const p = d.better < 0 ? (start - v) / Math.max(1e-9, start - g) : (v - start) / Math.max(1e-9, g - start);
  return Math.max(0, Math.min(1, p));
}
const WATCHK = ['budgetLeft', 'murder', 'jail', 'evict', 'vote', 'rent', 'waitlist', 'commute', 'informal', 'protest', 'shoot', 'aides', 'gcp', 'pop'];
function overview() {
  const h = S.hist, last = h[h.length - 1], prev = h[h.length - 2] || last, p = proj();
  const goalsDone = GOALK.filter(k => met(S, k, last[k])).length;
  const fulfil = GOALK.reduce((a, k) => a + goalProg(k, last[k]), 0) / GOALK.length * 100;
  const row = (k, target) => {
    const d = KP[k]; if (!d) return '';
    const v = last[k], dv = v - prev[k], good = dv * d.better > 0, g = target && d.goal ? d.goal(S) : null, ok = g != null ? met(S, k, v) : null;
    const col = ok == null ? 'var(--ink2)' : ok ? 'var(--good)' : 'var(--red)';
    const pr = g != null ? goalProg(k, v) : null;
    const bd = target && S.t < 20 ? mc().band[k] : null, bl = bd ? bd[bd.length - 1] : null;
    const rng = bl ? `<td class="r mu rngc" title="Middle 80% of 40 simulated futures with random events and varied assumptions">${esc(d.f(bl.p10))} to ${esc(d.f(bl.p90))}</td>` : '<td></td>';
    return `<tr class="cf ${selKpi === k ? 'sel' : ''}" data-k="${k}" tabindex="0"><td class="cfn">${esc(d.name)}</td><td class="r mu">${esc(d.f(h[0][k]))}</td><td class="r"><b class="num cfv">${esc(d.f(v))}</b></td><td class="r ${Math.abs(dv) < 1e-9 ? 'mu' : good ? 'up' : 'dn'}">${S.t && Math.abs(dv) > 1e-9 ? (dv >= 0 ? '▲' : '▼') : ''}</td><td class="r mu">${g != null ? esc(d.gtxt(g).replace('goal ', '')) : ''}</td>${rng}<td class="cfp">${pr != null ? `<span class="sq10 ${ok ? 'ok' : ''}" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${i < Math.round(pr * 10) ? 'on' : ''}"></i>`).join('')}</span><span class="num">${Math.round(pr * 100)}%</span>` : ''}</td><td class="cfs">${spark(h.map(x => x[k]), p.slice(1).map(x => x[k]), col)}</td></tr>`;
  };
  const rep = S.lastReport;
  const evs = rep ? rep.events.map(e => `<li class="ev ${e.k}"><b>${esc(e.t)}</b>${esc(e.d)}</li>`).join('') + rep.notes.map(n => `<li>${esc(n)}</li>`).join('') : '';
  $('#v-overview').innerHTML = `
    <div class="cfhead"><h1>Control figures</h1><div class="cfbtns"><button class="btn go subbtn" id="toDec">This quarter's decisions</button><button class="btn subbtn" id="subOv">Submit this plan</button></div><div class="cfbig"><span class="num">${Math.round(fulfil)}%</span><span>of the plan fulfilled<br>${goalsDone} of ${GOALK.length} targets met</span></div></div>
    <p class="lead">${esc(finding())} ${S.t < 20 ? `Quarter ${S.t + 1} of 20.` : `The five-year plan is over; you are governing beyond it.`} Dashed lines project your current laws and plan forward without random events; "Likely 2031" is the middle 80% of 40 futures with storms, recessions and uncertain assumptions. Select a row to chart it.</p>
    <div class="cfgrid">
      <div class="scroll"><table class="cft"><thead><tr><th>Indicator</th><th class="r">2027</th><th class="r">Now</th><th></th><th class="r">Target 2031</th><th class="r" title="Middle 80% of 40 simulated futures">Likely 2031</th><th>Fulfilment</th><th>Trend</th></tr></thead>
        <tbody><tr class="grp"><td colspan="8">Plan targets</td></tr>${GOALK.map(k => row(k, true)).join('')}<tr class="grp"><td colspan="8">Under observation</td></tr>${WATCHK.map(k => row(k, false)).join('')}</tbody></table></div>
      <aside class="cfside"><h2>${rep ? 'Report for ' + esc(rep.label) : 'Briefing'}</h2>
        <ul class="list">${evs || `<li>You take office on 1 January 2027 with a $125.8B budget, a 1.41% rental vacancy rate and a power grid NYISO already flags as short in summer. Open <b>Decisions</b> to see every choice in one place, with what needs attention first. Then run the quarter.</li><li>Every resource is a balance: homes need construction crews, crews need training, everything needs money, and money comes from a tax base that can leave.</li>`}</ul></aside>
    </div>
    <section class="cfchart"><div class="row sp"><h2 id="mainT">${esc(KP[selKpi].name)}</h2><label class="note row" style="gap:6px"><input type="checkbox" id="bandT" ${showBand ? 'checked' : ''} style="width:18px;height:18px"> show the 10–90% range of 40 simulated futures</label></div><p class="note" style="margin:0">Solid: history. Dashed: projection.${showBand ? ' Shaded: range with random events.' : ''}</p><div class="fig" id="mainFig"></div></section>`;
  $$('#v-overview tr.cf').forEach(r => { r.onclick = () => { selKpi = r.dataset.k; overview(); $('#mainT').scrollIntoView({ block: 'nearest' }); }; r.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.onclick(); } }; });
  $('#bandT').onchange = e => { showBand = e.target.checked; overview(); };
  $('#subOv').onclick = submitForm; $('#toDec').onclick = () => { tab = 'decide'; render(); window.scrollTo({ top: 0 }); };
  const d = KP[selKpi];
  const ser = [{ name: 'history', color: 'var(--ink)', pts: series(selKpi), w: 2.5 }, { name: 'projection', color: 'var(--red)', pts: pseries(selKpi), dash: true }];
  if (showBand) { const b = mc().band[selKpi]; ser.push({ name: 'median', color: 'var(--s1)', pts: b.map(x => [x.t, x.p50]), band: b.map(x => [x.t, x.p10, x.p90]), dash: true, dot: false, w: 1.5 }); }
  lineChart($('#mainFig'), ser, { yf: v => d.f(v), goal: d.goal ? d.goal(S) : null, zeroLine: true });
}
function goalRow(k, last) {
  const d = KP[k], v = last[k], g = d.goal(S), ok = met(S, k, v);
  const start = S.hist[0][k]; let prog = d.better < 0 ? (start - v) / Math.max(1e-9, start - g) : (v - start) / Math.max(1e-9, g - start);
  if (ok) prog = 1; prog = Math.max(0, Math.min(1, prog));
  return `<div style="padding:8px 0;border-top:1px solid var(--line)"><div class="row sp"><span>${esc(d.name)}</span><span class="num" style="white-space:nowrap"><b>${esc(d.f(v))}</b> <span class="note">${esc(d.gtxt(g))}</span></span></div><div class="meter"><i class="${ok ? 'ok' : prog < 0.15 ? 'bad' : ''}" style="width:${prog * 100}%"></i></div></div>`;
}

// ---------- map ----------
const GEO = {
  MN: [[[-74.0193, 40.7003], [-74.0165, 40.7097], [-74.0128, 40.724], [-74.011, 40.738], [-74.009, 40.753], [-74.001, 40.764], [-73.993, 40.774], [-73.984, 40.787], [-73.973, 40.802], [-73.962, 40.817], [-73.953, 40.832], [-73.947, 40.85], [-73.938, 40.864], [-73.928, 40.878], [-73.916, 40.875], [-73.922, 40.859], [-73.93, 40.844], [-73.934, 40.824], [-73.933, 40.809], [-73.929, 40.797], [-73.942, 40.783], [-73.953, 40.768], [-73.962, 40.755], [-73.971, 40.74], [-73.973, 40.727], [-73.976, 40.711], [-73.996, 40.707], [-74.01, 40.701]]],
  BX: [[[-73.933, 40.809], [-73.934, 40.824], [-73.93, 40.844], [-73.922, 40.859], [-73.916, 40.875], [-73.928, 40.878], [-73.918, 40.915], [-73.897, 40.911], [-73.86, 40.904], [-73.837, 40.893], [-73.81, 40.887], [-73.785, 40.881], [-73.78, 40.85], [-73.793, 40.822], [-73.793, 40.805], [-73.83, 40.804], [-73.855, 40.806], [-73.88, 40.803], [-73.895, 40.798], [-73.915, 40.795], [-73.929, 40.797]]],
  QN: [[[-73.962, 40.738], [-73.962, 40.743], [-73.957, 40.752], [-73.945, 40.762], [-73.935, 40.775], [-73.915, 40.785], [-73.89, 40.775], [-73.87, 40.78], [-73.855, 40.77], [-73.845, 40.795], [-73.81, 40.795], [-73.79, 40.798], [-73.775, 40.795], [-73.765, 40.775], [-73.745, 40.775], [-73.7, 40.752], [-73.705, 40.72], [-73.725, 40.69], [-73.73, 40.665], [-73.74, 40.635], [-73.77, 40.625], [-73.8, 40.63], [-73.83, 40.645], [-73.86, 40.65], [-73.865, 40.675], [-73.87, 40.69], [-73.885, 40.7], [-73.9, 40.705], [-73.915, 40.715], [-73.925, 40.725], [-73.94, 40.733]],
    [[-73.94, 40.548], [-73.9, 40.56], [-73.84, 40.575], [-73.78, 40.585], [-73.74, 40.592], [-73.74, 40.605], [-73.78, 40.598], [-73.84, 40.587], [-73.9, 40.572], [-73.94, 40.558]]],
  BK: [[[-73.962, 40.738], [-73.961, 40.725], [-73.967, 40.712], [-73.98, 40.705], [-73.995, 40.703], [-74.003, 40.695], [-74.012, 40.684], [-74.018, 40.677], [-74.01, 40.665], [-74.022, 40.65], [-74.035, 40.64], [-74.04, 40.625], [-74.035, 40.61], [-74.02, 40.6], [-74.005, 40.59], [-74.012, 40.578], [-73.985, 40.572], [-73.955, 40.575], [-73.93, 40.582], [-73.905, 40.592], [-73.895, 40.61], [-73.88, 40.625], [-73.868, 40.64], [-73.86, 40.65], [-73.865, 40.675], [-73.87, 40.69], [-73.885, 40.7], [-73.9, 40.705], [-73.915, 40.715], [-73.925, 40.725], [-73.94, 40.733]]],
  SI: [[[-74.072, 40.645], [-74.055, 40.625], [-74.055, 40.605], [-74.075, 40.59], [-74.1, 40.57], [-74.125, 40.548], [-74.16, 40.53], [-74.2, 40.515], [-74.245, 40.498], [-74.255, 40.51], [-74.245, 40.53], [-74.225, 40.555], [-74.205, 40.585], [-74.2, 40.615], [-74.185, 40.64], [-74.15, 40.645], [-74.11, 40.648]]],
};
const LANDS = [
  [[-74.3, 40.95], [-73.93, 40.95], [-73.95, 40.87], [-73.99, 40.79], [-74.02, 40.74], [-74.03, 40.705], [-74.05, 40.68], [-74.07, 40.655], [-74.12, 40.655], [-74.2, 40.64], [-74.215, 40.6], [-74.24, 40.56], [-74.27, 40.5], [-74.3, 40.48]],
  [[-73.93, 40.95], [-73.918, 40.915], [-73.86, 40.904], [-73.78, 40.881], [-73.68, 40.88], [-73.68, 40.95]],
  [[-73.68, 40.88], [-73.75, 40.8], [-73.7, 40.752], [-73.705, 40.72], [-73.725, 40.69], [-73.735, 40.62], [-73.74, 40.592], [-73.68, 40.59]],
];
const POI = [
  { n: 'Hunts Point Food Distribution Center', p: [-73.877, 40.808], d: 'Distributes ~4.5B lb of food a year; about half stays in NYC.' },
  { n: 'Ravenswood Generating Station', p: [-73.946, 40.759], d: 'Largest power plant in the city (gas).' },
  { n: 'Astoria power complex', p: [-73.912, 40.786], d: 'Cluster of gas plants and peakers.' },
  { n: 'South Brooklyn Marine Terminal', p: [-74.014, 40.654], d: 'Offshore wind staging port.' },
  { n: 'La Marqueta', p: [-73.941, 40.797], d: 'Site of the first city-owned grocery store.' },
  { n: 'City Hall', p: [-74.006, 40.713], d: 'Your office.' },
];
const LAT0 = 40.7, CX = Math.cos(LAT0 * Math.PI / 180);
const PX = p => [(p[0] + 74.3) * CX * 1000, (40.95 - p[1]) * 1000];
const LAYERS = [
  { id: 'pov', name: 'Poverty rate', v: b => b.pov, f: v => pct(v) },
  { id: 'inc', name: 'Median household income', v: b => BOROUGHS.find(x => x.id === b.id).inc, f: v => '$' + k1(v), static: true },
  { id: 'unemp', name: 'Unemployment', v: b => b.unemp, f: v => pct(v) },
  { id: 'dens', name: 'People per sq mi', v: b => b.pop / BOROUGHS.find(x => x.id === b.id).area, f: v => n0(v) },
  { id: 'units', name: 'Homes per 1,000 people', v: b => b.units / b.pop * 1000, f: v => v.toFixed(0) },
  { id: 'pub', name: 'Plan: public homes built', v: b => b.pubUnits, f: v => k1(v) },
  { id: 'stores', name: 'Plan: city grocery stores', v: b => b.stores, f: v => n0(v) },
  { id: 'support', name: 'Plan support', v: b => b.support ?? S.support, f: v => pct(v, 0) },
];
const RAMP = ['var(--r0)', 'var(--r1)', 'var(--r2)', 'var(--r3)', 'var(--r4)'];
// ---------- map: 59 community districts, zoom & pan, 3D columns ----------
const CDG = /*CDGEO*/;
const CDD = (LIVE.cd && Object.keys(LIVE.cd).length >= 59) ? LIVE.cd : /*CDDATA*/;
const BORO_OF = { 1: 'MN', 2: 'BX', 3: 'BK', 4: 'QN', 5: 'SI' };
CDG.forEach(f => { f.b = BORO_OF[f.id[0]]; f.num = +f.id.slice(1); f.jia = !CDD[f.id]; f.rings = f.r.map(r => { const a = []; for (let i = 0; i < r.length; i += 2) a.push([r[i] / 10, r[i + 1] / 10]); return a; }); f.d = f.rings.map(r => 'M' + r.map(p => p[0] + ',' + p[1]).join('L') + 'Z').join(''); });
const CDS = CDG.filter(f => !f.jia);
const boroName = id => BOROUGHS.find(x => x.id === id).name;
const cdName = f => `${boroName(f.b)} CD ${f.num}`;
const JIA_NAMES = { 164: 'Central Park', 226: 'Van Cortlandt Park', 227: 'Bronx Park', 228: 'Pelham Bay Park', 355: 'Prospect Park', 356: 'Brooklyn Gateway parks', 480: 'LaGuardia Airport', 481: 'Flushing Meadows–Corona Park', 482: 'Forest Park', 483: 'JFK Airport', 484: 'Jamaica Bay & Rockaway parks', 595: 'Staten Island Greenbelt & parks' };
// borough-weighted baselines so the 2014–18 district pattern can be scaled to the simulated borough level
const CD_BASE = {}; ['MN', 'BX', 'BK', 'QN', 'SI'].forEach(b => { const fs = CDS.filter(f => f.b === b); const P = fs.reduce((a, f) => a + CDD[f.id].pop, 0); CD_BASE[b] = { pov: fs.reduce((a, f) => a + CDD[f.id].pov * CDD[f.id].pop, 0) / P, unemp: fs.reduce((a, f) => a + CDD[f.id].unemp * CDD[f.id].pop, 0) / P, need: fs.reduce((a, f) => a + CDD[f.id].pop * CDD[f.id].burd, 0), poor: fs.reduce((a, f) => a + CDD[f.id].pop * CDD[f.id].pov, 0) }; });
function cdVals(s) {
  const out = {};
  CDS.forEach(f => {
    const d = CDD[f.id], bo = s.bor.find(x => x.id === f.b), B0 = BOROUGHS.find(x => x.id === f.b), base = CD_BASE[f.b];
    out[f.id] = {
      pov: d.pov * bo.pov / base.pov, unemp: d.unemp * bo.unemp / base.unemp, burd: d.burd, dens: d.pop / f.sqmi, o65: d.o65, bach: d.bach, crime: d.crime,
      fpu: d.fp == null ? null : d.fp * (1 - (s.clim ? s.clim.protect : 0)), pub: bo.pubUnits * d.pop * d.burd / base.need, stores: bo.stores * d.pop * d.pov / base.poor, bsup: bo.support ?? s.support, pop: d.pop, units: d.units,
      ...(s.cx && s.cx.cd && s.cx.cd[f.id] ? (x => ({ rentI: x.rent, dispK: x.dispYr / (x.units * 0.66) * 1000, gp: x.gp * 100, hvi: x.hvi, heatK: x.heatYr / x.pop * 1e5, crimeD: x.crime })) (s.cx.cd[f.id]) : {}),
    };
  });
  return out;
}
const DLAYERS = [
  { id: 'pov', name: 'Poverty rate', f: v => pct(v), dyn: 1 },
  { id: 'unemp', name: 'Unemployment', f: v => pct(v), dyn: 1 },
  { id: 'burd', name: 'Rent-burdened households', f: v => pct(v) },
  { id: 'dens', name: 'People per sq mi', f: v => n0(v) },
  { id: 'o65', name: 'Residents 65+', f: v => pct(v) },
  { id: 'bach', name: 'Bachelor\'s degree or higher', f: v => pct(v) },
  { id: 'crime', name: 'Major crimes per 1,000', f: v => v.toFixed(1) },
  { id: 'fpu', name: 'People in unprotected floodplain', f: v => k1(v), dyn: 1 },
  { id: 'rentI', name: 'Rent index (2027 = 100)', f: v => v.toFixed(1), dyn: 1 },
  { id: 'dispK', name: 'Displaced or evicted per 1,000 renter homes (this year)', f: v => v.toFixed(1), dyn: 1 },
  { id: 'gp', name: 'Gentrification pressure (0–100)', f: v => v.toFixed(0) },
  { id: 'hvi', name: 'Heat risk (1–5, approx. of the city index)', f: v => v.toFixed(0) },
  { id: 'heatK', name: 'Heat deaths this summer per 100,000', f: v => v.toFixed(1), dyn: 1 },
  { id: 'pub', name: 'Plan: public homes built', f: v => k1(v), dyn: 1 },
  { id: 'stores', name: 'Plan: city grocery stores', f: v => v.toFixed(1), dyn: 1 },
  { id: 'bsup', name: 'Plan support (borough)', f: v => pct(v, 0), dyn: 1 },
];
const HLAYERS = [['', 'Flat map'], ['pop', 'Population'], ['units', 'Homes'], ...DLAYERS.map(l => [l.id, l.name])];
let mapH = '', selCd = '202', mapVB = null, map3d = false;
const K3 = 0.58, Y3 = 450;
const T3 = p => map3d ? [p[0], Y3 + (p[1] - Y3) * K3] : p;
function vbFull() { return map3d ? { x: 20, y: 150, w: 446, h: 320 } : { x: 20, y: 22, w: 446, h: 446 }; }
function quantBreaks(vals) { const v = vals.filter(x => x != null).sort((a, b) => a - b); return [0.2, 0.4, 0.6, 0.8].map(q => v[Math.min(v.length - 1, Math.floor(q * v.length))]); }
function mapView() {
  const L = DLAYERS.find(l => l.id === mapLayer) || DLAYERS[0]; mapLayer = L.id;
  const V = cdVals(S), vals = CDS.map(f => V[f.id][L.id]);
  const br = quantBreaks(vals); const col = v => v == null ? 'var(--panel2)' : RAMP[br.filter(b => v > b).length];
  const sel = CDS.find(f => f.id === selCd) || CDS[0]; selBor = sel.b;
  const b = S.bor.find(x => x.id === selBor), B0 = BOROUGHS.find(x => x.id === selBor), dv = V[sel.id], dd = CDD[sel.id];
  const lo = Math.min(...vals.filter(x => x != null)), hi = Math.max(...vals.filter(x => x != null));
  $('#v-map').innerHTML = `<h1>59 districts, one plan</h1>
    <p class="lead">New York's 59 community districts range from ${pct(Math.min(...CDS.map(f => CDD[f.id].pov)), 0)} to ${pct(Math.max(...CDS.map(f => CDD[f.id].pov)), 0)} poverty. Pick a layer, zoom in (mouse wheel, pinch, double-click or the + button), drag to move, and select a district. Turn on 3D columns to show a second indicator as height.</p>
    <div class="row" style="gap:8px 14px;margin-bottom:10px"><label class="vzsel">Colour <select id="mapL" aria-label="Colour layer">${DLAYERS.map(l => `<option value="${l.id}" ${l.id === L.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>
      <label class="vzsel">Height <select id="mapH" aria-label="Column height">${HLAYERS.map(h => `<option value="${h[0]}" ${h[0] === mapH ? 'selected' : ''}>${esc(h[1])}</option>`).join('')}</select></label>${qm('map.layers', 'map layers')}</div>
    <div class="mapwrap">
      <div><div class="map" id="mapBox" tabindex="0" aria-label="Map of New York City community districts. Use plus and minus to zoom, arrow keys to pan.">
          <svg id="mapSvg" role="img" aria-label="Community district map"></svg><div class="tt" id="mapTT"></div>
          <div class="mapctl"><button id="mzIn" aria-label="Zoom in">+</button><button id="mzOut" aria-label="Zoom out">−</button><button id="mzAll" aria-label="Show whole city" title="Whole city">⤢</button></div>
          <div class="scalebar" id="mapScale"><i></i><span></span></div></div>
        <div class="legend"><span>${esc(L.name)}:</span>${RAMP.map((c, i) => `<span style="display:inline-flex;align-items:center;gap:4px"><i style="display:inline-block;width:14px;height:10px;border-radius:2px;background:${c}"></i>${i === 0 ? '≤' + esc(L.f(br[0])) : i === 4 ? '>' + esc(L.f(br[3])) : esc(L.f(br[i - 1])) + '–' + esc(L.f(br[i]))}</span>`).join('')}${vals.some(v => v == null) ? '<span style="display:inline-flex;align-items:center;gap:4px"><i style="display:inline-block;width:14px;height:10px;border-radius:2px;background:var(--panel2);border:1px solid var(--line)"></i>no data</span>' : ''}</div>
        <div class="legend"><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:var(--ink)"></span>key sites <span style="display:inline-block;width:10px;height:10px;background:var(--red)"></span> ≈2,000 public homes <span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:var(--s3)"></span> city store <span style="display:inline-block;width:10px;height:10px;background:var(--park)"></span> parks &amp; airports</div>
        <p class="note">Boundaries: NYC Department of City Planning. District data: ${esc(LIVE.cdMeta ? LIVE.cdMeta.src + ', ' + LIVE.cdMeta.asOf : 'DCP Community District Profiles, ACS 2014–18')} (some neighbouring districts share one Census sample area and show the same value; crime 2019 and floodplain population 2010 from DCP). Poverty and unemployment keep each district's pattern but move with your plan's borough results. Plan homes go to districts by rent burden, stores by poverty.</p></div>
      <div class="card">
        <h2>${esc(cdName(sel))}</h2><p class="note">${esc(dd.nb)}</p>
        <table><tbody>
          <tr><td>Population</td><td class="r">${n0(dd.pop)}</td></tr>
          <tr><td>Homes (2020 tax lots)</td><td class="r">${n0(dd.units)}</td></tr>
          <tr><td>Land area</td><td class="r">${sel.sqmi} sq mi</td></tr>
          ${DLAYERS.filter(l => l.id !== 'bsup').map(l => `<tr><td>${esc(l.name)}${l.dyn && !/^Plan/.test(l.name) ? ' <span class="note">(now)</span>' : ''}</td><td class="r">${dv[l.id] == null ? '–' : esc(l.f(dv[l.id]))}</td></tr>`).join('')}
        </tbody></table>
        <h3 style="margin-top:12px">${esc(B0.name)}</h3>
        <table><tbody>
          <tr><td>Poverty rate (start → now)</td><td class="r">${pct(B0.pov)} → ${pct(b.pov)}</td></tr>
          <tr><td>Unemployment (start → now)</td><td class="r">${pct(B0.unemp)} → ${pct(b.unemp)}</td></tr>
          <tr><td>Public homes / city stores</td><td class="r">${n0(b.pubUnits)} / ${n0(b.stores)}</td></tr>
        </tbody></table>
        <div class="sl" style="margin-top:8px"><span class="slh"><label for="bw">${esc(B0.name)}: priority for public homes &amp; stores</label>${qm('map.priority', 'borough priority')}</span><output>${b.w.toFixed(1)}×</output><input id="bw" type="range" min="0" max="5" step="0.5" value="${b.w}"><span class="note">Share of new public homes going to ${esc(B0.name)}: ${pct(b.w / S.bor.reduce((a, x) => a + x.w, 0) * 100, 0)}</span></div>
      </div>
    </div>`;
  drawMap(V, L, col);
  $('#mapL').onchange = e => { mapLayer = e.target.value; mapView(); };
  $('#mapH').onchange = e => { const was = map3d; mapH = e.target.value; map3d = !!mapH; if (was !== map3d) mapVB = null; mapView(); };
  $('#bw').oninput = e => { b.w = +e.target.value; changed(); mapView(); };
}
function drawMap(V, L, col) {
  const svg = $('#mapSvg'), box = $('#mapBox'), tt = $('#mapTT');
  if (!mapVB) mapVB = vbFull();
  let g = `<defs><filter id="landSh" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="${map3d ? 3 : 1.2}" stdDeviation="${map3d ? 2.5 : 1.4}" flood-color="#000" flood-opacity="${map3d ? 0.35 : 0.22}"/></filter></defs>`;
  const base = map3d ? ` transform="translate(0 ${Y3}) scale(1 ${K3}) translate(0 ${-Y3})"` : '';
  g += `<g${base}>`;
  g += LANDS.map(l => `<path d="M${l.map(p => PX(p).map(x => x.toFixed(1)).join(',')).join('L')}Z" fill="var(--land)" opacity=".7"/>`).join('');
  g += `<g filter="url(#landSh)">${CDG.map(f => f.jia ? `<path class="jia" data-j="${f.id}" d="${f.d}"/>` : `<path class="cd ${f.id === selCd ? 'sel' : ''}" data-cd="${f.id}" d="${f.d}" fill="${col(V[f.id][L.id])}"/>`).join('')}</g>`;
  const s = CDG.find(f => f.id === selCd); if (s) g += `<path d="${s.d}" fill="none" stroke="var(--red)" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  g += `</g>`;
  // markers: public homes & stores, placed inside districts
  const R = (seed => () => (seed = seed * 16807 % 2147483647) / 2147483647)(42); let mk = '';
  CDS.forEach(f => {
    const nS = Math.round(Math.min(V[f.id].stores, 12)), nH = Math.min(Math.round(V[f.id].pub / 2000), 12); if (!nS && !nH) return;
    const ring = f.rings.reduce((a, r) => r.length > a.length ? r : a, f.rings[0]); const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
    for (let i = 0; i < nS + nH; i++) { let p, t = 0; do { p = [Math.min(...xs) + R() * (Math.max(...xs) - Math.min(...xs)), Math.min(...ys) + R() * (Math.max(...ys) - Math.min(...ys))]; t++; } while (!pip(p, ring) && t < 40); const q = T3(p); mk += i < nS ? `<g class="mk" data-x="${q[0].toFixed(1)}" data-y="${q[1].toFixed(1)}"><circle r="4.5" fill="var(--s3)" stroke="var(--panel)" stroke-width="1.5"/></g>` : `<g class="mk" data-x="${q[0].toFixed(1)}" data-y="${q[1].toFixed(1)}"><rect x="-4" y="-4" width="8" height="8" fill="var(--red)" stroke="var(--panel)" stroke-width="1.5"/></g>`; }
  });
  // 3D columns
  if (map3d) {
    const hv = f => mapH === 'pop' || mapH === 'units' ? V[f.id][mapH] : V[f.id][mapH] ?? 0; const hmax = Math.max(...CDS.map(hv)) || 1;
    const cols = CDS.map(f => ({ f, p: T3(f.c), h: 70 * hv(f) / hmax })).sort((a, b) => a.p[1] - b.p[1]);
    g += `<g class="cols">${cols.map(({ f, p, h }) => { const w = 7, dx = 3.5, dy = -2.5, x = p[0] - w / 2, y = p[1], c = col(V[f.id][L.id]); return `<g class="col" data-cd="${f.id}"><path d="M${x + w},${y}l${dx},${dy}v${-h}l${-dx},${-dy}Z" fill="${c}"/><path d="M${x + w},${y}l${dx},${dy}v${-h}l${-dx},${-dy}Z" fill="#000" opacity=".28"/><rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${c}" stroke="var(--panel)" stroke-width=".4"/><path d="M${x},${y - h}l${dx},${dy}h${w}l${-dx},${-dy}Z" fill="${c}"/><path d="M${x},${y - h}l${dx},${dy}h${w}l${-dx},${-dy}Z" fill="#fff" opacity=".35"/></g>`; }).join('')}</g>`;
  }
  g += mk;
  g += POI.map(o => { const q = T3(PX(o.p)); return `<g class="mk poi" data-x="${q[0].toFixed(1)}" data-y="${q[1].toFixed(1)}" data-n="${esc(o.n)}" data-d="${esc(o.d)}"><circle r="5" fill="var(--ink)" stroke="var(--panel)" stroke-width="2"/></g>`; }).join('');
  // labels
  const bl = ['MN', 'BX', 'BK', 'QN', 'SI'].map(bb => { const fs = CDS.filter(f => f.b === bb); const A = fs.reduce((a, f) => a + f.sqmi, 0); const c = [fs.reduce((a, f) => a + f.c[0] * f.sqmi, 0) / A, fs.reduce((a, f) => a + f.c[1] * f.sqmi, 0) / A]; if (bb === 'MN') c[0] -= 6; if (bb === 'QN') c[1] -= 10; return `<text class="bl lb" data-x="${T3(c)[0]}" data-y="${T3(c)[1]}" text-anchor="middle">${esc(boroName(bb))}</text>`; }).join('');
  const dl = CDS.map(f => `<text class="dl lb" data-x="${T3(f.c)[0]}" data-y="${T3(f.c)[1]}" text-anchor="middle">${f.num}</text>`).join('');
  const dl2 = CDS.map(f => `<text class="dl lb" data-x="${T3(f.c)[0]}" data-y="${T3(f.c)[1]}" text-anchor="middle">${f.num} · ${esc(CDD[f.id].nb.split(',')[0])}</text>`).join('');
  g += `<g id="blab">${bl}</g><g id="dlab">${dl}</g><g id="dlab2">${dl2}</g>`;
  svg.innerHTML = g;
  const apply = () => {
    if (!box.isConnected || !$('#mapScale')) return;
    const W = box.clientWidth || 400, Hh = box.clientHeight || 400; const vb = mapVB;
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const u = Math.max(vb.w / W, vb.h / Hh); const z = vbFull().w / vb.w;
    svg.style.setProperty('--u', u);
    $$('.mk', svg).forEach(m => m.setAttribute('transform', `translate(${m.dataset.x} ${m.dataset.y}) scale(${u})`));
    $$('.lb', svg).forEach(t => { t.setAttribute('x', t.dataset.x); t.setAttribute('y', t.dataset.y); });
    $('#blab', svg).style.display = z < 2.2 ? '' : 'none'; $('#dlab', svg).style.display = z >= 2.2 && z < 4.5 ? '' : 'none'; $('#dlab2', svg).style.display = z >= 4.5 ? '' : 'none';
    box.style.touchAction = z > 1.05 ? 'none' : 'pan-y';
    const ppm = 14.5 / u; const mi = [0.25, 0.5, 1, 2, 5].find(m => m * ppm >= 50) || 5;
    $('#mapScale i').style.width = (mi * ppm) + 'px'; $('#mapScale span').textContent = mi + ' mi';
  };
  const full = vbFull();
  const clamp = () => { const vb = mapVB; vb.w = Math.max(full.w / 14, Math.min(full.w, vb.w)); vb.h = vb.w * full.h / full.w; vb.x = Math.max(full.x - vb.w * 0.3, Math.min(full.x + full.w - vb.w * 0.7, vb.x)); vb.y = Math.max(full.y - vb.h * 0.3, Math.min(full.y + full.h - vb.h * 0.7, vb.y)); };
  const toUser = (cx, cy) => { const r = svg.getBoundingClientRect(); const sc = Math.min(r.width / mapVB.w, r.height / mapVB.h); const ox = (r.width - mapVB.w * sc) / 2, oy = (r.height - mapVB.h * sc) / 2; return [mapVB.x + (cx - r.left - ox) / sc, mapVB.y + (cy - r.top - oy) / sc]; };
  const zoomAt = (k, cx, cy) => { const p = cx == null ? [mapVB.x + mapVB.w / 2, mapVB.y + mapVB.h / 2] : toUser(cx, cy); mapVB.w /= k; mapVB.h /= k; clamp(); const q = cx == null ? [mapVB.x + mapVB.w / 2, mapVB.y + mapVB.h / 2] : toUser(cx, cy); mapVB.x += p[0] - q[0]; mapVB.y += p[1] - q[1]; clamp(); apply(); };
  svg.onwheel = e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0018), e.clientX, e.clientY); };
  const ptr = new Map(); let moved = 0, pinch0 = null;
  svg.onpointerdown = e => { ptr.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pinch0 = { d: Math.hypot(a[0] - c[0], a[1] - c[1]), w: mapVB.w }; } };
  svg.onpointermove = e => {
    if (!ptr.has(e.pointerId)) { hover(e); return; }
    const prev = ptr.get(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2 && pinch0) { const [a, c] = [...ptr.values()]; const d = Math.hypot(a[0] - c[0], a[1] - c[1]); const k = mapVB.w / (pinch0.w * pinch0.d / d); zoomAt(k, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2); moved = 99; return; }
    if (e.pointerType !== 'mouse' && box.style.touchAction !== 'none') return;
    const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 4) { svg.setPointerCapture?.(e.pointerId); const r = svg.getBoundingClientRect(); const sc = Math.min(r.width / mapVB.w, r.height / mapVB.h); mapVB.x -= dx / sc; mapVB.y -= dy / sc; clamp(); apply(); tt.style.display = 'none'; }
  };
  const up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch0 = null; };
  svg.onpointerup = e => { const was = moved; up(e); if (was <= 4) { const t = e.target.closest('[data-cd]'); if (t) { selCd = t.dataset.cd; mapView(); } } };
  svg.onpointercancel = up; svg.onpointerleave = e => { if (e.pointerType === 'mouse') tt.style.display = 'none'; };
  svg.ondblclick = e => { e.preventDefault(); zoomAt(2, e.clientX, e.clientY); };
  function hover(e) {
    const t = e.target.closest('[data-cd],[data-j],.poi'); if (!t) { tt.style.display = 'none'; return; }
    let h;
    if (t.dataset.cd) { const f = CDS.find(x => x.id === t.dataset.cd), v = V[f.id]; h = `<b>${esc(cdName(f))}</b><div>${esc(CDD[f.id].nb.split(',').slice(0, 2).join(','))}</div><div>${esc(L.name)}: ${v[L.id] == null ? 'no data' : esc(L.f(v[L.id]))}</div>${map3d ? `<div>${esc(HLAYERS.find(x => x[0] === mapH)[1])}: ${esc(mapH === 'pop' || mapH === 'units' ? n0(v[mapH]) : v[mapH] == null ? 'no data' : DLAYERS.find(x => x.id === mapH).f(v[mapH]))}</div>` : ''}`; }
    else if (t.dataset.j) h = `<b>${esc(JIA_NAMES[t.dataset.j] || 'Park or airport')}</b><div>Not part of any community district</div>`;
    else h = `<b>${esc(t.dataset.n)}</b><div style="white-space:normal;max-width:220px">${esc(t.dataset.d)}</div>`;
    tt.innerHTML = h; tt.style.display = 'block';
    const r = box.getBoundingClientRect(); tt.style.left = Math.min(r.width - tt.offsetWidth - 4, Math.max(4, e.clientX - r.left + 12)) + 'px'; tt.style.top = Math.max(4, e.clientY - r.top - tt.offsetHeight - 10) + 'px';
  }
  $('#mzIn').onclick = () => zoomAt(1.6); $('#mzOut').onclick = () => zoomAt(1 / 1.6); $('#mzAll').onclick = () => { mapVB = vbFull(); apply(); };
  box.onkeydown = e => { const st = mapVB.w * 0.12; if (e.key === '+' || e.key === '=') zoomAt(1.4); else if (e.key === '-') zoomAt(1 / 1.4); else if (e.key === 'ArrowLeft') { mapVB.x -= st; clamp(); apply(); } else if (e.key === 'ArrowRight') { mapVB.x += st; clamp(); apply(); } else if (e.key === 'ArrowUp') { mapVB.y -= st; clamp(); apply(); } else if (e.key === 'ArrowDown') { mapVB.y += st; clamp(); apply(); } else return; e.preventDefault(); };
  if (box._ro) box._ro.disconnect(); box._ro = new ResizeObserver(apply); box._ro.observe(box);
  apply();
}
function pip(p, ring) { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if (((a[1] > p[1]) !== (b[1] > p[1])) && (p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; }

// ---------- laws ----------
function lawsView() {
  const { fx } = fxAll(S);
  if (S.lost) { $('#v-laws').innerHTML = `<h1>You are out of office</h1><p class="lead">You lost the November 2029 election with ${pct(S.el2029.share)}. The new administration repealed your laws. Use Undo to go back and try a different path, or keep running quarters to watch what follows.</p>`; return; }
  $('#v-laws').innerHTML = `<h1>Write the city's laws</h1>
    <p class="lead">Each law changes what the plan can do and what it costs. ${S.mode === 'real' ? 'Laws marked <span class="tag warn">Needs Albany</span> wait for the State Legislature, which acts mainly from January to June around the State budget (better odds with high support). Laws with legal risk can be struck down in court. Every other change needs 26 of 51 Council votes; the tag shows today\'s whip count.' : 'Sandbox: the city has full powers, no court challenges and no debt limit.'} Your current operating cost of laws: <b>${bn(fx.op)}/yr</b>.</p>
    <div class="card">${LAWS.map(l => `<div class="law"><div><h3>${esc(l.name)} ${qm('law.' + l.id, l.name)}</h3><div class="note">In force: <b>${esc(optOf(S, l.id).name)}</b>${S.pending[l.id] ? `<br><span class="tag warn">Pending in Albany: ${esc(optName2(l.id, S.pending[l.id]))}</span>` : ''}</div></div>
      <div class="opts">${l.opts.map(o => optCard(l, o)).join('')}</div></div>`).join('')}</div>`;
  $$('#v-laws .opt').forEach(b => { b.onclick = () => chooseLaw(b.dataset.l, b.dataset.o); b.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === b) { e.preventDefault(); chooseLaw(b.dataset.l, b.dataset.o); } }; });
}
function optName2(l, o) { return LAWS.find(x => x.id === l).opts.find(x => x.id === o).name; }
function optCard(l, o) {
  const e = o.fx || {}; const on = S.pol[l.id] === o.id, pend = S.pending[l.id] === o.id;
  const tags = [];
  if (e.op) tags.push(`<span class="tag">${bn(e.op)}/yr</span>`);
  if (e.capex) tags.push(`<span class="tag">${bn(e.capex)} once</span>`);
  if (e.albany && S.mode === 'real') tags.push('<span class="tag warn">Needs Albany</span>');
  if (e.legal) tags.push(`<span class="tag ${e.legal >= 3 ? 'red' : 'warn'}">Legal risk ${e.legal >= 3 ? 'high' : 'some'}</span>`);
  if (e.climate && e.climate <= -1) tags.push('<span class="tag red">Investors leave</span>');
  if (e.support > 0) tags.push(`<span class="tag good">Support +</span>`); else if (e.support < 0) tags.push('<span class="tag red">Support −</span>');
  if (S.mode === 'real' && o.id !== l.opts[0].id && !e.albany && !on) { const v = councilVote(S, o); tags.push(`<span class="tag ${v.pass ? 'good' : 'red'}">Council ${v.yes}–${v.no}</span>`); if (!v.pass && v.short <= DEAL_MAX) tags.push(`<span class="tag warn">Deal: ${v.short} vote${v.short > 1 ? 's' : ''}, $${Math.round(v.short * dealPer(o) * 1000)}M/yr</span>`); }
  return `<div class="opt ${on ? 'on' : ''} ${pend ? 'pend' : ''}" role="button" tabindex="0" data-l="${l.id}" data-o="${o.id}" aria-pressed="${on}"><span class="n">${esc(o.name)} ${qm('opt.' + l.id + '.' + o.id, o.name)}</span><span class="ds">${esc(o.desc)}</span>${o.prec ? `<span class="pr">${esc(o.prec)}</span>` : ''}<span>${tags.join('')}</span></div>`;
}
function lawRefresh() { if (tab === 'decide') { decideView(); addNum(); } else lawsView(); }
function chooseLaw(lid, oid) {
  const l = LAWS.find(x => x.id === lid), o = l.opts.find(x => x.id === oid);
  if (S.pol[lid] === oid) { delete S.pending[lid]; changed(); lawRefresh(); return; }
  if (S.pending[lid] === oid) { delete S.pending[lid]; changed(); lawRefresh(); toast('Request to Albany withdrawn.'); return; }
  const cur = optOf(S, lid);
  if (S.b.fcb && S.mode === 'real' && ((o.fx.op || 0) > (cur.fx.op || 0) || o.fx.capex)) { toast('The Financial Control Board blocks new spending until the budget balances.'); return; }
  if (o.fx.albany && S.mode === 'real') { S.pending[lid] = oid; changed(); lawRefresh(); toast(`Sent to Albany: "${o.name}". It takes effect if the Legislature passes it.`); return; }
  if (S.mode === 'real' && oid !== l.opts[0].id) { const v = councilVote(S, o); if (!v.pass) { const whip = v.by.map(b => `${BLOCS.find(x => x.id === b.id).name}: ${b.yes} of ${b.seats}`).join('; ');
      if (v.short <= DEAL_MAX && !S.lost) { const cost = v.short * dealPer(o); modal(`<h2 style="margin-top:0">${v.short} vote${v.short > 1 ? 's' : ''} short</h2><p>The whip count for "${esc(o.name)}" is ${v.yes} to ${v.no}; 26 are needed. ${esc(whip)}.</p><p>Undecided members would vote yes in return for projects in their districts: parks, school repairs, street safety. That costs about <b>$${Math.round(cost * 1000)}M a year</b> for as long as the law stands (model assumption: $${Math.round(dealPer(o) * 1000)}M per vote; bigger and more radical laws cost more).</p><p class="note">Every mayor makes deals like this. The alternative is a milder option, more public support, or a different Council after the 2029 election.</p><div class="row" style="gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn" id="mClose">No deal</button><button class="btn go" id="dealGo">Make the deal</button></div>`);
        $('#dealGo').onclick = () => { undoStack.push(JSON.stringify(S)); const q = makeDeal(S, lid, oid); closeModal(); if (!q) { toast('The deal fell through.'); return; } changed(); lawRefresh(); toast(`Deal done. The Council passes "${o.name}" with 26 votes, and $${Math.round(q.cost * 1000)}M a year goes to swing districts.`); };
        return; }
      toast(`The Council votes it down, ${v.yes} to ${v.no} (26 needed). ${whip}. That is too far short for a deal. A milder option, more public support, or a different Council after 2029 could change the count.`); return; } delete S.pending[lid]; S.pol[lid] = oid; changed(); lawRefresh(); toast(`The Council passes "${o.name}", ${v.yes} to ${v.no}.`); return; }
  delete S.pending[lid]; S.pol[lid] = oid; changed(); lawRefresh();
}

// ---------- plan & balances ----------
function planView() {
  const { fx, flags } = fxAll(S); const P = S.plan;
  const capOff = id => (id === 'acq' && !flags.acquire) || (id === 'stores' && fx.storesCap !== 9999);
  const capNote = id => id === 'acq' && !flags.acquire ? 'Needs the law "Municipalize with compensation"' : id === 'stores' && fx.storesCap === 5 ? 'The five-store pilot builds automatically; choose "Public grocery network" to scale' : id === 'stores' && fx.storesCap === 0 ? 'Needs a public grocery law' : CAPITAL.find(c => c.id === id).note;
  const capTotal = Object.keys(P.cap).reduce((a, k) => a + (capOff(k) ? 0 : P.cap[k]), 0);
  const trainCost = TRAIN.reduce((a, t) => a + P.train[t.id] * t.cost / 1e9, 0);
  $('#v-plan').innerHTML = `<h1>Balance the plan in physical units</h1>
    <p class="lead">This is the core of planning: for every resource, what is needed against what will exist. A red row is a shortfall the plan must fix by investing, training or cutting a target. Changes apply when you run the quarter.</p>
    <div class="card" id="solver" style="margin-bottom:14px">${solverHTML()}</div>
    <div class="grid g12">
      <div class="grid">
        <div class="card"><div class="row sp"><h2>Capital investment</h2><span class="num"><b id="capSum">${bn(capTotal)}</b>/yr</span></div>
          ${CAPITAL.map(c => slider('cap', c.id, c.name, P.cap[c.id], c.max, c.step, v => bn(v), capNote(c.id), capOff(c.id))).join('')}</div>
        <div class="card"><div class="row sp"><h2>Training seats per year</h2><span class="num"><b id="trainSum">${bn(trainCost)}</b>/yr</span></div>
          ${TRAIN.map(t => slider('train', t.id, t.name, P.train[t.id], t.max, t.max / 100, v => n0(v), `${t.qtrs} quarters · $${k1(t.cost)} per seat`)).join('')}</div>
        <div class="card"><h2>Rules of allocation</h2>
          ${slider('rule', 'homeless', 'Share of public homes for shelter residents', P.homeless, 60, 5, v => v + '%', 'Each home moves ≈2.4 people out of shelter')}
          ${slider('rule', 'bond', 'Capital financed by bonds', P.bond, 100, 5, v => v + '%', 'The rest is paid from this year\'s operating budget. Bonds cost ≈6.2%/yr in debt service.')}
          ${slider('rule', 'audit', 'Statistics, inspections and audits', P.audit ?? 0.05, 0.5, 0.01, v => bn(v) + '/yr', 'Closes the gap between what enterprises report and what is real, and cuts graft. See the Economy page.')}</div>
      </div>
      <div class="grid">
        <div class="card"><h2>Material balances, next 12 months</h2><div class="scroll"><table id="balT"></table></div></div>
        <div class="card"><h2>Where this plan lands by Q4 2031</h2><p class="note">Deterministic projection with your current laws and plan, no random events.</p><div class="scroll"><table id="endT"></table></div></div>
        <div class="card flat"><h2>Input–output coefficients used</h2><div class="scroll"><table><thead><tr><th>One unit of…</th><th>needs</th></tr></thead><tbody>
          <tr><td>New public home</td><td>$${k1(650000 * S.h.costIdx * fx.costMult)} (cost index ${S.h.costIdx.toFixed(3)}), 1.6 construction worker-years, 8 quarters</td></tr>
          <tr><td>Rental building bought</td><td>≈$250k per apartment (assumption for older stabilized stock)</td></tr>
          <tr><td>MW of battery storage</td><td>$2.0M, 4 quarters; counts 90% at peak</td></tr>
          <tr><td>MW of offshore wind</td><td>$6.0M, 16 quarters; 3.9 GWh/yr; 25% at peak</td></tr>
          <tr><td>MW of peak avoided by retrofits</td><td>$4.0M, 3 quarters; also cuts gas burned in buildings</td></tr>
          <tr><td>City grocery store</td><td>$30M build, 6 quarters, ≈$4M/yr to run incl. staple discounts; serves ≈15,000 people</td></tr>
          <tr><td>Job-guarantee worker</td><td>≈$55,000/yr incl. benefits</td></tr>
          <tr><td>Plan dollar</td><td>Delivers ${pct((0.72 + 0.28 * S.info) * 100, 0)} of its target output at current information quality</td></tr>
        </tbody></table></div><p class="note">Coefficients marked as assumptions are model calibrations, not official figures. See Sources.</p></div>
      </div>
    </div>`;
  $$('#v-plan input[type=range]').forEach(inp => inp.oninput = () => {
    const [g, id] = inp.id.split('-'); const v = +inp.value;
    if (g === 'cap') P.cap[id] = v; else if (g === 'train') P.train[id] = v; else P[id] = v;
    inp.previousElementSibling.textContent = inp.dataset.f === 'sbn' ? sbn(v) + '/yr' : inp.dataset.f === 'bn' ? bn(v) : inp.dataset.f === 'pc' ? v + '%' : n0(v);
    $('#capSum').textContent = bn(Object.keys(P.cap).reduce((a, k) => a + (capOff(k) ? 0 : P.cap[k]), 0));
    $('#trainSum').textContent = bn(TRAIN.reduce((a, t) => a + P.train[t.id] * t.cost / 1e9, 0));
    changed(); debounce(planTables, 200);
  });
  planTables(); bindSolver();
}
const SOLVE_NAMES = { shortage: 'Housing shortage', shelter: 'People in shelters', insec: 'Food insecurity', margin: 'Power margin', ghg: 'Emissions', unemp: 'Unemployment', life: 'Life expectancy', support: 'Public support', care: 'Child-care coverage' };
let solveGoals = ['shortage', 'shelter', 'insec', 'margin', 'ghg', 'care'], solveTax = false;
function solverHTML() {
  const r = solveRes;
  let res = '';
  if (r) {
    const P = S.plan, Q = r.plan; const rows = [];
    CAPITAL.forEach(c => { if (Math.abs(Q.cap[c.id] - P.cap[c.id]) > 0.004) rows.push([c.name, bn(P.cap[c.id]) + '/yr', bn(Q.cap[c.id]) + '/yr']); });
    TRAIN.forEach(t => { if (Math.abs(Q.train[t.id] - P.train[t.id]) > 1) rows.push([t.name, n0(P.train[t.id]) + ' seats', n0(Q.train[t.id]) + ' seats']); });
    if (Q.homeless !== P.homeless) rows.push(['Public homes for shelter residents', P.homeless + '%', Math.round(Q.homeless) + '%']);
    if (Q.bond !== P.bond) rows.push(['Capital financed by bonds', P.bond + '%', Math.round(Q.bond) + '%']);
    if (r.tax) { const c4 = TAX0.prop[3] * (1 + r.tax.c4 / 100); if (Math.abs(c4 - S.tax.prop[3]) > 0.005) rows.push(['Commercial property tax (Council)', S.tax.prop[3].toFixed(2) + '%', c4.toFixed(2) + '%']); if (Math.abs(r.tax.mill - S.tax.mill) > 0.04) rows.push(['Extra rate over $1M (Albany)', S.tax.mill.toFixed(1) + '%', r.tax.mill.toFixed(1) + '%']); }
    const now = proj(); const ne = now[now.length - 1], se = r.best.end;
    const unmet = Object.keys(SOLVE_NAMES).filter(k => solveGoals.includes(k) && gap(S, k, se[k]) > 0);
    const bind = [];
    if (se.deficit > -0.3 && se.deficit < 0.5) bind.push('the operating budget (more spending would trigger the Financial Control Board)');
    if (S.trainScale < 1) bind.push('training capacity at CUNY');
    res = `<div class="grid g2" style="margin-top:12px"><div><h3>Proposed changes (${r.evals} plans tested)</h3><div class="scroll"><table><thead><tr><th>Lever</th><th class="r">Now</th><th class="r">Solver</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(x[0])}</td><td class="r">${esc(x[1])}</td><td class="r"><b>${esc(x[2])}</b></td></tr>`).join('') || '<tr><td colspan="3" class="note">No change beats your current plan.</td></tr>'}</tbody></table></div></div>
      <div><h3>Result at the end of the plan</h3><div class="scroll"><table><thead><tr><th>Indicator</th><th class="r">Your plan</th><th class="r">Solver</th><th class="r">Goal</th></tr></thead><tbody>${Object.keys(SOLVE_NAMES).concat(['deficit', 'vote']).map(k => { const d = KP[k]; const g = d.goal ? d.goal(S) : null; const ok = g != null ? met(S, k, se[k]) : null; return `<tr><td>${esc(d.name)}</td><td class="r">${esc(d.f(ne[k]))}</td><td class="r" style="color:${ok == null ? 'inherit' : ok ? 'var(--good)' : 'var(--red)'}"><b>${esc(d.f(se[k]))}</b></td><td class="r note">${g != null ? esc(d.gtxt(g)) : ''}</td></tr>`; }).join('')}</tbody></table></div></div></div>
      <p style="margin-top:10px">${unmet.length ? `<b>Out of reach under today's laws:</b> ${unmet.map(k => esc(SOLVE_NAMES[k])).join(', ')}. ${bind.length ? 'The binding constraint is ' + bind.join(' and ') + '.' : ''} Change laws (revenue, ownership, land) and solve again.` : '<b>All ticked goals are reachable.</b>'} Cost of the solver's plan: ${bn(CAPITAL.reduce((a, c) => a + r.plan.cap[c.id], 0))}/yr capital.</p>
      <div class="row"><button class="btn go" id="applySol">Apply this plan</button><button class="btn" id="dropSol">Discard</button></div>`;
  }
  return `<div class="row sp"><h2 style="margin:0">Let the bureau find the cheapest plan ${qm('solver', 'the solver')}</h2><button class="btn go" id="runSol" ${solving ? 'disabled' : ''}>${solving ? 'Searching…' : 'Solve'}</button></div>
    <p class="note" style="margin:6px 0 10px">Searches every investment and training lever for the cheapest plan that meets the goals you tick by Q4 2031, without triggering the Financial Control Board or losing the 2029 election. Real planning offices do this with linear programming, invented by Leonid Kantorovich in 1939.</p>
    <div class="row" style="gap:6px 14px">${Object.keys(SOLVE_NAMES).map(k => `<label class="row" style="gap:6px;font-size:14px"><input type="checkbox" class="sg" value="${k}" ${solveGoals.includes(k) ? 'checked' : ''} style="width:18px;height:18px">${esc(SOLVE_NAMES[k])}</label>`).join('')}
    <label class="row" style="gap:6px;font-size:14px"><input type="checkbox" id="solTax" ${solveTax ? 'checked' : ''} style="width:18px;height:18px"><b>May change taxes</b> (commercial property rate, millionaire surcharge)</label>${qm('solver.tax', 'letting the solver change taxes')}</div>
    <div class="meter" style="margin-top:10px;${solving ? '' : 'display:none'}"><i id="solBar" style="width:0%"></i></div>${res}`;
}
function bindSolver() {
  $$('#solver .sg').forEach(c => c.onchange = () => { solveGoals = $$('#solver .sg').filter(x => x.checked).map(x => x.value); });
  const tx = $('#solTax'); if (tx) tx.onchange = () => { solveTax = tx.checked; };
  const go = $('#runSol'); if (go) go.onclick = runSolver;
  const ap = $('#applySol'); if (ap) ap.onclick = () => {
    undoStack.push(JSON.stringify(S)); S.plan = clone(solveRes.plan);
    let msg = '';
    if (solveRes.tax) {
      const tx = clone(S.tax); tx.prop[3] = TAX0.prop[3] * (1 + solveRes.tax.c4 / 100);
      if (Math.abs(tx.prop[3] - S.tax.prop[3]) > 0.005) { const v = S.mode === 'sandbox' ? { pass: true, yes: 51, no: 0 } : propTaxVote(S, tx); if (v.pass) { S.tax.prop[3] = tx.prop[3]; msg += `Council adopts the commercial rate, ${v.yes}–${v.no}. `; } else msg += `Council rejects the commercial rate, ${v.yes}–${v.no}. `; }
      if (solveRes.tax.mill > S.tax.mill + 0.04) { const t2 = clone(S.taxPending ? S.taxPending.tx : S.tax); t2.mill = solveRes.tax.mill; t2.prop = S.tax.prop.slice(); if (S.mode === 'real') { S.taxPending = { tx: t2, age: 0 }; msg += 'Millionaire surcharge sent to Albany.'; } else S.tax.mill = solveRes.tax.mill; }
    }
    taxDraft = null; solveRes = null; changed(); planView(); if (msg) toast(msg);
  };
  const dr = $('#dropSol'); if (dr) dr.onclick = () => { solveRes = null; $('#solver').innerHTML = solverHTML(); bindSolver(); };
}
function runSolver() {
  if (!solveGoals.length) { toast('Tick at least one goal.'); return; }
  solving = true; solveRes = null; $('#solver').innerHTML = solverHTML(); bindSolver();
  const gen = solveGen(S, solveGoals, { tax: solveTax }); let last = null; const expect = solveTax ? 700 : 380;
  const tick = () => {
    for (let i = 0; i < 12; i++) { const r = gen.next(); if (r.done) { solving = false; solveRes = r.value; $('#solver').innerHTML = solverHTML(); bindSolver(); return; } last = r.value; }
    const bar = $('#solBar'); if (bar && last) bar.style.width = Math.min(98, last.evals / expect * 100) + '%';
    setTimeout(tick, 0);
  };
  setTimeout(tick, 30);
}
function slider(g, id, name, v, max, step, f, note, off, min = 0) {
  const ft = g === 'safe' ? (id === 'police' ? 'sbn' : 'bn') : g === 'cap' || id === 'audit' ? 'bn' : g === 'rule' ? 'pc' : 'n';
  return `<div class="sl ${off ? 'off' : ''}"><span class="slh"><label for="${g}-${id}">${esc(name)}</label>${qm(g + '.' + id, name)}</span><output>${esc(f(v))}</output><input type="range" id="${g}-${id}" data-f="${ft}" min="${min}" max="${max}" step="${step}" value="${v}" ${off ? 'disabled' : ''}><span class="note">${esc(note || '')}</span></div>`;
}
let dT = null; function debounce(fn, ms) { clearTimeout(dT); dT = setTimeout(fn, ms); }
function planTables() {
  if (!$('#balT')) return;
  const rows = balances(S);
  $('#balT').innerHTML = `<thead><tr><th>Resource</th><th class="r">Needed</th><th class="r">Available</th><th>Balance</th></tr></thead><tbody>${rows.map(r => {
    const ratio = r.need > 0 ? r.have / r.need : 1; const ok = ratio >= 0.98; const f = v => r.dec ? v.toFixed(r.dec) : k1(v);
    return `<tr><td><b>${esc(r.name)}</b><br><span class="note">${esc(r.unit)}</span><details><summary>how it's calculated</summary><span class="note">${esc(r.how)}</span></details></td><td class="r">${esc(f(r.need))}</td><td class="r">${esc(f(r.have))}</td><td><div class="bal"><div class="meter"><i class="${ok ? 'ok' : 'bad'}" style="width:${Math.min(100, ratio * 100)}%"></i></div><span class="num" style="white-space:nowrap;font-size:13px">${pct(ratio * 100, 0)}</span></div></td></tr>`;
  }).join('')}</tbody>`;
  projCache = null; const p = proj(); const end = p[p.length - 1], now = S.hist[S.hist.length - 1];
  $('#endT').innerHTML = `<thead><tr><th>Indicator</th><th class="r">Now</th><th class="r">End of plan</th><th class="r">Goal</th></tr></thead><tbody>${GOALK.concat(['rent', 'top', 'gcp']).map(k => { const d = KP[k]; const g = d.goal ? d.goal(S) : null; const ok = g != null ? met(S, k, end[k]) : null; return `<tr><td>${esc(d.name)}</td><td class="r">${esc(d.f(now[k]))}</td><td class="r" style="color:${ok == null ? 'inherit' : ok ? 'var(--good)' : 'var(--red)'}"><b>${esc(d.f(end[k]))}</b></td><td class="r note">${g != null ? esc(d.gtxt(g)) : ''}</td></tr>`; }).join('')}</tbody>`;
}

// ---------- people: ages, child care, schools, CUNY, elder care, labor ----------
function peopleView() {
  const L = S.lab, G = S.age, G0 = S.hist[0];
  const { fx, flags } = fxAll(S);
  const ages = [['Under 5', G.k04, G0.k04], ['5–17', G.k517, G0.k517], ['18–64', G.a1864, G0.a1864], ['65+', G.s65, G0.s65]];
  const pipe = {}; L.trainees.forEach(t => pipe[t.id] = (pipe[t.id] || 0) + t.n);
  const cap = trainCap(S, fx), asked = TRAIN.filter(t => !t.short).reduce((a, t) => a + S.plan.train[t.id], 0);
  const rows = SECTORS.map(x => [x.name, L.sectors[x.id] - x.jobs * 1000]);
  const now = SECTORS.map(x => [x.name, L.sectors[x.id]]);
  const cNeed = careNeed(S, flags);
  $('#v-labor').innerHTML = `<h1>People: a city getting older, with fewer children</h1>
    <p class="lead">New York had 1.43 million residents aged 65+ in 2023, up 53% since 2000, while public school enrollment keeps falling. Every age group needs something different from the plan: seats for toddlers, teachers for pupils, training for workers, aides for elders.</p>
    <div class="grid g2">
      <div class="card"><h2>Age groups now vs Q1 2027</h2>${ages.map(a => `<div class="hbar"><span>${esc(a[0])}</span><span class="tr"><i style="width:${a[1] / 5.6e6 * 100}%;background:var(--s1)"></i></span><span class="val">${k1(a[1])}</span></div><div class="note" style="margin:-2px 0 6px;text-align:right">${a[1] >= a[2] ? '+' : '−'}${k1(Math.abs(a[1] - a[2]))} since start</div>`).join('')}
        <p class="note">Births 11.9 per 1,000 residents (2023); families with children make up a large share of people moving away (assumption).</p></div>
      <div class="card"><h2>Older and younger residents</h2><div class="fig sm" id="ageFig"></div></div>
      <div class="card"><h2>Child care</h2>
        <div class="row sp"><span>Families wanting a seat</span><b class="num">${n0(cNeed)}</b></div>
        <div class="row sp"><span>Usable seats (3-K, pre-K, 2-K, vouchers, new centers)</span><b class="num">${n0(S.cc.usable ?? S.cc.seats)}</b></div>
        <div class="meter" style="margin:8px 0"><i class="${(S.cc.coverage ?? 0.7) >= S.goals.care / 100 ? 'ok' : ''}" style="width:${(S.cc.coverage ?? 0.7) * 100}%"></i></div>
        <p class="note">${flags.universal ? 'Universal child care is law: 65% of families with under-5s now ask for a seat.' : 'Under current law about 45% of families with under-5s seek a seat (assumption).'} New seats in the pipeline: ${n0(S.cc.pipe.reduce((a, x) => a + x.n, 0))}. Child care costs families over $26,000 a year privately. Seats filled bring parents into work: +${L.lfpBoost.toFixed(2)} pts labor participation so far.</p></div>
      <div class="card"><h2>Schools and CUNY</h2>
        <div class="row sp"><span>Public school enrollment (district)</span><b class="num">${n0(S.ed.enroll)}</b></div>
        <div class="row sp"><span>Teachers still needed for class-size law</span><b class="num">${n0(Math.max(0, S.ed.teacherGap))}</b></div>
        <div class="row sp"><span>CUNY students</span><b class="num">${n0(S.cu.enroll)}</b></div>
        <div class="row sp"><span>Training seats asked / available</span><b class="num" style="color:${asked > cap ? 'var(--red)' : 'inherit'}">${n0(asked)} / ${n0(cap)}</b></div>
        <p class="note">Enrollment is projected to fall another 128,000 by 2034–35. CUNY and the colleges run your training programs, so their capacity caps how fast you can retrain people.</p></div>
      <div class="card"><h2>Elder care</h2>
        <div class="row sp"><span>Residents 65+</span><b class="num">${n0(G.s65)}</b></div>
        <div class="row sp"><span>Home-care aides needed / working</span><b class="num">${n0(S.el.need ?? G.s65 * S.A.aideRatio)} / ${n0(S.el.aides)}</b></div>
        <div class="meter" style="margin:8px 0"><i class="${(S.el.ratio ?? 1) >= 0.98 ? 'ok' : 'bad'}" style="width:${Math.min(100, (S.el.ratio ?? 0.99) * 100)}%"></i></div>
        <p class="note">Home health aides are the city's most common job, low-paid and mostly Medicaid-funded. A short course takes one quarter; a living-wage co-op law slows quitting.</p></div>
      <div class="card"><h2>Training pipeline</h2><div class="scroll"><table><thead><tr><th>Program</th><th class="r">Length</th><th class="r">In training</th><th class="r">Seats/yr</th></tr></thead><tbody>${TRAIN.map(t => `<tr><td>${esc(t.name)}</td><td class="r">${t.qtrs} qtrs</td><td class="r">${n0(pipe[t.id] || 0)}</td><td class="r">${n0(S.plan.train[t.id])}</td></tr>`).join('')}</tbody></table></div>
        <p class="note">Doctors take 28 quarters: anyone you start training now finishes after the plan ends. That is why real plans are written for 5 and 15 years at once.</p></div>
      <div class="card"><h2>Jobs by sector now</h2><p class="note">Sept 2026 baseline: 4,822,670 jobs. ${n0(L.unemployed)} residents unemployed (${pct(L.unemployed / L.lf * 100)}); ${n0(L.jg)} in the job guarantee.</p>${hbars(now, 'var(--s1)', v => k1(v))}</div>
      <div class="card"><h2>Change since Q1 2027</h2><p class="note">Finance and tech follow top earners and the business climate; construction, health and schools grow with training.</p>${hbars(rows, 'var(--good)', v => (v >= 0 ? '+' : '−') + k1(Math.abs(v)))}</div>
    </div>`;
  lineChart($('#ageFig'), [{ name: '65+', color: 'var(--s4)', pts: series('s65') }, { name: '', color: 'var(--s4)', pts: pseries('s65'), dash: true, dot: false }, { name: 'Ages 5–17', color: 'var(--s2)', pts: series('k517') }, { name: '', color: 'var(--s2)', pts: pseries('k517'), dash: true, dot: false }], { yf: v => k1(v), rlab: true });
}

// ---------- services: water, waste, safety, transit ----------
function servicesView() {
  const W = S.wt, WS = S.ws, SF = S.sf;
  $('#v-services').innerHTML = `<h1>The city underneath: water, waste and safety</h1>
    <p class="lead">Planning is not only new things. Pipes, trucks and patrols must keep running, and they compete for the same money and workers.</p>
    <div class="grid g3">
      <div class="card kpi"><span class="l">Water used</span><span class="v num">${n0(W.mgd)} M gal/day</span><span class="d mu">990 in 2025, from upstate reservoirs</span></div>
      <div class="card kpi"><span class="l">Water main breaks</span><span class="v num">${n0(W.breaks)}/yr</span><span class="d mu">359 in FY2024, then +54% in FY2025</span></div>
      <div class="card kpi"><span class="l">Typical homeowner water bill</span><span class="v num">$${n0(W.bill)}/yr</span><span class="d mu">$1,224 in FY2026; paid to the Water Board, not taxes</span></div>
      <div class="card kpi"><span class="l">Waste diverted from landfill</span><span class="v num">${pct(WS.divert)}</span><span class="d mu">18.8% DSNY-managed, FY2025</span></div>
      <div class="card kpi"><span class="l">Refuse exported</span><span class="v num">${WS.tons.toFixed(2)}M t/yr</span><span class="d mu">≈3.2M tons a year, trucked and railed out of the city</span></div>
      <div class="card kpi"><span class="l">Shootings</span><span class="v num">${n0(SF.shoot)}/yr</span><span class="d mu">688 in 2025, the lowest on record; officers ${n0(SF.officers)}</span></div>
    </div>
    <div class="grid g3" style="margin-top:14px">
      <div class="card"><h2>Water main breaks</h2><div class="fig sm" id="svW"></div><p class="note">Add money under "Water mains & sewers" in the Plan. DEP already runs a $33.3B ten-year capital plan.</p></div>
      <div class="card"><h2>Waste diverted</h2><div class="fig sm" id="svD"></div><p class="note">Citywide curbside composting began in October 2024. Plants and markets for recyclables raise the rate.</p></div>
      <div class="card"><h2>Shootings per year</h2><div class="fig sm" id="svS"></div><p class="note">Modelled from poverty, unemployment and your safety law. The Office of Community Safety ($260M) answers only part of the ~200,000 mental-health calls police handle each year.</p></div>
    </div>
    <h2 style="margin-top:26px">Climate: heat and floods</h2>
    <div class="grid g2">
      <div class="card"><h2>Heat deaths per year</h2><div class="fig sm" id="svH"></div><p class="note">About 500 New Yorkers die from heat each year; most heat-stress deaths happen at home, often without working air conditioning. Fund "Cooling" in the Plan.</p></div>
      <div class="card"><h2>Waterfront protected from a 100-year flood</h2><div class="fig sm" id="svF"></div><p class="note">1.3 million people live in or next to the floodplain. Unprotected coast turns a hurricane into billions in damage and lost homes. Fund "Coastal flood protection".</p></div>
    </div>`;
  const pair = (k, c) => [{ name: '', color: c, pts: series(k) }, { name: '', color: c, pts: pseries(k), dash: true, dot: false }];
  lineChart($('#svW'), pair('breaks', 'var(--s1)'), { yf: v => n0(v) });
  lineChart($('#svD'), pair('divert', 'var(--s3)'), { yf: v => pct(v, 0) });
  lineChart($('#svS'), pair('shoot', 'var(--s2)'), { yf: v => n0(v) });
  lineChart($('#svH'), pair('heat', 'var(--s2)'), { yf: v => n0(v), zero: true });
  lineChart($('#svF'), pair('protect', 'var(--s1)'), { yf: v => pct(v, 0), zero: true, ymax: 100 });
}

// ---------- scenarios, uncertainty, sensitivity ----------
const SC_COL = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
let scMetric = 'shortage', mcMetric = 'shortage', senMetric = 'shortage', senCache = null;
function scenProject(sc) { const c = lite(S); c.pol = clone(sc.pol); c.pending = clone(sc.pending); c.plan = clone(sc.plan); sc.w.forEach((w, i) => c.bor[i].w = w); for (let i = 0; i < Math.max(4, 20 - S.t); i++) step(c, { events: false }); return c.hist; }
function scenariosView() {
  const scs = S.scen || (S.scen = []);
  const res = scs.map(sc => ({ sc, h: scenProject(sc) }));
  const cur = proj(); const m = mc();
  const d = KP[scMetric];
  const sens = senCache && senCache.t === S.t && senCache.k === senMetric ? senCache.r : (senCache = { t: S.t, k: senMetric, r: sensitivity(S, senMetric) }).r;
  const smax = Math.max(...sens.map(x => Math.max(Math.abs(x.lo), Math.abs(x.hi)))) || 1;
  const sel = (id, v) => `<select id="${id}" aria-label="Indicator">${KPIS.filter(x => x.better !== 0 || x.k === 's65').map(x => `<option value="${x.k}" ${x.k === v ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`;
  $('#v-scenarios').innerHTML = `<h1>Compare plans before you commit</h1>
    <p class="lead">Save your current laws and plan as a scenario, change them, save again, and compare where each leads by Q4 2031. Then check how sure you can be: 40 simulated futures with random shocks, and a test of which assumptions matter most.</p>
    <div class="card"><div class="row sp"><h2 style="margin:0">Scenarios</h2><div class="row"><input id="scName" type="text" placeholder="Name, e.g. Vienna model" style="padding:9px 10px;border-radius:8px;border:1px solid var(--line);background:var(--panel);font-size:16px;min-height:44px;width:220px"><button class="btn go" id="scSave" ${scs.length >= 4 ? 'disabled' : ''}>Save current plan</button>${qm('scenario', 'saving a scenario')}</div></div>
      <p class="note">Up to four. Each is projected from today's state without random events.</p>
      <div class="row" style="margin:8px 0">${sel('scM', scMetric)}</div>
      <div class="fig" id="scFig"></div>
      <div class="scroll"><table><thead><tr><th>Indicator at end of plan</th><th class="r">Current plan</th>${res.map((r, i) => `<th class="r"><span style="color:${SC_COL[i]}">■</span> ${esc(r.sc.name)}</th>`).join('')}</tr></thead><tbody>
        ${GOALK.concat(['vote', 'rent', 'gcp']).map(k => { const kd = KP[k]; const cell = v => { const g = kd.goal ? kd.goal(S) : null; const ok = g != null ? met(S, k, v) : null; return `<td class="r" style="color:${ok == null ? 'inherit' : ok ? 'var(--good)' : 'inherit'}">${esc(kd.f(v))}</td>`; }; return `<tr><td>${esc(kd.name)}</td>${cell(cur[cur.length - 1][k])}${res.map(r => cell(r.h[r.h.length - 1][k])).join('')}</tr>`; }).join('')}
        <tr><td></td><td></td>${res.map((r, i) => `<td class="r"><button class="btn" data-load="${i}" style="min-height:36px;padding:6px 10px">Load</button> <button class="btn" data-del="${i}" style="min-height:36px;padding:6px 10px">Delete</button></td>`).join('')}</tr>
      </tbody></table></div></div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><h2>How sure is this plan?</h2><p class="note">40 futures with random events (storms, downturns, federal cuts, heat waves) and each key assumption drawn ±15%.</p>
        <div class="row" style="margin:8px 0">${sel('mcM', mcMetric)}</div><div class="fig" id="mcFig"></div>
        <h3 style="margin-top:12px">Chance of meeting each goal</h3>${m.goalsMet.map(g => `<div class="hbar"><span>${esc(KP[g.k].name)}</span><span class="tr"><i style="width:${g.p * 100}%;background:${g.p >= 0.5 ? 'var(--good)' : 'var(--s1)'}"></i></span><span class="val">${pct(g.p * 100, 0)}</span></div>`).join('')}
        <div class="hbar"><span>State takeover (Control Board)</span><span class="tr"><i style="width:${m.fcbP * 100}%;background:var(--red)"></i></span><span class="val">${pct(m.fcbP * 100, 0)}</span></div>
        <div class="hbar"><span>Losing the 2029 election</span><span class="tr"><i style="width:${m.loseP * 100}%;background:var(--red)"></i></span><span class="val">${pct(m.loseP * 100, 0)}</span></div></div>
      <div class="card"><h2>Which assumptions matter?</h2><p class="note">Each model assumption moved 25% down and up; bars show the change in the indicator at the end of the plan. Long bars are where better data would pay off most.</p>
        <div class="row" style="margin:8px 0">${sel('seM', senMetric)}</div>
        ${sens.slice(0, 10).map(x => `<div class="hbar tor"><span>${esc(x.name)}</span><span style="position:relative;height:14px;background:var(--panel2);border-radius:3px"><i style="position:absolute;top:0;height:100%;left:${50 + Math.min(0, x.lo) / smax * 50}%;width:${Math.abs(x.lo) / smax * 50}%;background:${x.lo * (KP[senMetric].better || 1) >= 0 ? 'var(--good)' : 'var(--red)'}"></i><i style="position:absolute;top:0;height:100%;left:${50 + Math.min(0, x.hi) / smax * 50}%;width:${Math.abs(x.hi) / smax * 50}%;background:${x.hi * (KP[senMetric].better || 1) >= 0 ? 'var(--good)' : 'var(--red)'};opacity:.6"></i><i style="position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:var(--ink)"></i></span><span class="val">${esc(fmtD(senMetric, x.lo))} / ${esc(fmtD(senMetric, x.hi))}</span></div>`).join('')}
        <p class="note">Solid: assumption −25%. Faded: +25%. Green helps the goal, red hurts it.</p></div>
    </div>`;
  const ser = [{ name: 'Current plan', color: 'var(--ink)', pts: cur.map(h => [h.t, h[scMetric]]), w: 2.5 }].concat(res.map((r, i) => ({ name: r.sc.name, color: SC_COL[i], pts: r.h.map(h => [h.t, h[scMetric]]) })));
  lineChart($('#scFig'), [{ name: '', color: 'var(--ink2)', pts: series(scMetric), dot: false }].concat(ser), { yf: v => d.f(v), goal: d.goal ? d.goal(S) : null, rlab: true });
  const b = m.band[mcMetric], dm = KP[mcMetric];
  lineChart($('#mcFig'), [{ name: 'history', color: 'var(--ink)', pts: series(mcMetric), dot: false }, { name: 'median', color: 'var(--s1)', pts: b.map(x => [x.t, x.p50]), band: b.map(x => [x.t, x.p10, x.p90]) }], { yf: v => dm.f(v), goal: dm.goal ? dm.goal(S) : null });
  $('#scM').onchange = e => { scMetric = e.target.value; scenariosView(); };
  $('#mcM').onchange = e => { mcMetric = e.target.value; scenariosView(); };
  $('#seM').onchange = e => { senMetric = e.target.value; scenariosView(); };
  $('#scSave').onclick = () => { const nm = ($('#scName').value || '').trim().slice(0, 40) || `Scenario ${String.fromCharCode(65 + scs.length)}`; scs.push({ name: nm, pol: clone(S.pol), pending: clone(S.pending), plan: clone(S.plan), w: S.bor.map(b => b.w) }); save(); scenariosView(); };
  $$('#v-scenarios [data-del]').forEach(bt => bt.onclick = () => { scs.splice(+bt.dataset.del, 1); save(); scenariosView(); });
  $$('#v-scenarios [data-load]').forEach(bt => bt.onclick = () => { const sc = scs[+bt.dataset.load]; if (S.lost) { toast('You are out of office.'); return; } undoStack.push(JSON.stringify(S)); const fail = []; LAWS.forEach(l => { const want = sc.pol[l.id]; if (want === S.pol[l.id]) return; const o = l.opts.find(x => x.id === want); if (S.mode === 'real' && want !== l.opts[0].id && !(o.fx || {}).albany) { const v = councilVote(S, o); if (!v.pass) { fail.push(`${o.name} (${v.yes}–${v.no})`); return; } } S.pol[l.id] = want; }); S.pending = clone(sc.pending); S.plan = clone(sc.plan); sc.w.forEach((w, i) => S.bor[i].w = w); changed(); toast(`Loaded "${sc.name}" into your laws and plan.${fail.length ? ' The Council voted down: ' + fail.join(', ') + '.' : ''}`); scenariosView(); });
}
function fmtD(k, v) { const s = KP[k].f(Math.abs(v)).replace('+', ''); return (v >= 0 ? '+' : '−') + s; }

// ---------- budget ----------
function budgetView() {
  const B = S.b; const rp = Object.entries(B.revParts || { 'FY2027 adopted budget': 125.8 }), ep = Object.entries(B.expParts || { 'FY2027 adopted budget': 125.8 });
  $('#v-budget').innerHTML = `<h1>${B.deficit >= -0.05 ? 'The budget balances' : 'The plan runs a ' + bn(-B.deficit) + ' yearly deficit'}</h1>
    <p class="lead">State law requires a balanced operating budget. Agencies can absorb up to $4B/yr of shortfall through service cuts. Next come one-time reserves (Rainy Day Fund and the retiree health trust, $7.2B). After that, four deficit quarters in a row put the city under the Financial Control Board, as in 1975. Set tax rates on the Taxes tab. The top 1% of filers paid 48% of city income tax in 2021, so policies that push them out shrink revenue.</p>
    <div class="grid g3">
      <div class="card kpi"><span class="l">Revenue</span><span class="v num">${bn(B.rev)}</span><span class="d mu">per year, annualized</span></div>
      <div class="card kpi"><span class="l">Plan bonds issued</span><span class="v num">${bn(B.newDebt)}</span><span class="d mu">headroom left ≈ ${bn(B.headroom)} (assumption)</span></div>
      <div class="card kpi"><span class="l">Reserves left</span><span class="v num">${bn(B.reserves ?? 7.2)}</span><span class="d mu">rating ${esc(ratingName(S.fin.notch).replace(' (S&P scale)', ''))}, bonds at ${pct((S.fin.rate ?? S.A.bondRate) * 100, 2)}</span></div>
      <div class="card kpi"><span class="l">Top earners index</span><span class="v num">${S.ec.top.toFixed(0)}</span><span class="d mu">business climate ${S.ec.climate.toFixed(0)}</span></div>
    </div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><h2>Where the money comes from</h2>${hbars(rp, 'var(--s1)', v => bn(v))}</div>
      <div class="card"><h2>Where it goes</h2>${hbars(ep, 'var(--s2)', v => bn(v))}</div>
    </div>
    <div class="card" style="margin-top:14px"><h2>Operating balance, $B per year</h2><div class="fig" id="defFig"></div></div>`;
  lineChart($('#defFig'), [{ name: 'balance', color: 'var(--ink)', pts: series('deficit'), w: 2.5 }, { name: 'projection', color: 'var(--red)', pts: pseries('deficit'), dash: true }], { yf: v => bn(v), zeroLine: true });
}

// ---------- trends ----------
const TR_DEF = ['shortage', 'shelter', 'insec', 'margin', 'care', 'vote'];
let trSel = TR_DEF.slice();
function trendsView() {
  $('#v-trends').innerHTML = `<h1>Trends to plan from</h1>
    <p class="lead">Each chart shows the simulated history (solid), your plan's projection (dashed) and the goal. Below: the real historical series the model starts from.</p>
    <div class="grid g3">${trSel.map((k, i) => `<div class="card"><select aria-label="Metric" data-i="${i}">${KPIS.map(d => `<option value="${d.k}" ${d.k === k ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select><div class="fig sm" id="tr${i}"></div></div>`).join('')}</div>
    <h2 style="margin-top:26px">Real data behind the model</h2>
    <div class="grid g3">
      <div class="card"><h3>${esc(HIST.population.label)}</h3><div class="fig sm" id="hPop"></div><p class="note">${esc(HIST.population.src)}. The 1970s fiscal crisis cost the city 800,000 residents.</p></div>
      <div class="card"><h3>${esc(HIST.completions.label)}</h3>${hbars(HIST.completions.rows, 'var(--s1)', v => n0(v))}<p class="note">${esc(HIST.completions.src)}. Completions peaked after the 421-a tax break expired in 2022, but permits fell: the pipeline is thinning.</p></div>
      <div class="card"><h3>Energy: the grid is already tight</h3>${hbars([['Zone J peak (MW)', 11005], ['Projected 2030 shortfall (MW)', -99], ['Offshore wind planned into Zone J (MW)', 816]], 'var(--s4)', v => n0(v))}<p class="note">NYISO 2025–26. NYC uses ≈50,000 GWh a year.</p></div>
    </div>`;
  $$('#v-trends select').forEach(sel => sel.onchange = () => { trSel[+sel.dataset.i] = sel.value; trendsView(); });
  trSel.forEach((k, i) => { const d = KP[k]; lineChart($('#tr' + i), [{ name: d.name, color: 'var(--ink)', pts: series(k) }, { name: 'projection', color: 'var(--red)', pts: pseries(k), dash: true, dot: false }], { yf: v => d.f(v), goal: d.goal ? d.goal(S) : null }); });
  lineChart($('#hPop'), [{ name: 'population', color: 'var(--s1)', pts: HIST.population.pts }], { xf: x => String(x), yf: v => v.toFixed(1) + 'M' });
}

// ---------- learn ----------
// ---------- learn: an illustrated course ----------
const LILL = {
  ledger: `<svg viewBox="0 0 300 300"><rect class="pap sk" x="34" y="20" width="232" height="262" stroke-width="5"/><rect class="ink" x="34" y="20" width="232" height="34"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect class="ink" x="50" y="${74 + i * 26}" width="200" height="2"/>`).join('')}<rect class="ink" x="148" y="62" width="4" height="200"/>${[[64, 70, 'ink'], [64, 44, 'ink'], [64, 58, 'red']].map((b, i) => `<rect class="${b[2]}" x="${58 + i * 28}" y="${240 - b[1] - [0, 70, 114][i]}" width="22" height="${b[1]}"/>`).join('')}${[[58, 'ink'], [76, 'red'], [38, 'ink']].map((b, i) => `<rect class="${b[1]}" x="${168 + i * 28}" y="${240 - b[0] - [0, 58, 134][i]}" width="22" height="${b[0]}"/>`).join('')}</svg>`,
  fog: `<svg viewBox="0 0 300 300">${(() => { let r = 7, g = '', x = 8; const R = () => (r = r * 16807 % 2147483647) / 2147483647; while (x < 292) { const w = 16 + R() * 26, h = 50 + R() * 120; g += `<rect class="ink" x="${x}" y="${290 - h}" width="${w}" height="${h}"/>`; x += w + 4; } return g; })()}${Array.from({ length: 60 }, (_, i) => `<circle class="pap" cx="${(i * 47) % 290 + 6}" cy="${120 + (i * 31) % 150}" r="${6 + (i % 5) * 3}" opacity=".85"/>`).join('')}<circle class="pap sk" cx="92" cy="72" r="48" stroke-width="9"/><circle class="red" cx="92" cy="72" r="18"/><rect class="ink" x="128" y="98" width="70" height="16" transform="rotate(35 128 98)"/></svg>`,
  factory: `<svg viewBox="0 0 300 300"><polygon class="ink" points="20,280 20,150 80,190 80,150 140,190 140,150 200,190 200,280"/><rect class="ink" x="214" y="70" width="34" height="210"/><circle class="pap sk" cx="231" cy="48" r="16" stroke-width="5"/><circle class="pap sk" cx="252" cy="24" r="11" stroke-width="5"/>${[0, 1, 2].map(i => `<rect class="pap" x="${40 + i * 52}" y="222" width="26" height="26"/>`).join('')}<polygon class="red" points="146,282 196,240 286,240 286,282"/><text x="232" y="270" text-anchor="middle" style="font:800 15px var(--display);fill:var(--paper)">reserve</text><polyline class="skr" fill="none" stroke-width="9" points="20,120 60,120 60,96 100,96 100,72 140,72 140,48 180,48"/></svg>`,
  queue: `<svg viewBox="0 0 300 300"><rect class="ink" x="170" y="40" width="120" height="240"/><rect class="pap" x="186" y="64" width="88" height="96"/>${[0, 1, 2].map(i => `<rect class="ink" x="186" y="${90 + i * 26}" width="88" height="4"/>`).join('')}<rect class="red" x="196" y="78" width="16" height="12"/><rect class="red" x="186" y="176" width="88" height="22"/><text x="230" y="192" text-anchor="middle" style="font:800 14px var(--display);fill:var(--paper)">STORE</text>${[0, 1, 2, 3, 4].map(i => `<circle class="${i === 2 ? 'red' : 'ink'}" cx="${148 - i * 30}" cy="${178 + (i % 2) * 4}" r="11"/><rect class="${i === 2 ? 'red' : 'ink'}" x="${137 - i * 30}" y="${194 + (i % 2) * 4}" width="22" height="58"/><rect class="ink" x="${140 - i * 30}" y="${252 + (i % 2) * 4}" width="6" height="28"/><rect class="ink" x="${150 - i * 30}" y="${252 + (i % 2) * 4}" width="6" height="28"/>`).join('')}</svg>`,
  border: `<svg viewBox="0 0 300 300">${[30, 60, 90, 70, 110, 80, 50].map((h, i) => `<rect class="ink" x="${16 + i * 24}" y="${200 - h}" width="20" height="${h}"/>`).join('')}<rect class="ink" x="0" y="200" width="300" height="8"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect class="red" x="192" y="${12 + i * 36}" width="8" height="22"/>`).join('')}<rect class="ink" x="214" y="150" width="62" height="40"/><rect class="ink" x="276" y="164" width="18" height="26"/><circle class="red" cx="232" cy="194" r="9"/><circle class="red" cx="280" cy="194" r="9"/><polygon class="red" points="214,236 270,236 270,224 294,246 270,268 270,256 214,256"/><text x="96" y="252" text-anchor="middle" style="font:800 18px var(--display);fill:var(--ink)">Albany · D.C.</text></svg>`,
  tub: `<svg viewBox="0 0 300 300"><rect class="ink" x="196" y="18" width="70" height="20"/><rect class="ink" x="196" y="18" width="20" height="70"/><path class="pap sk" d="M24 120 H276 V210 Q276 262 224 262 H76 Q24 262 24 210 Z" stroke-width="7"/><path class="red" d="M28 168 H272 V210 Q272 258 224 258 H76 Q28 258 28 210 Z"/><rect class="ink" x="20" y="132" width="262" height="4"/><rect class="red" x="202" y="88" width="8" height="82"/><rect class="ink" x="60" y="262" width="12" height="26"/><rect class="ink" x="228" y="262" width="12" height="26"/></svg>`,
  crane: `<svg viewBox="0 0 300 300"><rect class="ink" x="70" y="40" width="16" height="250"/><rect class="ink" x="20" y="40" width="270" height="14"/><polygon class="ink" points="78,10 70,40 86,40"/><rect class="ink" x="246" y="54" width="3" height="90"/><rect class="red" x="226" y="144" width="44" height="30"/>${[0, 1, 2, 3].map(r => [0, 1, 2].map(c => `<rect class="${r === 0 && c === 2 ? 'red' : 'ink'}" x="${118 + c * 46}" y="${200 + r * 22}" width="40" height="18"/>`).join('')).join('')}<polygon class="red" points="0,290 300,290 300,300 0,300"/></svg>`,
};
const UNITS = [
  { id: 'u1', ill: 'ledger', title: 'The plan is a balance sheet', go: [['plan', 'Plan & balances'], ['economy', 'Economy']],
    body: `<p>From 1928 the Soviet planning office Gosplan drew up <b>material balances</b>: sheets in physical units, tonnes of steel, tractors, hours of labor. For every good, sources (production, imports, stocks) had to equal uses (factories, households, exports). The Plan page is such a sheet for New York.</p>
    <p>Every output is an input to something else. Wassily Leontief's input–output tables (Nobel 1973) and Leonid Kantorovich's linear programming (Nobel 1975) were invented to keep thousands of balances consistent at once. The solver on the Plan page does a small version: it tries thousands of combinations against the full model. When it cannot reach a goal, a law, not a budget line, is usually the real limit.</p>`,
    toy: 'balance' },
  { id: 'u2', ill: 'fog', title: 'What planners cannot see', go: [['scenarios', 'Scenarios'], ['economy', 'Data gap on Economy']],
    body: `<p>Ludwig von Mises (1920) argued that without market prices planners cannot know what things really cost. Friedrich Hayek (1945) added that the knowledge needed is scattered across millions of people and much of it is never written down. Oskar Lange (1936) replied that planners could find prices by trial and error, raising a price when queues form and cutting it when stock piles up.</p>
    <p>Planners also face the future. Storms, recessions and Washington break every plan, so modern bureaus run many simulated futures and report ranges, not single numbers. And demography moves slowly but surely: a child born today is a pupil in five years and a worker in eighteen; a doctor takes seven years to train.</p>`,
    toy: null },
  { id: 'u3', ill: 'factory', title: 'Inside the planned enterprise', go: [['laws', 'How firms are run (Laws)'], ['economy', 'Economy']],
    body: `<p>Planners only see what enterprises report. If a manager is judged on hitting an output target and next year's target is set from this year's result, it pays to hide spare capacity, to ask for more inputs than needed and to book work that is not finished. Joseph Berliner documented these habits in Soviet factories (1957); Martin Weitzman showed why this <b>ratchet</b> makes them rational (1980).</p>
    <p>János Kornai named the deeper cause the <b>soft budget constraint</b>: if the state always covers losses, nobody has to economise. Fast programmes also leak money, and city contracts are already slow: about 81% were registered late in fiscal 2024. When more projects start than there are workers to build them, projects stall half-finished, the investment cycle seen in every planned economy.</p>`,
    toy: 'ratchet' },
  { id: 'u4', ill: 'queue', title: 'Queues, waiting lists and black markets', go: [['services', 'Services'], ['economy', 'Queues on Economy']],
    body: `<p>When something is priced below what it costs to supply, it is rationed by waiting instead of by price. Kornai's <i>Economics of Shortage</i> (1980) showed how this becomes chronic. New York already lives with it: about 241,000 families wait for public housing that turns over at roughly 2% a year, and the 2024 housing lottery drew six million applications for 10,000 homes.</p>
    <p>In the USSR wages grew faster than goods, so households sat on savings they could not spend, a "monetary overhang". A city inside the dollar economy cannot trap money that way: people spend it in New Jersey, online or on the private market. What the city does get is <b>spillover</b>: rationed public goods push demand onto private ones, and an informal market grows where controls bite.</p>`,
    toy: 'queue' },
  { id: 'u5', ill: 'border', title: 'A city is not a country', go: [['taxes', 'Taxes'], ['politics', 'Politics']],
    body: `<p>New York cannot print money, control borders or set most taxes. People and firms can leave with a moving van. The city imports nearly all its food and much of its power, paid for with dollars earned by finance, tech and tourism. State law governs rents, income taxes and the subway; the Fifth Amendment requires compensation for seized property.</p>
    <p>Property tax is set by the Council; income, business and sales taxes need Albany. The top 10% of filers earn about 63% of all income, so they carry most of the income tax. Every law needs 26 Council votes, union contracts compound for decades, and bond buyers watch reserves. Realistic mode keeps all of this in force; Sandbox lifts it so you can see the pure planning problem.</p>`,
    toy: null },
  { id: 'u6', ill: 'tub', title: 'Planning against a carbon budget', go: [['climate', 'Climate'], ['plan', 'Climate investment (Plan)']],
    body: `<p>The climate is a planning problem with a hard limit. Scientists estimate how much more CO₂ the world can emit for an even chance of holding warming to 1.5 °C: about 130 billion tonnes from the start of 2026, roughly three years of today's emissions. Pathways that respect that budget cut global emissions about 43% below 2019 by 2030 and 60% by 2035.</p>
    <p>New York emits about 49 million tonnes a year: roughly two-thirds from heating, cooling and powering buildings, most of the rest from traffic, a little from waste. Its own Local Law 97 asks for 40% below 2005 by 2030. Retrofits, heat pumps, wind and solar, electric buses and better transit bring emissions down; more people, more jobs, more floor space and crowded trains push them up. Building homes costs carbon too: concrete and steel carry "embodied" emissions before anyone moves in.</p>`,
    toy: 'tub' },
];
const TIMELINE = [
  [1920, 'idea', 'Mises: no prices, no calculation', 'Argues that a socialist economy cannot compare costs rationally.'],
  [1921, 'plan', 'Gosplan founded', 'The Soviet State Planning Committee begins work.'],
  [1923, 'city', 'Red Vienna builds', 'By 1934 the city has built about 64,000 municipal flats, paid for by a housing tax.'],
  [1928, 'plan', 'First Five-Year Plan', 'Material balances in physical units steer Soviet industry.'],
  [1936, 'idea', 'Lange replies', 'Planners can find prices by trial and error.'],
  [1941, 'idea', 'Leontief\'s input–output tables', 'Every industry\'s inputs and outputs in one table.'],
  [1945, 'idea', 'Hayek on dispersed knowledge', 'The knowledge a plan needs is spread across millions of people.'],
  [1957, 'idea', 'Berliner\'s factory managers', 'Interviews show managers hiding capacity and hoarding inputs.'],
  [1965, 'plan', 'Kosygin reform', 'Soviet firms are judged partly on sales and profit, not only output.'],
  [1971, 'plan', 'Project Cybersyn', 'Chile links factories by telex to a control room; ended by the 1973 coup.'],
  [1980, 'idea', 'Kornai and Weitzman', 'Economics of Shortage; the ratchet principle.'],
  [1989, 'city', 'Porto Alegre budget', 'Residents vote on part of the city\'s investment budget.'],
  [1991, 'plan', 'The Soviet Union dissolves', 'Central planning ends across most of Eastern Europe.'],
  [1996, 'city', 'Kerala People\'s Plan', '35–40% of the state\'s plan budget goes to local councils.'],
  [2015, 'climate', 'Paris Agreement', 'Nations agree to aim for 1.5 °C.'],
  [2019, 'climate', 'NYC Local Law 97', 'Emission caps for large buildings, tightening in 2030.'],
  [2021, 'city', 'Berlin rent cap voided', 'The Constitutional Court rules that rent law is federal.'],
  [2026, 'city', 'NYC rent freeze', 'The Rent Guidelines Board freezes stabilized rents.'],
];
const MYTHS = [
  { m: 'Planned economies never grew.', e: 'The Soviet economy grew fast from 1928 into the 1960s, mainly by moving farm workers into industry and investing heavily, then slowed sharply from the 1970s (Allen 2003). Planning was good at mobilizing resources and bad at using them efficiently.' },
  { m: 'Rent control is free.', e: 'San Francisco\'s 1994 expansion of rent control kept tenants in their homes, but landlords converted or sold about 15% of covered rental housing, which pushed up rents elsewhere in the city (Diamond, McQuade & Qian 2019).' },
  { m: 'Today\'s computers would solve the calculation problem.', e: 'Cockshott and Cottrell (1993) argue that the sums are now easy. Critics answer that Hayek\'s problem was never arithmetic: a computer still depends on honest reports, and the ratchet gives managers reasons not to report honestly.' },
  { m: 'Public housing always fails.', e: 'Vienna\'s city landlord manages around 220,000 flats that are well kept and mixed-income, which holds down rents across the whole market. Design, funding and who is allowed to live there matter more than ownership alone.' },
  { m: 'If you tax the rich, they all leave.', e: 'Studies of New Jersey\'s millionaire tax found little migration (Young & Varner 2011). Newer work on California finds a larger response among top earners, through moving and reporting less income (Rauh & Shyu 2024). Some leave; most do not.' },
  { m: 'More police is the only thing that cuts crime.', e: 'More officers do cut violent crime: about 3% for every 10% more police (Chalfin & McCrary 2018). But summer jobs, violence interrupters and stable housing also prevent violence, without the extra low-level arrests that more policing brings (Heller 2014; Chalfin et al. 2022).' },
  { m: 'Electric heat cuts emissions automatically.', e: 'A heat pump uses far less energy than a gas boiler, but its emissions depend on the grid. While New York still burns gas for power, part of the saving is lost. Clean power and electrification have to move together.' },
];
const QUIZ = [
  { q: 'Who argued that the knowledge a plan needs is scattered across millions of people?', a: ['Oskar Lange', 'Friedrich Hayek', 'Wassily Leontief'], c: 1, x: 'Hayek, "The use of knowledge in society" (1945). Lange argued planners could find prices by trial and error.' },
  { q: 'Next year\'s target is set from this year\'s output. What does a sensible manager do?', a: ['Produces as much as possible', 'Hits the target with a little to spare and hides the rest', 'Asks for fewer inputs'], c: 1, x: 'That is Weitzman\'s ratchet: overshooting today only raises tomorrow\'s target.' },
  { q: 'A city sells bread at half of what it costs and does not ration it. What happens?', a: ['Bread gets cheaper everywhere', 'Queues form and a second market appears', 'Bakeries produce more'], c: 1, x: 'Demand rises and private supply falls, so goods are rationed by waiting, and some resell at higher prices.' },
  { q: 'Which tax can the New York City Council set without Albany?', a: ['The property tax', 'The personal income tax', 'The sales tax'], c: 0, x: 'Income, business and sales tax rates are set by State law.' },
  { q: 'Roughly what share of New York City\'s emissions comes from buildings?', a: ['About a quarter', 'About half', 'About two-thirds'], c: 2, x: 'Heating, cooling and powering buildings is about two-thirds of the city inventory; transport is most of the rest.' },
  { q: '1.5 °C pathways cut global emissions by about how much below 2019 by 2030?', a: ['10%', '43%', '90%'], c: 1, x: 'IPCC AR6: about 43% by 2030 and 60% by 2035.' },
];
function toyHTML(k) {
  if (k === 'balance') return `<div class="toy" id="toyBal"><h4>Try it: balance the homes plan</h4>
    <div class="toyc"><label>Homes to build this year <b id="tbH"></b><input type="range" id="tbHomes" min="4000" max="40000" step="1000" value="20000"></label>
    <label>Apprentices trained last year <b id="tbA"></b><input type="range" id="tbApp" min="0" max="20000" step="500" value="4000"></label>
    <label>Capital budget for homes <b id="tbB"></b><input type="range" id="tbBud" min="2" max="25" step="0.5" value="10"></label></div>
    <div id="tbOut"></div><p class="note">Coefficients from the game: 1.6 worker-years and $650,000 per public home; 22,000 construction workers free for public work; 60% of apprentices are useful in their first year.</p></div>`;
  if (k === 'ratchet') return `<div class="toy" id="toyRat"><h4>Try it: you run a cement works</h4><p>Your plant can make <b>100</b> units a year. This year's target is 80. Each year the target becomes 5% more than what you produced. Meet it: bonus 10, plus 1 per unit over. Miss it: penalty 10.</p>
    <div class="toyc rat">${[0, 1, 2, 3, 4].map(i => `<label>Year ${i + 1}<input type="range" data-y="${i}" min="60" max="100" step="1" value="100"><b></b></label>`).join('')}</div>
    <div class="row"><button class="btn" data-rs="all">Work flat out</button><button class="btn" data-rs="hide">Just meet each target</button></div><div id="trOut"></div></div>`;
  if (k === 'queue') return `<div class="toy" id="toyQ"><h4>Try it: set the price of a basket of food</h4>
    <div class="toyc"><label>Price, as a share of what it costs to supply <b id="tqP"></b><input type="range" id="tqPrice" min="40" max="130" step="5" value="60"></label>
    <label class="chk"><input type="checkbox" id="tqPub"> City stores fill the gap at the low price</label></div><div id="tqOut"></div><p class="note">Stylised: demand falls 0.6% and private supply rises 1% for each 1% rise in price.</p></div>`;
  if (k === 'tub') return `<div class="toy" id="toyT"><h4>Try it: how fast must emissions fall?</h4>
    <div class="toyc"><label>Cut emissions each year by <b id="ttR"></b><input type="range" id="ttRate" min="0" max="25" step="1" value="5"></label>
    <p class="note" style="margin:0">Budget: New York's equal share per person of what the world has left, about 87 Mt at the start of 2027.</p></div>
    <div class="fig" id="ttFig" style="height:240px"></div><div id="ttOut"></div><p class="note">Assumes 49 Mt in 2027. A global budget of about 130 Gt from the start of 2026 (Forster et al. 2026); the city used about 49 Mt of an equal share in 2026.</p></div>`;
  return '';
}

// ---------- guide: how the game works, as a reference page ----------
const GUIDE_PAGES = {
  decide: 'Every choice for this quarter in one place, with what you changed and what needs attention.',
  overview: 'The ten targets for 2031: where you started, where you are, and where you are heading.',
  laws: 'Change the rules: rent, land, energy, food, safety and more. Some need the Council, some need Albany.',
  taxes: 'Draft a tax package and see who pays. Property tax is local; most other taxes need Albany.',
  plan: 'Invest and train, and check that homes, builders, power and money add up. Red rows are shortfalls.',
  economy: 'What happens inside the plan: queues, hoarding, black markets and protest.',
  map: 'The 59 community districts. Compare neighbourhoods and set where new public homes go first.',
  labor: 'Workers by sector, training pipelines, migration and an ageing population.',
  services: 'Water, waste, subway, roads, schools and hospitals: the systems that must keep working.',
  justice: 'Crime, jails, overdoses and evictions, with the evidence behind each lever.',
  climate: 'Emissions against the 1.5 °C path, heat, floods and sea level rise.',
  politics: 'Council blocs, Albany, unions and lenders, and the tools to shape the Council.',
  budget: 'Where the money comes from and where it goes. Four deficit quarters hand the budget to the State.',
  scenarios: 'Save versions of your plan and compare them across 40 possible futures.',
  viz: 'Build your own chart from any indicators.',
  trends: 'Your simulated history next to real historical data.',
  learn: 'Six short lessons on how planning works and where it breaks.',
  sources: 'Every figure and where it comes from, with checks on the model itself.',
};
function guideSteps() {
  const lawCh = LAWS.some(l => S.pol[l.id] !== l.opts[0].id) || Object.keys(S.pending || {}).length > 0, gv = S.gv || {};
  return [
    { done: gv.decide != null, h: 'Open Decisions', p: 'See every choice for this quarter and what needs attention first.', go: 'decide', b: 'Open Decisions' },
    { done: lawCh, h: 'Change one law', p: 'Pick a new option on the Laws page. Watch the Council count on the card before you click.', go: 'laws', b: 'Open Laws' },
    { done: (S.plan.cap.build || 0) > 0, h: 'Invest in new homes', p: 'On Plan & balances, give "Public housing construction" money, then check whether there are enough builders.', go: 'plan', b: 'Open Plan & balances' },
    { done: S.t >= 1, h: 'Run the first quarter', p: 'Press Run quarter in the top bar. Three months pass and a report explains what happened.', run: true, b: 'Run quarter' },
    { done: S.t >= 1 && (gv.overview ?? -1) >= 1, h: 'Check the control figures', p: 'See how far each target moved, and what the dashed lines now project for 2031.', go: 'overview', b: 'Open Control figures' },
  ];
}
function guideView() {
  const st = guideSteps(), nDone = st.filter(x => x.done).length;
  const node = (go, t, d) => `<button class="gnode" data-go="${go}"><b>${esc(t)}</b><span>${esc(d)}</span></button>`;
  const col = (h, items, cls = '') => `<div class="gcol ${cls}"><h4>${esc(h)}</h4>${items.join('')}</div>`;
  $('#v-guide').innerHTML = `<div class="course guide">
  <header class="chero"><div class="chero-t"><h1 class="ph">How the game works</h1><p class="lead">A reference for while you play: what one quarter looks like, what each page is for, and how your choices travel through the city and come back to you.</p>
    <div class="row"><button class="btn" id="gIntro">Replay the short intro</button><a class="btn" href="#g-first">First game in five moves</a></div></div>
    <div class="ill chero-i">${ILL.quarter}</div></header>

  <section class="gsec" id="g-loop"><h2>One quarter, step by step</h2>
    <p class="note">The game runs from January 2027 to December 2031: 20 quarters of three months each.</p>
    <ol class="gloop">
      <li><b>Decide</b><span>Change laws, taxes, investment and training. Nothing happens yet; you can undo.</span><button class="btn" data-go="decide">Decisions</button></li>
      <li><b>Run the quarter</b><span>Press Run quarter. Votes are counted, money is spent, and three months pass, with storms or recessions possible.</span></li>
      <li><b>Read the report</b><span>A report lists what passed, what failed and what changed. Events explain the surprises.</span></li>
      <li><b>Adjust</b><span>Check the control figures and the red rows on Plan & balances, then decide again.</span><button class="btn" data-go="overview">Control figures</button></li>
    </ol>
    <p class="gback" aria-hidden="true">↺ and again, 20 times</p>
  </section>

  <section class="gsec" id="g-pages"><h2>Every page in one sentence</h2>
    <div class="gpages">${TAB_GROUPS.map(([g, ids]) => `<div><h4>${esc(g)}</h4>${ids.filter(id => GUIDE_PAGES[id]).map(id => `<button class="gpage" data-go="${id}"><b>${esc(TABS.find(x => x[0] === id)[1])}</b><span>${esc(GUIDE_PAGES[id])}</span></button>`).join('')}</div>`).join('')}</div>
  </section>

  <section class="gsec" id="g-model"><h2>How the model connects</h2>
    <p class="note">Follow the arrows. Every box opens the page where you see or change it. The loop back is what makes it hard: results change public support, and support decides what you can do next.</p>
    <div class="gflow">
      ${col('1 · You choose', [node('laws', 'Laws', 'the rules'), node('taxes', 'Taxes', 'who pays'), node('plan', 'Investment and training', 'what gets built, who learns what')], 'gin')}
      <div class="garr" aria-hidden="true"></div>
      ${col('2 · Resources must add up', [node('budget', 'Money', 'budget, reserves, borrowing'), node('labor', 'Workers', 'builders, nurses, teachers'), node('plan', 'Land, power, materials', 'sites, grid, agency capacity')])}
      <div class="garr" aria-hidden="true"></div>
      ${col('3 · Results', [node('overview', 'Ten targets for 2031', 'homes, shelters, hunger, power, emissions, jobs, health, child care, support, budget'), node('map', 'Who gains, where', '59 districts, income groups')])}
      <div class="garr" aria-hidden="true"></div>
      ${col('4 · Reaction', [node('overview', 'Public support', 'rises with results, falls with costs and shortages'), node('labor', 'People and firms move', 'top earners, commuters, landlords')])}
      <div class="garr" aria-hidden="true"></div>
      ${col('5 · Who can stop you', [node('politics', 'Council', '26 of 51 votes'), node('politics', 'Albany', 'state law and most taxes'), node('budget', 'Lenders', 'rating and interest'), node('politics', 'Voters', 'November 2029')], 'gout')}
    </div>
    <div class="gloopback"><span>Support and these gatekeepers decide which choices are open to you next quarter</span></div>
    <p class="note" style="margin-top:20px">From outside: storms, heat, recessions and Wall Street swings hit step 3 at random (<button class="lnk" data-go="climate">Climate</button>, <button class="lnk" data-go="economy">Economy</button>). Delays: a home takes about two years from start to keys, a trained nurse even longer, so today's choices show up in 2029.</p>
  </section>

  <section class="gsec" id="g-first"><h2>First game in five moves</h2>
    <p class="note">These tick themselves off as you play. ${nDone} of ${st.length} done.</p>
    <ol class="gfirst">${st.map((x, i) => `<li class="${x.done ? 'done' : ''}"><span class="gchk" aria-hidden="true">${x.done ? '✓' : i + 1}</span><div><b>${esc(x.h)}</b>${x.done ? ' <span class="note">done</span>' : ''}<p>${esc(x.p)}</p></div>${x.done ? '' : x.run ? `<button class="btn go" id="gRun">${esc(x.b)}</button>` : `<button class="btn" data-go="${x.go}">${esc(x.b)}</button>`}</li>`).join('')}</ol>
    ${nDone === st.length ? '<p><b>That is the whole loop.</b> From here on, the Decisions page tells you what needs attention each quarter.</p>' : ''}
  </section></div>`;
  const v = $('#v-guide');
  $$('[data-go]', v).forEach(x => x.onclick = () => { tab = x.dataset.go; render(); window.scrollTo({ top: 0 }); try { history.replaceState(null, '', '#' + tab); } catch (e) { } });
  $('#gIntro').onclick = () => openIntro(0);
  const r = $('#gRun'); if (r) r.onclick = () => { const n = $('#next'); if (n) n.click(); };
  const a = v.querySelector('a[href="#g-first"]'); if (a) a.onclick = e => { e.preventDefault(); $('#g-first').scrollIntoView({ behavior: 'smooth' }); };
}
function learnView() {
  $('#v-learn').innerHTML = `<div class="course">
  <header class="chero"><div class="chero-t"><h1 class="ph">Planning, in six lessons</h1><p class="lead">How a planned economy is supposed to work, where it breaks, and what that means for one real city. Each lesson ends with something to try and a page in the game to test it on.</p>
    <div class="row"><button class="btn go" id="whyLearn">Why this project exists</button><button class="btn" id="replayIntro">Replay the intro: how the game works</button><a class="btn" href="#quiz">Take the quiz</a></div></div>
    <div class="ill chero-i">${LILL.crane}</div></header>
  <aside class="teach inl" aria-label="For teachers"><div><b class="teach-h">Teaching with Plan Bureau?</b><p>Want to use these lessons and the simulation in your class? Get in touch. We are happy to help.</p></div><button class="btn teach-b" id="teachLearn">Contact us</button></aside>
  <nav class="cmapn" aria-label="Lessons">${UNITS.map((u, i) => `<a href="#${u.id}"><span class="ill">${LILL[u.ill]}</span><b>${['I', 'II', 'III', 'IV', 'V', 'VI'][i]}</b><span>${esc(u.title)}</span></a>`).join('')}<a href="#tline"><span class="ill">${ILL.look}</span><b>+</b><span>Timeline, myths, quiz</span></a></nav>
  ${UNITS.map((u, i) => `<article class="unit" id="${u.id}"><div class="unit-side"><b class="unum">${['I', 'II', 'III', 'IV', 'V', 'VI'][i]}</b><div class="ill">${LILL[u.ill]}</div></div>
    <div class="unit-main"><h2>${esc(u.title)}</h2>${u.body}<p class="ingame"><span>In the game:</span> ${u.go.map(g => `<button class="btn" data-go="${g[0]}">${esc(g[1])}</button>`).join(' ')}</p>${u.toy ? toyHTML(u.toy) : ''}</div></article>`).join('')}
  <section class="tline" id="tline"><h2>A century of planning</h2><p class="note">Scroll sideways. Red: plans in practice · black: ideas · outlined: cities · green: climate.</p>
    <div class="tl" tabindex="0">${TIMELINE.map(t => `<div class="tle k-${t[1]}"><b class="tly">${t[0]}</b><i></i><h4>${esc(t[2])}</h4><p>${esc(t[3])}</p></div>`).join('')}</div></section>
  <section class="myths"><h2>Common claims, checked</h2><p class="note">Click a card to see what the evidence says.</p><div class="mygrid">${MYTHS.map((m, i) => `<button class="myth" data-m="${i}" aria-expanded="false"><span class="mq">“${esc(m.m)}”</span><span class="ma">${esc(m.e)}</span></button>`).join('')}</div></section>
  <section class="quiz" id="quiz"><h2>Quiz</h2><div id="qz"></div></section>
  <section class="reads"><h2>Further reading</h2><ul class="refs">${REFS.slice().sort((a, b) => a.y - b.y).map(r => `<li>${r.a} (${r.y}). <i>${esc(r.t)}</i>${r.p ? '. ' + esc(r.p) : ''}.</li>`).join('')}</ul>
  <h3>What New York is already doing in 2026</h3><p>The Rent Guidelines Board froze stabilized rents in June 2026. The city plans five city-owned grocery stores, the first at La Marqueta. A $1.2B State–City child-care partnership started. These are the starting moves; the game asks how far the same logic can be pushed, and what it costs.</p>
  <p class="note">The model is a teaching simplification: real starting data, transparent assumptions, no claim to forecast. Debate the coefficients; that is the point.</p></section></div>`;
}
function learnBind() {
  const b = $('#replayIntro'); if (!b) return; b.onclick = () => openIntro(0); $('#whyLearn').onclick = openPrologue; const tl = $('#teachLearn'); if (tl) tl.onclick = openTeach;
  const v = $('#v-learn');
  v.querySelectorAll('[data-go]').forEach(x => x.onclick = () => { tab = x.dataset.go; render(); window.scrollTo({ top: 0 }); try { history.replaceState(null, '', '#' + tab); } catch (e) { } });
  v.querySelectorAll('a[href^="#"]').forEach(a => a.onclick = e => { const el = document.getElementById(a.getAttribute('href').slice(1)); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); } });
  v.querySelectorAll('.myth').forEach(m => m.onclick = () => { const o = m.classList.toggle('open'); m.setAttribute('aria-expanded', o); });
  const bar = (lab, need, have, f) => { const mx = Math.max(need, have) || 1, gap = have - need; return `<div class="balrow"><span>${lab}</span><div class="balb"><i class="need" style="width:${need / mx * 100}%"></i><i class="have" style="width:${have / mx * 100}%"></i></div><span class="r">${f(have)} of ${f(need)}${gap < 0 ? ` <b class="neg">short ${f(-gap)}</b>` : ' <b class="pos">✓</b>'}</span></div>`; };
  // material balance
  if ($('#toyBal')) { const up = () => { const H = +$('#tbHomes').value, A = +$('#tbApp').value, B = +$('#tbBud').value; $('#tbH').textContent = n0(H); $('#tbA').textContent = n0(A); $('#tbB').textContent = '$' + B + 'B';
      const wNeed = H * 1.6, wHave = 22000 + A * 0.6, bNeed = H * 0.65 / 1000; const can = Math.floor(Math.min(H, wHave / 1.6, B * 1000 / 0.65));
      $('#tbOut').innerHTML = `<div class="bal"><div class="balh"><span></span><span class="balk"><i class="need"></i>needed <i class="have"></i>available</span></div>${bar('Construction workers', wNeed, wHave, n0)}${bar('Money ($B)', bNeed, B, v => v.toFixed(1))}</div><p class="tres">${can >= H ? `Balanced: all ${n0(H)} homes can start.` : `Only <b>${n0(can)}</b> of ${n0(H)} homes can start. ${wHave / 1.6 < B * 1000 / 0.65 ? 'Workers are the binding limit: train more a year ahead, or the money sits unspent.' : 'Money is the binding limit: crews will stand idle.'}`}</p>`; };
    ['#tbHomes', '#tbApp', '#tbBud'].forEach(s => $(s).oninput = up); up(); }
  // ratchet
  if ($('#toyRat')) { const sl = [...v.querySelectorAll('#toyRat input')]; const up = () => { let tgt = 80, tot = 0, rows = '';
      sl.forEach((s, i) => { const o = +s.value; s.nextElementSibling.textContent = o; const met = o >= tgt - 1e-9; const bon = met ? 10 + (o - tgt) : -10; tot += bon; rows += `<tr><td>Year ${i + 1}</td><td class="r">${tgt.toFixed(0)}</td><td class="r">${o}</td><td class="r">${100 - o}</td><td class="r ${bon < 0 ? 'neg' : ''}">${bon > 0 ? '+' : ''}${bon.toFixed(0)}</td></tr>`; tgt = o * 1.05; });
      $('#trOut').innerHTML = `<table class="rt"><thead><tr><th>Year</th><th class="r">Target</th><th class="r">Made</th><th class="r">Hidden reserve</th><th class="r">Bonus</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="4">Total bonus</td><td class="r"><b>${tot.toFixed(0)}</b></td></tr></tfoot></table><p class="tres">${tot >= 45 ? 'You learned the ratchet: by never showing your full capacity you keep the targets reachable. The planner never finds out the plant can make 100.' : 'Working flat out raised the target above what the plant can make, and the penalties followed. Try just meeting each target.'}</p>`; };
    sl.forEach(s => s.oninput = up); v.querySelectorAll('[data-rs]').forEach(bt => bt.onclick = () => { let t = 80; sl.forEach(s => { s.value = bt.dataset.rs === 'all' ? 100 : Math.min(100, Math.ceil(t)); t = +s.value * 1.05; }); up(); }); up(); }
  // queue
  if ($('#toyQ')) { const up = () => { const p = +$('#tqPrice').value / 100, pub = $('#tqPub').checked; $('#tqP').textContent = Math.round(p * 100) + '%';
      const D = 100 * (1.6 - 0.6 * p), Sp = 100 * Math.min(1.3, p), gap = Math.max(0, D - Sp); const black = gap > 0 && !pub ? (1.6 - Sp / 100) / 0.6 : null; const subsidy = pub ? gap * (1 - p) : 0;
      $('#tqOut').innerHTML = `<div class="bal"><div class="balh"><span></span><span class="balk"><i class="need"></i>wanted <i class="have"></i>supplied</span></div>${bar('Baskets', D, pub ? Sp + gap : Sp, n0)}</div><p class="tres">${gap <= 0 ? (p > 1.01 ? 'Above cost: shelves are full, but fewer people can afford the basket.' : 'At cost: supply meets demand, no queue.') : pub ? `No queue, but the city pays <b>${subsidy.toFixed(0)}</b> cost-units a week to cover the gap, money that cannot go to homes or schools.` : `<b>${Math.round(gap / D * 100)}%</b> of buyers leave empty-handed or queue. On the second market the basket sells for about <b>${Math.round(black * 100)}%</b> of cost.`}</p>`; };
    $('#tqPrice').oninput = up; $('#tqPub').onchange = up; up(); }
  // carbon bathtub
  if ($('#toyT')) { const up = () => { const r = +$('#ttRate').value / 100, B = 87; $('#ttR').textContent = Math.round(r * 100) + '%';
      let e = 49, cum = 0, out = null; const pts = [], bud = [], path = []; for (let y = 2027; y <= 2050; y++) { pts.push([y, cum]); bud.push([y, B]); cum += e; if (out === null && cum > B) out = y + (B - (cum - e)) / e; e *= 1 - r; }
      const total = r > 0 ? 49 / r : Infinity; const needed = 49 / B;
      lineChart($('#ttFig'), [{ name: 'emitted', color: 'var(--red)', pts, dot: false, w: 3 }, { name: 'budget', color: 'var(--ink)', pts: bud, dot: false, dash: true }], { xf: x => String(x), yf: v => v.toFixed(0) + ' Mt', zero: true, rlab: true });
      $('#ttOut').innerHTML = `<p class="tres">${out ? `The budget is used up in <b>${Math.floor(out)}</b>${out < 2028 ? ', within the first plan year' : ''}.` : 'The budget lasts.'} Even a cut of ${Math.round(r * 100)}% a year adds up to ${isFinite(total) ? '≈' + Math.round(total) + ' Mt' : 'no end'} in total. Staying inside this share would need cuts of about <b>${needed >= 1 ? 'more than 100%' : Math.round(needed * 100) + '%'}</b> a year from 2027. So the game measures you against the 1.5 °C <i>pathway</i> instead (−43% by 2030, −60% by 2035), the yardstick most cities use. Pathways that still reach 1.5 °C with so little budget left assume a temporary overshoot and CO₂ removed from the air later.</p>`; };
    $('#ttRate').oninput = up; up(); }
  // quiz
  const qz = $('#qz'); if (qz) { let i = 0, score = 0; const show = () => { if (i >= QUIZ.length) { qz.innerHTML = `<p class="qres"><b>${score} of ${QUIZ.length}</b> right. ${score === QUIZ.length ? 'Ready for the Planning Commission.' : 'The lessons above cover every answer.'}</p><button class="btn" id="qzA">Start again</button>`; $('#qzA').onclick = () => { i = 0; score = 0; show(); }; return; }
      const q = QUIZ[i]; qz.innerHTML = `<p class="qn">Question ${i + 1} of ${QUIZ.length}</p><p class="qq">${esc(q.q)}</p><div class="qa">${q.a.map((a, j) => `<button class="btn" data-a="${j}">${esc(a)}</button>`).join('')}</div><div id="qzF"></div>`;
      qz.querySelectorAll('[data-a]').forEach(bt => bt.onclick = () => { const j = +bt.dataset.a, ok = j === q.c; if (ok) score++; qz.querySelectorAll('[data-a]').forEach(x => { x.disabled = true; if (+x.dataset.a === q.c) x.classList.add('right'); else if (x === bt) x.classList.add('wrong'); });
        $('#qzF').innerHTML = `<p class="qx"><b>${ok ? 'Right.' : 'Not quite.'}</b> ${esc(q.x)}</p><button class="btn go" id="qzN">${i + 1 < QUIZ.length ? 'Next question' : 'See your score'}</button>`; $('#qzN').onclick = () => { i++; show(); }; }); };
    show(); }
}

const REFS = [
  { a: 'Hayek, F. A.', y: 1945, t: 'The use of knowledge in society', p: 'American Economic Review 35(4)' },
  { a: 'Lange, O.', y: 1936, t: 'On the economic theory of socialism', p: 'Review of Economic Studies 4(1)' },
  { a: 'Leontief, W.', y: 1941, t: 'The Structure of American Economy, 1919–1929', p: 'Harvard University Press' },
  { a: 'Kantorovich, L.', y: 1939, t: 'Mathematical Methods of Organizing and Planning Production', p: 'Leningrad University' },
  { a: 'Berliner, J.', y: 1957, t: 'Factory and Manager in the USSR', p: 'Harvard University Press' },
  { a: 'Ward, B.', y: 1958, t: 'The firm in Illyria: market syndicalism', p: 'American Economic Review 48(4)' },
  { a: 'Kornai, J.', y: 1980, t: 'Economics of Shortage', p: 'North-Holland' },
  { a: 'Weitzman, M.', y: 1980, t: 'The "ratchet principle" and performance incentives', p: 'Bell Journal of Economics 11(1)' },
  { a: 'Nove, A.', y: 1983, t: 'The Economics of Feasible Socialism', p: 'Allen & Unwin' },
  { a: 'Estrin, S.', y: 1983, t: 'Self-Management: Economic Theory and Yugoslav Practice', p: 'Cambridge University Press' },
  { a: 'Devine, P.', y: 1988, t: 'Democracy and Economic Planning', p: 'Polity' },
  { a: 'Cockshott, W. P. & Cottrell, A.', y: 1993, t: 'Towards a New Socialism', p: 'Spokesman' },
  { a: 'Kornai, J., Maskin, E. & Roland, G.', y: 2003, t: 'Understanding the soft budget constraint', p: 'Journal of Economic Literature 41(4)' },
  { a: 'Medina, E.', y: 2011, t: 'Cybernetic Revolutionaries: Technology and Politics in Allende\'s Chile', p: 'MIT Press' },
  { a: 'Mises, L. von', y: 1920, t: 'Economic calculation in the socialist commonwealth', p: 'English translation in Hayek (ed.), Collectivist Economic Planning, 1935' },
  { a: 'Allen, R. C.', y: 2003, t: 'Farm to Factory: A Reinterpretation of the Soviet Industrial Revolution', p: 'Princeton University Press' },
  { a: 'Young, C. & Varner, C.', y: 2011, t: 'Millionaire migration and state taxation of top incomes', p: 'National Tax Journal 64(2)' },
  { a: 'Diamond, R., McQuade, T. & Qian, F.', y: 2019, t: 'The effects of rent control expansion on tenants, landlords, and inequality', p: 'American Economic Review 109(9)' },
  { a: 'IPCC', y: 2023, t: 'AR6 Synthesis Report: Climate Change 2023', p: 'Summary for Policymakers' },
  { a: 'Rauh, J. & Shyu, R.', y: 2024, t: 'Behavioral responses to state income taxation of high earners: evidence from California', p: 'American Economic Journal: Economic Policy 16(1)' },
  { a: 'Forster, P. M. et al.', y: 2026, t: 'Indicators of Global Climate Change 2025', p: 'Earth System Science Data 18, 3889' },
  { a: 'Chalfin, A. & McCrary, J.', y: 2018, t: 'Are U.S. cities underpoliced? Theory and evidence', p: 'Review of Economics and Statistics 100(1)' },
  { a: 'Chalfin, A., Hansen, B., Weisburst, E. & Williams, M.', y: 2022, t: 'Police force size and civilian race', p: 'American Economic Review: Insights 4(2)' },
  { a: 'Heller, S. B.', y: 2014, t: 'Summer jobs reduce violence among disadvantaged youth', p: 'Science 346(6214)' },
  { a: 'Gelber, A., Isen, A. & Kessler, J. B.', y: 2016, t: 'The effects of youth employment: evidence from New York City lotteries', p: 'Quarterly Journal of Economics 131(1)' },
  { a: 'Ellman, M.', y: 2014, t: 'Socialist Planning', p: '3rd ed., Cambridge University Press' },
];
function confirmReset() { return true; }
// ---------- sources ----------
function sourcesView() {
  const MAN = (typeof MANUAL_DATA !== 'undefined' && MANUAL_DATA) || {}; const today = new Date();
  const overdue = k => { const m = MAN[k]; if (!m || !m.reviewMonths) return false; const d = new Date(m.verified); d.setMonth(d.getMonth() + m.reviewMonths); return d < today; };
  const lv = Object.entries(LIVE.values || {});
  $('#v-sources').innerHTML = `<h1>Sources and assumptions</h1><p class="lead">Starting figures come from public sources. Some refresh automatically every month; the rest are checked by hand on a schedule and flagged here when a check is due. Model coefficients without an official source are listed as assumptions.</p>
  <div class="card" style="margin-bottom:14px"><div class="row sp"><h2 style="margin:0">Live data</h2><span class="note">Last update run: <b>${esc(LIVE.generated || 'never')}</b></span></div>
    <div class="scroll"><table><thead><tr><th>Figure</th><th class="r">Value</th><th>As of</th><th>Source</th><th>How</th></tr></thead><tbody>${lv.map(([k, x]) => `<tr><td>${esc(liveLabel(k))}</td><td class="r">${esc(liveFmt(k, x.v))}</td><td>${esc(x.asOf || '')}</td><td><a href="${esc(x.url || '#')}" target="_blank" rel="noopener">${esc(x.src || '')}</a></td><td>${x.method === 'auto' ? `<span class="tag good">Automatic</span> <span class="note">${esc(x.fetched || '')}</span>` : '<span class="tag">Starting value</span>'}</td></tr>`).join('')}
      <tr><td>59 community districts</td><td class="r">${LIVE.cdMeta ? LIVE.cdMeta.districts : 0}</td><td>${esc(LIVE.cdMeta ? LIVE.cdMeta.asOf : '')}</td><td>${LIVE.cdMeta ? `<a href="${esc(LIVE.cdMeta.url)}" target="_blank" rel="noopener">${esc(LIVE.cdMeta.src)}</a>` : ''}</td><td>${LIVE.cdMeta && /ACS 20(19|2)/.test(LIVE.cdMeta.asOf) ? '<span class="tag good">Automatic</span>' : '<span class="tag">Starting value</span>'}</td></tr></tbody></table></div></div>
  <div class="grid g2"><div class="card"><h2>Data</h2><ul class="list">${Object.entries(SOURCES).map(([k, s]) => `<li><a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a>${MAN[k] ? `<br><span class="note">${MAN[k].autoUpdates ? 'Refreshed automatically' : 'Checked ' + esc(MAN[k].verified)}</span>${overdue(k) ? ' <span class="tag warn">Check due</span>' : ''}` : ''}</li>`).join('')}</ul></div>
  <div class="card"><h2>Model assumptions</h2><p class="note">Tested in Scenarios → "Which assumptions matter?"</p><table><tbody>${Object.entries(ASSUME).map(([k, o]) => `<tr><td>${esc(o.name)}</td><td class="r">${esc(o.v >= 1000 ? n0(o.v) : String(o.v))}</td></tr>`).join('')}</tbody></table><ul class="list" style="margin-top:10px">${['GHG ≈49 Mt CO₂e in 2024, derived from the reported 25% cut since 2005', 'Revenue split of the FY2027 budget into property, income, business, sales, other and aid is approximate', 'Sector output per job calibrated so city GDP ≈ $1.4T; export shares by sector are estimates', 'Debt headroom ≈$40B', 'Age groups in 2025 (under 5: 495k, 5–17: 1.25M, 65+: 1.5M) estimated from 2023 counts and birth rates', 'Home-care aides start at 200,000 (187,000 counted in 2018)', 'Plan training capacity at CUNY and colleges: 40,000 seats a year; $1B adds ≈8,000', 'Export cost of refuse ≈$130 per ton', 'Bronx and Manhattan 2025 population and Bronx housing units derived from city totals', 'Vote share in 2029 = 50.4% (2025 result) + 0.9 × (support − 50), ±3 points of chance', 'Income split of the bottom 90% across nine deciles, and cash transfers per decile (SNAP, SSI, EITC, Social Security), are estimates', 'Home ownership by income group is an estimate (69% of households rent citywide)', 'Council blocs: Progressive Caucus 24; the remaining 27 split into 14 mainstream Democrats and 13 moderates plus Republicans (simplification)', 'Albany passes laws mainly in Q1–Q2, around the 1 April State budget', 'Credit rating: about two years of fiscal stress costs one notch; each notch adds 0.25 points to bond interest', 'Recession chance ≈4% a quarter; a recession cuts income tax 10%, sales tax 5% and transfer tax 30% for five quarters', 'Union wage pattern: each 1 point above 3% a year adds ≈0.48% a year to existing city spending', 'Hurricane damage of a Sandy-class storm with no protection ≈$10B (Sandy cost the city ≈$19B in 2012)', 'Reserves start at $7.2B (Rainy Day Fund $2.0B + Retiree Health Benefits Trust $5.2B)', 'Enterprise behaviour by regime (hidden capacity 3–12%, hoarding 5–18%, falsified completions 0–5%, quality drift, soft-budget share, wage push, investment hunger) is a model judgement based on the literature under Learn', 'Waiting list inflow and outflow: NYCHA turnover 2.3% a year plus new public homes; applications grow with rent growth and the shortage', 'Informal economy starts at 8% of activity (assumption) and grows with price controls, small-business taxes and unemployment', 'Waste and graft start at 1.5% of new spending and rise with programme growth; audits worth $0.5B/yr cut them by about 2.5 points', 'Transit: each $1B a year of signals, buses and bus lanes adds about 1.6% capacity a year', 'Epidemic shock: about 0.6% chance a quarter', 'Starting commute times by borough: ACS 2020–24 mean travel time to work'].map(a => `<li>${esc(a)}</li>`).join('')}</ul></div></div>`;
  const LIM = [
    ['Industries', 'Sectors are linked by a few coefficients, not a full input–output table of 70 industries. Knock-on effects between, say, finance and restaurants are approximate.'],
    ['People', 'Each district now has its own rents, displacement, heat risk and floods, and 2,500 sample households show who wins and loses. They are a sample, not every New Yorker, and they do not move between districts except when displaced.'],
    ['The region', 'New Jersey, Long Island and Westchester appear only as places people and firms can move to. Their rents and wages do not react.'],
    ['Washington and Albany', 'Federal and State budgets change only through scripted events and votes, not through a model of their politics.'],
    ['Energy', 'The grid is modelled as yearly averages. There is no hourly winter or summer peak, and the State grid gets cleaner on a fixed trend.'],
    ['Climate', 'Emissions follow the city inventory (buildings, transport, waste). Flights, imported food and goods are left out, as in the official inventory; counting them would add a large share on top. Embodied carbon is counted only for new homes.'],
    ['Behaviour', 'Elasticities, migration responses and the strength of the ratchet are assumptions taken from published ranges, not estimated for New York. Scenarios → "Which assumptions matter?" shows which of them change the result.'],
    ['Safety and justice', 'Crime is modelled citywide, not precinct by precinct. Courts, district attorneys and State bail law, which decide much of who sits in jail, are outside the mayor\'s control and kept fixed. The prevention effect is an assumption.'],
    ['Testing', 'Every lever is checked to move its indicator the right way. Only the crime equations are back-tested against 2015–2025 (see above); housing, budget and emissions are calibrated to 2026 but not yet back-tested. It is a teaching model, not a forecast.'],
  ];
  $('#v-sources').insertAdjacentHTML('beforeend', `<div class="card" style="margin-top:18px"><h2>What the model leaves out</h2><p class="note">Known simplifications. Each is a place where a better model, or better data, would change the numbers.</p><table class="limt"><tbody>${LIM.map(r => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table></div>`);
}

const LIVE_NAMES = { pov: 'poverty rate', unemp: 'unemployment', inc: 'median household income' };
function liveLabel(k) { const p = k.split('.'); if (p[0] === 'bor') return `${BOROUGHS.find(b => b.id === p[1]).name}: ${LIVE_NAMES[p[2]] || p[2]}`; return { 'city.unemp': 'NYC unemployment rate', 'city.water': 'Water use (million gallons a day)', 'city.shoot': 'Shooting incidents (12 months)' }[k] || k; }
function liveFmt(k, v) { return /inc$/.test(k) ? '$' + n0(v) : /pov|unemp/.test(k) ? pct(v) : n0(v); }

// ---------- quarter flow ----------
function runQuarter() {
  undoStack.push(JSON.stringify(S)); if (undoStack.length > 12) undoStack.shift();
  const before = S.hist[S.hist.length - 1];
  const rep = step(S); S.decBase = decSnap(S); projCache = null; mcCache = null; save();
  const after = S.hist[S.hist.length - 1];
  const keys = ['shortage', 'shelter', 'insec', 'margin', 'unemp', 'deficit', 'support', 'rent', 'pop'];
  const rows = keys.map(k => { const d = KP[k]; const dv = after[k] - before[k]; const good = dv * d.better > 0; return `<tr><td>${esc(d.name)}</td><td class="r">${esc(d.f(before[k]))}</td><td class="r"><b>${esc(d.f(after[k]))}</b></td><td class="r ${Math.abs(dv) < 1e-6 ? 'mu' : good ? 'up' : 'dn'}">${dv >= 0 ? '▲' : '▼'}</td></tr>`; }).join('');
  const ended = S.t === 20;
  modal(`<div class="row sp"><h2 style="margin:0">${ended ? 'The five-year plan is complete' : 'Report to the bureau'}</h2><span class="bigq">${esc(rep.label)}</span></div>
    ${ended ? endCard() : ''}
    <ul class="list" style="margin:10px 0">${rep.events.map(e => `<li class="ev ${e.k}"><b>${esc(e.t)}</b>${esc(e.d)}</li>`).join('') || '<li class="note">No major events this quarter.</li>'}${rep.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
    ${decisionHTML()}
    <div class="scroll"><table><thead><tr><th>Indicator</th><th class="r">Before</th><th class="r">After</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn go" id="mClose">${ended ? 'Keep governing' : 'Continue'}</button></div>`);
  bindDecision(() => header());
  taxDraft = null; render();
}
function endCard() {
  const last = S.hist[S.hist.length - 1]; const done = GOALK.filter(k => met(S, k, last[k]));
  setTimeout(() => { const b = $('#subEnd'); if (b) b.onclick = submitForm; }, 0);
  return `<p style="margin:10px 0"><button class="btn go" id="subEnd">Submit this plan as a proposal</button></p><p class="lead" style="margin-top:8px">You met <b>${done.length} of ${GOALK.length}</b> goals. ${done.length >= 7 ? 'A plan that delivered.' : done.length >= 4 ? 'Partial fulfilment, the usual outcome of real five-year plans.' : 'The plan fell short; read the balances to see which constraint bound first.'}</p><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0 18px">${GOALK.map(k => goalRow(k, last)).join('')}</div>`;
}
function modal(html) { $('#modalCard').classList.remove('wide'); $('#modalCard').innerHTML = html; $('#modal').classList.add('on'); const c = $('#mClose'); if (c) { c.onclick = closeModal; c.focus(); } }
function closeModal() { $('#modal').classList.remove('on'); $('#modalCard').classList.remove('wide'); }
function toast(msg) { modal(`<p style="margin:0 0 12px">${esc(msg)}</p><div class="row" style="justify-content:flex-end"><button class="btn go" id="mClose">OK</button></div>`); }
function changed() { projCache = null; mcCache = null; save(); header(); }
let saveT = null;
function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 400); }
addEventListener('pagehide', () => { if (S) saveNow(); });


// ---------- range fill (unit-square sliders) ----------
function rangeFill(el) { const mn = +el.min || 0, mx = +el.max || 100, v = +el.value, f = x => ((x - mn) / ((mx - mn) || 1) * 100).toFixed(2) + '%'; const z = mn < 0 ? 0 : mn; el.style.setProperty('--a', f(Math.min(z, v))); el.style.setProperty('--p', f(Math.max(z, v))); }
document.addEventListener('input', e => { if (e.target && e.target.type === 'range') rangeFill(e.target); }, true);
{ let q = false; new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; document.querySelectorAll('input[type=range]').forEach(rangeFill); }); }).observe(document.documentElement, { childList: true, subtree: true }); }
// ---------- decisions: every input on one page ----------
function decSnap(s) { return JSON.stringify({ ld: s.ld ? Object.fromEntries(Object.entries(s.ld.sites).map(([k, v]) => [k, v.st])) : {}, pol: s.pol, pending: s.pending, plan: s.plan, tax: s.tax, taxPending: s.taxPending ? s.taxPending.tx : null, w: s.bor.map(b => b.w) }); }
function decBase() { if (!S.decBase) S.decBase = decSnap(S); return JSON.parse(S.decBase); }
const DRULES = [['homeless', 'Share of public homes for shelter residents', 60, 5, v => v + '%', 'Each home moves ≈2.4 people out of shelter'], ['bond', 'Capital financed by bonds', 100, 5, v => v + '%', 'The rest comes from this year\'s operating budget. Bonds cost ≈6.2%/yr.'], ['audit', 'Statistics, inspections and audits', 0.5, 0.01, v => bn(v) + '/yr', 'Closes the gap between reports and reality, and cuts graft.']];
function decChanges() {
  const B = decBase(), out = [];
  LAWS.forEach(l => {
    const a = B.pol[l.id] || l.opts[0].id, b = S.pol[l.id] || l.opts[0].id;
    if (a !== b) out.push({ s: 'law', a: 'dx-law-' + l.id, t: l.name, d: `${optName2(l.id, a)} → ${optName2(l.id, b)}` });
    const pa = B.pending[l.id], pb = S.pending[l.id];
    if (pb && pa !== pb) out.push({ s: 'law', a: 'dx-law-' + l.id, t: l.name, d: `sent to Albany: ${optName2(l.id, pb)}` });
    if (pa && !pb && b !== pa) out.push({ s: 'law', a: 'dx-law-' + l.id, t: l.name, d: 'Albany request withdrawn' });
  });
  TAXDEF.forEach(d => { const a = tget(B.tax, d), b = tget(S.tax, d); if (Math.abs(a - b) > 1e-9) out.push({ s: 'tax', a: 'dx-tax', t: d.name, d: `${tfmt(d, a)} → ${tfmt(d, b)}` }); });
  if (S.taxPending && JSON.stringify(S.taxPending.tx) !== JSON.stringify(B.taxPending)) out.push({ s: 'tax', a: 'dx-tax', t: 'Tax package', d: 'sent to Albany' });
  CAPITAL.forEach(c => { const a = B.plan.cap[c.id] || 0, b = S.plan.cap[c.id] || 0; if (Math.abs(a - b) > 1e-6) out.push({ s: 'cap', a: 'dx-cap-' + c.id, t: c.name, d: `${bn(a)} → ${bn(b)} a year` }); });
  TRAIN.forEach(t => { const a = B.plan.train[t.id] || 0, b = S.plan.train[t.id] || 0; if (Math.abs(a - b) > 0.5) out.push({ s: 'train', a: 'dx-train-' + t.id, t: t.name, d: `${n0(a)} → ${n0(b)} seats` }); });
  DRULES.forEach(r => { const a = B.plan[r[0]] ?? 0, b = S.plan[r[0]] ?? 0; if (Math.abs(a - b) > 1e-6) out.push({ s: 'rule', a: 'dx-rule-' + r[0], t: r[1], d: `${r[4](a)} → ${r[4](b)}` }); });
  DSAFE.forEach(r => { const a = B.plan[r[0]] || 0, b = S.plan[r[0]] || 0; if (Math.abs(a - b) > 1e-6) out.push({ s: 'safe', a: 'dx-safe-' + r[0], t: r[1], d: `${r[5](a)} → ${r[5](b)}` }); });
  if (S.ld && B.ld) SITES.forEach(x => { const a = B.ld[x.id], b = S.ld.sites[x.id].st; if (a && a !== b && (b === 'review' || b === 'appeal')) out.push({ s: 'site', a: 'dx-sites', t: x.name, d: b === 'appeal' ? 'sent to the Appeals Board' : 'proposed for review' }); });
  S.bor.forEach((x, i) => { const a = B.w[i]; if (a != null && Math.abs(a - x.w) > 1e-6) out.push({ s: 'bor', a: 'dx-bor', t: BOROUGHS[i].name + ' priority', d: `${a.toFixed(1)}× → ${x.w.toFixed(1)}×` }); });
  return out;
}
// which levers help with which problem
const LEV = {
  law: id => [`dx-law-${id}`, LAWS.find(l => l.id === id).name + ' (law)'],
  cap: id => [`dx-cap-${id}`, CAPITAL.find(c => c.id === id).name],
  train: id => [`dx-train-${id}`, 'Training: ' + TRAIN.find(t => t.id === id).name],
  rule: id => [`dx-rule-${id}`, DRULES.find(r => r[0] === id)[1]],
  safe: id => [`dx-safe-${id}`, DSAFE.find(r => r[0] === id)[1]],
  tax: () => ['dx-tax', 'Taxes'],
};
const BAL_FIX = { homes: [['cap', 'build'], ['law', 'housing']], crew: [['train', 'constr']], food: [['law', 'food']], access: [['cap', 'stores'], ['law', 'food']], peak: [['cap', 'storage'], ['cap', 'eff'], ['cap', 'wind']], energy: [['cap', 'wind'], ['cap', 'solar']], water: [['cap', 'water']], care: [['cap', 'care'], ['train', 'ece']], aides: [['train', 'aide']], nurses: [['train', 'nurse'], ['train', 'doc']], teachers: [['train', 'teach']], seats: [['cap', 'cuny']], agency: [['train', 'plan'], ['rule', 'audit']], capital: [['rule', 'bond'], ['tax']], budget: [['tax'], ['rule', 'bond']], trade: [] };
const GOAL_FIX = { shortage: [['cap', 'build'], ['law', 'housing'], ['law', 'land']], shelter: [['rule', 'homeless'], ['cap', 'build']], insec: [['law', 'food'], ['cap', 'stores']], margin: [['cap', 'storage'], ['cap', 'eff'], ['cap', 'wind']], ghg: [['cap', 'eff'], ['law', 'carbon'], ['cap', 'wind'], ['cap', 'fleet']], unemp: [['law', 'labor'], ['train', 'constr']], life: [['law', 'health'], ['train', 'nurse'], ['cap', 'cool']], care: [['law', 'care'], ['cap', 'care'], ['train', 'ece']], support: [['law', 'transit'], ['law', 'housing']], deficit: [['tax'], ['rule', 'bond']] };
const levLinks = arr => arr.map(([k, id]) => { const [a, n] = LEV[k](id); return `<a class="lk" href="#${a}">${esc(n)}</a>`; }).join(', ');
function decAttention() {
  const it = [];
  if (S.lost) return [{ k: 'red', t: 'You are out of office', d: 'The new administration repealed your laws. Use Undo to go back, or keep running quarters to watch what follows.' }];
  if (S.decision) it.push({ k: 'warn', t: S.decision.t, d: 'The unions are waiting for your offer. It shapes wages, morale and the budget for years.', btn: ['dDec', 'Decide the contract'] });
  if (S.b.fcb && S.mode === 'real') it.push({ k: 'red', t: 'The State Financial Control Board is in charge', d: 'New spending and new costly laws are blocked until the budget balances. Fix: ' + levLinks(GOAL_FIX.deficit) + '.' });
  if (taxDraft && JSON.stringify(taxDraft) !== JSON.stringify(S.taxPending ? Object.assign(clone(S.taxPending.tx), { prop: S.tax.prop.slice() }) : S.tax)) it.push({ k: 'warn', t: 'Your tax draft has not been voted on', d: 'Drafts do nothing until the Council votes or Albany is asked. <a class="lk" href="#dx-tax">Go to taxes</a>.' });
  balances(S).forEach(r => { if (r.need > 0 && r.have / r.need < 0.98) { const f = BAL_FIX[r.id] || []; it.push({ k: 'red', t: `${r.name}: only ${pct(r.have / r.need * 100, 0)} of what the plan needs`, d: (f.length ? 'Fix with ' + levLinks(f) + '. ' : '') + `<a class="lk" data-go="plan">See the balance</a>` }); } });
  { const J = S.js; if (J && S.t >= 1 && J.jail > 4160) it.push({ k: 'warn', t: `Rikers closes in August 2027: ${n0(J.jail - 4160)} people have no bed in the borough jails`, d: 'Fix with ' + levLinks([['law', 'drugs'], ['law', 'safety'], ['safe', 'prevent']]) + '.' }); }
  { const X = S.cx; if (X && X.gr && X.gr.marginW < 0) it.push({ k: 'red', t: `Winter evenings: demand ${n0(X.gr.peakW)} MW is above firm supply`, d: 'Heat pumps and chargers now peak on cold evenings. Fix with ' + levLinks([['cap', 'storage'], ['cap', 'eff'], ['cap', 'wind']]) + '.' });
    if (X && Math.max(...X.net.map(n => n.load)) > 115) it.push({ k: 'warn', t: `Subway: the most crowded line runs at ${Math.round(Math.max(...X.net.map(n => n.load)))}% of the crowding guideline`, d: 'Fix with ' + levLinks([['cap', 'transit']]) + '.' });
    if (X && X.biz && X.biz.open < X.biz.close * 0.8) it.push({ k: 'warn', t: `More businesses close than open (${n0(X.biz.close)} vs ${n0(X.biz.open)} this quarter)`, d: 'Taxes, commercial rents and safety drive it. See Economy. <a class="lk" href="#dx-tax">Go to taxes</a>.' }); }
  const p = proj(), end = p[p.length - 1]; const miss = GOALK.filter(k => !met(S, k, end[k]));
  miss.slice(0, 6).forEach(k => it.push({ k: 'goal', t: `Off track for 2031: ${KP[k].name}`, d: `Projected ${esc(KP[k].f(end[k]))}; ${esc(KP[k].gtxt(KP[k].goal(S)))}. Try ${levLinks(GOAL_FIX[k] || [])}.` }));
  Object.keys(S.pending).forEach(l => it.push({ k: 'info', t: `Waiting for Albany: ${optName2(l, S.pending[l])}`, d: 'The Legislature acts mainly January to June. Nothing to do but keep support up.' }));
  if (S.taxPending) it.push({ k: 'info', t: 'Waiting for Albany: your tax package', d: 'It can pass in full, halved, or not at all.' });
  return it;
}
function decSideHTML() {
  const ch = decChanges(); const p = proj(), end = p[p.length - 1]; const done = GOALK.filter(k => met(S, k, end[k]));
  return `<h2>Queued for ${esc(qLabel(S))}</h2>
    ${ch.length ? `<ul class="chg">${ch.map(c => `<li><a class="lk" href="#${c.a}">${esc(c.t)}</a><span>${esc(c.d)}</span></li>`).join('')}</ul><button class="btn" id="dReset">Undo all ${ch.length} change${ch.length > 1 ? 's' : ''}</button>` : '<p class="note">No changes yet. Running the quarter now continues the plan exactly as it stands, which is a real choice too.</p>'}
    <div class="dproj"><span class="note">If you keep these settings, by the end of 2031</span><b>${done.length} of ${GOALK.length}</b><span class="note">targets are met</span>
      <div class="gl">${GOALK.map(k => `<span class="${met(S, k, end[k]) ? 'ok' : 'no'}" title="${esc(KP[k].name)}: ${esc(KP[k].f(end[k]))}">${met(S, k, end[k]) ? '✓' : '✗'} ${esc(KP[k].name.replace(/ \(.*\)/, ''))}</span>`).join('')}</div></div>
    <button class="btn go drun" id="dRun" ${S.t >= 20 && S.lost ? '' : ''}>Run quarter ${esc(qLabel(S))}</button>`;
}
function dChip(l, o) {
  const e = o.fx || {}; const on = (S.pol[l.id] || l.opts[0].id) === o.id, pend = S.pending[l.id] === o.id;
  const t = [];
  if (e.op) t.push(`${e.op > 0 ? '+' : '−'}$${Math.abs(e.op).toFixed(1)}B/yr`);
  if (e.capex) t.push(`$${e.capex}B once`);
  if (e.albany && S.mode === 'real') t.push('needs Albany');
  if (e.legal >= 3) t.push('high legal risk');
  if (S.mode === 'real' && !on && o.id !== l.opts[0].id && !e.albany) { const v = councilVote(S, o); t.push(`<i class="${v.pass ? 'y' : 'n'}">Council ${v.yes}–${v.no}</i>`); }
  return `<button type="button" class="dchip ${on ? 'on' : ''} ${pend ? 'pend' : ''}" data-l="${l.id}" data-o="${o.id}" aria-pressed="${on}" title="${esc(o.desc)}">${esc(o.name)}${pend ? '<small>pending in Albany</small>' : ''}${t.length && !on ? `<small>${t.join(' · ')}</small>` : ''}</button>`;
}
function decideView() {
  const v = $('#v-decide'); if (!v) return;
  const { fx, flags } = fxAll(S); const P = S.plan; const B = decBase();
  const capOff = id => (id === 'acq' && !flags.acquire) || (id === 'stores' && fx.storesCap !== 9999);
  const capNote = id => id === 'acq' && !flags.acquire ? 'Needs the housing law "Municipalize with compensation"' : id === 'stores' && fx.storesCap !== 9999 ? 'Needs the food law "Public grocery network"' : '';
  const att = decAttention(); const ch = decChanges(); const cnt = s => ch.filter(c => c.s === s).length;
  const tag = s => cnt(s) ? `<span class="tag good">${cnt(s)} changed</span>` : '';
  const D = taxDraft || (taxDraft = clone(S.taxPending ? Object.assign(clone(S.taxPending.tx), { prop: S.tax.prop.slice() }) : S.tax));
  const txs = d => `<div class="sl"><span class="slh"><label for="dtx-${d.id}">${esc(d.name)} <span class="tag ${d.who === 'council' ? 'good' : 'warn'}">${d.who === 'council' ? 'Council' : 'Albany'}</span></label>${qm('tax.' + d.id, d.name)}</span><output id="dtxo-${d.id}">${esc(tfmt(d, tget(D, d)))}</output><input type="range" id="dtx-${d.id}" data-id="${d.id}" min="${d.min}" max="${d.max}" step="${d.step}" value="${tget(D, d)}" ${S.lost ? 'disabled' : ''}></div>`;
  const tot = S.bor.reduce((a, x) => a + x.w, 0);
  v.innerHTML = `<h1>This quarter's decisions</h1>
    <p class="lead">Everything you can change before you run the quarter, on one page. The same controls appear, with more detail, on the Laws, Taxes, Plan and Map pages. Nothing takes effect until you press Run quarter.</p>
    <div class="dtop">
      <section class="datt"><h2>Needs your attention</h2>${att.length ? (() => { const li = a => `<li class="a-${a.k}"><b>${esc(a.t)}</b><span>${a.d}</span>${a.btn ? `<button class="btn go" id="${a.btn[0]}">${esc(a.btn[1])}</button>` : ''}</li>`; return `<ul class="att">${att.slice(0, 5).map(li).join('')}</ul>${att.length > 5 ? `<details class="more"><summary>${att.length - 5} more</summary><ul class="att">${att.slice(5).map(li).join('')}</ul></details>` : ''}`; })() : '<p class="note">Nothing urgent. Every balance holds and every target is on track.</p>'}</section>
      <section class="dside" id="dSide">${decSideHTML()}</section>
    </div>
    <nav class="dnav" aria-label="Decision groups"><a href="#dx-laws">Laws ${cnt('law') ? '<b>' + cnt('law') + '</b>' : ''}</a><a href="#dx-tax">Taxes ${cnt('tax') ? '<b>' + cnt('tax') + '</b>' : ''}</a><a href="#dx-cap">Investment ${cnt('cap') ? '<b>' + cnt('cap') + '</b>' : ''}</a><a href="#dx-train">Training ${cnt('train') ? '<b>' + cnt('train') + '</b>' : ''}</a><a href="#dx-rules">Rules ${cnt('rule') ? '<b>' + cnt('rule') + '</b>' : ''}</a><a href="#dx-sites">Sites ${cnt('site') ? '<b>' + cnt('site') + '</b>' : ''}</a><a href="#dx-safe">Safety ${cnt('safe') ? '<b>' + cnt('safe') + '</b>' : ''}</a><a href="#dx-bor">Boroughs ${cnt('bor') ? '<b>' + cnt('bor') + '</b>' : ''}</a></nav>
    <section class="dsec" id="dx-laws"><div class="dsh"><h2>Laws</h2>${tag('law')}<button class="btn" data-go="laws">Full descriptions and precedents</button></div>
      <p class="note">One option per row; black is in force. Hover an option for what it does. Grey notes show its yearly cost, whether Albany must agree, and today's Council count (26 of 51 needed).${S.lost ? '' : ` Laws in force cost <b>${bn(fx.op)}/yr</b> to run.`}</p>
      ${LAWS.map(l => `<div class="dlaw" id="dx-law-${l.id}"><div class="dlh"><b>${esc(l.name)}</b> ${qm('law.' + l.id, l.name)}${(B.pol[l.id] || l.opts[0].id) !== (S.pol[l.id] || l.opts[0].id) ? ' <span class="tag good">changed</span>' : ''}</div><div class="dchips">${l.opts.map(o => dChip(l, o)).join('')}</div></div>`).join('')}</section>
    <section class="dsec" id="dx-tax"><div class="dsh"><h2>Taxes</h2>${tag('tax')}<button class="btn" data-go="taxes">Who pays, winners and losers</button></div>
      <p class="note">Move the sliders to draft a package, then vote. The Council sets property tax; every other rate needs Albany, which is ${esc(albanyNow())}.</p>
      <div class="dgrid"><div><h3>Council decides</h3>${TAXDEF.filter(d => d.who === 'council').map(txs).join('')}<div class="row"><button class="btn go" id="dTxVote">Put to a Council vote</button></div></div>
        <div><h3>Albany decides</h3>${TAXDEF.filter(d => d.who === 'albany').map(txs).join('')}<div class="row"><button class="btn go" id="dTxAlb">Send to Albany</button><button class="btn" id="dTxReset">Reset draft</button></div></div></div>
      <p class="tres" id="dTxSum"></p></section>
    <section class="dsec" id="dx-cap"><div class="dsh"><h2>Investment</h2>${tag('cap')}<span class="num" id="dCapSum">${bn(Object.keys(P.cap).reduce((a, k) => a + (capOff(k) ? 0 : P.cap[k]), 0))}/yr</span><button class="btn" data-go="plan">Let the solver propose a plan</button></div>
      <p class="note">Billions of dollars a year, on top of today's city capital plan. Projects take months or years to finish, so start early.</p>
      <div class="dgrid">${CAPITAL.map(c => `<div id="dx-cap-${c.id}">${slider('cap', c.id, c.name, P.cap[c.id] || 0, c.max, c.step, x => bn(x), capNote(c.id), capOff(c.id))}</div>`).join('')}</div></section>
    <section class="dsec" id="dx-train"><div class="dsh"><h2>Training</h2>${tag('train')}<span class="num" id="dTrainSum">${bn(TRAIN.reduce((a, t) => a + P.train[t.id] * t.cost / 1e9, 0))}/yr</span></div>
      <p class="note">New places per year. Graduates join the workforce after the course length shown; shortages of builders, nurses and teachers limit everything else.</p>
      <div class="dgrid">${TRAIN.map(t => `<div id="dx-train-${t.id}">${slider('train', t.id, t.name, P.train[t.id], t.max, t.max / 100, x => n0(x), `${t.qtrs} quarter${t.qtrs > 1 ? 's' : ''} · $${k1(t.cost)} per seat`)}</div>`).join('')}</div></section>
    <section class="dsec" id="dx-rules"><div class="dsh"><h2>Rules of allocation</h2>${tag('rule')}</div>
      <div class="dgrid">${DRULES.map(r => `<div id="dx-rule-${r[0]}">${slider('rule', r[0], r[1], P[r[0]] ?? 0, r[2], r[3], r[4], r[5])}</div>`).join('')}</div></section>
    <section class="dsec" id="dx-sites"><div class="dsh"><h2>Where to build</h2>${tag('site')}<button class="btn" data-go="plan">Sites in detail</button></div>
      <p class="note">Public homes can only go where land is approved. Propose sites early: review takes one to four quarters.</p>${sitesTable(true)}</section>
    <section class="dsec" id="dx-safe"><div class="dsh"><h2>Safety and justice</h2>${tag('safe')}<button class="btn" data-go="justice">Crime, jails, overdoses, evictions</button></div>
      <p class="note">Police and prevention budgets. The laws on policing, drugs and evictions are in the Laws section above.</p>
      <div class="dgrid">${safeSliders()}</div></section>
    <section class="dsec" id="dx-bor"><div class="dsh"><h2>Borough priorities</h2>${tag('bor')}<button class="btn" data-go="map">See needs on the map</button></div>
      <p class="note">Where new city grocery stores go, and public homes on sites that span several boroughs. Most public homes go where their site is (Where to build).</p>
      <div class="dgrid">${S.bor.map((b, i) => `<div class="sl"><span class="slh"><label for="bw-${i}">${esc(BOROUGHS[i].name)}</label></span><output id="bwo-${i}">${b.w.toFixed(1)}× · ${pct(b.w / tot * 100, 0)}</output><input type="range" id="bw-${i}" data-i="${i}" min="0" max="5" step="0.5" value="${b.w}" ${S.lost ? 'disabled' : ''}><span class="note">Poverty ${pct(BOROUGHS[i].pov, 0)}</span></div>`).join('')}</div></section>
    <div class="dend"><button class="btn go drun" id="dRun2">Run quarter ${esc(qLabel(S))}</button><span class="note" id="dEndNote"></span></div>`;
  decBind();
}
function decSideRefresh() { const s = $('#dSide'); if (!s) return; s.innerHTML = decSideHTML(); decSideBind(); const ch = decChanges();
  const { fx, flags } = fxAll(S); const capOff = id => (id === 'acq' && !flags.acquire) || (id === 'stores' && fx.storesCap !== 9999);
  const cs = $('#dCapSum'); if (cs) cs.textContent = bn(Object.keys(S.plan.cap).reduce((a, k) => a + (capOff(k) ? 0 : S.plan.cap[k]), 0)) + '/yr';
  const ts = $('#dTrainSum'); if (ts) ts.textContent = bn(TRAIN.reduce((a, t) => a + S.plan.train[t.id] * t.cost / 1e9, 0)) + '/yr';
  const en = $('#dEndNote'); if (en) en.textContent = ch.length ? ch.length + ' change' + (ch.length > 1 ? 's' : '') + ' queued.' : 'No changes queued.'; $$('#v-decide .dnav a').forEach(a => { const map = { '#dx-laws': 'law', '#dx-tax': 'tax', '#dx-cap': 'cap', '#dx-train': 'train', '#dx-rules': 'rule', '#dx-safe': 'safe', '#dx-bor': 'bor' }; const n = ch.filter(c => c.s === map[a.getAttribute('href')]).length; a.innerHTML = a.textContent.replace(/\s*\d+$/, '') + (n ? ' <b>' + n + '</b>' : ''); }); }
function decSideBind() {
  const run = () => $('#next').click();
  [$('#dRun'), $('#dRun2')].forEach(b => { if (b) b.onclick = run; });
  const rs = $('#dReset'); if (rs) rs.onclick = () => {
    const B = decBase(); undoStack.push(JSON.stringify(S));
    S.pol = B.pol; S.pending = B.pending; S.plan = B.plan; S.tax = B.tax; S.taxPending = B.taxPending ? Object.assign({ age: (S.taxPending && S.taxPending.age) || 0 }, { tx: B.taxPending }) : null; S.bor.forEach((x, i) => { if (B.w[i] != null) x.w = B.w[i]; });
    taxDraft = null; changed(); decideView(); toast('All changes for this quarter were undone.');
  };
}
function decBind() {
  const v = $('#v-decide'); const P = S.plan;
  const jump = id => { const el = document.getElementById(id); if (!el) return; el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); const f = el.querySelector('input,button.dchip'); if (f) f.focus({ preventScroll: true }); };
  v.onclick = e => {
    const a = e.target.closest('a[href^="#dx-"]'); if (a) { e.preventDefault(); jump(a.getAttribute('href').slice(1)); return; }
    const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); tab = g.dataset.go; render(); window.scrollTo({ top: 0 }); return; }
    const c = e.target.closest('.dchip'); if (c && !S.lost) { chooseLaw(c.dataset.l, c.dataset.o); }
  };
  const dd = $('#dDec'); if (dd) dd.onclick = decisionModal;
  const upd = () => debounce(decSideRefresh, 250);
  $$('#v-decide input[type=range]').forEach(inp => inp.oninput = () => {
    const x = +inp.value;
    if (inp.id.startsWith('dtx-')) { const d = TAXDEF.find(t => t.id === inp.dataset.id); tset(taxDraft, d, x); $('#dtxo-' + d.id).textContent = tfmt(d, x); decTaxSum(); return; }
    if (inp.id.startsWith('bw-')) { S.bor[+inp.dataset.i].w = x; const tot = S.bor.reduce((a, b) => a + b.w, 0); S.bor.forEach((b, i) => { const o = $('#bwo-' + i); if (o) o.textContent = `${b.w.toFixed(1)}× · ${pct(b.w / tot * 100, 0)}`; }); changed(); upd(); return; }
    const [g, id] = inp.id.split('-');
    if (g === 'cap') P.cap[id] = x; else if (g === 'train') P.train[id] = x; else P[id] = x;
    if (g === 'safe') { inp.previousElementSibling.textContent = DSAFE.find(r => r[0] === id)[5](x); changed(); upd(); return; }
    inp.previousElementSibling.textContent = g === 'cap' || id === 'audit' ? bn(x) + (id === 'audit' ? '/yr' : '') : g === 'rule' ? x + '%' : n0(x);
    changed(); upd();
  });
  $('#dTxVote').onclick = () => taxCouncilVote(taxDraft); $('#dTxAlb').onclick = () => taxSendAlbany(taxDraft); $('#dTxReset').onclick = () => { taxDraft = null; decideView(); };
  decTaxSum(); decSideRefresh();
}
function decTaxSum() {
  const D = taxDraft, o = $('#dTxSum'); if (!D || !o) return;
  const now = taxCalc(S, S.tax), dr = taxCalc(S, D); const d = dr.total - now.total;
  const propCh = D.prop.some((x, c) => Math.abs(x - S.tax.prop[c]) > 1e-9), albCh = TAXDEF.some(t => t.who === 'albany' && Math.abs(tget(D, t) - tget(S.tax, t)) > 1e-9);
  $('#dTxVote').disabled = !propCh || S.lost; $('#dTxAlb').disabled = !albCh || S.lost;
  const v = propCh ? (S.mode === 'sandbox' ? { pass: true, yes: 51, no: 0 } : propTaxVote(S, D)) : null;
  o.innerHTML = Math.abs(d) < 0.05 && !propCh && !albCh ? 'Your draft matches the taxes in force.' : `Your draft would raise <b>${d >= 0 ? '+' : '−'}$${Math.abs(d).toFixed(1)}B a year</b> after people and firms react.${v ? ` Council whip count for the property rates: <b style="color:${v.pass ? 'var(--good)' : 'var(--red)'}">${v.yes} yes, ${v.no} no</b>.` : ''} Nothing changes until you vote or send it.`;
}
function taxCouncilVote(D) {
  if (S.lost) return; const v = S.mode === 'sandbox' ? { pass: true, yes: 51, no: 0, by: [] } : propTaxVote(S, D);
  if (v.pass) { undoStack.push(JSON.stringify(S)); S.tax.prop = D.prop.slice(); changed(); render(); toast(`The Council adopts the new property tax rates, ${v.yes} to ${v.no}. They apply from this quarter.`); }
  else toast(`The vote fails, ${v.yes} to ${v.no} (26 needed). ${v.by.map(b => `${BLOCS.find(x => x.id === b.id).name}: ${b.yes} of ${b.seats}`).join('; ')}. Smaller increases, or raising public support first, would change the count.`);
}
function taxSendAlbany(D) {
  if (S.lost) return; const tx = clone(D); tx.prop = S.tax.prop.slice();
  undoStack.push(JSON.stringify(S)); S.taxPending = { tx, age: 0 }; changed(); render();
  toast(`Tax package sent to Albany, which is ${albanyNow()}. Watch the quarterly reports.`);
}

// ---------- taxes ----------
let taxDraft = null;
const tget = (tx, d) => d.i != null ? tx[d.g][d.i] : tx[d.g];
const tset = (tx, d, v) => { if (d.i != null) tx[d.g][d.i] = v; else tx[d.g] = v; };
const tfmt = (d, v) => d.g === 'pat' ? (v >= 0.5 ? 'On' : 'Off') : (+v).toFixed(d.step < 0.01 ? 3 : d.step < 0.1 ? 2 : 1) + '%';
const albanyNow = () => S.q === 1 ? 'in session; the State budget is due 1 April' : S.q === 2 ? 'closing the State budget, the best chance all year' : 'out of session until January';
const shortGrp = n => n.replace('Bottom ', '').replace('Top ', '');
function groupPoll(g) { return Math.max(3, Math.min(97, S.support + g.netPct * 2.2)); }
function taxesView() {
  if (!taxDraft) taxDraft = clone(S.taxPending ? Object.assign(clone(S.taxPending.tx), { prop: S.tax.prop.slice() }) : S.tax);
  const D = taxDraft;
  const sl = d => { const v = tget(D, d), cur = tget(S.tax, d), v0 = tget(TAX0, d); return `<div class="sl"><span class="slh"><label for="tx-${d.id}">${esc(d.name)} <span class="tag ${d.who === 'council' ? 'good' : 'warn'}">${d.who === 'council' ? 'Council' : 'Albany'}</span></label>${qm('tax.' + d.id, d.name)}</span><output id="txo-${d.id}">${esc(tfmt(d, v))}</output><input type="range" id="tx-${d.id}" data-id="${d.id}" min="${d.min}" max="${d.max}" step="${d.step}" value="${v}" ${S.lost ? 'disabled' : ''}><span class="note">2027 law ${esc(tfmt(d, v0))}${Math.abs(cur - v0) > 1e-9 ? ` · in force now ${esc(tfmt(d, cur))}` : ''}${d.note ? ' · ' + esc(d.note) : ''}</span></div>`; };
  $('#v-taxes').innerHTML = `<h1>Set the city's taxes</h1>
    <p class="lead">New York City collects about $90B a year in taxes, but it controls only some of them. The Council sets property tax rates each June. Every other rate, including the city income tax, is State law: you can only ask Albany. Albany is ${esc(albanyNow())}. Move the sliders to draft a package, see who pays, then put it to a vote.</p>
    <div class="grid g12">
      <div class="grid">
        <div class="card"><h2>Council decides: property tax</h2><p class="note">Rates per $100 of assessed value (FY2026). Owners of apartment buildings pass about half of class 2 increases to tenants.</p>${TAXDEF.filter(d => d.who === 'council').map(sl).join('')}
          <div id="whip" style="margin-top:10px"></div>
          <div class="row" style="margin-top:10px"><button class="btn go" id="txVote">Put to a Council vote</button>${qm('tax.vote', 'a Council vote')}</div></div>
        <div class="card"><h2>Albany decides: everything else</h2><p class="note">Income tax rates have not changed since 2017. A request needs the Legislature and the Governor; it can pass in full, halved, or not at all.</p>${TAXDEF.filter(d => d.who === 'albany').map(sl).join('')}
          <div class="row" style="margin-top:10px"><button class="btn go" id="txAlb">Send to Albany</button>${qm('tax.albany', 'sending to Albany')}${S.taxPending ? '<button class="btn" id="txWd">Withdraw request</button>' : ''}<button class="btn" id="txReset">Reset draft</button></div>
          ${S.taxPending ? `<p class="note" style="margin-top:8px"><span class="tag warn">Pending in Albany</span> sent ${S.taxPending.age || 0} quarter${(S.taxPending.age || 0) === 1 ? '' : 's'} ago.</p>` : ''}</div>
      </div>
      <div id="taxOut" class="grid"></div>
    </div>`;
  $$('#v-taxes input[type=range]').forEach(inp => inp.oninput = () => {
    const d = TAXDEF.find(x => x.id === inp.dataset.id); tset(D, d, +inp.value);
    $('#txo-' + d.id).textContent = tfmt(d, +inp.value); debounce(taxOut, 120);
  });
  $('#txVote').onclick = () => taxCouncilVote(D);
  $('#txAlb').onclick = () => taxSendAlbany(D);
  const wd = $('#txWd'); if (wd) wd.onclick = () => { S.taxPending = null; taxDraft = null; changed(); taxesView(); };
  $('#txReset').onclick = () => { taxDraft = null; taxesView(); };
  taxOut();
}
function taxOut() {
  const D = taxDraft; if (!D || !$('#taxOut')) return;
  const now = taxCalc(S, S.tax), dr = taxCalc(S, D);
  const dn = distribution(S), dd = distribution(Object.assign({}, S, { tax: D }));
  const v = propTaxVote(S, D);
  const propCh = D.prop.some((x, c) => Math.abs(x - S.tax.prop[c]) > 1e-9);
  const albCh = TAXDEF.some(d => d.who === 'albany' && Math.abs(tget(D, d) - tget(S.tax, d)) > 1e-9);
  $('#txVote').disabled = !propCh || S.lost; $('#txAlb').disabled = !albCh || S.lost;
  $('#whip').innerHTML = propCh ? `<h3>Whip count for your property rates</h3>${v.by.map(b => { const B = BLOCS.find(x => x.id === b.id); return `<div class="hbar"><span>${esc(B.name)}</span><span class="tr"><i style="width:${b.yes / b.seats * 100}%;background:var(--ink)"></i></span><span class="val">${b.yes} of ${b.seats}</span></div>`; }).join('')}<p class="note" style="margin-top:4px"><b style="color:${v.pass ? 'var(--good)' : 'var(--red)'}">${v.yes} yes, ${v.no} no</b>: ${v.pass ? 'it would pass' : 'it would fail'} (26 of 51 needed).</p>` : '';
  const keys = Object.keys(now.parts);
  const mx = Math.max(...dn.map(g => g.taxRate), ...dd.map(g => g.taxRate));
  const nets = dd.map(g => g.net); const nm = Math.max(1, ...nets.map(Math.abs));
  $('#taxOut').innerHTML = `
    <div class="card"><h2>Revenue per year</h2><div class="scroll"><table><thead><tr><th>Tax</th><th class="r">In force</th><th class="r">Your draft</th><th class="r">Change</th></tr></thead><tbody>
      ${keys.map(k => { const a = now.parts[k], b = dr.parts[k], d = b - a; return `<tr><td>${esc(k)}</td><td class="r">${bn(a)}</td><td class="r">${bn(b)}</td><td class="r ${Math.abs(d) < 0.05 ? 'mu' : d > 0 ? 'up' : 'dn'}">${Math.abs(d) < 0.05 ? '–' : (d > 0 ? '+' : '−') + '$' + Math.abs(d).toFixed(1) + 'B'}</td></tr>`; }).join('')}
      <tr><td><b>Total taxes</b></td><td class="r"><b>${bn(now.total)}</b></td><td class="r"><b>${bn(dr.total)}</b></td><td class="r"><b>${(dr.total - now.total >= 0 ? '+' : '−') + '$' + Math.abs(dr.total - now.total).toFixed(1) + 'B'}</b></td></tr></tbody></table></div>
      <p class="note">Estimates include behavior: high earners move or shift income (elasticity ${S.A.eTop}), firms relocate (${S.A.eCorp}), shoppers buy outside the city (${S.A.eSales}). These are model assumptions; see Sources.</p></div>
    <div class="card"><h2>Who pays: local taxes as a share of income</h2><p class="note">City income, property (incl. the part passed into rent), sales and business taxes per household, divided by income plus cash transfers.</p>
      <div class="row" style="gap:14px;margin:6px 0"><span class="note"><span style="color:var(--ink2)">■</span> In force</span><span class="note"><span style="color:var(--s1)">■</span> Your draft</span></div>
      ${dn.map((g, i) => `<div class="hbar pair"><span>${esc(g.name)}</span><span><span class="tr"><i style="width:${g.taxRate / mx * 100}%;background:var(--ink2)"></i></span><span class="tr"><i style="width:${dd[i].taxRate / mx * 100}%;background:var(--s1)"></i></span></span><span class="val">${pct(g.taxRate)} → ${pct(dd[i].taxRate)}</span></div>`).join('')}</div>
    <div class="card"><h2>Winners and losers</h2><p class="note">Net gain per household per year from your laws, programs and draft taxes, compared with 2027 law. Benefits count rent savings, child care, fares, food, jobs, health and social housing.</p>
      <div class="row" style="gap:14px;margin:6px 0"><span class="note"><span style="color:var(--s1)">■</span> Gains</span><span class="note"><span style="color:var(--s2)">■</span> Loses</span></div>
      ${dd.map(g => `<div class="hbar tor"><span>${esc(g.name)}</span><span style="position:relative;height:14px;background:var(--panel2);border-radius:3px"><i style="position:absolute;top:0;height:100%;left:${50 + Math.min(0, g.net) / nm * 50}%;width:${Math.abs(g.net) / nm * 50}%;background:${g.net >= 0 ? 'var(--s1)' : 'var(--s2)'};border-radius:3px"></i><i style="position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:var(--ink)"></i></span><span class="val">${g.net >= 0 ? '+' : '−'}$${n0(Math.abs(g.net))} (${g.netPct >= 0 ? '+' : '−'}${Math.abs(g.netPct).toFixed(1)}%)</span></div>`).join('')}
      <details style="margin-top:8px"><summary>Table: income, taxes, benefits and polling by group</summary><div class="scroll"><table><thead><tr><th>Group (tax filers)</th><th class="r">Income</th><th class="r">+ transfers</th><th class="r">Extra tax</th><th class="r">Benefits</th><th class="r">Approval</th></tr></thead><tbody>${dd.map(g => `<tr><td>${esc(g.name)}</td><td class="r">$${k1(g.inc)}</td><td class="r">$${k1(g.res)}</td><td class="r">${g.taxD >= 0 ? '' : '−'}$${n0(Math.abs(g.taxD))}</td><td class="r">$${n0(g.ben)}</td><td class="r">${pct(groupPoll(g), 0)}</td></tr>`).join('')}</tbody></table></div><p class="note">Approval is modelled from overall support plus each group's net gain; it is not a real poll.</p></details></div>`;
}

// ---------- politics, money, region ----------
function politicsView() {
  const F = S.fin, B = S.b, rating = ratingName(F.notch).replace(' (S&P scale)', '');
  const ST = seatsOf(S), seats = BLOCS.flatMap(b => Array.from({ length: ST[b.id] }, () => b.color));
  const due = c => c.at[0] * 4 + c.at[1] - 1, nowQ = S.year * 4 + S.q - 1;
  const pend = Object.keys(S.pending).map(l => `<li><span class="tag warn">Albany</span> ${esc(optName2(l, S.pending[l]))} <span class="note">(${esc(LAWS.find(x => x.id === l).name)})</span></li>`);
  if (S.taxPending) pend.push(`<li><span class="tag warn">Albany</span> Your tax package <span class="note">(sent ${S.taxPending.age || 0} quarters ago)</span></li>`);
  $('#v-politics').innerHTML = `<h1>Votes, unions and lenders</h1>
    <p class="lead">A plan needs 26 Council votes, Albany's consent, labor peace and investors willing to lend. This page shows where each stands.</p>
    <div class="grid g2">
      <div class="card"><h2>City Council, 51 seats</h2>
        <div class="seats" aria-hidden="true">${seats.map(c => `<i style="background:${c}"></i>`).join('')}</div>
        ${BLOCS.map(b => `<div class="row" style="gap:8px;margin-top:6px"><span style="color:${b.color}">■</span><span style="flex:1">${esc(b.name)}</span><b class="num">${ST[b.id]}</b>${S.cn && S.cn.el && S.cn.el.before[b.id] !== ST[b.id] ? `<span class="note">(was ${S.cn.el.before[b.id]})</span>` : ''}</div>`).join('')}
        <p class="note" style="margin-top:8px">Democrats hold 46 seats and Republicans 5. The Progressive Caucus has 24 members, two short of a majority on its own; Speaker Julie Menin is a moderate. Bloc sizes for the moderate wing are a model simplification. Each law option shows its whip count on the Laws tab; votes shift with public support. ${S.cn && S.cn.el ? 'Seats shown are the Council elected in November 2029.' : 'All 51 seats are up in November 2029.'}</p></div>
      <div class="card"><h2>Albany</h2><p>The Legislature is <b>${esc(albanyNow())}</b>.</p>
        <ul class="list">${pend.join('') || '<li class="note">Nothing pending.</li>'}</ul>
        <p class="note">Chance of passage each quarter: ${pct(Math.max(0, (S.q === 1 ? 0.6 : S.q === 2 ? 1.5 : 0) * (S.A.albany + (S.support - 50) / 200)) * 100, 0)} for laws (Q1 0.6×, Q2 1.5×, rest of year 0, scaled by support).</p></div>
    </div>
${councilPowerHTML()}
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><h2>Union contracts</h2><p class="note">Public-sector strikes are illegal under the Taylor Law, but unions can work to rule and take uniformed disputes to arbitration. Personal services cost the city about $60B a year.</p>
        <div class="scroll"><table><thead><tr><th>Union</th><th>Due</th><th>Status</th></tr></thead><tbody>${CONTRACTS.map(c => `<tr><td>${esc(c.name)}</td><td>Q${c.at[1]} ${c.at[0]}</td><td>${S.un.done[c.id] != null ? `Settled at ${S.un.done[c.id]}% a year` : due(c) <= nowQ ? '<span class="tag warn">Talks open</span>' : 'Not yet'}</td></tr>`).join('')}</tbody></table></div>
        <p style="margin-top:8px">Wage pattern now: <b>${(0.75 * S.un.civ + 0.25 * S.un.uni).toFixed(2)}% a year</b>. Workforce morale ${pct(S.lab.morale * 100, 0)}.${F.wtr > 0 ? ' <span class="tag red">Work-to-rule slows agencies</span>' : ''}</p>
        ${S.decision ? '<button class="btn go" id="openDec">Decide the open contract</button>' : ''}</div>
      <div class="card"><h2>Bond markets</h2>
        <div class="grid kp2" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          <div class="kpi"><span class="l">GO rating</span><span class="v num">${esc(rating)}</span><span class="d mu">outlook ${F.outlook < 0 ? 'negative' : 'stable'}</span></div>
          <div class="kpi"><span class="l">Interest on new bonds</span><span class="v num">${pct((F.rate ?? S.A.bondRate) * 100, 2)}</span><span class="d mu">+0.25 points per notch lost</span></div>
          <div class="kpi"><span class="l">Reserves</span><span class="v num">${bn(B.reserves ?? 7.2)}</span><span class="d mu">Rainy Day Fund + retiree health trust</span></div>
          <div class="kpi"><span class="l">Economy</span><span class="v num">${F.recession > 0 ? 'Recession' : 'Growing'}</span><span class="d mu">${F.recession > 0 ? F.recession + (F.recession === 1 ? ' quarter left' : ' quarters left') : 'pension change ' + bn(F.pensionAdj) + '/yr'}</span></div>
        </div><p class="note" style="margin-top:8px">Agencies watch structural balance, reserve use and debt. Two years of stress costs a notch; three good years can win one back.</p></div>
    </div>
    <div class="grid g3" style="margin-top:14px">
      <div class="card"><h2>Reserves, $B</h2><div class="fig sm" id="poR"></div></div>
      <div class="card"><h2>Agency load, % of capacity</h2><div class="fig sm" id="poC"></div><p class="note">Above 100%, projects slip and cost more. Training planners raises capacity.</p></div>
      <div class="card"><h2>Commuters into the city</h2><div class="fig sm" id="poM"></div><p class="note">About a million suburbanites work for city employers. ${n0(S.reg.moved)} jobs have left so far.</p></div>
    </div>`;
  const pair = (k, c) => [{ name: '', color: c, pts: series(k) }, { name: '', color: c, pts: pseries(k), dash: true, dot: false }];
  lineChart($('#poR'), pair('reserves', 'var(--s1)'), { yf: v => bn(v), zero: true });
  lineChart($('#poC'), pair('capUse', 'var(--s2)'), { yf: v => pct(v, 0), goal: 100, goalLab: 'capacity' });
  lineChart($('#poM'), pair('commuters', 'var(--s3)'), { yf: v => k1(v) });
  const od = $('#openDec'); if (od) od.onclick = decisionModal;
  councilPowerBind();
}

function councilPowerHTML() {
  const c = S.cn || {}, deals = Object.entries(c.deals || {}).filter(([lid, d]) => S.pol[lid] === d.oid);
  const real = S.mode === 'real', pOpen = primOpen(S), prim = c.prim || 'none';
  const opts = charterOptions(S), by = crcBallotYear(S);
  const dealList = deals.length ? `<ul class="list">${deals.map(([lid, d]) => `<li>${esc(optName2(lid, d.oid))}: ${d.votes} vote${d.votes > 1 ? 's' : ''}, <b>$${Math.round(d.votes * (d.per || DEAL_VOTE) * 1000)}M/yr</b></li>`).join('')}</ul><p class="note">Total ${bn(dealCost(S))}/yr, paid while each law stands.</p>` : '<p class="note">No deals yet. When a law is up to five votes short, the Laws tab offers one.</p>';
  const primBox = c.primDone ? `<p>${c.primDone.prim === 'none' ? 'You stayed out of the June 2029 primaries.' : `Your candidates won <b>${c.primDone.gain}</b> primar${c.primDone.gain === 1 ? 'y' : 'ies'} in June 2029.`}</p>`
    : `<div class="seg" id="primSeg" style="display:grid;grid-template-columns:minmax(0,1fr)">${Object.entries(PRIM).map(([k, P]) => `<button data-p="${k}" class="${prim === k ? 'on' : ''}" ${pOpen && !S.lost ? '' : 'disabled'}>${esc(P.label)}</button>`).join('')}</div>
      <p class="note" style="margin-top:6px">${prim === 'none' ? 'No risk, no gain.' : prim === 'some' ? 'Recruit and endorse candidates for open seats. Expected gain: 1 to 4 seats, more if you are popular. Members notice, slightly.' : 'Also run challengers against sitting members who block you. Expected gain: 2 to 8 seats if you are popular, but the members you target vote against you until the primary, and those who survive hold a grudge.'} Decided in the June 2029 primaries.</p>`;
  const crcBox = c.crc ? `<p>Your commission is preparing <b>"${esc(optName2(c.crc.lid, c.crc.oid))}"</b> for the November ${c.crc.year} ballot. Projected yes vote today: <b>${pct(crcYes(S, LAWS.find(l => l.id === c.crc.lid).opts.find(o => o.id === c.crc.oid)), 0)}</b>.</p>`
    : S.lost ? '<p class="note">You are out of office.</p>' : by > 2031 ? '<p class="note">Too late: a commission appointed now could not reach the ballot before the plan ends.</p>'
    : opts.length ? `<label class="fl">Proposal<select id="crcPick">${opts.map(x => `<option value="${x.lid}|${x.oid}">${esc(x.law)}: ${esc(x.name)}</option>`).join('')}</select></label>
      <div class="row" style="gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap"><button class="btn" id="crcGo" ${real ? '' : 'disabled'}>Appoint a commission</button><span class="note" id="crcInfo"></span></div>` : '<p class="note">Everything a commission could propose is already in force.</p>';
  const log = (c.crcLog || []).map(x => `<li>${x.year}: "${esc(optName2(x.lid, x.oid))}" ${x.res}${x.yes != null ? ` (${x.yes.toFixed(0)}% yes)` : ''}</li>`).join('');
  return `<div class="card" style="margin-top:14px"><h2>Shaping the Council</h2>
    <p class="note">The mayor cannot change the Council's powers. A mayor can change what members are offered, who sits in the Council after 2029, and which questions go straight to voters.${real ? '' : ' In Sandbox the Council does not vote, so these tools only matter under realistic rules.'}</p>
    <div class="grid g3" style="margin-top:10px">
      <div><h3>Deals with members</h3>${dealList}</div>
      <div><h3>The 2029 primaries</h3>${primBox}<p class="note">In November 2029 all 51 seats are up, and about ${OPEN_2029} are open because more than two-thirds of members reach their term limit. Your own vote share moves those open seats.</p></div>
      <div><h3>Charter Revision Commission</h3><p class="note">A commission you appoint puts Charter changes on the November ballot without a Council vote, as the 2025 commission did over Council objections. It can reorganise city government, not change state law or taxes. Appointed by June, it reaches that year's ballot.</p>${crcBox}${log ? `<ul class="list">${log}</ul>` : ''}</div>
    </div></div>`;
}
function councilPowerBind() {
  $$('#primSeg [data-p]').forEach(b => b.onclick = () => { if (!primOpen(S) || S.lost) return; cnOf(S).prim = b.dataset.p; changed(); politicsView(); });
  const sel = $('#crcPick'), info = $('#crcInfo');
  const upd = () => { if (!sel) return; const [lid, oid] = sel.value.split('|'), o = LAWS.find(l => l.id === lid).opts.find(x => x.id === oid); info.textContent = `Ballot: November ${crcBallotYear(S)}. Projected yes today: ${crcYes(S, o).toFixed(0)}%.`; };
  if (sel) { sel.onchange = upd; upd(); }
  const go = $('#crcGo'); if (go) go.onclick = () => { const [lid, oid] = sel.value.split('|'); undoStack.push(JSON.stringify(S)); const x = startCRC(S, lid, oid); if (!x) { toast('A commission cannot be appointed now.'); return; } changed(); politicsView(); toast(`Commission appointed. "${optName2(lid, oid)}" goes to voters in November ${x.year}.`); };
}
function decisionHTML() {
  const d = S.decision; if (!d) return '';
  return `<div class="card flat" id="decBox" style="margin:12px 0;border:2px solid var(--warn)"><h3>${esc(d.t)} ${qm('contract', 'contract talks')}</h3><p class="note">${esc(d.d)}</p><div class="opts">${d.opts.map(o => `<button class="opt" data-dec="${o.id}"><span class="n">${esc(o.label)}</span><span class="ds">${esc(o.d)}</span></button>`).join('')}</div><p class="note" style="margin-top:6px">If you do not decide, the city settles at 3% next quarter.</p></div>`;
}
function bindDecision(after) {
  $$('[data-dec]').forEach(b => b.onclick = () => { const id = S.decision.id; const o = RAISE_OPTS.find(x => x.id === b.dataset.dec); applyDecision(S, id, o.id); changed(); const box = $('#decBox'); if (box) box.innerHTML = `<b>Settled at ${esc(o.label)}.</b>`; if (after) after(); });
}
function decisionModal() { modal(`${decisionHTML()}<div class="row" style="justify-content:flex-end"><button class="btn" id="mClose">Later</button></div>`); bindDecision(() => { render(); }); }

// ---------- visualize ----------
let VZ = { src: 'time', ks: ['shortage', 'rent', ''], type: 'index', diff: false };
const VZ_COL = ['var(--s1)', 'var(--s2)', 'var(--s3)'];
const VZ_SRC = [['time', 'Over time (history + plan)'], ['fut', '40 possible futures (end of plan)'], ['cd', '59 districts (today)'], ['bor', 'Five boroughs (today)']];
const VZ_TYPES = { time: [['index', 'Indexed lines'], ['multi', 'Small multiples'], ['conn', 'Connected scatter'], ['scat', 'Scatter of quarters']], fut: [['scat', 'Scatter'], ['hist', 'Histograms']], cd: [['scat', 'Scatter'], ['hist', 'Histograms']], bor: [['bars', 'Bars'], ['scat', 'Scatter']] };
const VZ_PRE = [
  { n: 'Does rent follow the housing shortage?', src: 'time', ks: ['shortage', 'rent', ''], type: 'conn' },
  { n: 'Taxing the top: rate, earners, revenue', src: 'time', ks: ['rateTop', 'top', 'taxRev'], type: 'index' },
  { n: 'Deficits, interest and support across futures', src: 'fut', ks: ['deficit', 'bondRate', 'support'], type: 'scat' },
  { n: 'Poverty, rent burden and crime in 59 districts', src: 'cd', ks: ['pov', 'burd', 'crime'], type: 'scat' },
  { n: 'Do degrees protect against unemployment?', src: 'cd', ks: ['bach', 'unemp', 'pov'], type: 'scat' },
  { n: 'Which futures win the election?', src: 'fut', ks: ['support', 'vote', 'deficit'], type: 'scat' },
  { n: 'Heat deaths, emissions, power margin', src: 'time', ks: ['heat', 'ghg', 'margin'], type: 'multi' },
];
function vzDefs() { if (VZ.src === 'cd') return DLAYERS.map(l => ({ k: l.id, name: l.name, f: l.f })).concat([{ k: 'pop', name: 'Population', f: v => k1(v) }]); return VZ.src === 'bor' ? LAYERS.map(l => ({ k: l.id, name: l.name, f: l.f })) : KPIS.map(d => ({ k: d.k, name: d.name, f: d.f })); }
function vzRows() {
  if (VZ.src === 'time') { const p = proj(); return S.hist.map(h => ({ lab: tLab(h.t), t: h.t, h, proj: false })).concat(p.slice(1).map(h => ({ lab: tLab(h.t) + ' (plan)', t: h.t, h, proj: true }))); }
  if (VZ.src === 'fut') return mc().ends.map((h, i) => ({ lab: 'Future ' + (i + 1), h }));
  if (VZ.src === 'cd') { const V = cdVals(S); return CDS.map(f => ({ lab: cdName(f), h: V[f.id] })); }
  return S.bor.map(b => ({ lab: BOROUGHS.find(x => x.id === b.id).name, h: Object.fromEntries(LAYERS.map(l => [l.id, l.v(b)])) }));
}
function pearson(x, y) { const n = x.length; if (n < 3) return null; const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; } return sx > 0 && sy > 0 ? sxy / Math.sqrt(sx * sy) : null; }
const rWord = r => r == null ? 'no variation to compare' : Math.abs(r) >= 0.7 ? 'strong' : Math.abs(r) >= 0.4 ? 'moderate' : Math.abs(r) >= 0.2 ? 'weak' : 'little or none';
function vizView() {
  const defs = vzDefs(), D = Object.fromEntries(defs.map(d => [d.k, d]));
  VZ.ks = VZ.ks.map((k, i) => k && D[k] ? k : i < 2 ? defs[i].k : '');
  if (!VZ_TYPES[VZ.src].some(t => t[0] === VZ.type)) VZ.type = VZ_TYPES[VZ.src][0][0];
  const ks = VZ.ks.filter(Boolean);
  const sel = i => `<label class="vzsel"><span style="color:${VZ_COL[i]}">■</span> ${'ABC'[i]} <select data-i="${i}" aria-label="Indicator ${'ABC'[i]}">${i === 2 ? '<option value="">(none)</option>' : ''}${defs.map(d => `<option value="${d.k}" ${d.k === VZ.ks[i] ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>`;
  $('#v-viz').innerHTML = `<h1>Find the connections yourself</h1>
    <p class="lead">Pick up to three indicators, where the numbers come from and how to draw them. The bureau computes how closely each pair moves together. A strong correlation is a lead to investigate, not proof that one causes the other.</p>
    <div class="card"><div class="vzc">
      <div><div class="note">Data</div><div class="seg2" id="vzSrc">${VZ_SRC.map(s => `<button data-s="${s[0]}" class="${VZ.src === s[0] ? 'on' : ''}">${esc(s[1])}</button>`).join('')}</div></div>
      <div class="row" style="gap:8px 14px">${[0, 1, 2].map(sel).join('')}</div>
      <div><div class="note">Chart</div><div class="seg2" id="vzType">${VZ_TYPES[VZ.src].map(t => `<button data-t="${t[0]}" class="${VZ.type === t[0] ? 'on' : ''}">${esc(t[1])}</button>`).join('')}</div></div>
      ${VZ.src === 'time' ? `<label class="row" style="gap:6px;font-size:14px"><input type="checkbox" id="vzDiff" ${VZ.diff ? 'checked' : ''} style="width:18px;height:18px">Correlate quarter-to-quarter changes, not levels</label>` : ''}
    </div>
    <div class="row" style="gap:6px;margin-top:10px"><span class="note">Try:</span>${VZ_PRE.map((p, i) => `<button class="pill" data-p="${i}">${esc(p.n)}</button>`).join('')}</div></div>
    <div class="grid g21" style="margin-top:14px">
      <div class="card"><div id="vzHead"></div><div id="vzFig"></div><div id="vzLeg"></div></div>
      <div class="card"><h2>How they move together</h2><div id="vzR"></div></div>
    </div>
    <div class="card" style="margin-top:14px"><details><summary>Data table</summary><div class="scroll" id="vzT"></div></details></div>`;
  $$('#vzSrc button').forEach(b => b.onclick = () => { VZ.src = b.dataset.s; VZ.ks = VZ.src === 'bor' ? ['pov', 'unemp', ''] : VZ.src === 'cd' ? ['pov', 'burd', ''] : ['shortage', 'rent', '']; vizView(); });
  $$('#vzType button').forEach(b => b.onclick = () => { VZ.type = b.dataset.t; vizView(); });
  $$('#v-viz select').forEach(s => s.onchange = () => { VZ.ks[+s.dataset.i] = s.value; vizView(); });
  const df = $('#vzDiff'); if (df) df.onchange = () => { VZ.diff = df.checked; vizView(); };
  $$('#v-viz .pill').forEach(b => b.onclick = () => { const p = VZ_PRE[+b.dataset.p]; VZ.src = p.src; VZ.ks = p.ks.slice(); VZ.type = p.type; vizView(); });
  vzDraw(defs, D, ks);
}
function vzDraw(defs, D, ks) {
  const rows = vzRows(); const col = k => VZ_COL[VZ.ks.indexOf(k)];
  const vals = k => rows.map(r => r.h[k]);
  const fig = $('#vzFig'), head = $('#vzHead'), leg = $('#vzLeg'); fig.className = ''; leg.innerHTML = '';
  const [A, B, C] = VZ.ks; const fA = D[A].f, fB = B ? D[B].f : null;
  // correlations
  const pairs = []; for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) pairs.push([ks[i], ks[j]]);
  const series2 = k => { const v = vals(k); return VZ.src === 'time' && VZ.diff ? v.slice(1).map((x, i) => x - v[i]) : v; };
  $('#vzR').innerHTML = (pairs.length ? pairs.map(([a, b]) => { const sa = series2(a), sb = series2(b), ok = sa.map((x, i) => x != null && sb[i] != null && !isNaN(x) && !isNaN(sb[i])); const r = pearson(sa.filter((x, i) => ok[i]), sb.filter((x, i) => ok[i])); return `<div class="rrow"><div class="note"><span style="color:${col(a)}">■</span> ${esc(D[a].name)} × <span style="color:${col(b)}">■</span> ${esc(D[b].name)}</div><div class="rbar"><span><i style="left:${r == null ? 50 : 50 + Math.min(0, r) * 50}%;width:${r == null ? 0 : Math.abs(r) * 50}%"></i><b></b></span><span class="num">${r == null ? '–' : (r >= 0 ? '+' : '−') + Math.abs(r).toFixed(2)}</span></div><div class="note">${r == null ? 'One of them does not change here.' : `${rWord(r)[0].toUpperCase() + rWord(r).slice(1)} ${Math.abs(r) >= 0.2 ? (r > 0 ? 'link: they rise and fall together' : 'inverse link: when one rises, the other falls') : 'link'}.`}</div></div>`; }).join('') : '<p class="note">Pick a second indicator to compare.</p>') +
    `<p class="note" style="margin-top:10px">Pearson's r runs from −1 (perfectly opposite) to +1 (perfectly together). ${VZ.src === 'time' ? (VZ.diff ? 'Using changes removes shared trends, so what is left is closer to a real connection.' : 'Two indicators that both trend over five years will look correlated even if unrelated; tick "changes" to test that.') : VZ.src === 'bor' ? 'Five boroughs are very few points, so r is unreliable here; use it as a hint.' : VZ.src === 'cd' ? `Each district is one point. District data come from the Census survey (${esc(LIVE.cdMeta ? LIVE.cdMeta.asOf : 'ACS 2014–18')}), and some neighbouring districts share one sample area, so pairs of points can be identical.` : 'Each future has different shocks and assumptions, so links across futures show what tends to go wrong together under your plan.'} Correlation is not causation: a third factor can drive both.</p>`;
  // table
  $('#vzT').innerHTML = `<table><thead><tr><th>${VZ.src === 'time' ? 'Quarter' : VZ.src === 'fut' ? 'Future' : VZ.src === 'cd' ? 'District' : 'Borough'}</th>${ks.map(k => `<th class="r">${esc(D[k].name)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.lab)}</td>${ks.map(k => `<td class="r">${r.h[k] == null ? '–' : esc(D[k].f(r.h[k]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const T = VZ.type;
  if (T === 'index') {
    const hr = rows.filter(r => !r.proj), pr = rows.filter((r, i) => r.proj || i === hr.length - 1);
    const z = ks.some(k => { const b = rows[0].h[k]; return !(b > 0) || rows.some(r => r.h[k] <= 0); });
    const tf = k => { const v = vals(k); const m = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1, b0 = rows[0].h[k]; return x => z ? (x - m) / sd : x / b0 * 100; };
    head.innerHTML = `<h2>${z ? 'Standardized (0 = average, 1 = one standard deviation)' : 'Indexed: each starts at 100'}</h2><p class="note">${z ? 'Some values are zero or negative, so the chart shows how far each is from its own average instead of an index.' : 'A line at 120 is 20% above its own starting level. Solid: history. Dashed: your plan.'}</p>`;
    fig.className = 'fig';
    lineChart(fig, ks.flatMap(k => { const f = tf(k); return [{ name: D[k].name, color: col(k), pts: hr.map(r => [r.t, f(r.h[k])]), dot: false, lab: false }, { name: D[k].name, color: col(k), pts: pr.map(r => [r.t, f(r.h[k])]), dash: true }]; }), { yf: v => z ? v.toFixed(1) : v.toFixed(0), rlab: true });
  } else if (T === 'multi') {
    head.innerHTML = '<h2>Small multiples</h2><p class="note">Each indicator on its own scale. Solid: history. Dashed: your plan.</p>';
    fig.innerHTML = `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${ks.map((k, i) => `<div><h3><span style="color:${col(k)}">■</span> ${esc(D[k].name)}</h3><div class="fig sm" id="vzm${i}"></div></div>`).join('')}</div>`;
    ks.forEach((k, i) => { const hr = rows.filter(r => !r.proj), pr = rows.filter((r, j) => r.proj || j === hr.length - 1); lineChart($('#vzm' + i), [{ name: '', color: col(k), pts: hr.map(r => [r.t, r.h[k]]), dot: false }, { name: '', color: col(k), pts: pr.map(r => [r.t, r.h[k]]), dash: true }], { yf: v => D[k].f(v) }); });
  } else if (T === 'hist') {
    head.innerHTML = VZ.src === 'cd' ? '<h2>How the 59 districts spread out</h2><p class="note">Each bar counts districts whose value falls in that range.</p>' : '<h2>How the 40 futures spread out</h2><p class="note">Each bar counts futures whose end-of-plan value falls in that range. A wide spread means the outcome depends on luck and on assumptions.</p>';
    fig.innerHTML = `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${ks.map((k, i) => `<div><h3><span style="color:${col(k)}">■</span> ${esc(D[k].name)}</h3><div class="fig sm" id="vzh${i}"></div></div>`).join('')}</div>`;
    ks.forEach((k, i) => histo($('#vzh' + i), vals(k).filter(v => v != null), col(k), D[k].f, VZ.src === 'cd' ? 'districts' : 'futures'));
  } else if (T === 'bars') {
    head.innerHTML = '<h2>Boroughs side by side</h2>';
    fig.innerHTML = `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${ks.map(k => `<div><h3><span style="color:${col(k)}">■</span> ${esc(D[k].name)}</h3>${hbars(rows.map(r => [r.lab, r.h[k]]), col(k), D[k].f)}</div>`).join('')}</div>`;
  } else {
    if (!B) { head.innerHTML = '<h2>Pick indicator B</h2><p class="note">A scatter needs two indicators: A across, B up.</p>'; return; }
    const conn = T === 'conn';
    const cv = C ? vals(C).filter(v => v != null) : null, cl = cv ? Math.min(...cv) : 0, ch = cv ? Math.max(...cv) : 1;
    const R4 = RAMP.slice(1), cc = v => R4[ch === cl ? 1 : Math.min(3, Math.floor((v - cl) / (ch - cl) * 3.999))];
    const pts = rows.filter(r => r.h[A] != null && r.h[B] != null).map((r, i) => ({ x: r.h[A], y: r.h[B], lab: r.lab, proj: r.proj, fill: conn ? (r.proj ? 'var(--panel)' : col(A)) : C ? (r.h[C] == null ? 'var(--panel2)' : cc(r.h[C])) : col(A), tip: `${esc(D[A].name)}: ${esc(fA(r.h[A]))}<br>${esc(D[B].name)}: ${esc(fB(r.h[B]))}${C ? `<br>${esc(D[C].name)}: ${r.h[C] == null ? 'no data' : esc(D[C].f(r.h[C]))}` : ''}` }));
    head.innerHTML = `<h2>${esc(D[B].name)} against ${esc(D[A].name)}</h2><p class="note">${conn ? 'Each dot is a quarter, joined in time order. Filled: history; hollow and dashed: your plan.' : VZ.src === 'fut' ? 'Each dot is one simulated future at the end of the plan.' : VZ.src === 'cd' ? 'Each dot is a community district.' : VZ.src === 'bor' ? 'Each dot is a borough.' : 'Each dot is a quarter.'} The dashed grey line is the best straight-line fit.</p>`;
    fig.className = 'fig';
    scatter(fig, pts, { xf: fA, yf: fB, xl: D[A].name, yl: D[B].name, path: conn, labels: VZ.src === 'bor' ? 'all' : conn ? 'ends' : 'none', trend: true });
    if (C && !conn) leg.innerHTML = `<div class="legend"><span>Colour: ${esc(D[C].name)}</span><span>${esc(D[C].f(cl))}</span><span class="ramp" style="background:linear-gradient(90deg,${RAMP.slice(1).join(',')})"></span><span>${esc(D[C].f(ch))}</span></div>`;
  }
}
function scatter(el, pts, o) {
  if (el._ro) el._ro.disconnect();
  el.innerHTML = '<svg role="img"></svg><div class="tt"></div>';
  const svg = el.firstChild, tt = el.lastChild;
  const draw = () => {
    const W = el.clientWidth, H = el.clientHeight; if (!W || !H || !pts.length) return;
    const m = { l: 64, r: 18, t: 22, b: 44 };
    let x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
    const px = (x1 - x0) * 0.08 || Math.abs(x1) * 0.1 || 1, py = (y1 - y0) * 0.1 || Math.abs(y1) * 0.1 || 1; x0 -= px; x1 += px; y0 -= py; y1 += py;
    const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r), Y = y => m.t + (1 - (y - y0) / (y1 - y0)) * (H - m.t - m.b);
    let g = '';
    const ys = nice((y1 - y0) / 4); for (let v = Math.ceil(y0 / ys) * ys; v <= y1; v += ys) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${esc(o.yf(v))}</text>`;
    const nx = Math.max(2, Math.floor((W - m.l - m.r) / 120)); const xs = nice((x1 - x0) / nx); for (let v = Math.ceil(x0 / xs) * xs; v <= x1; v += xs) g += `<line x1="${X(v)}" x2="${X(v)}" y1="${m.t}" y2="${H - m.b}" stroke="var(--line)" opacity=".5"/><text x="${X(v)}" y="${H - m.b + 16}" text-anchor="middle">${esc(o.xf(v))}</text>`;
    g += `<text x="${(m.l + W - m.r) / 2}" y="${H - 6}" text-anchor="middle" style="fill:var(--ink)">${esc(o.xl)} →</text><text x="${m.l}" y="${m.t - 8}" style="fill:var(--ink)">↑ ${esc(o.yl)}</text>`;
    if (o.trend && pts.length > 2) { const n = pts.length, mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n; let sxy = 0, sxx = 0; pts.forEach(p => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; }); if (sxx > 0) { const b = sxy / sxx, a = my - b * mx; const lo = Math.min(...pts.map(p => p.x)), hi = Math.max(...pts.map(p => p.x)); g += `<line x1="${X(lo)}" y1="${Y(a + b * lo)}" x2="${X(hi)}" y2="${Y(a + b * hi)}" stroke="var(--ink2)" stroke-width="1.5" stroke-dasharray="4 4"/>`; } }
    if (o.path) { const hp = pts.filter(p => !p.proj), lastH = hp[hp.length - 1], pp = [lastH].concat(pts.filter(p => p.proj)); const d = a => a.map((p, i) => (i ? 'L' : 'M') + X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1)).join(''); g += `<path d="${d(hp)}" fill="none" stroke="var(--s1)" stroke-width="2"/>`; if (pp.length > 1) g += `<path d="${d(pp)}" fill="none" stroke="var(--s1)" stroke-width="2" stroke-dasharray="5 4"/>`; }
    pts.forEach((p, i) => { g += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="5" fill="${p.fill}" stroke="${o.path ? 'var(--s1)' : 'var(--panel)'}" stroke-width="2"/>`; });
    const lab = o.labels === 'all' ? pts : o.labels === 'ends' ? [pts[0], pts[pts.length - 1]] : [];
    lab.forEach(p => { const right = X(p.x) < W - 110; g += `<text x="${X(p.x) + (right ? 9 : -9)}" y="${Y(p.y) - 8}" text-anchor="${right ? 'start' : 'end'}" style="fill:var(--ink);paint-order:stroke;stroke:var(--panel);stroke-width:3px">${esc(p.lab.replace(' (plan)', ''))}</text>`; });
    svg.innerHTML = g;
    svg.onmousemove = e => { const r = svg.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; let best = null, bd = 28 * 28; pts.forEach(p => { const d = (X(p.x) - mx) ** 2 + (Y(p.y) - my) ** 2; if (d < bd) { bd = d; best = p; } }); if (!best) { tt.style.display = 'none'; return; } tt.innerHTML = `<b>${esc(best.lab)}</b><div>${best.tip}</div>`; tt.style.display = 'block'; tt.style.left = Math.min(W - tt.offsetWidth - 4, Math.max(0, X(best.x) + 12)) + 'px'; tt.style.top = Math.max(0, Y(best.y) - tt.offsetHeight - 8) + 'px'; };
    svg.onmouseleave = () => { tt.style.display = 'none'; };
  };
  el._ro = new ResizeObserver(draw); el._ro.observe(el); draw();
}
function histo(el, v, color, f, unit = 'futures') {
  if (el._ro) el._ro.disconnect();
  el.innerHTML = '<svg role="img"></svg><div class="tt"></div>';
  const svg = el.firstChild, tt = el.lastChild;
  const lo = Math.min(...v), hi = Math.max(...v), nb = hi === lo ? 1 : 8, w = (hi - lo) / nb || 1;
  const bins = Array.from({ length: nb }, (_, i) => ({ a: lo + i * w, b: lo + (i + 1) * w, n: 0 }));
  v.forEach(x => bins[Math.min(nb - 1, Math.floor((x - lo) / w))].n++);
  const draw = () => {
    const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
    const m = { l: 30, r: 8, t: 10, b: 26 }, mx = Math.max(...bins.map(b => b.n)), bw = (W - m.l - m.r) / nb;
    const Y = n => m.t + (1 - n / mx) * (H - m.t - m.b);
    let g = `<line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}" stroke="var(--ink2)"/>`;
    [0, Math.ceil(mx / 2), mx].forEach(n => g += `<text x="${m.l - 6}" y="${Y(n) + 4}" text-anchor="end">${n}</text>`);
    bins.forEach((b, i) => { if (!b.n) return; const x = m.l + i * bw + 1, h = H - m.b - Y(b.n); g += `<path data-i="${i}" d="M${x},${H - m.b}V${Y(b.n) + Math.min(4, h)}q0,-4 4,-4h${Math.max(0, bw - 10)}q4,0 4,4V${H - m.b}Z" fill="${color}"/>`; });
    g += `<text x="${m.l}" y="${H - 6}">${esc(f(lo))}</text><text x="${W - m.r}" y="${H - 6}" text-anchor="end">${esc(f(hi))}</text>`;
    svg.innerHTML = g;
    svg.onmousemove = e => { const r = svg.getBoundingClientRect(); const i = Math.floor((e.clientX - r.left - m.l) / bw); const b = bins[i]; if (!b) { tt.style.display = 'none'; return; } tt.innerHTML = `<b>${b.n} of ${v.length} ${unit}</b><div>${esc(f(b.a))} to ${esc(f(b.b))}</div>`; tt.style.display = 'block'; tt.style.left = Math.min(W - tt.offsetWidth - 4, m.l + i * bw + bw) + 'px'; tt.style.top = '4px'; };
    svg.onmouseleave = () => { tt.style.display = 'none'; };
  };
  el._ro = new ResizeObserver(draw); el._ro.observe(el); draw();
}


// ---------- intro walkthrough & first-visit tips ----------
const ILL = {
  city: `<svg viewBox="0 0 300 300"><polygon class="red" transform="translate(72 72) scale(0.8) translate(-185 -110)" points="185.0,36.0 203.8,92.1 263.0,92.7 215.4,127.9 233.2,184.3 185.0,150.0 136.8,184.3 154.6,127.9 107.0,92.7 166.2,92.1"/><polygon class="red" points="0,250 300,95 300,125 0,280"/>${(() => { let r = 11, g = '', x = 6; const R = () => (r = r * 16807 % 2147483647) / 2147483647; while (x < 300) { const w = 14 + R() * 24, h = 40 + R() * (x > 110 && x < 190 ? 120 : 70); g += `<rect class="ink" x="${x}" y="${300 - h}" width="${w}" height="${h}"/>`; x += w + 3; } return g; })()}<rect class="ink" x="146" y="70" width="9" height="230"/></svg>`,
  plan: `<svg viewBox="0 0 300 300"><rect class="pap sk" x="28" y="40" width="110" height="140" stroke-width="4"/>${[70, 95, 120, 145].map(y => `<rect class="ink" x="46" y="${y}" width="${40 + (y % 3) * 18}" height="9"/>`).join('')}<rect class="red" x="46" y="55" width="74" height="9"/><polygon class="red" points="140,120 238,120 238,96 284,140 238,184 238,160 140,160"/>${[0, 1, 2].map(i => `<rect class="ink" x="${170 + i * 40}" y="${300 - 60 - i * 30}" width="32" height="${60 + i * 30}"/>`).join('')}</svg>`,
  quarter: `<svg viewBox="0 0 300 300">${[0, 1, 2, 3].map(i => `<rect class="${i === 1 ? 'red' : 'ink'}" x="${24 + i * 66}" y="${110 - (i === 1 ? 18 : 0)}" width="54" height="${80 + (i === 1 ? 18 : 0)}"/><text x="${51 + i * 66}" y="${230}" text-anchor="middle" style="font:800 26px var(--display);fill:var(--ink)">Q${i + 1}</text>`).join('')}<polygon class="red" points="24,262 250,262 250,252 276,268 250,284 250,274 24,274"/></svg>`,
  balance: `<svg viewBox="0 0 300 300"><polygon class="ink" points="150,70 132,270 168,270"/><rect class="ink" x="30" y="92" width="240" height="10" transform="rotate(-8 150 97)"/><rect class="ink" x="40" y="114" width="70" height="60"/><rect class="red" x="196" y="78" width="54" height="40"/><rect class="pap sk" x="96" y="262" width="108" height="14" stroke-width="4"/><circle class="red" cx="150" cy="70" r="10"/></svg>`,
  others: `<svg viewBox="0 0 300 300">${Array.from({ length: 51 }, (_, i) => `<rect class="${i < 24 ? 'red' : 'ink'}" x="${22 + (i % 9) * 29}" y="${40 + Math.floor(i / 9) * 32}" width="22" height="22"/>`).join('')}<rect class="ink" x="22" y="244" width="254" height="10"/><text x="150" y="286" text-anchor="middle" style="font:800 22px var(--display);fill:var(--ink)">26 votes to pass</text></svg>`,
  goals: `<svg viewBox="0 0 300 300"><circle class="pap sk" cx="150" cy="150" r="118" stroke-width="10"/><circle class="red" cx="150" cy="150" r="84"/><circle class="pap" cx="150" cy="150" r="54"/><circle class="ink" cx="150" cy="150" r="24"/><polygon class="ink" points="150,150 290,30 296,40 156,160"/></svg>`,
  look: `<svg viewBox="0 0 300 300">${[50, 90, 70, 130, 110, 170].map((h, i) => `<rect class="${i === 4 ? 'red' : 'ink'}" x="${26 + i * 36}" y="${250 - h}" width="26" height="${h}"/>`).join('')}<circle class="sk" cx="217" cy="110" r="52" stroke-width="12" fill="none"/><rect class="ink" x="249" y="150" width="16" height="55" transform="rotate(-40 257 150)"/></svg>`,
};
const INTRO = [
  { ill: 'city', h: 'You run New York\'s planning bureau', p: ['It is January 2027. For the next five years you decide how New York uses its land, money and workers.', 'Every starting number comes from real 2026 data: 8.6 million people, a $126 billion budget, and about 400,000 fewer homes than the city needs.'] },
  { ill: 'plan', h: 'What a planned economy means', p: ['In a market economy, prices and private companies mostly decide what gets built and who gets it. In a planned economy, a public plan decides: how many homes, how much food and power, who trains for which job.', 'This game asks how far one city could take that idea, and what it would cost. You can go a little further than today or all the way.'] },
  { ill: 'quarter', h: 'Every quarter: decide, then run', p: ['Each turn is three months. Make your choices, then press Run quarter. The <b>Decisions</b> page collects every choice in one place and shows what you changed.'], ul: ['<b>Laws</b>: set the rules, from rent to child care to who owns what.', '<b>Taxes</b>: decide who pays for it.', '<b>Plan</b>: put money and training places where they are needed.'], p2: 'A short report then shows what happened and why.' },
  { ill: 'balance', h: 'Everything has to add up', p: ['A new home needs builders. Builders need training. Everything needs money. The Plan tab lists each resource as needed against available, the way real planning offices did it.', 'A red row is a shortage. Fix it by investing or training, or lower the goal.'] },
  { ill: 'others', h: 'You don\'t rule alone', p: ['The City Council votes on your laws, and you need 26 of 51 votes. The State government in Albany controls income tax and rent law. Unions negotiate wages, courts can strike laws down, and lenders watch your budget.', 'If deficits pile up, the State takes over the budget, as it did in 1975. In November 2029, voters decide whether you stay.'] },
  { ill: 'goals', h: 'Your goals for 2031', p: ['There are ten goals: fewer homes missing, fewer people in shelters, less hunger, enough power, lower emissions, jobs, health, child care, public support and a budget that balances.', 'Real five-year plans rarely hit every target. See how many you can, and which ones fight each other.'] },
  { ill: 'look', h: 'Look before you leap', p: ['The Economy page shows what the plan does underneath: hidden reserves, queues, black markets, graft and protest, and a map of how it all connects. The Map shows needs district by district; Scenarios runs 40 possible futures. Undo takes back the last quarter.', 'A good first move: open Laws, choose Universal child care, then press Run quarter.'] },
];
// ---------- prologue: why this exists ----------
function proPanels() {
  return [
    { bg: 'red', big: true, ill: 'star', h: 'A fair economy can be planned.',
      p: ['A home for everyone who needs one. Food on every table, clean power, child care, work that pays. None of this is beyond our means. It is a question of who decides what gets made, and for whom.'] },
    { bg: 'paper', ill: 'queue', h: 'The market cannot plan for a crisis.',
      p: ['Climate change will make water, energy, land and food scarcer everywhere. Markets answer shortages with higher prices, so the people with the least go without first. Firms build what pays today, not the flood walls, clean power and affordable homes everyone will need tomorrow.', 'Climate change has been called the greatest market failure the world has ever seen: no single firm profits from preventing it. This simulator exists to show that the alternative, a democratic socialist planned economy, is possible today.'] },
    { bg: 'black', ill: 'quarter', h: 'Winning is only half the job.',
      p: ['We pour our energy into electing the right people. Then they take office with a promise and no machine to deliver it.', 'Rent freezes, public grocery stores, free child care: keeping such promises takes builders who are not yet trained, budgets that higher governments control and votes that have to be counted. The movement needs its planning tools ready before the next victory, not after.'] },
    { bg: 'paper', ill: 'tub', h: 'Scarcity is coming. Someone will ration.',
      p: ['Heat, floods and failed harvests will make water, energy, land and food scarcer. The world can emit about 130 billion more tonnes of CO₂ for an even chance of holding warming to 1.5 °C: roughly three years at today\'s rate.', 'A market rations scarce things by price, and the poorest go without. A plan rations by need and builds before the crisis. The question is not whether we will plan, but who plans and for whom.'] },
    { bg: 'red', ill: 'ledger', h: 'We have tools no planner ever had.',
      p: ['Gosplan balanced an economy across a continent with paper ledgers, slide rules and reports that took weeks to arrive. Today public data updates every month, meters count energy by the minute and an ordinary laptop solves planning problems with millions of variables.', 'The old objection was that a plan could never know enough. Every year it knows more. What remains hard is honest reporting and real democratic control, and this game models both.'] },
    { bg: 'paper', ill: 'balance', h: 'Everything is connected. That is the point.',
      p: ['A home needs builders, builders need training, training needs teachers, everything needs power, and every law needs a majority on the city council. Run the city for five years and you will feel each choice pull on all the others.', 'Yes, it is complex. Capitalism is complex too; it just plans behind closed doors, where a few people plan for profit. We want the plan in the open, made for everyone.'] },
    { bg: 'black', ill: 'look', h: 'Real data. An honest model. On the side of planning.',
      ul: ['Every starting number comes from official public statistics: census, labour, housing and city budget data. Most refresh automatically every month.', 'Every assumption is labelled, and every source is one click away.', 'The failures of 20th-century planning are in the model too: queues, hidden reserves, graft. We take planning seriously enough to learn from where it went wrong.'] },
    { bg: 'red', big: true, ill: 'star', h: 'Take the chair.', last: true,
      p: ['Five years. Ten goals. One city. Show that it can be done, then send us your plan. The best ideas go to the people who can make them law.'] },
  ];
}
const PRO_STAR = `<svg viewBox="0 0 300 300"><polygon class="ink" points="150,30 178,112 264,112 194,162 220,246 150,196 80,246 106,162 36,112 122,112"/></svg>`;
const PRO_MARKS = {
  // a fragment of the street grid from the front page
  grid: () => { const R = pRng(5); let g = '<svg viewBox="0 0 300 300"><g transform="rotate(-29 150 150)">'; for (let i = -3; i < 8; i++) for (let j = -3; j < 10; j++) { const t = R(); g += `<rect class="${t < 0.16 ? 'red' : 'ink'}" x="${i * 50}" y="${j * 37}" width="42" height="29"/>`; } return g + '<rect class="bgc" x="-200" y="128" width="700" height="16"/></g></svg>'; },
  // the map marker: a ring and a dot on the grid
  pin: () => { const R = pRng(8); let g = '<svg viewBox="0 0 300 300"><g transform="rotate(-29 150 150)" opacity=".9">'; for (let i = -3; i < 8; i++) for (let j = -3; j < 10; j++) g += `<rect class="ink" x="${i * 50}" y="${j * 37}" width="42" height="29" opacity="${(0.25 + R() * 0.25).toFixed(2)}"/>`; return g + '</g><circle cx="150" cy="150" r="92" fill="none" class="sk" stroke-width="22"/><circle class="ink" cx="150" cy="150" r="34"/></svg>'; },
  // a city of unit squares, the planned ones in light
  units: () => { const R = pRng(11); let g = '<svg viewBox="0 0 300 300">'; for (let c = 0; c < 15; c++) { const h = 3 + Math.floor(R() * (c > 3 && c < 11 ? 11 : 7)), p = R() < 0.6 ? 1 + Math.floor(R() * 3) : 0; for (let k = 0; k < h + p; k++) g += `<rect class="${k >= h ? 'red' : 'ink'}" x="${8 + c * 19}" y="${282 - k * 19 - 15}" width="15" height="15"/>`; } return g + '</svg>'; },
  // one housing block, drawn in three faces
  block: () => '<svg viewBox="0 0 300 300"><polygon class="ink" points="150,40 250,98 250,248 150,290 150,140"/><polygon class="ink" opacity=".75" points="150,40 50,98 50,248 150,290 150,140"/><polygon class="red" points="150,40 250,98 150,150 50,98"/>' + [0, 1, 2, 3, 4].map(k => `<line x1="60" y1="${130 + k * 26}" x2="140" y2="${172 + k * 26}" class="skr" stroke-width="7"/><line x1="160" y1="${172 + k * 26}" x2="240" y2="${130 + k * 26}" class="skr" stroke-width="7"/>`).join('') + '</svg>',
};
Object.assign(PRO_MARKS, {
  // people side by side, neighbours' hands joined above their heads
  unite: () => {
    // poster style: flat colours, hard-edged shadows, heads raised toward the right, a sun and wedge rays behind
    const skin = ['#f0d2a8', '#6b3d22', '#c68650', '#3f2414', '#e2b088'], cloth = ['#111', '#f3e3c3', '#8c1410', '#111', '#f3e3c3'], wear = ['cap', 'scarf', 'hair', 'cap', 'scarf'];
    const xs = [0, 75, 150, 225, 300], sy = [226, 214, 220, 210, 224], top = 34; let arms = '', bodies = '', hands = '';
    const fist = (x, y, c, flip) => `<g transform="translate(${x} ${y}) rotate(${flip ? 10 : -10})"><polygon points="-15,-14 12,-18 17,-5 15,13 -13,16" fill="${c}" stroke="#000" stroke-width="3" stroke-linejoin="miter"/><path d="M -14 -4 H 14 M -13 6 H 14" stroke="#000" stroke-width="2.5"/><polygon points="-15,-14 -2,-16 -4,15 -13,16" fill="#000" opacity=".3"/></g>`;
    const head = (x, y, c, w) => {
      const hw = w === 'cap' ? '<polygon points="-25,-12 -21,-35 17,-38 23,-24 40,-21 37,-14" fill="#111" stroke="#000" stroke-width="3"/><rect x="-23" y="-17" width="46" height="5" fill="#8c1410"/>'
        : w === 'scarf' ? '<polygon points="-26,-4 -13,-36 17,-34 24,-18 9,-20 -6,-12 -15,26" fill="#8c1410" stroke="#000" stroke-width="3"/>'
        : '<polygon points="-24,-6 -16,-30 2,-36 20,-30 25,-20 6,-24 -10,-16 -16,4" fill="#111"/>';
      return `<g transform="translate(${x} ${y}) rotate(-12)"><polygon points="-21,-16 0,-30 17,-24 22,-8 30,1 22,5 23,13 14,25 -3,27 -15,16 -23,0" fill="${c}" stroke="#000" stroke-width="3" stroke-linejoin="miter"/><polygon points="-21,-16 -2,-28 -6,27 -15,16 -23,0" fill="#000" opacity=".32"/><path d="M 10 -6 L 18 -7" stroke="#000" stroke-width="3"/><path d="M 13 15 L 20 13" stroke="#000" stroke-width="2.5"/>${hw}</g>`;
    };
    const joins = xs.slice(0, -1).map((x, i) => [x + 37.5, top + (i % 2 ? 16 : 0)]);
    xs.forEach((x, i) => {
      const y = sy[i], sh = 34;
      const targets = [i > 0 ? joins[i - 1] : [x - 40, top + 22], i < 4 ? joins[i] : [x + 40, top + 22]];
      [[[x - sh + 6, y], targets[0], -1], [[x + sh - 6, y], targets[1], 1]].forEach(([a0, b0, d]) => { const b1 = [b0[0] - d * 7, b0[1] + 14]; const mx = a0[0] + (b1[0] - a0[0]) * 0.55, my = a0[1] + (b1[1] - a0[1]) * 0.55;
        arms += `<line x1="${a0[0]}" y1="${a0[1]}" x2="${b1[0]}" y2="${b1[1]}" stroke="#000" stroke-width="24"/><line x1="${a0[0]}" y1="${a0[1]}" x2="${b1[0]}" y2="${b1[1]}" stroke="${skin[i]}" stroke-width="17"/><line x1="${a0[0]}" y1="${a0[1]}" x2="${mx}" y2="${my}" stroke="#000" stroke-width="30"/><line x1="${a0[0]}" y1="${a0[1]}" x2="${mx}" y2="${my}" stroke="${cloth[i]}" stroke-width="24"/>`; });
      bodies += `<path d="M ${x - sh - 8} 320 L ${x - sh} ${y} L ${x - 10} ${y - 7} L ${x + 10} ${y - 7} L ${x + sh} ${y} L ${x + sh + 8} 320 Z" fill="${cloth[i]}" stroke="#000" stroke-width="3" stroke-linejoin="miter"/><polygon points="${x - sh - 8},320 ${x - sh},${y} ${x - 6},${y - 5} ${x - 18},320" fill="#000" opacity=".3"/><path d="M ${x - 11} ${y - 7} L ${x} ${y + 16} L ${x + 11} ${y - 7}" fill="none" stroke="${cloth[i] === '#111' ? '#8c1410' : '#000'}" stroke-width="4"/><rect x="${x - 8}" y="${y - 28}" width="16" height="22" fill="${skin[i]}" stroke="#000" stroke-width="2"/>${head(x, y - 50, skin[i], wear[i])}`;
    });
    joins.forEach(([x, y], i) => { hands += fist(x - 6, y + 4, skin[i], false) + fist(x + 6, y - 2, skin[i + 1], true); });
    hands += fist(xs[0] - 40, top + 22, skin[0], false) + fist(xs[4] + 40, top + 22, skin[4], true);
    const cx = 150, cy = 44, n = 16, rays = Array.from({ length: n }, (_, i) => { const a1 = (i / n) * 2 * Math.PI, a2 = a1 + Math.PI / n, r = 330; return `<polygon points="${cx},${cy} ${(cx + r * Math.cos(a1)).toFixed(1)},${(cy + r * Math.sin(a1)).toFixed(1)} ${(cx + r * Math.cos(a2)).toFixed(1)},${(cy + r * Math.sin(a2)).toFixed(1)}" fill="#000" opacity=".16"/>`; }).join('');
    return `<svg viewBox="-70 0 440 320" style="overflow:visible"><g class="rays">${rays}</g><circle cx="${cx}" cy="${cy}" r="44" fill="#f3e3c3" opacity=".92"/>${arms}${bodies}${hands}</svg>`;
  },
  // poster style without people: a city of new blocks rising toward a sun, a crane setting the last piece
  rise: () => {
    const cx = 150, cy = 140, n = 16, rays = Array.from({ length: n }, (_, i) => { const a1 = (i / n) * 2 * Math.PI, a2 = a1 + Math.PI / n, r = 330; return `<polygon points="${cx},${cy} ${(cx + r * Math.cos(a1)).toFixed(1)},${(cy + r * Math.sin(a1)).toFixed(1)} ${(cx + r * Math.cos(a2)).toFixed(1)},${(cy + r * Math.sin(a2)).toFixed(1)}" fill="#000" opacity=".16"/>`; }).join('');
    const B = [[-62, 46, 92, '#111'], [-10, 48, 134, '#111'], [44, 54, 176, '#7a1210'], [104, 46, 118, '#111'], [156, 62, 214, '#111'], [224, 48, 150, '#f3e3c3'], [278, 52, 104, '#111']];
    let g = '';
    B.forEach(([x, w, h, c]) => { const y = 280 - h, win = c === '#f3e3c3' ? '#111' : '#f3e3c3';
      g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" stroke="#000" stroke-width="3"/>`;
      for (let yy = y + 12; yy < 268; yy += 16) for (let xx = x + 8; xx + 8 <= x + w - 6; xx += 13) g += `<rect x="${xx}" y="${yy}" width="7" height="8" fill="${win}" opacity="${c === '#7a1210' ? 0.85 : 0.9}"/>`;
      g += `<polygon points="${x},${y} ${x + w * 0.32},${y} ${x + w * 0.18},280 ${x},280" fill="#000" opacity=".28"/>`; });
    const crane = `<rect x="334" y="34" width="10" height="246" fill="#111"/>${Array.from({ length: 12 }, (_, i) => `<line x1="334" y1="${44 + i * 20}" x2="344" y2="${54 + i * 20}" stroke="#f3e3c3" stroke-width="2"/>`).join('')}<rect x="190" y="30" width="190" height="9" fill="#111"/><polygon points="339,30 352,8 365,30" fill="#111"/><line x1="352" y1="9" x2="196" y2="30" stroke="#111" stroke-width="3"/><line x1="352" y1="9" x2="378" y2="30" stroke="#111" stroke-width="3"/><rect x="362" y="39" width="18" height="16" fill="#111"/><line x1="246" y1="39" x2="246" y2="96" stroke="#111" stroke-width="3"/><rect x="226" y="96" width="40" height="24" fill="#8c1410" stroke="#000" stroke-width="3"/><polygon points="226,96 238,96 232,120 226,120" fill="#000" opacity=".3"/>`;
    return `<svg viewBox="-70 0 440 320" style="overflow:visible"><defs><clipPath id="riseClip"><rect x="-400" y="-400" width="1200" height="680"/></clipPath></defs><g class="rays" clip-path="url(#riseClip)">${rays}</g><circle cx="${cx}" cy="${cy}" r="74" fill="#f3e3c3" opacity=".92"/>${g}${crane}<rect x="-74" y="280" width="458" height="14" fill="#111"/></svg>`;
  },
  // a hammer in the flat poster style: black head, cream handle, hard shadows, wedge rays behind
  hammer: () => {
    const cx = 150, cy = 120, n = 16, rays = Array.from({ length: n }, (_, i) => { const a1 = (i / n) * 2 * Math.PI, a2 = a1 + Math.PI / n, r = 330; return `<polygon points="${cx},${cy} ${(cx + r * Math.cos(a1)).toFixed(1)},${(cy + r * Math.sin(a1)).toFixed(1)} ${(cx + r * Math.cos(a2)).toFixed(1)},${(cy + r * Math.sin(a2)).toFixed(1)}" fill="#000" opacity=".16"/>`; }).join('');
    const h = `<g transform="translate(150 170) scale(1.4) translate(-150 -170) rotate(-35 150 170)">
      <rect x="136" y="118" width="28" height="196" fill="#f3e3c3" stroke="#000" stroke-width="3"/><rect x="136" y="118" width="9" height="196" fill="#000" opacity=".25"/>
      ${[248, 266, 284].map(y => `<rect x="136" y="${y}" width="28" height="9" fill="#111"/>`).join('')}
      <polygon points="66,60 250,60 250,120 66,120 26,108 26,72" fill="#111" stroke="#000" stroke-width="3" stroke-linejoin="miter"/>
      <rect x="250" y="50" width="26" height="80" fill="#111" stroke="#000" stroke-width="3"/>
      <rect x="76" y="67" width="168" height="8" fill="#f3e3c3" opacity=".35"/><rect x="255" y="57" width="6" height="66" fill="#f3e3c3" opacity=".35"/>
      <rect x="126" y="116" width="48" height="16" fill="#8c1410" stroke="#000" stroke-width="3"/></g>`;
    return `<svg viewBox="-70 0 440 320" style="overflow:visible"><g class="rays">${rays}</g>${h}</svg>`;
  },
  // raised forearms, clasped in pairs, rising from the bottom
  hands: () => {
    const skin = ['#f1d8b8', '#5a3824', '#c99368', '#8a5a3a', '#e3b48c', '#3d2618']; let g = '';
    const pairs = [[40, 110], [130, 60], [220, 100]];
    pairs.forEach(([cx, cy], p) => {
      [[-1, skin[p * 2]], [1, skin[p * 2 + 1]]].forEach(([d, c]) => { const bx = cx + d * 46; g += `<path d="M ${bx - 18} 320 L ${cx + d * 6 - 16} ${cy + 14} L ${cx + d * 6 + 16} ${cy + 18} L ${bx + 18} 320 Z" fill="${c}" stroke="#000" stroke-width="3"/><path d="M ${bx - 22} 320 L ${bx - 20} 250 L ${bx + 20} 250 L ${bx + 22} 320 Z" fill="${p === 1 && d > 0 ? '#f6ead6' : '#000'}"/>`; });
      g += `<ellipse cx="${cx}" cy="${cy}" rx="26" ry="30" fill="${skin[p * 2]}" stroke="#000" stroke-width="3"/><path d="M ${cx - 20} ${cy - 10} Q ${cx} ${cy - 30} ${cx + 22} ${cy - 6} M ${cx - 22} ${cy + 4} Q ${cx} ${cy - 14} ${cx + 22} ${cy + 8} M ${cx - 18} ${cy + 18} Q ${cx} ${cy + 2} ${cx + 18} ${cy + 20}" fill="none" stroke="#000" stroke-width="3"/>`;
    });
    return `<svg viewBox="-20 0 300 300" style="overflow:visible">${g}</svg>`;
  },
});
function proIll(k) { if (k === 'star') { const m = PRO_MARKS[(SITE && SITE.mark) || 'star']; return m ? m() : PRO_STAR; } return LILL[k] || ILL[k] || ''; }
try { window.PB_MARKS = PRO_MARKS; } catch (e) { }
function openPrologue() {
  const el = $('#prologue'); const P = proPanels();
  el.innerHTML = `<button class="btn proskip" id="proSkip">Skip to the game</button>
    <nav class="prodots" aria-label="Sections">${P.map((_, i) => `<a href="#pro${i}" aria-label="Part ${i + 1} of ${P.length}"></a>`).join('')}</nav>
    ${P.map((x, i) => `<section class="pro bg-${x.bg} ${x.big ? 'big' : ''}" id="pro${i}"><div class="prow">
      <div class="prot"><h2 ${i === 0 ? 'id="proH" tabindex="-1"' : ''}>${esc(x.h)}</h2>
        ${x.stats ? `<div class="prostats">${x.stats.map(s => `<div><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div>`).join('')}</div>` : ''}
        ${(x.p || []).map(t => `<p>${esc(t)}</p>`).join('')}${x.ul ? `<ul>${x.ul.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${x.last ? `<div class="row probtns"><button class="btn proGo" id="proStart">Start planning</button><button class="btn proAlt" id="proHow">How the game works</button></div>` : i === 0 ? `<a class="pronext" href="#pro1">Read why</a>` : ''}</div>
      ${x.ill ? `<div class="proi ill" aria-hidden="true">${proIll(x.ill)}</div>` : ''}</div></section>`).join('')}`;
  el.hidden = false; document.body.classList.add('noscroll'); el.scrollTop = 0;
  const done = () => { try { localStorage.setItem('pb-why', '1'); } catch (e) { } el.hidden = true; el.innerHTML = ''; document.body.classList.remove('noscroll'); };
  $('#proSkip').onclick = done; $('#proStart').onclick = () => { done(); const b = $('#begin'); if (b) b.focus(); };
  $('#proHow').onclick = () => { done(); openIntro(0); };
  const dots = $$('.prodots a', el);
  el.querySelectorAll('a[href^="#pro"]').forEach(a => a.onclick = e => { e.preventDefault(); const t = $(a.getAttribute('href'), el); if (t) t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { const i = +en.target.id.slice(3); dots.forEach((d, j) => d.classList.toggle('on', j === i)); el.dataset.bg = P[i].bg; } }), { root: el, threshold: 0.55 });
  $$('.pro', el).forEach(s => io.observe(s));
  el.onkeydown = e => { if (e.key === 'Escape') done(); };
  const h = $('#proH'); if (h) h.focus({ preventScroll: true });
}
const whySeen = () => { try { return localStorage.getItem('pb-why') === '1'; } catch (e) { return true; } };

let introStep = 0;
function introHTML() {
  const s = INTRO[introStep], last = introStep === INTRO.length - 1;
  return `<div class="intro"><div class="ill" aria-hidden="true">${ILL[s.ill]}</div><div class="itx">
    <div class="steps" role="tablist" aria-label="Intro steps">${INTRO.map((x, i) => `<button role="tab" aria-selected="${i === introStep}" aria-label="Step ${i + 1}: ${esc(x.h)}" class="${i === introStep ? 'on' : ''}" data-st="${i}">${i + 1}</button>`).join('')}</div>
    <h2 id="introH" tabindex="-1">${esc(s.h)}</h2>${s.p.map(t => `<p>${t}</p>`).join('')}${s.ul ? `<ul>${s.ul.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}${s.p2 ? `<p>${s.p2}</p>` : ''}
    <div class="inav"><button class="skip" id="iSkip">${last ? '' : 'Skip the intro'}</button>${introStep ? '<button class="btn" id="iBack">Back</button>' : ''}${last && S ? '<button class="btn" id="iGuide">Full guide</button>' : ''}<button class="btn go" id="iNext">${last ? (S ? 'Start planning' : 'Close') : 'Next'}</button></div></div></div>`;
}
function openIntro(step = 0) {
  introStep = step;
  const card = $('#modalCard'); card.classList.add('wide'); card.innerHTML = introHTML(); $('#modal').classList.add('on');
  const bind = () => {
    $$('[data-st]', card).forEach(b => b.onclick = () => { introStep = +b.dataset.st; card.innerHTML = introHTML(); bind(); });
    const done = () => { try { localStorage.setItem('pb-intro', '1'); } catch (e) { } card.classList.remove('wide'); closeModal(); };
    $('#iNext').onclick = () => { if (introStep === INTRO.length - 1) done(); else { introStep++; card.innerHTML = introHTML(); bind(); $('#introH').focus(); } };
    const bk = $('#iBack'); if (bk) bk.onclick = () => { introStep--; card.innerHTML = introHTML(); bind(); $('#introH').focus(); };
    $('#iSkip').onclick = done;
    const ig = $('#iGuide'); if (ig) ig.onclick = () => { done(); tab = 'guide'; render(); window.scrollTo({ top: 0 }); };
  };
  bind(); $('#iNext').focus();
}
const introSeen = () => { try { return localStorage.getItem('pb-intro') === '1'; } catch (e) { return true; } };

const TIPS = {
  justice: 'Crime, jails, overdoses and evictions, with the research behind each lever. Police and prevention budgets can be changed here or on Decisions.',
  decide: 'Every choice you can make this quarter in one place: laws, taxes, investment, training, rules and borough priorities. The box on the right lists what you changed and how many targets the plan now reaches by 2031.',
  overview: 'The control figures: every target of the plan with its starting value, today\'s value and how much of the way you have come. Select a row to chart it.',
  climate: 'Emissions against the 1.5 °C pathway and Local Law 97, where they come from, and the city\'s share of the remaining global carbon budget.',
  economy: 'What happens inside the plan: how enterprises report and hoard, queues and waiting lists, black markets, graft and protest. The map at the bottom shows how everything connects.',
  map: 'Colour shows one indicator for each of the 59 districts; pick a Height to add a second. Click a district for details, and set a borough\'s priority for new public homes.',
  laws: 'Pick one option per row. Tags show the cost, the risks and today\'s Council vote count. New laws take effect when you run the quarter.',
  taxes: 'Drag the sliders to draft a tax package and see who pays. Property tax goes to a Council vote; everything else has to be sent to Albany.',
  plan: 'Set investment and training here. The table shows where the plan is short; red rows need attention. The solver can search for the cheapest plan that meets your goals.',
  politics: 'Who can block or slow you down: Council blocs, Albany, union contracts and the bond markets.',
  scenarios: 'Save your current plan, change it, save again and compare. The lower half shows how sure you can be across 40 possible futures.',
  viz: 'Pick up to three indicators and a chart type, or start with one of the questions under "Try".',
  labor: 'Workers by sector, training pipelines and how the population is ageing. Training takes years, so start early.',
  services: 'Water, waste, safety, heat and floods: the systems that have to keep working whatever else you change.',
  budget: 'Where the money comes from and where it goes. Deficits that last four quarters hand the budget to the State.',
  trends: 'Pick any indicator to chart its simulated history and your projection, next to real historical data.',
};
function tipSeen(t) { try { return (JSON.parse(localStorage.getItem('pb-tips') || '[]')).includes(t); } catch (e) { return true; } }
function addTip(t) {
  if (!TIPS[t] || tipSeen(t)) return;
  const v = $('#v-' + t); if (!v || v.querySelector('.tip')) return;
  v.insertAdjacentHTML('afterbegin', `<div class="tip" role="note"><p><b>${esc(TABS.find(x => x[0] === t)[1])}.</b> ${esc(TIPS[t])}</p><button class="btn" data-tipx="${t}">Got it</button></div>`);
  v.querySelector('[data-tipx]').onclick = e => { try { const a = JSON.parse(localStorage.getItem('pb-tips') || '[]'); a.push(t); localStorage.setItem('pb-tips', JSON.stringify(a)); } catch (er) { } e.target.closest('.tip').remove(); };
}
// ---------- start-screen graphics: alternatives to the star ----------
const PBAND = `<polygon points="-60,780 640,262 640,352 -60,870" fill="#000"/><text transform="translate(250 600) rotate(-36.5)" style="font:900 42px var(--display);font-stretch:62%;fill:#fff7e6;letter-spacing:.03em">PLAN 2027–2031</text>`;
function pRng(seed) { let r = seed; return () => (r = r * 16807 % 2147483647) / 2147483647; }
const POSTERS = {
  star: () => posterGfx(),
  // a city built from unit squares: each square a home, red ones are planned
  squares: () => {
    const R = pRng(11); let g = ''; const s = 15, gap = 4;
    for (let c = 0; c * (s + gap) < 640; c++) {
      const x = c * (s + gap); const mid = Math.abs(x - 330) < 170;
      const h = Math.floor(5 + R() * (mid ? 26 : 16)); const plan = R() < 0.55 ? Math.floor(2 + R() * 6) : 0;
      for (let k = 0; k < h + plan; k++) { const y = 790 - k * (s + gap) - s; if (y < 40) break; g += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${k >= h ? 'var(--red)' : 'var(--ink)'}"${k >= h && k === h + plan - 1 && R() < 0.5 ? ' opacity=".5"' : ''}/>`; }
    }
    for (let i = 0; i < 40; i++) g += `<rect x="${Math.floor(R() * 32) * (s + gap)}" y="${60 + Math.floor(R() * 14) * (s + gap)}" width="${s}" height="${s}" fill="var(--red)" opacity="${(0.15 + R() * 0.5).toFixed(2)}"/>`;
    return g;
  },
  // the city seen from above: a street grid, a river, planned blocks in red
  map: () => {
    const R = pRng(5); let g = '';
    g += `<g transform="rotate(-29 330 420)">`;
    for (let i = -6; i < 16; i++) for (let j = -4; j < 20; j++) {
      const x = i * 62, y = j * 46, t = R();
      g += `<rect x="${x}" y="${y}" width="52" height="36" fill="${t < 0.16 ? 'var(--red)' : t < 0.2 ? 'none' : 'var(--ink)'}" ${t >= 0.16 && t < 0.2 ? 'stroke="var(--red)" stroke-width="3"' : ''} opacity="${t < 0.2 ? 1 : 0.88}"/>`;
    }
    g += `<rect x="-400" y="300" width="1400" height="34" fill="var(--paper)"/><rect x="250" y="-400" width="30" height="1600" fill="var(--paper)"/></g>`;
    g += `<path d="M 640 120 C 470 260 520 430 330 520 S 120 700 -20 820 L -20 900 L 120 900 C 250 760 380 690 480 560 S 560 330 680 210 Z" fill="var(--water)"/>`;
    g += `<circle cx="480" cy="300" r="58" fill="none" stroke="var(--red)" stroke-width="10"/><circle cx="480" cy="300" r="14" fill="var(--red)"/>`;
    return g;
  },
  // a tower crane lifting the plan into place
  crane: () => {
    const R = pRng(9); let g = '';
    for (let x = 0; x < 640;) { const w = 26 + R() * 46, h = 90 + R() * (x > 160 && x < 460 ? 170 : 110), open = R() < 0.25; g += open ? `<rect x="${x.toFixed(0)}" y="${(800 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="none" stroke="var(--ink)" stroke-width="4" stroke-dasharray="10 6"/>` : `<rect x="${x.toFixed(0)}" y="${(800 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="var(--ink)"/>`; x += w + 6; }
    const mx = 420, top = 90; g += `<rect x="${mx - 14}" y="${top}" width="28" height="${800 - top}" fill="var(--ink)"/>`;
    for (let y = top + 20; y < 800; y += 40) g += `<line x1="${mx - 14}" y1="${y}" x2="${mx + 14}" y2="${y + 40}" stroke="var(--paper)" stroke-width="4"/>`;
    g += `<rect x="40" y="${top}" width="560" height="22" fill="var(--ink)"/><polygon points="${mx},${top - 60} ${mx - 16},${top} ${mx + 16},${top}" fill="var(--ink)"/><line x1="${mx}" y1="${top - 60}" x2="60" y2="${top}" stroke="var(--ink)" stroke-width="3"/><line x1="${mx}" y1="${top - 60}" x2="590" y2="${top}" stroke="var(--ink)" stroke-width="3"/>`;
    g += `<rect x="520" y="${top + 22}" width="70" height="60" fill="var(--ink)"/><line x1="150" y1="${top + 22}" x2="150" y2="380" stroke="var(--ink)" stroke-width="3"/><rect x="85" y="380" width="130" height="100" fill="var(--red)"/>`;
    for (let i = 0; i < 3; i++) g += `<rect x="${97 + i * 40}" y="392" width="28" height="22" fill="var(--paper)"/><rect x="${97 + i * 40}" y="428" width="28" height="22" fill="var(--paper)"/>`;
    return g;
  },
  // the plan as a chart: five years of rising columns
  bars: () => {
    let g = ''; const yrs = [2027, 2028, 2029, 2030, 2031], base = 760;
    for (let i = 0; i <= 6; i++) g += `<line x1="40" y1="${base - i * 100}" x2="640" y2="${base - i * 100}" stroke="var(--ink)" stroke-width="${i ? 1 : 4}" opacity="${i ? 0.25 : 1}"/>`;
    yrs.forEach((y, i) => { const h = 150 + i * 105, x = 70 + i * 112; g += `<rect x="${x}" y="${base - h}" width="84" height="${h}" fill="${i === 4 ? 'var(--red)' : 'var(--ink)'}"/>`; if (i < 4) g += `<rect x="${x}" y="${base - h - 60}" width="84" height="60" fill="none" stroke="var(--red)" stroke-width="4" stroke-dasharray="8 6"/>`; g += `<text x="${x + 42}" y="${base + 40}" text-anchor="middle" style="font:800 26px var(--display);font-stretch:70%;fill:var(--ink)">${y}</text>`; });
    g += `<polyline points="112,560 224,455 336,350 448,245 560,140" fill="none" stroke="var(--red)" stroke-width="10"/><polygon points="560,110 600,150 548,168" fill="var(--red)"/>`;
    return g;
  },
};
Object.assign(POSTERS, {
  // E: a planning sheet with an approval stamp
  stamp: () => {
    let g = `<g transform="rotate(-8 400 420)"><rect x="170" y="80" width="470" height="640" fill="var(--panel)" stroke="var(--ink)" stroke-width="4"/>`;
    for (let i = 0; i < 15; i++) { const y = 150 + i * 36; g += `<line x1="200" y1="${y}" x2="610" y2="${y}" stroke="var(--ink)" stroke-width="1.5" opacity=".35"/>`; const w = 40 + ((i * 53) % 150); g += `<rect x="${560 - w}" y="${y - 22}" width="${w}" height="12" fill="${i % 5 === 3 ? 'var(--red)' : 'var(--ink)'}"/><rect x="200" y="${y - 22}" width="${60 + (i * 31) % 90}" height="8" fill="var(--ink)" opacity=".5"/>`; }
    g += `<rect x="170" y="80" width="470" height="44" fill="var(--ink)"/></g>`;
    g += `<g transform="rotate(14 370 560)" opacity=".92"><circle cx="370" cy="560" r="140" fill="none" stroke="var(--red)" stroke-width="12"/><circle cx="370" cy="560" r="112" fill="none" stroke="var(--red)" stroke-width="4"/><text x="370" y="582" text-anchor="middle" style="font:900 74px var(--display);font-stretch:62%;fill:var(--red);letter-spacing:.04em">PLAN</text><text x="370" y="520" text-anchor="middle" style="font:800 22px var(--display);font-stretch:80%;fill:var(--red);letter-spacing:.2em">APPROVED</text><text x="370" y="625" text-anchor="middle" style="font:800 22px var(--display);font-stretch:80%;fill:var(--red);letter-spacing:.2em">2027–2031</text></g>`;
    return g;
  },
  // F: isometric housing blocks, the planned ones in red
  iso: () => {
    let g = ''; const blk = (x, y, w, d, h, c) => { const ux = 0.866, uy = 0.5;
      const A = [x, y], B = [x + w * ux, y + w * uy], C = [x + w * ux - d * ux, y + w * uy + d * uy], D = [x - d * ux, y + d * uy];
      const up = p => [p[0], p[1] - h]; const P = a => a.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
      const top = [up(A), up(B), up(C), up(D)], right = [B, C, up(C), up(B)], left = [D, C, up(C), up(D)];
      const f = c === 'red' ? ['var(--red)', 'color-mix(in srgb,var(--red) 75%,#000)', 'color-mix(in srgb,var(--red) 55%,#000)'] : c === 'open' ? ['none', 'none', 'none'] : ['var(--paper)', 'var(--ink)', 'color-mix(in srgb,var(--ink) 70%,var(--paper))'];
      let s = `<polygon points="${P(left)}" fill="${f[1]}" stroke="var(--ink)" stroke-width="2"/><polygon points="${P(right)}" fill="${f[2]}" stroke="var(--ink)" stroke-width="2"/><polygon points="${P(top)}" fill="${f[0]}" stroke="var(--ink)" stroke-width="2" ${c === 'open' ? 'stroke-dasharray="6 5"' : ''}/>`;
      if (c !== 'open') for (let k = 1; k * 26 < h - 10; k++) s += `<line x1="${D[0].toFixed(1)}" y1="${(D[1] - k * 26).toFixed(1)}" x2="${C[0].toFixed(1)}" y2="${(C[1] - k * 26).toFixed(1)}" stroke="${c === 'red' ? 'var(--paper)' : 'var(--paper)'}" stroke-width="2" opacity=".5"/>`;
      return s; };
    const L = [[470, 300, 80, 80, 300, 'ink'], [330, 380, 80, 80, 200, 'red'], [560, 400, 70, 70, 160, 'ink'], [420, 470, 90, 70, 250, 'red'], [250, 500, 70, 70, 120, 'open'], [530, 560, 80, 70, 110, 'red'], [340, 600, 80, 80, 140, 'ink'], [470, 680, 90, 80, 80, 'ink'], [230, 680, 70, 70, 60, 'red']];
    L.sort((a, b) => a[1] - b[1]).forEach(b => g += blk(...b));
    return g;
  },
  // G: a radial city map, districts and ring roads
  radial: () => {
    const cx = 450, cy = 470; let g = '';
    for (let r = 340; r > 0; r -= 56) g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--ink)" stroke-width="${r % 112 === 4 ? 9 : 3}"/>`;
    for (let a = 0; a < 360; a += 30) { const t = a * Math.PI / 180; g += `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(t) * 360).toFixed(0)}" y2="${(cy + Math.sin(t) * 360).toFixed(0)}" stroke="var(--ink)" stroke-width="${a % 90 ? 3 : 8}"/>`; }
    const seg = (r0, r1, a0, a1) => { const p = (r, a) => `${(cx + Math.cos(a * Math.PI / 180) * r).toFixed(1)},${(cy + Math.sin(a * Math.PI / 180) * r).toFixed(1)}`; return `<path d="M ${p(r0, a0)} L ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 0 0 ${p(r0, a0)} Z" fill="var(--red)"/>`; };
    [[60, 116, 0, 30], [116, 172, 90, 120], [172, 228, 210, 240], [228, 284, 300, 330], [116, 172, 330, 360], [284, 340, 30, 60], [172, 228, 150, 180]].forEach(s => g += seg(...s));
    g += `<circle cx="${cx}" cy="${cy}" r="22" fill="var(--ink)"/>`;
    return `<g clip-path="inset(0 0 0 130px)">${g}</g>`;
  },
  // H: a transit-map composition
  metro: () => {
    let g = ''; const line = (pts, c, w) => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
    const L1 = [[170, 820], [170, 560], [330, 400], [600, 400]], L2 = [[620, 160], [470, 310], [470, 820]], L3 = [[250, 120], [250, 300], [520, 570], [620, 570]], L4 = [[640, 700], [360, 700], [300, 640]];
    g += line(L1, 'var(--red)', 22) + line(L2, 'var(--ink)', 22) + line(L3, 'var(--ink)', 10) + line(L4, 'var(--red)', 10);
    [[170, 650], [250, 480], [330, 400], [470, 400], [560, 400], [470, 310], [470, 520], [470, 700], [250, 200], [387, 437], [570, 570], [360, 700], [560, 700]].forEach(([x, y], i) => g += `<circle cx="${x}" cy="${y}" r="${i === 3 || i === 7 ? 20 : 12}" fill="var(--paper)" stroke="var(--ink)" stroke-width="6"/>`);
    return g;
  },
});
try { window.PB_POSTERS = POSTERS; } catch (e) { }

function posterGfx() {
  let r = 7, g = ''; const R = () => (r = r * 16807 % 2147483647) / 2147483647;
  const cx = 330, cy = 300, L = 320;
  for (let i = 0; i < 32; i++) { const a0 = (i / 32) * Math.PI * 2, a1 = a0 + Math.PI / 80; g += `<polygon points="${cx},${cy} ${(cx + Math.cos(a0) * L).toFixed(1)},${(cy + Math.sin(a0) * L).toFixed(1)} ${(cx + Math.cos(a1) * L).toFixed(1)},${(cy + Math.sin(a1) * L).toFixed(1)}" fill="var(--red)"/>`; }
  g += `<circle cx="${cx}" cy="${cy}" r="172" fill="var(--paper)"/><polygon fill="var(--red)" points="330.0,144.0 367.6,260.2 489.8,260.1 390.9,331.8 428.7,447.9 330.0,376.0 231.3,447.9 269.1,331.8 170.2,260.1 292.4,260.2"/><polygon fill="var(--paper)" points="330.0,272.0 339.1,299.5 368.0,299.6 344.7,316.8 353.5,344.4 330.0,327.5 306.5,344.4 315.3,316.8 292.0,299.6 320.9,299.5"/>`;
  let sk = ''; for (let x = 0; x < 620;) { const w = 18 + R() * 40, h = 70 + R() * (x > 220 && x < 420 ? 200 : 120); sk += `<rect x="${x.toFixed(0)}" y="${(800 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}"/>`; x += w + 4; }
  g += `<g class="sky">${sk}</g>`;
  g += `<polygon points="-60,780 640,262 640,352 -60,870" fill="#000"/>`;
  g += `<text transform="translate(250 600) rotate(-36.5)" style="font:900 42px var(--display);font-stretch:62%;fill:#fff7e6;letter-spacing:.03em">PLAN 2027–2031</text>`;
  return g;
}


// ---------- economy: enterprises, queues, leakage, building cycle, transit, protest, cause & effect ----------
const CM_NODES = [
  { id: 'laws', x: 70, y: 50, n: 'Laws', v: () => `${LAWS.filter(l => S.pol[l.id] !== l.opts[0].id).length} changed`, d: 'Your laws set rents, ownership, prices and how enterprises are run.' },
  { id: 'taxes', x: 70, y: 150, n: 'Taxes', v: () => bn(S.taxNow ? S.taxNow.total : 89.9), d: 'Rates set by the Council and Albany. Higher rates raise money but some earners and firms leave.' },
  { id: 'plan', x: 70, y: 250, n: 'Plan investment', v: () => bn(Object.values(S.plan.cap).reduce((a, b) => a + b, 0)) + '/yr', d: 'Capital and training you fund each year.' },
  { id: 'firms', x: 70, y: 350, n: 'Enterprise rules', v: () => (REGIMES[S.pol.firms] || REGIMES.k0).name, d: 'How public enterprises are managed decides how honestly they report, how much they hoard and how good their output is.' },
  { id: 'audit', x: 70, y: 450, n: 'Audits & statistics', v: () => bn(S.plan.audit || 0) + '/yr', d: 'Inspectors and statisticians. They close the gap between reports and reality and reduce graft.' },
  { id: 'transit', x: 70, y: 550, n: 'Transit capacity', v: () => bn(S.plan.cap.transit || 0) + '/yr', d: 'Signals, buses and bus lanes. More capacity means less crowding and shorter commutes.' },
  { id: 'info', x: 290, y: 400, n: 'Planning information', v: () => pct(S.info * 100, 0), d: 'How well the bureau knows what is really happening. Bad data makes every plan miss.' },
  { id: 'graft', x: 290, y: 490, n: 'Waste & graft', v: () => pct(S.d.leak), d: 'Share of new spending lost to inflated invoices, no-show contracts and waste. Rises when programmes grow fast.' },
  { id: 'eff', x: 470, y: 330, n: 'Plan efficiency', v: () => pct((0.72 + 0.28 * S.info) * 100, 0), d: 'How much real output each planned dollar buys.' },
  { id: 'crews', x: 290, y: 250, n: 'Workers & training', v: () => k1(S.lab.sectors.constr) + ' builders', d: 'Every project needs trained workers. Training takes years.' },
  { id: 'climate', x: 290, y: 150, n: 'Business climate', v: () => S.ec.climate.toFixed(0), d: 'How willing firms and high earners are to stay and invest.' },
  { id: 'stores', x: 290, y: 50, n: 'Prices & city stores', v: () => n0(S.f.stores) + ' stores', d: 'Controlled prices make goods cheaper but can create shortages.' },
  { id: 'homes', x: 650, y: 290, n: 'Homes built', v: () => k1(S.h.done * 4) + '/yr', d: 'New homes finished, public and private.' },
  { id: 'jobs', x: 470, y: 150, n: 'Jobs', v: () => pct(S.lab.unemployed / S.lab.lf * 100) + ' unemployed', d: 'Employment depends on the business climate, public jobs and training.' },
  { id: 'queues', x: 470, y: 50, n: 'Queues', v: () => S.d.queueMin.toFixed(0) + ' min', d: 'When prices are below what it costs to supply, people queue and goods vanish to the black market.' },
  { id: 'informal', x: 650, y: 50, n: 'Informal economy', v: () => pct(S.d.informal), d: 'Cash work and black markets. They pay no tax.' },
  { id: 'revenue', x: 650, y: 170, n: 'Tax revenue', v: () => bn(S.b.rev), d: 'Taxes, aid and fees.' },
  { id: 'shortage', x: 830, y: 290, n: 'Housing shortage', v: () => k1(S.h.shortage), d: 'Homes the city lacks.' },
  { id: 'rent', x: 830, y: 380, n: 'Rents', v: () => S.h.rentIdx.toFixed(0), d: 'Market rents rise with the shortage and with demand pushed out of rationed housing.' },
  { id: 'waitlist', x: 830, y: 470, n: 'Waiting lists', v: () => k1(S.d.waitlist), d: 'Families waiting for public housing. Turnover is only about 2% a year.' },
  { id: 'budget', x: 830, y: 170, n: 'Budget balance', v: () => bn(S.b.deficit), d: 'Deficits for four quarters hand the budget to the State.' },
  { id: 'rating', x: 830, y: 50, n: 'Credit rating', v: () => ratingName(S.fin.notch).replace(' (S&P scale)', ''), d: 'Lenders charge more when deficits and reserve use pile up.' },
  { id: 'commute', x: 470, y: 550, n: 'Commutes', v: () => S.d.commuteAvg.toFixed(1) + ' min', d: 'Crowded trains and homes far from jobs make commutes longer.' },
  { id: 'protest', x: 650, y: 550, n: 'Protest pressure', v: () => S.d.protest.toFixed(0), d: 'Queues, rents, commutes, job losses and cuts bring people onto the streets.' },
  { id: 'support', x: 830, y: 550, n: 'Public support', v: () => pct(S.support, 0), d: 'Decides Council votes and the 2029 election.' },
  { id: 'council', x: 650, y: 440, n: 'Council votes', v: () => '26 of 51 needed', d: 'Laws need 26 votes. Members follow public opinion.' },
];
const CM_EDGES = [
  ['taxes', 'revenue', 1], ['taxes', 'climate', -1], ['climate', 'jobs', 1], ['climate', 'revenue', 1], ['plan', 'crews', 1], ['plan', 'homes', 1], ['plan', 'budget', -1],
  ['crews', 'homes', 1], ['firms', 'info', 0], ['firms', 'eff', 0], ['audit', 'info', 1], ['audit', 'graft', -1], ['info', 'eff', 1], ['graft', 'eff', -1], ['eff', 'homes', 1],
  ['homes', 'shortage', -1], ['shortage', 'rent', 1], ['shortage', 'waitlist', 1], ['rent', 'support', -1], ['waitlist', 'protest', 1], ['laws', 'stores', 1], ['laws', 'rent', -1],
  ['stores', 'queues', 1], ['queues', 'informal', 1], ['informal', 'revenue', -1], ['queues', 'protest', 1], ['revenue', 'budget', 1], ['budget', 'rating', 1], ['rating', 'budget', 1],
  ['jobs', 'revenue', 1], ['jobs', 'protest', -1], ['transit', 'commute', -1], ['commute', 'protest', 1], ['protest', 'support', -1], ['support', 'council', 1], ['council', 'laws', 1], ['firms', 'budget', 0],
];
let cmSel = 'eff';
function causalMap() {
  const N = Object.fromEntries(CM_NODES.map(n => [n.id, n])), W = 140, H = 40;
  const link = CM_EDGES.filter(e => e[0] === cmSel || e[1] === cmSel);
  let g = `<defs>${['ink', 'red', 'good', 'line'].map(c => `<marker id="ar-${c}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--${c === 'line' ? 'line' : c})"/></marker>`).join('')}</defs>`;
  CM_EDGES.forEach(([a, b, sgn]) => {
    const A = N[a], B = N[b], on = a === cmSel || b === cmSel;
    const x1 = A.x + (B.x > A.x + 10 ? W / 2 : B.x < A.x - 10 ? -W / 2 : 0), y1 = A.y + (Math.abs(B.x - A.x) <= 10 ? (B.y > A.y ? H / 2 : -H / 2) : 0);
    const x2 = B.x + (A.x > B.x + 10 ? W / 2 : A.x < B.x - 10 ? -W / 2 : 0), y2 = B.y + (Math.abs(B.x - A.x) <= 10 ? (A.y > B.y ? H / 2 : -H / 2) : 0);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + (a === 'rating' ? 24 : 0);
    const c = on ? (sgn > 0 ? 'good' : sgn < 0 ? 'red' : 'ink') : 'line';
    g += `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" fill="none" stroke="var(--${c})" stroke-width="${on ? 2.5 : 1.2}" ${sgn === 0 && on ? 'stroke-dasharray="5 4"' : ''} marker-end="url(#ar-${c})" opacity="${on ? 1 : 0.55}"/>`;
  });
  CM_NODES.forEach(n => { const on = n.id === cmSel, near = link.some(e => e[0] === n.id || e[1] === n.id); g += `<g class="cmn" data-n="${n.id}" tabindex="0" role="button" aria-label="${esc(n.n)}"><rect x="${n.x - W / 2}" y="${n.y - H / 2}" width="${W}" height="${H}" fill="${on ? 'var(--red)' : near ? 'var(--panel)' : 'var(--panel2)'}" stroke="${on || near ? 'var(--ink)' : 'var(--line)'}" stroke-width="${on ? 2 : 1.2}"/><text x="${n.x}" y="${n.y - 3}" text-anchor="middle" style="font:700 12.5px var(--text);fill:${on ? '#fff' : 'var(--ink)'}">${esc(n.n)}</text><text x="${n.x}" y="${n.y + 12}" text-anchor="middle" style="font:500 11px var(--text);fill:${on ? '#fff' : 'var(--ink2)'}">${esc(n.v())}</text></g>`; });
  const sel = N[cmSel];
  const ins = link.filter(e => e[1] === cmSel).map(e => `${N[e[0]].n} ${e[2] > 0 ? 'raises' : e[2] < 0 ? 'lowers' : 'changes'} it`);
  const outs = link.filter(e => e[0] === cmSel).map(e => `it ${e[2] > 0 ? 'raises' : e[2] < 0 ? 'lowers' : 'changes'} ${N[e[1]].n.toLowerCase()}`);
  return { svg: g, txt: `<b>${esc(sel.n)}: ${esc(sel.v())}.</b> ${esc(sel.d)} ${ins.length ? esc(ins.join('; ')) + '.' : ''} ${outs.length ? esc(outs[0][0].toUpperCase() + outs.join('; ').slice(1)) + '.' : ''}` };
}
function economyView() {
  const D = S.d, g = REGIMES[S.pol.firms] || REGIMES.k0, h = S.hist, last = h[h.length - 1];
  const row = (name, val, note) => `<tr><td>${esc(name)}${note ? `<br><span class="note">${esc(note)}</span>` : ''}</td><td class="r"><b class="num">${esc(val)}</b></td></tr>`;
  const cm = causalMap();
  $('#v-economy').innerHTML = `<h1>The economy under the plan</h1>
    <p class="lead">A plan is carried out by enterprises, offices and people who all respond to it. This page shows the side effects that decided the fate of real planned economies: hidden reserves, hoarding, queues, waiting lists, black markets, graft, half-finished projects and protest.</p>
    <section class="econ">
      <div><h2>Public enterprises</h2><p class="note">Run as: <b>${esc(g.name)}</b> (change it under Laws). Public enterprises produce ${pct(D.peWeight * 100, 0)} of the city's output; the more they produce, the more their rules matter.</p>
        <table><tbody>${row('Spare capacity hidden from the bureau', pct(D.conceal * 100), 'Managers keep reserves so next year\'s target stays reachable')}${row('Extra inputs requested and hoarded', pct(D.hoardNow * 100), 'Insurance against supply delays; it raises everyone\'s costs')}${row('Gap between reports and reality', pct(D.dataGap), 'Feeds directly into planning information')}${row('Phantom completions', k1(D.phantom), 'Homes reported as finished that are not ready')}${row('Quality of public output', D.quality.toFixed(0), '100 = today')}${row('Losses covered by the city', bn(D.subsidy) + '/yr', g.soft >= 0.9 ? 'Soft budget: losses are always refinanced' : 'Partly hard budget: loss-makers shed staff')}${row('Jobs lost in closures', k1(D.closures))}</tbody></table></div>
      <div><h2>Queues and waiting lists</h2>
        <table><tbody>${row('Families on the public housing waiting list', k1(D.waitlist), '241,000 in 2025')}${row('Years to clear the list at today\'s pace', D.waitYears.toFixed(0))}${row('Applications per affordable home in the lottery', n0(D.lottery), 'About 600 in 2024')}${row('Queue at city stores', D.queueMin.toFixed(0) + ' min', S.pol.food === 'f3' || S.pol.food === 'f4' ? 'Prices are controlled' : 'Prices are not controlled')}${row('Extra private rent growth from demand pushed out of rationed housing', '+' + (D.spill * 0.32).toFixed(2) + ' pts/yr')}</tbody></table></div>
      <div><h2>Leaks</h2>
        <table><tbody>${row('Informal economy (share of activity)', pct(D.informal), 'Untaxed cash work and black markets; costs sales and business taxes')}${row('New spending lost to waste and graft', pct(D.leak), 'Grows with fast programme growth; audits cut it')}${row('City contracts registered late', pct(D.late, 0), '80.7% in FY2024; late contracts mean unpaid providers')}${row('Audits budget', bn(S.plan.audit || 0) + '/yr', 'Set under Plan → Rules of allocation')}</tbody></table></div>
      <div><h2>The building cycle</h2>
        <table><tbody>${row('Public homes paid for but stalled', k1(D.stalled), 'When starts exceed the construction workforce')}${row('Money tied up in unfinished projects', bn(D.stalledB))}${row('Construction cost index', S.h.costIdx.toFixed(3), '1.000 = 2027')}${row('Extra projects enterprises start', pct(g.hunger * 100, 0), 'Investment hunger: success is measured by growth')}</tbody></table></div>
      <div><h2>Transit and commutes</h2><p class="note">Crowding ${D.crowd.toFixed(2)}× today's level. Average commute ${D.commuteAvg.toFixed(1)} minutes one way.</p>
        ${hbars(['BX', 'BK', 'MN', 'QN', 'SI'].map(b => [boroName(b), D.commute[b]]), 'var(--s1)', v => v.toFixed(1) + ' min')}<p class="note">Starting values: ACS 2020–24 mean travel time to work.</p></div>
      <div><h2>Protest pressure</h2><div class="pbar big"><i style="width:${Math.min(100, D.protest)}%;background:${D.protest > 45 ? 'var(--red)' : 'var(--ink)'}"></i></div><p class="note">${D.protest > 45 ? 'High: protests are likely and Council members are wavering.' : D.protest > 25 ? 'Rising: grievances are building.' : 'Low.'} It reduces public support by ${D.supPen.toFixed(1)} points.</p><div class="fig sm" id="ecP"></div></div>
    </section>
    <section class="cmwrap"><h2>Cause and effect</h2><p class="note">How the parts of the model push on each other. Select a box to see its links: green raises, red lowers, dashed depends on your choices. Values are live.</p>
      <div class="scroll"><svg class="cmap" viewBox="0 0 900 600" role="img" aria-label="Cause and effect map">${cm.svg}</svg></div><p id="cmTxt" class="cmtxt">${cm.txt}</p></section>`;
  const pair = (k, c) => [{ name: '', color: c, pts: series(k) }, { name: '', color: c, pts: pseries(k), dash: true, dot: false }];
  lineChart($('#ecP'), pair('protest', 'var(--red)'), { yf: v => v.toFixed(0), zero: true });
  $$('#v-economy .cmn').forEach(n => { const go = () => { cmSel = n.dataset.n; const c = causalMap(); $('#v-economy .cmap').innerHTML = c.svg; $('#cmTxt').innerHTML = c.txt; economyBind(); }; n.onclick = go; n.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; });
}
function economyBind() { $$('#v-economy .cmn').forEach(n => { const go = () => { cmSel = n.dataset.n; const c = causalMap(); $('#v-economy .cmap').innerHTML = c.svg; $('#cmTxt').innerHTML = c.txt; economyBind(); }; n.onclick = go; n.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; }); }


// ---------- "?" help for every decision ----------
const LAW_INFO = {
  housing: 'Who owns rental homes and how rents are set. About 1 million NYC apartments are rent-stabilized today; the Rent Guidelines Board sets their yearly increases.',
  land: 'How land is taxed and who holds it. Land prices drive the cost of every home and building the plan wants.',
  energy: 'Who owns the power system. Con Edison is investor-owned; NYPA, a State authority, already supplies City buildings.',
  food: 'How food reaches households. Five city-owned grocery stores are planned; most food comes through private chains and the Hunts Point market.',
  transit: 'What riders pay. Fares are set by the MTA, a State authority, so fare changes need Albany.',
  health: 'How medical care is provided. NYC Health + Hospitals already runs 11 public hospitals.',
  elder: 'Care for the 1.5 million New Yorkers aged 65 and over. Home-care aides are already scarce.',
  safety: 'How the city responds to crime and crises, from police to mental-health teams.',
  drugs: 'How the city treats drug use: as a crime, or as a health problem. About 1,900 New Yorkers died of overdoses in 2025.',
  evict: 'What happens when tenants fall behind. Marshals evicted about 18,000 households in 2025, and evictions feed the shelters.',
  work: 'Who owns businesses. Ranges from supporting co-ops to taking over large firms.',
  labor: 'Jobs and pay. A job guarantee hires anyone who wants work; a pay-ratio cap limits top salaries.',
  care: 'Child care for children under five. Families can pay more than $26,000 a year today.',
  cuny: 'The City University, which also trains the workers the plan needs.',
  method: 'How the bureau makes the plan: by budget, by physical balances, with real-time data, with assemblies or with markets.',
  carbon: 'How hard the city pushes buildings and streets off fossil fuels. Buildings cause about two-thirds of NYC emissions, transport most of the rest.',
  firms: 'The rules managers of public enterprises work under. They decide how honestly enterprises report, how much they hoard, how good their output is and who pays for their losses.',
};
function fxText(fx) {
  const t = [];
  if (fx.op) t.push(`Costs about ${bn(fx.op)} a year to run.`);
  if (fx.capex) t.push(`One-time cost of about ${bn(fx.capex)}.`);
  if (fx.rentG) t.push(`Rents grow about ${Math.abs(fx.rentG)} points a year ${fx.rentG < 0 ? 'slower' : 'faster'}.`);
  if (fx.privBuild && fx.privBuild !== 1) t.push(`Private builders start ${fx.privBuild < 1 ? Math.round((1 - fx.privBuild) * 100) + '% fewer' : Math.round((fx.privBuild - 1) * 100) + '% more'} homes.`);
  if (fx.maint) t.push('Landlords spend less on repairs, so older buildings decline faster.');
  if (fx.climate) t.push(`Business climate ${fx.climate < 0 ? 'falls' : 'rises'} by ${Math.abs(fx.climate)} points a year: ${fx.climate < 0 ? 'some firms and high earners leave, taking taxes with them' : 'firms invest and stay'}.`);
  if (fx.flight) t.push('Top earners move out faster.');
  if (fx.support) t.push(`Public support ${fx.support > 0 ? 'rises' : 'falls'} by about ${Math.abs(fx.support)} point${Math.abs(fx.support) === 1 ? '' : 's'}.`);
  if (fx.legal) t.push(`Legal risk: courts may strike it down (${fx.legal >= 3 ? 'high' : 'some'} risk).`);
  if (fx.albany) t.push('Needs a vote of the State Legislature in Albany.');
  if (fx.storesCap === 5) t.push('Builds the five pilot city grocery stores.');
  if (fx.storesCap === 9999) t.push('Lets you build as many city grocery stores as you fund in the Plan.');
  if (fx.privFood) t.push('Private grocers stock less at controlled prices: shortages and queues follow.');
  if (fx.black) t.push('A black market grows.');
  if (fx.ration) t.push('Staples are rationed by card: fair shares, but long queues and a second market.');
  if (fx.rides) t.push(`Transit ridership rises about ${Math.round(fx.rides * 100)}%.`);
  if (fx.life) t.push('Life expectancy rises slowly over the years.');
  if (fx.healthNeed) t.push(`Needs about ${n0(fx.healthNeed)} more health workers; train them in the Plan.`);
  if (fx.aideGrow) t.push('More people become home-care aides each year.');
  if (fx.crime) t.push(`Shootings fall about ${Math.abs(fx.crime * 100)}% a year faster.`);
  if (fx.morale) t.push(`Worker morale ${fx.morale > 0 ? 'rises' : 'falls'}, which changes productivity.`);
  if (fx.nationalize) t.push('The city takes over large firms; many owners and investors leave.');
  if (fx.jg) t.push('The city hires unemployed people at about $55,000 a year with benefits.');
  if (fx.universal) t.push('Every family can claim a free seat; demand rises, so you must build centers and train educators.');
  if (fx.cunyCap) t.push(`Adds about ${n0(fx.cunyCap)} training seats a year.`);
  if (fx.info) t.push(`Planning information settles at about ${Math.round(fx.info * 100)}%.`);
  if (fx.noise) t.push('Results stray further from targets.');
  if (fx.infoRamp) t.push(`Takes about ${fx.infoRamp} quarters to reach full effect.`);
  if (fx.costMult && fx.costMult !== 1) t.push(`Building costs ${fx.costMult < 1 ? 'fall' : 'rise'} about ${Math.round(Math.abs(1 - fx.costMult) * 100)}%.`);
  if (fx.energyCost && fx.energyCost !== 1) t.push(`Electricity costs about ${Math.round((1 - fx.energyCost) * 100)}% less.`);
  if (fx.police) t.push(`${fx.police > 0 ? 'Adds' : 'Moves'} about $${Math.abs(fx.police)}B a year ${fx.police > 0 ? 'to' : 'out of'} the NYPD budget.`);
  if (fx.prevent) t.push(`Puts about $${fx.prevent}B a year into prevention and civilian crisis teams.`);
  if (fx.lowlevel) t.push(`Low-level arrests and summonses ${fx.lowlevel > 0 ? 'rise' : 'fall'} about ${Math.round(Math.abs(fx.lowlevel) * 100)}%.`);
  if (fx.od) t.push(`Overdose deaths fall about ${Math.round(-fx.od * 100)}%.`);
  if (fx.jail) t.push(`Jail population falls about ${Math.round(-fx.jail * 100)}%.`);
  if (fx.evict) t.push(`Evictions fall about ${Math.round(-fx.evict * 100)}%.`);
  if (fx.elec) t.push(`Speeds up the switch of building heat to electric heat pumps by about ${(fx.elec * 100).toFixed(1)} points a year.`);
  if (fx.car) t.push(`Car traffic falls about ${Math.round(-fx.car * 100)}%.`);
  if (fx.lag) t.push(`Projects take ${fx.lag} quarter${fx.lag === 1 ? '' : 's'} longer.`);
  return t;
}
function regimeText(k) {
  const g = REGIMES[k]; if (!g) return [];
  return [`Managers hide about ${Math.round(g.conceal * 100)}% of capacity and request ${Math.round(g.hoard * 100)}% more inputs than needed.`, g.falsify ? `About ${Math.round(g.falsify * 100)}% of reported completions are not real.` : 'Reports are mostly honest.', g.quality < 0 ? 'Quality of output declines.' : g.quality > 0 ? 'Quality of output improves.' : 'Quality stays as it is.', g.soft >= 0.9 ? 'Losses are always covered by the city budget (a soft budget).' : `The city covers only ${Math.round(g.soft * 100)}% of losses; loss-makers shed staff.`, g.wage ? `Wage pressure: about +${g.wage.toFixed(2)} points a year on pay in public enterprises.` : '', `Enterprises start about ${Math.round(g.hunger * 100)}% more projects than they can build.`, 'These effects grow with the share of the economy public enterprises run (see Economy).'].filter(Boolean);
}
const CAP_HELP = {
  build: 'Money for the city to build homes it owns. Each home costs about $650,000 today, rising when builders are scarce. Homes take land-use review plus about two years to build. A share goes to people leaving shelters (see Rules).',
  nycha: 'Extra money to repair existing public housing. NYCHA needs $78.3B over 20 years. Below about $3.9B a year in total, buildings keep deteriorating and some apartments become unlivable.',
  acq: 'Buy existing rental buildings at market value and run them as social housing. Needs the law "Municipalize with compensation". Adds no new homes but lowers rents across the market as the public share grows.',
  storage: 'Batteries that charge at night and discharge at the summer peak. The fastest fix for the shortfall NYISO projects for New York City.',
  solar: 'Solar on roofs and community sites. Clean energy, but only about a quarter of its capacity is available at the evening summer peak.',
  wind: 'Offshore wind connected into the city. Large amounts of clean energy, but it takes about four years to come online.',
  eff: 'Insulation, heat pumps and efficient equipment in buildings. Lowers peak demand and emissions; buildings cause about 70% of NYC emissions.',
  stores: 'City-owned grocery stores that sell staples below typical prices. Each serves about 15,000 people and takes about 18 months to open. Needs a public grocery law to scale.',
  care: 'New child-care centers. Seats open after a year and then cost about $22,000 each per year to run. Needs trained early-childhood educators.',
  cuny: 'More teaching capacity at CUNY and training colleges, so more people can train for the jobs the plan creates.',
  water: 'Replace aging water mains and sewers on top of DEP\'s own plan. Fewer breaks; paid by water bills in reality, by the plan here.',
  waste: 'Recycling and compost plants. Raises the share of waste kept out of landfills and cuts the cost of shipping trash out of the city.',
  coast: 'Sea walls, raised shorelines and wetlands. Each dollar reduces the damage and lost homes when a hurricane hits.',
  cool: 'Air conditioners for low-income homes, street trees and cooling centers. Cuts heat deaths in summer.',
  fleet: 'Electric buses, garbage trucks and city vehicles. Cuts transport emissions and diesel pollution in the neighbourhoods along bus depots and truck routes.',
  transit: 'Modern signals, more buses and dedicated bus lanes. Raises transit capacity, which lowers crowding and shortens commutes.',
};
const TRAIN_HELP = {
  constr: 'Trains construction workers. Every home being built needs about 1.6 workers for two years, so builders limit how fast the plan can build.',
  nurse: 'Trains nurses for hospitals and clinics. Needed for any health-care expansion.',
  teach: 'Teacher residencies. The class-size law needs about 6,900 more teachers.',
  elec: 'Electricians and heat-pump installers for solar, batteries and retrofits.',
  ece: 'Early-childhood educators for new child-care seats.',
  aide: 'A short course for home-care aides. Demand rises fast as the city ages.',
  plan: 'Planners and data analysts. They raise planning information and the amount of new work agencies can manage.',
  doc: 'Medical school plus residency: seven years before a doctor starts work.',
};
const HELP = {
  'rule.homeless': 'Share of new public homes reserved for families leaving homeless shelters. Each home moves about 2.4 people out of a shelter, which also saves about $70,000 a year per person in shelter costs.',
  'rule.bond': 'How much of the capital plan is paid by borrowing. Bonds spread the cost over decades but add interest every year; the rest comes out of this year\'s budget. The State caps how much the city may borrow.',
  'safe.police': 'Add or cut money for the NYPD. About three-quarters of a change moves the number of officers (≈$160,000 each a year). Research: 10% more officers cut violent crime about 3% but raise low-level arrests.',
  'safe.prevent': 'Violence interrupters, summer and youth jobs, civilian crisis teams, re-entry help. Evidence is promising but less certain than for police; effects build over 1–2 years.',
  'rule.audit': 'Money for statistics, inspectors and auditors. Audits cut graft and close the gap between what public enterprises report and what is real; they can uncover homes reported as finished that are not. Without data, every plan misses.',
  solver: 'The bureau searches thousands of combinations of investment and training for the cheapest plan that meets the goals you tick by the end of 2031, without a State takeover or losing the 2029 election. It shows what it would change before you accept.',
  'solver.tax': 'Lets the solver also raise the commercial property tax (a Council vote) and ask Albany for a surcharge on incomes over $1 million.',
  'tax.vote': 'Property tax rates are set by the City Council each June. Your draft goes to a vote; you need 26 of 51 members. Raising taxes on homeowners and renters is much harder than on commercial property.',
  'tax.albany': 'Every other city tax is State law. Your request goes to the State Legislature, which acts mainly in January to June around the State budget. It can pass in full, be cut in half, or be rejected.',
  'map.priority': 'How strongly new public homes and city stores go to this borough. Within the borough, homes go to districts with the most rent-burdened households and stores to districts with the most poverty.',
  'map.layers': 'Colour shows one indicator for each district. Height turns the map into 3D columns for a second indicator, so you can see two at once.',
  contract: 'City workers\' contracts come up in turn. Raises compound into every future budget: each extra point a year across the workforce costs about $0.6B in the first year and more after that. Low offers save money but lower morale, and work-to-rule slows agencies.',
  scenario: 'Saves your current laws and plan under a name so you can change things and compare where each version leads by 2031.',
  mode: 'Realistic: the city has its real powers. Albany controls many laws and taxes, courts can strike laws down, and the State caps borrowing. Sandbox: the city can do anything, to see the pure planning problem.',
  'tax.who': 'Who decides this tax. Council: the City Council can change it with 26 votes. Albany: it is State law and needs the Legislature.',
};
function helpContent(key) {
  const [kind, a, b] = key.split('.');
  if (kind === 'law') { const l = LAWS.find(x => x.id === a); return { t: l.name, p: [LAW_INFO[a] || ''], ul: ['Pick one option. Each option has its own ? with details.'] }; }
  if (kind === 'opt') {
    const l = LAWS.find(x => x.id === a), o = l.opts.find(x => x.id === b);
    const ul = (a === 'firms' ? regimeText(b) : []).concat(fxText(o.fx || {}));
    let vote = '';
    if (o.id !== l.opts[0].id && S && S.mode === 'real') { if ((o.fx || {}).albany) vote = 'Needs Albany: it waits for the State Legislature.'; else { const v = councilVote(S, o); vote = `Council whip count today: ${v.yes} yes, ${v.no} no (26 needed).`; } }
    return { t: o.name, p: [o.desc], ul: ul.length ? ul : ['No change from today.'], ex: o.prec, foot: vote };
  }
  if (kind === 'cap') { const c = CAPITAL.find(x => x.id === a); return { t: c.name, p: [CAP_HELP[a] || '', c.note] }; }
  if (kind === 'train') { const t = TRAIN.find(x => x.id === a); return { t: t.name, p: [TRAIN_HELP[a] || ''], ul: [`Each seat costs about $${n0(t.cost)}.`, `Graduates start work after ${t.qtrs} quarters (${(t.qtrs / 4).toFixed(t.qtrs % 4 ? 1 : 0)} year${t.qtrs === 4 ? '' : 's'}).`, 'Training capacity at CUNY and colleges is limited; fund CUNY in Capital to expand it.'] }; }
  if (kind === 'tax' && TAXDEF.find(d => d.id === a)) {
    const d = TAXDEF.find(x => x.id === a);
    const g = { pit: 'City income tax, paid by residents on top of State and federal tax. The top 10% of filers earn about 63% of income, so they pay most of it, but high earners can move.', mill: 'An extra rate only on income above $1 million a year. Raises a lot from few people; some may move or shift income out of the city.', prop: 'Tax on the assessed value of property, set each year by the Council. Class 2 (apartment buildings) is partly passed on to tenants in rent.', corp: 'Tax on corporate profits earned in the city. Firms can shift profits and jobs elsewhere.', ubt: 'Tax on the profits of partnerships and sole proprietors in the city. Small businesses feel it.', sales: 'City share of the sales tax. Hits low-income households hardest relative to income; shoppers buy outside the city when it rises.', rptt: 'Tax paid when property is sold. Swings sharply with the market.', commuter: 'A tax on wages earned in the city by people who live outside it. Repealed by Albany in 1999; about a million suburbanites work for city employers.', pat: 'An annual tax on expensive second homes owned by non-residents, in force since July 2026.' }[d.g];
    return { t: d.name, p: [g], ul: [d.who === 'council' ? 'Decided by the City Council (26 votes).' : 'State law: you can only ask Albany.', 'See "Who pays" on the right for its effect on each income group.'] };
  }
  const h = HELP[key]; if (h) return { t: '', p: [h] };
  return { t: '', p: ['No explanation yet.'] };
}
function qm(key, label) { return `<button type="button" class="qm" data-help="${esc(key)}" aria-label="What does ${esc(label || 'this')} do?" title="What does this do?">?</button>`; }
function openPop(btn) {
  const c = helpContent(btn.dataset.help); let pop = $('#pop');
  if (!pop) { pop = document.createElement('div'); pop.id = 'pop'; pop.setAttribute('role', 'dialog'); document.body.appendChild(pop); }
  pop.innerHTML = `${c.t ? `<b class="pt">${esc(c.t)}</b>` : ''}${c.p.filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('')}${c.ul ? `<p class="ph2">In the model</p><ul>${c.ul.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${c.ex ? `<p class="ph2">Real example</p><p>${esc(c.ex)}</p>` : ''}${c.foot ? `<p class="pf">${esc(c.foot)}</p>` : ''}<button type="button" class="pclose" aria-label="Close">×</button>`;
  pop.style.display = 'block';
  const r = btn.getBoundingClientRect(), W = Math.min(360, window.innerWidth - 16);
  pop.style.width = W + 'px';
  let left = Math.min(window.innerWidth - W - 8, Math.max(8, r.left - 12));
  let top = r.bottom + 8; if (top + pop.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - pop.offsetHeight - 8);
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
  pop.querySelector('.pclose').onclick = closePop; pop.querySelector('.pclose').focus({ preventScroll: true });
  pop._from = btn; pop._y = window.scrollY;
}
function closePop() { const p = $('#pop'); if (p && p.style.display !== 'none') { p.style.display = 'none'; if (p._from && document.contains(p._from)) p._from.focus(); } }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.qm'); if (b) { e.preventDefault(); e.stopPropagation(); openPop(b); return; } if (!(e.target.closest && e.target.closest('#pop'))) closePop(); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });
window.addEventListener('scroll', () => { const p = $('#pop'); if (p && p.style.display === 'block' && Math.abs(window.scrollY - (p._y || 0)) > 120) closePop(); }, { passive: true });


// ---------- submit a plan: email, public post, share link, download ----------
const SITE = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG) || {};
const TAXKEYS = TAXDEF.map(d => d.id);
function encPlan(name) {
  const p = {}; LAWS.forEach(l => { if (S.pol[l.id] !== l.opts[0].id) p[l.id] = S.pol[l.id]; });
  Object.entries(S.pending || {}).forEach(([k, v]) => { p[k] = v; });
  const tx = S.taxPending ? S.taxPending.tx : S.tax;
  const c = {}; Object.entries(S.plan.cap).forEach(([k, v]) => { if (v) c[k] = +v.toFixed(2); });
  const r = {}; Object.entries(S.plan.train).forEach(([k, v]) => { if (v) r[k] = Math.round(v); });
  const o = { n: name || '', m: S.mode === 'sandbox' ? 's' : 'r', p, x: TAXDEF.map(d => +(+tget(tx, d)).toFixed(3)), c, r, h: S.plan.homeless, b: S.plan.bond, a: S.plan.audit, pp: S.plan.police || 0, pv: S.plan.prevent || 0, w: S.bor.map(b => b.w) };
  const json = JSON.stringify(o);
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decPlan(code) {
  try { const b = code.replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4))))); } catch (e) { return null; }
}
function applyPlan(o) {
  const s = newGame({ mode: o.m === 's' ? 'sandbox' : 'real' });
  Object.entries(o.p || {}).forEach(([k, v]) => { const l = LAWS.find(x => x.id === k); if (l && l.opts.some(x => x.id === v)) s.pol[k] = v; });
  if (Array.isArray(o.x) && o.x.length === TAXDEF.length) TAXDEF.forEach((d, i) => { const v = +o.x[i]; if (isFinite(v)) tset(s.tax, d, Math.max(d.min, Math.min(d.max, v))); });
  Object.entries(o.c || {}).forEach(([k, v]) => { const c = CAPITAL.find(x => x.id === k); if (c) s.plan.cap[k] = Math.max(0, Math.min(c.max, +v || 0)); });
  Object.entries(o.r || {}).forEach(([k, v]) => { const t = TRAIN.find(x => x.id === k); if (t) s.plan.train[k] = Math.max(0, Math.min(t.max, +v || 0)); });
  if (isFinite(o.h)) s.plan.homeless = o.h; if (isFinite(o.b)) s.plan.bond = o.b; if (isFinite(o.a)) s.plan.audit = o.a; if (isFinite(o.pp)) s.plan.police = Math.max(-3, Math.min(2, o.pp)); if (isFinite(o.pv)) s.plan.prevent = Math.max(0, Math.min(3, o.pv));
  if (Array.isArray(o.w)) o.w.forEach((w, i) => { if (s.bor[i] && isFinite(w)) s.bor[i].w = w; });
  s.sharedName = o.n || 'Shared plan';
  return s;
}
function planLink(name) { const base = (SITE.siteUrl || location.href).split('#')[0]; return base + '#plan=' + encPlan(name); }
const SUMK = ['shortage', 'shelter', 'insec', 'margin', 'ghg', 'unemp', 'life', 'care', 'support', 'deficit', 'vote', 'rent', 'waitlist', 'commute', 'protest'];
function planSummary(f) {
  const last = S.hist[S.hist.length - 1], end = proj()[proj().length - 1];
  const laws = LAWS.filter(l => S.pol[l.id] !== l.opts[0].id).map(l => `${l.name}: ${optName2(l.id, S.pol[l.id])}`);
  Object.entries(S.pending || {}).forEach(([k, v]) => laws.push(`${LAWS.find(l => l.id === k).name}: ${optName2(k, v)} (asked of Albany)`));
  const tx = S.taxPending ? S.taxPending.tx : S.tax;
  const taxes = TAXDEF.filter(d => Math.abs(tget(tx, d) - tget(TAX0, d)) > 1e-9).map(d => `${d.name}: ${tfmt(d, tget(tx, d))} (2027: ${tfmt(d, tget(TAX0, d))})`);
  const cap = CAPITAL.filter(c => S.plan.cap[c.id] > 0).map(c => `${c.name}: ${bn(S.plan.cap[c.id])}/yr`);
  const tr = TRAIN.filter(t => S.plan.train[t.id] > 0).map(t => `${t.name}: ${n0(S.plan.train[t.id])} seats/yr`);
  const res = SUMK.map(k => { const d = KP[k]; const g = d.goal ? d.goal(S) : null; return `${d.name}: ${d.f(S.hist[0][k])} → ${d.f(last[k])} now → ${d.f(end[k])} by end of 2031${g != null ? ` (${d.gtxt(g)})` : ''}`; });
  const L = [`PLAN PROPOSAL: ${f.name || 'Untitled plan'}`, `From: ${f.author || 'anonymous'}${f.contact ? ' <' + f.contact + '>' : ''}`, f.publish ? 'May be published: yes' : 'May be published: no', '', 'IDEA FOR THE REAL WORLD', f.note || '(no note)', '', `Played to ${qLabel(S)}, ${S.mode === 'sandbox' ? 'Sandbox rules' : 'Realistic rules'}, data of ${LIVE.generated || 'n/a'}.`, '', 'LAWS CHANGED', ...(laws.length ? laws : ['none']), '', 'TAXES CHANGED', ...(taxes.length ? taxes : ['none']), '', 'PLAN PER YEAR', ...(cap.length ? cap : ['no capital']), ...tr, `Public homes for shelter residents: ${S.plan.homeless}%; bonds: ${S.plan.bond}%; audits: ${bn(S.plan.audit || 0)}/yr`, '', 'RESULTS (start → now → projected end of 2031)', ...res, '', 'Open this plan in the simulator:', planLink(f.name)];
  return L.join('\n');
}
// short version for mail programs that limit link length (some Windows clients stop near 2,000 characters)
function shortSummary(f) {
  const last = S.hist[S.hist.length - 1], end = proj()[proj().length - 1];
  const laws = LAWS.filter(l => S.pol[l.id] !== l.opts[0].id).map(l => optName2(l.id, S.pol[l.id]));
  const res = ['shortage', 'shelter', 'insec', 'deficit', 'support'].map(k => `${KP[k].name}: ${KP[k].f(last[k])} now, ${KP[k].f(end[k])} by 2031`);
  return [`PLAN PROPOSAL: ${f.name}`, `From: ${f.author || 'anonymous'}${f.contact ? ' <' + f.contact + '>' : ''} · publish: ${f.publish ? 'yes' : 'no'}`, '', (f.note || '(no note)').slice(0, 700), '', 'Laws: ' + (laws.join('; ') || 'none'), ...res, '', 'Full plan: ' + planLink(f.name)].join('\n');
}
function fullSnapshot(f) {
  const last = S.hist[S.hist.length - 1], end = proj()[proj().length - 1], pick = h => Object.fromEntries(Object.keys(KP).map(k => [k, h[k]]));
  return { app: 'Plan Bureau NYC', version: 3, created: new Date().toISOString(), proposal: f, quarter: qLabel(S), mode: S.mode, dataDate: LIVE.generated, link: planLink(f.name), decisions: { laws: S.pol, pending: S.pending, taxes: S.tax, taxPending: S.taxPending ? S.taxPending.tx : null, plan: S.plan, boroughPriority: S.bor.map(b => ({ id: b.id, w: b.w })) }, results: { start: pick(S.hist[0]), now: pick(last), projectedEnd2031: pick(end) }, history: S.hist };
}
// ---------- direct sending through Web3Forms ----------
async function sendForm(fields) {
  const key = ((SITE && SITE.formKey) || '').trim();
  if (!key) return false;
  try {
    const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.assign({ access_key: key, from_name: 'Plan Bureau' }, fields)) });
    const j = await r.json().catch(() => ({}));
    return r.ok && j.success !== false;
  } catch (e) { return false; }
}
const trap = id => `<input type="checkbox" name="botcheck" id="${id}" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">`;
function submitForm() { if (!S) return; tab = 'submit'; render(); window.scrollTo({ top: 0 }); }
function submitView() {
  const em = (SITE.submitEmail || '').trim(), gh = (SITE.githubRepo || '').trim();
  const p = proj(), end = p[p.length - 1]; const met = GOALK.filter(k => KP[k].goal && (KP[k].better < 0 ? end[k] <= KP[k].goal(S) : end[k] >= KP[k].goal(S))).length;
  const lawsCh = LAWS.filter(l => (S.pol[l.id] || l.opts[0].id) !== l.opts[0].id);
  const capT = Object.values(S.plan.cap).reduce((a, b) => a + b, 0);
  $('#v-submit').innerHTML = `<h1>Submit your plan</h1>
    <p class="lead">No two runs end the same way. Storms, recessions, Council votes and court rulings are partly left to chance, and every plan sets off its own chain of effects. That is why your result is worth sending: when you find something that works, or fails in an interesting way, tell us what you learned. Submissions go to the Plan Bureau team, and the strongest ideas are collected as proposals for real city policy.</p>
    <div class="subgrid">
      <section class="subcard"><h2>Your plan so far</h2>
        <table class="jlev"><tbody>
          <tr><td>Quarter</td><td><b>${esc(qLabel(S))}</b>${S.t >= 20 ? ' (plan finished)' : ` · ${20 - S.t} quarters to go`}</td></tr>
          <tr><td>Targets reached by 2031</td><td><b>${met} of ${GOALK.length}</b> (projected)</td></tr>
          <tr><td>Laws changed</td><td><b>${lawsCh.length}</b>${lawsCh.length ? ': ' + lawsCh.slice(0, 6).map(l => esc(optOf(S, l.id).name)).join('; ') + (lawsCh.length > 6 ? '…' : '') : ''}</td></tr>
          <tr><td>New investment</td><td><b>${bn(capT)}/yr</b></td></tr>
          <tr><td>Public support</td><td><b>${pct(S.hist[S.hist.length - 1].support, 0)}</b></td></tr>
          <tr><td>Rules</td><td><b>${S.mode === 'sandbox' ? 'Sandbox' : 'Realistic'}</b></td></tr>
        </tbody></table>
        <p class="note">Your submission includes all laws, taxes, investments, the full history of every indicator and the random seed, so anyone can replay your run.</p></section>
      <section class="subcard subform"><h2>Your proposal</h2>
        <div class="grid" style="gap:10px">
          <label class="fl">Name of your plan<input id="sbName" type="text" maxlength="80" value="${esc(S.sharedName || '')}" placeholder="e.g. Homes first, taxes on the top 1%"></label>
          <label class="fl">What did you find? What should the city actually do?<textarea id="sbNote" rows="5" maxlength="1200" placeholder="Which choice made the biggest difference, what surprised you, and why it could work in the real city"></textarea></label>
          <div class="grid g2" style="gap:10px"><label class="fl">Your name (optional)<input id="sbAuthor" type="text" maxlength="80"></label><label class="fl">Email for replies (optional)<input id="sbContact" type="email" maxlength="120"></label></div>
          <label class="row" style="gap:8px;font-size:14px"><input type="checkbox" id="sbPub" checked style="width:18px;height:18px">You may publish this proposal (without my email address)</label>
        </div>
        <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap">
          ${trap('sbBot')}<button class="btn go" id="sbMail" ${em || SITE.formKey ? '' : 'disabled'}>Send to Plan Bureau</button>
          ${gh ? '<button class="btn" id="sbGh">Post publicly on GitHub</button>' : ''}
          <button class="btn" id="sbCopy">Copy link to this plan</button>
          <button class="btn" id="sbDl">Download full snapshot</button>
        </div>
        <p class="note" id="sbMsg" style="margin-top:8px">${em || SITE.formKey ? 'Your proposal goes straight to the Plan Bureau team.' : 'The team address is not set up yet; you can still copy a link or download the file.'} The link reopens your laws, taxes and plan for anyone.</p></section>
    </div>`;
  const form = () => ({ name: $('#sbName').value.trim(), note: $('#sbNote').value.trim(), author: $('#sbAuthor').value.trim(), contact: $('#sbContact').value.trim(), publish: $('#sbPub').checked });
  const msg = t => { $('#sbMsg').textContent = t; };
  const need = f => { if (!f.name) { msg('Please give your plan a name first.'); $('#sbName').focus(); return false; } return true; };
  const mailIt = f => { let body = planSummary(f); if (body.length > 1900) body = shortSummary(f); location.href = `mailto:${encodeURIComponent(em)}?subject=${encodeURIComponent('Plan proposal: ' + f.name)}&body=${encodeURIComponent(body)}`; };
  if (em || SITE.formKey) $('#sbMail').onclick = async () => { const f = form(); if (!need(f)) return; if ($('#sbBot').checked) { msg('Thank you, your proposal was sent.'); return; }
    const b = $('#sbMail'); b.disabled = true; b.textContent = 'Sending…';
    const sent = await sendForm({ subject: 'Plan proposal: ' + f.name, form: 'Plan proposal', plan_name: f.name, author: f.author || 'anonymous', email: f.contact || undefined, replyto: f.contact || undefined, may_publish: f.publish ? 'yes' : 'no', message: planSummary(f) });
    b.disabled = false; b.textContent = 'Send to Plan Bureau';
    if (sent) msg('Thank you, your proposal was sent to the Plan Bureau team.' + (f.contact ? ' We will reply to ' + f.contact + '.' : ''));
    else if (em) { msg('Sending did not work (are you offline?). Your mail program opens instead; press send there.'); mailIt(f); }
    else msg('Sending did not work. Please try again in a moment, or copy the link instead.'); };
  if (gh) $('#sbGh').onclick = () => { const f = form(); if (!need(f)) return; const g = Object.assign({}, f, { contact: '' }); window.open(`https://github.com/${gh}/issues/new?labels=proposal&title=${encodeURIComponent('Plan proposal: ' + f.name)}&body=${encodeURIComponent(planSummary(g).slice(0, 6000))}`, '_blank', 'noopener'); msg('GitHub opens in a new tab; you need a free GitHub account to post.'); };
  $('#sbCopy').onclick = async () => { const f = form(); const link = planLink(f.name); try { await navigator.clipboard.writeText(link); msg('Link copied. Anyone who opens it starts with your laws, taxes and plan.'); } catch (e) { prompt('Copy this link:', link); } };
  $('#sbDl').onclick = () => { const f = form(); const blob = new Blob([JSON.stringify(fullSnapshot(f), null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'plan-bureau-' + (f.name || 'plan').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); msg('Snapshot downloaded. You can attach it to an email.'); };
}
function sharedPlanFromHash() { const m = (location.hash || '').match(/^#plan=([A-Za-z0-9_-]+)/); return m ? decPlan(m[1]) : null; }


// ---------- safety & justice ----------
const sbn = v => (v > 0.005 ? '+' : v < -0.005 ? '−' : '') + '$' + Math.abs(v).toFixed(1) + 'B';
const DSAFE = [['police', 'NYPD budget, change from today', -3, 2, 0.1, v => sbn(v) + '/yr', 'Today ≈ $6.7B. About $160,000 per officer a year, all costs in.'], ['prevent', 'Community prevention', 0, 3, 0.1, v => '$' + v.toFixed(1) + 'B/yr', 'Violence interrupters, youth jobs, crisis teams. Takes 1–2 years to work.']];
function safeSliders() { return DSAFE.map(r => `<div id="dx-safe-${r[0]}">${slider('safe', r[0], r[1], S.plan[r[0]] || 0, r[3], r[4], r[5], r[6], false, r[2])}</div>`).join(''); }
function waffle(n, cap, per) {
  const k = Math.ceil(Math.max(n, cap) / per), on = Math.round(n / per), c = Math.round(cap / per);
  return `<div class="waf" role="img" aria-label="${n0(n)} people in jail; the new borough jails hold ${n0(cap)}">${Array.from({ length: k }, (_, i) => `<i class="${i < on ? (i >= c ? 'over' : 'on') : ''} ${i === c - 1 ? 'cap' : ''}"></i>`).join('')}</div>`;
}
function justiceView() {
  const h = S.hist, J = S.js, last = h[h.length - 1], h0 = h[0], p = proj(), end = p[p.length - 1];
  const tile = (lab, v, f, base, better, note) => { const d = v - base; const good = better < 0 ? d < 0 : d > 0; return `<div class="jt"><span class="note">${esc(lab)}</span><b class="num">${esc(f(v))}</b><span class="note ${Math.abs(d) / (Math.abs(base) || 1) < 0.005 ? '' : good ? 'pos' : 'neg'}">${Math.abs(d) / (Math.abs(base) || 1) < 0.005 ? 'same as 2027' : (d > 0 ? '+' : '−') + f(Math.abs(d)) + ' since 2027'}</span>${note ? `<span class="note">${esc(note)}</span>` : ''}</div>`; };
  const law = id => optOf(S, id).name;
  $('#v-justice').innerHTML = `<h1>Safety and justice</h1>
    <p class="lead">Crime in New York is at record lows: 305 murders and 688 shootings in 2025, the fewest ever recorded. The question for a planner is what keeps it falling, and who pays the price: police stops, jail, evictions and overdoses fall hardest on the same poor neighbourhoods.</p>
    <div class="jtiles">
      ${tile('Major felonies a year', last.felony, n0, h0.felony, -1)}${tile('Murders a year', last.murder, n0, h0.murder, -1)}${tile('People in city jails', last.jail, n0, h0.jail, -1)}
      ${tile('Overdose deaths a year', last.od, n0, h0.od, -1)}${tile('Evictions a year', last.evict, n0, h0.evict, -1)}${tile('Trust in public safety (index)', last.trust, v => v.toFixed(0), h0.trust, 1)}
    </div>
    <section class="jgrid">
      <div><h2>Rikers has to close</h2><p>City law (Local Law 192 of 2019) closes Rikers Island in August 2027. The four new borough jails will hold 4,160 people. Each square is 25 people in jail today; red squares have no bed after Rikers closes.</p>
        ${waffle(last.jail, 4160, 25)}<p class="note">${last.jail > 4160 ? `${n0(last.jail - 4160)} people over capacity. Courts and the federal monitor watch this; it raises legal risk every quarter after the deadline.` : 'The jail population fits in the borough jails.'}</p></div>
      <div><h2>Your levers</h2>
        <table class="jlev"><tbody><tr><td>Public safety law</td><td><b>${esc(law('safety'))}</b></td></tr><tr><td>Drugs and overdose</td><td><b>${esc(law('drugs'))}</b></td></tr><tr><td>Evictions</td><td><b>${esc(law('evict'))}</b></td></tr><tr><td>Police officers</td><td><b>${n0(last.officers)}</b></td></tr><tr><td>Low-level arrests and summonses</td><td><b>${(last.lowlevel).toFixed(0)}</b> <span class="note">(2026 = 100)</span></td></tr></tbody></table>
        <div class="dgrid one">${safeSliders()}</div>
        <p class="row"><button class="btn" data-go2="decide" data-a="dx-safe">Change the laws on Decisions</button></p></div>
    </section>
    <section class="jgrid">
      <div><h2>Murders: history and your plan</h2><div class="fig" id="jFig"></div><p class="note">Solid: simulated so far. Dashed: projection to 2031 if you keep today's settings (${n0(end.murder)} a year).</p></div>
      <div><h2>What the research says</h2><ul class="ev">
        <li><b>More police, fewer murders, more arrests.</b> Each 10% more officers cuts violent crime by about 3% (Chalfin & McCrary 2018), but also raises low-level arrests, mostly of Black residents (Chalfin et al. 2022).</li>
        <li><b>Jobs and outreach prevent violence.</b> Summer jobs for teenagers cut violent-crime arrests in Chicago (Heller 2014) and incarceration and deaths in New York (Gelber et al. 2016). Violence interrupters reduced shootings in some NYC precincts (Butts et al. 2015).</li>
        <li><b>Poverty and housing drive harm.</b> Here, crime rises with poverty and unemployment, and every eviction adds to shelter entries.</li>
        <li><b>Supervised consumption saves lives.</b> NYC's two sites reversed hundreds of overdoses without raising nearby crime (Chalfin, del Pozo & Mitre-Becerril 2023).</li>
      </ul><p class="note">The prevention effect in this model (−5% violent crime per $1B a year) is an assumption, less certain than the police estimate.</p></div>
    </section>`;
  const ser = [{ name: 'murders', color: 'var(--ink)', pts: h.map(x => [x.t, x.murder]), w: 2.5, lab: false }, { name: 'plan', color: 'var(--red)', pts: p.map(x => [x.t, x.murder]), dash: true, dot: false }];
  lineChart($('#jFig'), ser, { yf: v => n0(v), zero: true });
  const v = $('#v-justice');
  v.querySelectorAll('input[type=range]').forEach(inp => inp.oninput = () => { const x = +inp.value; S.plan[inp.id.split('-')[1]] = x; inp.previousElementSibling.textContent = DSAFE.find(r => 'safe-' + r[0] === inp.id)[5](x); changed(); });
  v.querySelectorAll('[data-go2]').forEach(b => b.onclick = () => { tab = b.dataset.go2; render(); const el = document.getElementById(b.dataset.a); if (el) el.scrollIntoView({ block: 'start' }); });
}

// ---------- climate: 1.5 °C ----------
function climateView() {
  const h = S.hist, last = h[h.length - 1], p = proj(), CB = S.cb; const done = h.find(x => x.t === 20); const end = done || p[p.length - 1];
  const goal = KP.ghg.goal(S), left = CB.left;
  // when does the city's equal share of the 1.5 °C budget run out?
  let outQ = null, acc = CLIMATE.budget0 - CLIMATE.used2526; const seq = h.slice(1).concat(p.slice(1));
  if (acc <= 0) outQ = 'before 2027'; else for (const x of seq) { acc -= x.ghg / 4; if (acc <= 0) { outQ = tLab(x.t); break; } }
  const path = t => CLIMATE.path15(t), ll = t => CLIMATE.ll97(t);
  const allT = h.map(x => x.t).concat(p.slice(1).map(x => x.t)); const tEnd = Math.max(...allT, 20);
  const lever = (name, val, on) => `<li><span class="lv ${on ? 'on' : ''}">${on ? '●' : '○'}</span> ${esc(name)}${val ? ` <span class="note">(${esc(val)})</span>` : ''}</li>`;
  const capv = k => S.plan.cap[k] || 0;
  $('#v-climate').innerHTML = `<h1>Climate: the 1.5 °C test</h1>
    <p class="lead">The Paris Agreement aims to limit warming to 1.5 °C. Scientists' pathways for that cut global greenhouse gases about 43% below 2019 levels by 2030 and 60% by 2035. New York's own law (Local Law 97) asks for 40% below 2005 by 2030 and carbon neutrality by 2050. Your plan target follows the 1.5 °C pathway: <b>${esc(KP.ghg.f(goal))} Mt by the end of 2031</b>.</p>
    <div class="climtop">
      <div><span class="note">Emissions now</span><b class="num big">${KP.ghg.f(last.ghg)} Mt</b><span class="note">CO₂e a year · 2027: ${KP.ghg.f(h[0].ghg)}</span></div>
      <div><span class="note">${done ? 'End of 2031 (actual)' : 'Projected end of 2031'}</span><b class="num big" style="color:${end.ghg <= goal ? 'var(--good)' : 'var(--red)'}">${KP.ghg.f(end.ghg)} Mt</b><span class="note">1.5 °C path: ${KP.ghg.f(goal)} · Local Law 97: ${KP.ghg.f(ll(19))}</span></div>
      <div><span class="note">City's fair share of the global 1.5 °C budget</span><b class="num big" style="color:var(--red)">${left > 0 ? Math.round(left) + ' Mt left' : 'used up'}</b><span class="note">${outQ ? 'Runs out ' + esc(outQ) : 'Lasts beyond 2031 at this pace'}</span></div>
    </div>
    <section class="climgrid">
      <div class="card"><h2>Emissions against the targets</h2><div class="fig" id="clFig"></div><p class="note">Solid: history. Dashed: your plan. Red line: 1.5 °C pathway. Grey line: Local Law 97.</p></div>
      <div class="card"><h2>Where emissions come from</h2>
        ${hbars([['Buildings: gas and oil burned on site', CB.bFuel], ['Buildings: electricity', CB.bElec], ['Transportation', CB.trans], ['Waste', CB.waste]], 'var(--s1)', v => v.toFixed(1) + ' Mt')}
        <p class="note" style="margin-top:8px">Not in the official inventory: materials for new homes add about ${Math.max(CB.emb, end.ghgEmb || 0).toFixed(2)} Mt a year by 2031 (≈${CLIMATE.embodiedPerHome} t per home). Building the homes the city needs costs carbon up front.</p>
        <table style="margin-top:8px"><tbody><tr><td>Building heat that is electric</td><td class="r"><b>${pct(CB.elec * 100, 0)}</b></td></tr><tr><td>Car and truck travel that is electric</td><td class="r"><b>${pct(CB.ev * 100, 0)}</b></td></tr><tr><td>Electricity from new city wind and solar</td><td class="r"><b>${pct(Math.min(90, (S.e.cleanShare || 0) * 100), 1)}</b></td></tr><tr><td>Car traffic (2027 = 100)</td><td class="r"><b>${(CB.carKm * 100).toFixed(0)}</b></td></tr></tbody></table></div>
    </section>
    <section class="climgrid">
      <div class="card"><h2>What brings emissions down</h2><ul class="levers">
        ${lever('Building retrofits and heat pumps', capv('eff') ? bn(capv('eff')) + '/yr' : 'not funded', capv('eff') > 0)}
        ${lever('Offshore wind and solar', capv('wind') + capv('solar') ? bn(capv('wind') + capv('solar')) + '/yr' : 'not funded', capv('wind') + capv('solar') > 0)}
        ${lever('Climate rules (Laws)', optOf(S, 'carbon').name, S.pol.carbon && S.pol.carbon !== 'g0')}
        ${lever('Electric buses, trucks and city fleet', capv('fleet') ? bn(capv('fleet')) + '/yr' : 'not funded', capv('fleet') > 0)}
        ${lever('Transit capacity and cheaper fares', capv('transit') ? bn(capv('transit')) + '/yr' : optOf(S, 'transit').name, capv('transit') > 0 || S.pol.transit !== 't0')}
        ${lever('Recycling and compost', capv('waste') ? bn(capv('waste')) + '/yr' : 'not funded', capv('waste') > 0)}
      </ul></div>
      <div class="card"><h2>What pushes emissions up</h2><ul class="levers rise">
        <li>More people and more jobs: more heating, power and traffic.</li>
        <li>Crowded trains: people switch to cars (${S.d.crowd > 1.02 ? 'now ' + Math.round((S.d.crowd - 1) * 100) + '% over capacity' : 'not yet a problem'}).</li>
        <li>New homes add floor space to heat until they are electric, and their concrete and steel carry embodied carbon.</li>
        <li>Electrifying heat adds electricity demand; until the grid is clean, part of the saving is lost.</li>
        <li>Cold winters and hot summers.</li>
        <li>Slow approvals: offshore wind takes about four years to connect.</li>
      </ul></div>
    </section>
    <p class="note">Sources: NYC greenhouse gas inventory (sector shares), Local Law 97 of 2019, IPCC AR6 Synthesis Report (pathways), Forster et al. 2026 (remaining budget). The fair share assumes every person on Earth gets an equal share of what is left; richer cities that emitted more in the past arguably deserve less.</p>`;
  const ser = [{ name: 'history', lab: false, color: 'var(--ink)', pts: h.map(x => [x.t, x.ghg]), w: 2.5 }, { name: 'your plan', color: 'var(--ink)', pts: p.map(x => [x.t, x.ghg]), dash: true, dot: false },
    { name: '1.5 °C path', color: 'var(--red)', pts: Array.from({ length: tEnd + 1 }, (_, t) => [t, path(t)]), dot: false, w: 1.5 }, { name: 'Local Law 97', color: 'var(--ink2)', pts: Array.from({ length: tEnd + 1 }, (_, t) => [t, ll(t)]), dot: false, w: 1.5, dash: true }];
  lineChart($('#clFig'), ser, { yf: v => v.toFixed(0) + ' Mt', rlab: true });
}

// ---------- teachers: contact form ----------
function openTeach() {
  const em = ((SITE && (SITE.contactEmail || SITE.submitEmail)) || '').trim();
  modal(`<h2 style="margin-top:0">Teaching with Plan Bureau</h2><p>Tell us about your class and what you would like to do. We are happy to help with lesson ideas, classroom set-ups, a walkthrough of the model, or a version that fits your course.</p>
    <div class="tform">
      <div class="g2"><label class="fl">Your name<input id="tcName" type="text" maxlength="80" autocomplete="name"></label><label class="fl">Email<input id="tcMail" type="email" maxlength="120" autocomplete="email"></label></div>
      <label class="fl">School, university or organisation<input id="tcOrg" type="text" maxlength="120"></label>
      <div class="g2"><label class="fl">You teach<select id="tcRole"><option>At a school</option><option>At a university or college</option><option>Adult education or workshops</option><option>Other</option></select></label><label class="fl">Subject and age group<input id="tcSub" type="text" maxlength="120" placeholder="e.g. economics, 17–18 year olds"></label></div>
      <label class="fl">How can we help?<textarea id="tcMsg" rows="4" maxlength="1500" placeholder="What you are planning, when, and what would be useful"></textarea></label>
    </div>
    <p class="note" id="tcNote" style="margin:8px 0 0">${em || SITE.formKey ? 'Your message goes straight to the Plan Bureau team.' : 'The contact address is not set up yet.'}</p>
    <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">${trap('tcBot')}<button class="btn go" id="tcSend" ${em || SITE.formKey ? '' : 'disabled'}>Send message</button><button class="btn" id="mClose">Close</button></div>`);
  const f = () => ({ name: $('#tcName').value.trim(), mail: $('#tcMail').value.trim(), org: $('#tcOrg').value.trim(), role: $('#tcRole').value, sub: $('#tcSub').value.trim(), msg: $('#tcMsg').value.trim() });
  const note = t => { $('#tcNote').textContent = t; };
  const body = v => `Name: ${v.name || '–'}\nEmail: ${v.mail}\nOrganisation: ${v.org || '–'}\nTeaches: ${v.role}\nSubject and age group: ${v.sub || '–'}\n\n${v.msg}`;
  const ok = v => { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.mail)) { note('Please add an email address so we can reply.'); $('#tcMail').focus(); return false; } if (!v.msg) { note('Please write a few words about what you need.'); $('#tcMsg').focus(); return false; } return true; };
  if (em || SITE.formKey) $('#tcSend').onclick = async () => { const v = f(); if (!ok(v)) return; if ($('#tcBot').checked) { note('Thank you, your message was sent.'); return; }
    const subj = 'Teaching with Plan Bureau' + (v.org ? ': ' + v.org : ''), b = $('#tcSend'); b.disabled = true; b.textContent = 'Sending…';
    const sent = await sendForm({ subject: subj, form: 'Teacher contact', name: v.name || '–', email: v.mail, replyto: v.mail, organisation: v.org || '–', teaches: v.role, subject_and_age: v.sub || '–', message: v.msg });
    b.disabled = false; b.textContent = 'Send message';
    if (sent) { note('Thank you, your message was sent. We will reply to ' + v.mail + '.'); b.textContent = 'Sent'; b.disabled = true; }
    else if (em) { note('Sending did not work (are you offline?). Your mail program opens instead; press send there.'); location.href = `mailto:${encodeURIComponent(em)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body(v))}`; }
    else note('Sending did not work. Please try again in a moment.'); };
}
// ---------- tabs ----------
const TABS = [['submit', 'Submit your plan'], ['decide', 'Decisions'], ['overview', 'Control figures'], ['laws', 'Laws'], ['taxes', 'Taxes'], ['plan', 'Plan & balances'], ['economy', 'Economy'], ['map', 'Map'], ['labor', 'People'], ['services', 'Services'], ['justice', 'Safety & justice'], ['climate', 'Climate'], ['politics', 'Politics'], ['budget', 'Budget'], ['scenarios', 'Scenarios'], ['viz', 'Visualize'], ['trends', 'Trends'], ['guide', 'Guide'], ['learn', 'Learn'], ['sources', 'Sources']];
const TAB_GROUPS = [['The plan', ['decide', 'overview', 'laws', 'taxes', 'plan', 'economy']], ['The city', ['map', 'labor', 'services', 'justice', 'climate']], ['Power and money', ['politics', 'budget']], ['Looking ahead', ['scenarios', 'viz', 'trends']], ['Reference', ['guide', 'learn', 'sources']]];
const VIEWS = { submit: submitView, decide: decideView, overview, map: mapView, laws: lawsView, taxes: taxesView, plan: planView, economy: economyView, politics: politicsView, scenarios: scenariosView, viz: vizView, labor: peopleView, services: servicesView, justice: justiceView, climate: climateView, budget: budgetView, trends: trendsView, learn: learnView, sources: sourcesView, guide: guideView };
function tabs() {
  let n = 0;
  $('#tabs .wrap').innerHTML = `<button class="railsub" role="tab" aria-selected="${tab === 'submit'}" data-t="submit" type="button">Submit your plan</button>` + TAB_GROUPS.map(([gname, ids]) => `<div class="tg"><span class="tgl">${esc(gname)}</span>${ids.map(id => { n++; return `<button role="tab" aria-selected="${id === tab}" data-t="${id}"><span class="no">§${n}</span><span>${esc(TABS.find(t => t[0] === id)[1])}</span></button>`; }).join('')}</div>`).join('');
  $('#tabs .wrap').insertAdjacentHTML('beforeend', `<div class="tg tgx"><span class="tgl">About</span><button type="button" id="railWhy">Why this exists</button><button type="button" id="railHow">How it works</button><button type="button" id="railTeach">For teachers</button><button type="button" id="railStart">Back to the start</button></div>`);
  $('#railTeach').onclick = openTeach; $('#railWhy').onclick = openPrologue; $('#railHow').onclick = () => openIntro(0);
  $('#railStart').onclick = () => { save(); $('#app').hidden = true; $('#start').hidden = false; startScreen(); window.scrollTo({ top: 0 }); };
  $$('#tabs button[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); window.scrollTo({ top: 0 }); try { history.replaceState(null, '', '#' + tab); } catch (e) { } });
}

// ---------- city detail panels appended to existing pages ----------
function xSec(title, body, id) { return `<section class="xsec" ${id ? `id="${id}"` : ''}><h2>${esc(title)}</h2>${body}</section>`; }
function gridPanel() {
  const G = S.cx && S.cx.gr; if (!G) return '';
  return xSec('Power, hour by hour', `<p class="note">The two hardest days of the year for the city's grid. Today New York peaks on hot summer afternoons. As buildings switch to heat pumps and cars to electric, the winter evening peak grows; batteries shave the highest hours, rooftop solar helps only in summer daylight.</p>
    <div class="jtiles"><div class="jt"><span class="note">Summer peak</span><b class="num">${n0(G.peakS)} MW</b><span class="note">at ${G.hS}:00 · firm supply ${n0(G.firmS)} MW</span></div><div class="jt"><span class="note">Winter peak</span><b class="num">${n0(G.peakW)} MW</b><span class="note">at ${G.hW}:00 · firm supply ${n0(G.firmW)} MW</span></div><div class="jt"><span class="note">The tighter season</span><b class="num">${G.binding === 'winter' ? 'Winter' : 'Summer'}</b><span class="note">margin ${n0(Math.min(G.firmS - G.peakS, G.firmW - G.peakW))} MW</span></div></div>
    <div class="fig" id="gridFig" style="height:260px"></div><p class="note">Zone J summer peak from NYISO. The winter peak and the extra load from full electrification are model assumptions scaled from NYISO's statewide forecasts.</p>`);
}
function subwayPanel() {
  const X = S.cx; if (!X) return '';
  const rows = X.net.map((n, k) => ({ n, L: SUB_LINES[k] })).sort((a, b) => b.n.load - a.n.load);
  return xSec('The subway, line by line', `<p class="note">Morning rush-hour load as a share of the MTA's crowding guideline (100% = full). Demand follows population and jobs in the boroughs each line serves; transit investment goes to the most crowded line first (new signals and cars, about +12% capacity per $1B).</p>
    <div class="sublines">${rows.map(({ n, L }) => `<div class="sl2"><span>${esc(L.name)}</span><div class="slb"><i style="width:${Math.min(100, n.load / 1.3)}%" class="${n.load > 100 ? 'over' : ''}"></i><b style="left:${100 / 1.3}%"></b></div><span class="r num">${Math.round(n.load)}%${n.inv > 0 ? ` <small>+${Math.round((n.cap - 1) * 100)}% capacity</small>` : ''}</span></div>`).join('')}</div>
    <p class="note">Lexington Ave express at 112% (MTA rider report, 2018) and its 1.3 million weekday riders (Second Ave Subway study) are documented; the other lines' loads are rounded estimates.</p>`);
}
function bizPanel() {
  const Z = S.cx && S.cx.biz; if (!Z) return '';
  return xSec('Firms opening, closing and leaving', `<p class="note">About 200,000 businesses; in 2025 about 19,800 opened and some quarters saw more than 8,000 close (NYCEDC). Here each sector decides from its own costs: commercial rents, the taxes it pays, wages, safety and how the economy is growing.</p>
    <div class="jtiles"><div class="jt"><span class="note">Businesses</span><b class="num">${n0(Z.n)}</b><span class="note">${Z.n >= BIZ0 ? '+' : '−'}${n0(Math.abs(Z.n - BIZ0))} since 2027</span></div><div class="jt"><span class="note">Opened / closed this quarter</span><b class="num">${n0(Z.open)} / ${n0(Z.close)}</b><span class="note">net ${Z.open >= Z.close ? '+' : '−'}${n0(Math.abs(Z.open - Z.close))}</span></div><div class="jt"><span class="note">Moved out of the city</span><b class="num">${n0(Z.moved)}</b><span class="note">this quarter, part of the closures</span></div></div>
    <div class="fig" id="bizFig" style="height:220px"></div>
    <table class="jlev"><thead><tr><th>Sector</th><th class="r">Businesses</th><th class="r">Net this quarter</th></tr></thead><tbody>${Z.sect.map((x, k) => `<tr><td>${esc(BIZ_SECT[k].name)}</td><td class="r">${n0(x.n)}</td><td class="r ${x.net < 0 ? 'neg' : 'pos'}">${x.net >= 0 ? '+' : '−'}${n0(Math.abs(x.net))}</td></tr>`).join('')}</tbody></table>`);
}
function projPanel() {
  const P = S.cx && S.cx.pr; if (!P) return '';
  const sq = (pct, cls) => `<div class="waf small">${Array.from({ length: 50 }, (_, i) => `<i class="${i < Math.round(pct / 2) ? cls : 'on'}"></i>`).join('')}</div>`;
  return xSec('Big projects: late and over budget', `<p class="note">The State Comptroller reviewed 5,128 New York City capital projects: 64% were delayed, nearly half by three years or more, and the overall overrun was about 18%. Your plan starts from that record. Overloaded agencies make it worse; audits and better planning data make it better.</p>
    <div class="jtiles"><div class="jt"><span class="note">Projects delayed</span><b class="num">${pct(P.late * 100, 0)}</b><span class="note">2024 record: 64%</span></div><div class="jt"><span class="note">Three years or more late</span><b class="num">${pct(P.late3 * 100, 0)}</b><span class="note">2024 record: 48%</span></div><div class="jt"><span class="note">Average cost overrun</span><b class="num">${pct((P.ovr - 1) * 100, 0)}</b><span class="note">≈ ${bn(P.extraB)} extra so far</span></div></div>
    <p class="note" style="margin-bottom:4px">Each square is one project in fifty; red ones finish three or more years late.</p>${sq(P.late3 * 100, 'over')}`);
}
function hhPanel() {
  const H = hhSummary(S); if (!H) return '';
  const f = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%';
  return xSec('Who wins, who loses', `<p class="note">${n0(H.n)} sample households drawn from each district's real mix of income, rent burden, age and tenure. Each quarter they get raises or lose jobs, face rent increases, get displaced or win a public home in the lottery. "Money left" is income after rent and city income tax, compared with 2027 (median household in the group).</p>
    <div class="tblw"><table class="jlev hh"><thead><tr><th>Group</th><th class="r">Money left</th><th class="r">Rent-burdened</th><th class="r">Displaced or evicted</th><th class="r">Moved into a public home</th><th class="r">Left the city</th></tr></thead><tbody>
    ${H.rows.map(r => `<tr><td>${esc(r.name)}</td><td class="r ${r.money < (Math.pow(1.03, S.t / 4) - 1) * 100 - 1.5 ? 'neg' : 'pos'}">${f(r.money)}</td><td class="r">${r.burden0 ? `${pct(r.burden0, 0)} → <b>${pct(r.burden, 0)}</b>` : '–'}</td><td class="r">${pct(r.disp, 1)}</td><td class="r">${pct(r.pub, 1)}</td><td class="r">${pct(r.left, 1)}</td></tr>`).join('')}</tbody></table></div>
    <p class="note">Incomes rise about 3% a year for everyone in work. Red marks groups falling behind that pace; rent is usually why.</p>`);
}
function hazardPanel() {
  const X = S.cx; if (!X || !X.cd) return '';
  const cds = Object.entries(X.cd);
  const heat = cds.slice().sort((a, b) => (b[1].heatD / b[1].pop) - (a[1].heatD / a[1].pop) || b[1].hvi - a[1].hvi).slice(0, 6);
  const flood = cds.filter(([, d]) => d.fp > 0).sort((a, b) => b[1].fp - a[1].fp).slice(0, 6);
  const prot = S.clim ? S.clim.protect : 0;
  return xSec('Heat and floods, district by district', `<p class="note">About 525 New Yorkers die from heat each summer (Health Department, 2018–2022), most of them at home in poorer, hotter neighbourhoods without air conditioning. Floods hit the waterfront districts and, in cloudbursts, basement homes. Cooling centres and AC access (Plan: heat) cut heat deaths; coastal protection and sewer upgrades cut flood damage.</p>
    <div class="jgrid" style="border-top:0;padding-top:0"><div><h3>Highest heat risk</h3><table class="jlev"><tbody>${heat.map(([id, d]) => `<tr><td>${esc(cdLabel(id))}</td><td class="r">risk ${d.hvi} of 5</td><td class="r">${d.heatD ? (d.heatD / d.pop * 1e5).toFixed(1) + ' deaths per 100k so far' : ''}</td></tr>`).join('')}</tbody></table></div>
    <div><h3>Most people in the floodplain</h3><table class="jlev"><tbody>${flood.map(([id, d]) => `<tr><td>${esc(cdLabel(id))}</td><td class="r">${n0(d.fp * (1 - prot))} unprotected</td><td class="r">${d.floodHit ? n0(d.floodHit) + ' flooded so far' : ''}</td></tr>`).join('')}</tbody></table></div></div>
    <p class="note">${X.hz.flash ? `Last cloudburst: ${X.hz.flash.deaths} deaths in ${X.hz.flash.hit.slice(0, 3).map(cdLabel).join(', ')}. ` : ''}Heat risk is an approximation of the Health Department's Heat Vulnerability Index from poverty, age and education. Map layers show both.</p>`);
}
function backtestPanel() {
  const b = backtest();
  return xSec('Does the model reproduce the past?', `<p class="note">A model is only as good as its fit to what already happened. Four real episodes, run through the model's own equations. First, the crime equations are run on 2015–2025 using only the real unemployment rate and the long-run trend, and compared with the murders the NYPD actually recorded.</p>
    <div class="fig" id="btFig" style="height:240px"></div>
    <div class="jtiles"><div class="jt"><span class="note">Average error, all years</span><b class="num">${b.mape.toFixed(0)}%</b><span class="note">"no change" guess: ${b.mapeNaive.toFixed(0)}%</span></div><div class="jt"><span class="note">Without 2020–2022</span><b class="num">${b.mapeNoCovid.toFixed(0)}%</b><span class="note">"no change" guess: ${b.mapeNaiveNoCovid.toFixed(0)}%</span></div><div class="jt"><span class="note">What it misses</span><b class="num" style="font-size:26px">The 2020 spike</b><span class="note">pandemic disruption is not in the model</span></div></div>
    <p class="note">The model does a little better than assuming nothing changes, and misses the pandemic-era rise almost entirely: unemployment alone cannot explain it. Unemployment inputs are rounded annual BLS figures.</p>
    <h3>2019 rent law: buildings that lose money</h3>
    <p class="note">The landlord equation (distress grows with the gap between operating costs and allowed rent increases) run on the real Rent Guidelines Board numbers since the 2019 law, starting from 5.5% of buildings in distress.</p>
    <div class="fig" id="rpRent" style="height:220px"></div>
    <p class="note"><b>Verdict:</b> close for 2020 and 2022, then far too high. After the 2022 cost jump the model keeps rising, but actual distress fell to 9.2% in 2024: rents in mixed buildings and the 2022–24 increases helped more than the equation allows. The model overstates how fast distress builds up after a cost shock. The 2020 cost figure is the Board's projection.</p>
    <h3>421-a expiry in 2022: new homes permitted</h3>
    <p class="note">The model has no tax-break lever; here its private building path with 25% fewer starts after June 2022 (our assumption for the share that depended on 421-a), with and without the new announcement effect, against permits actually issued.</p>
    <div class="fig" id="rpPermits" style="height:220px"></div>
    <p class="note"><b>Verdict:</b> the level after expiry fits (about 16,000 a year). Without expectations the model missed the rush entirely: developers filed 68,610 permits in 2022, 88% of them before the deadline. The model now lets developers file early while a law that would cut building waits in Albany. That rule was set from this episode, so it fits by construction; the check is the earlier lapse, when permits also spiked, to about 60,500 in 2015.</p>
    <h3>Congestion pricing, 2025</h3>
    <p class="note"><b>Not a test.</b> The road equation is set from the first year (−11% vehicles at $9), so it fits by construction. What can be checked later: whether the $12 toll in 2028 cuts traffic by the predicted further ${pct((1 - Math.exp(-ROAD0.k * 3)) * 100, 0)}.</p>
    <h3>1975 fiscal crisis</h3>
    <p class="note"><b>Partly reproduced.</b> The model has the State control board, service cuts, union pressure and people leaving. It does not have what actually triggered the crisis: the city had run deficits since 1961, hidden by borrowing, and in spring 1975 could not roll over $6 billion of short-term debt on a budget of about $15 billion. In the model the control board arrives after four deficit quarters, not when lenders stop lending.</p>`);
}
function migPanel() {
  const O = S.oc; if (!O) return '';
  const d = distribution(S), comm = (S.reg.commuters ?? 1000000) + O.commAdd;
  const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%';
  return xSec('Who moves in, who moves out', `<p class="note">New York is not closed. About 114,000 more people left for other parts of the country than arrived in 2025, across every income group (Citizens Budget Commission, 2026). Here each income group reacts to what your laws, plan and taxes are worth to it: groups that gain move in or stay, groups that lose leave a little faster. Some leavers keep their city job and commute in, so the city keeps the job but loses their income tax.</p>
    <div class="jtiles"><div class="jt"><span class="note">Moving because of your policies</span><b class="num">${O.migYr >= 0 ? '+' : '−'}${n0(Math.abs(O.migYr))}</b><span class="note">people a year (${O.migYr >= 0 ? 'net in' : 'net out'})</span></div><div class="jt"><span class="note">Households gained or lost</span><b class="num">${O.leftUnits <= 0 ? '+' : '−'}${n0(Math.abs(O.leftUnits))}</b><span class="note">tax-filing households since 2027</span></div><div class="jt"><span class="note">Commuters into the city</span><b class="num">${n0(comm)}</b><span class="note">${n0(O.commAdd)} are former residents</span></div></div>
    <div class="tblw"><table class="jlev"><thead><tr><th>Income group</th><th class="r">Net gain from policy</th><th class="r">Moving out (+) or in (−) a year</th><th class="r">Households now vs 2027</th></tr></thead><tbody>${d.map((g, i) => `<tr><td>${esc(g.name)}</td><td class="r ${g.netPct < 0 ? 'neg' : 'pos'}">${sg(g.netPct)}</td><td class="r">${sg(O.migG[i] * 100)}</td><td class="r">${O.u[i] >= 1 ? '+' : '−'}${Math.abs((O.u[i] - 1) * 100).toFixed(2)}%</td></tr>`).join('')}</tbody></table></div>
    <p class="note">Net gain is the yearly value of your laws, programmes and taxes as a share of each group's income (Taxes page). How strongly people react is a model assumption (0.05–0.2% of a group a year per point of income), tested under Scenarios; studies of state tax changes find small but real moves, larger at the top (Rauh and Shyu, 2024). Moves in add to housing demand.</p>`);
}
function deliverPanel() {
  const O = S.oc; if (!O) return '';
  const D = S.d || {};
  return xSec('Can the city deliver?', `<p class="note">Money is not the only limit. A plan also needs people to review permits, materials, installers and city staff. Push faster than they can follow and projects wait or cost more.</p>
    <div class="jtiles"><div class="jt"><span class="note">Building permit, filing to approval</span><b class="num">${n0(O.revDays)} days</b><span class="note">2026: 25.4 days (Department of Buildings)${O.revWait > 0 ? ` · public homes wait ${O.revWait} extra quarter${O.revWait > 1 ? 's' : ''}` : ''}</span></div>
    <div class="jt"><span class="note">Building prices from extra demand</span><b class="num">+${pct((O.mat - 1) * 100, 1)}</b><span class="note">the city builds about $70B a year (NYBC)</span></div>
    <div class="jt"><span class="note">Paid for, waiting for installers</span><b class="num">${n0(O.instWait)} MW</b><span class="note">batteries, solar, retrofits · trades install ≈${n0(O.instCap * 4)} MW a year</span></div>
    <div class="jt"><span class="note">Homes paid for but stalled</span><b class="num">${n0(D.stalled || 0)}</b><span class="note">not enough construction workers</span></div>
    <div class="jt"><span class="note">Agency workload</span><b class="num">${pct(S.capUse || 0, 0)}</b><span class="note">of what staff can absorb; hiring grows it ${pct((O.hire - 1) * 100, 0)} since 2027</span></div></div>
    <p class="note">Train planners to speed permits, energy-trades workers to clear the installer queue, construction apprentices for building. Raising city pay and slack in the job market make hiring easier. Review times rose by a quarter in a year with only 5% more filings (Mayor's Management Report 2026), so the model lets waits grow steeply with load. Installer capacity and the price response are model assumptions.</p>`);
}
function landlordPanel() {
  const O = S.oc; if (!O) return '';
  return xSec('How landlords respond', `<p class="note">Rent rules change what owners do. Operating costs of rent-stabilized buildings rose 5.3% last year (Rent Guidelines Board, 2026). When allowed rents rise more slowly than costs, more buildings lose money, repairs slip, some owners keep flats empty or sell to owner-occupiers, and buildings get cheaper to buy. San Francisco's 1994 rent control expansion cut rental supply in covered buildings by 15% (Diamond, McQuade and Qian, 2019). In New York conversions are harder, so the model uses smaller effects.</p>
    <div class="jtiles"><div class="jt"><span class="note">Stabilized flats in loss-making buildings</span><b class="num">${pct(O.distress * 100, 0)}</b><span class="note">2025: about 10% of pre-1974 flats</span></div>
    <div class="jt"><span class="note">Costs vs allowed rents</span><b class="num">${O.gap >= 0 ? '+' : '−'}${Math.abs(O.gap).toFixed(1)} pts</b><span class="note">a year, cost growth minus allowed rent growth</span></div>
    <div class="jt"><span class="note">Extra flats kept off the market</span><b class="num">${n0(O.whExtra)}</b><span class="note">on top of 26,310 in 2023 (Housing Vacancy Survey)</span></div>
    <div class="jt"><span class="note">Flats lost to abandonment</span><b class="num">${n0(O.abandoned)}</b><span class="note">when owners walk away</span></div>
    <div class="jt"><span class="note">Filed early before new rules</span><b class="num">${n0(S.ex ? S.ex.rushTot : 0)}</b><span class="note">homes${S.ex && S.ex.repaid > 1 ? `; ${n0(S.ex.repaid)} fewer later after a law failed` : ' rushed in while a law waited in Albany'}</span></div>
    <div class="jt"><span class="note">Price of buying a building</span><b class="num">${O.acqMul < 1 ? '−' : ''}${pct((1 - O.acqMul) * 100, 0)}</b><span class="note">below normal; cheaper to municipalize</span></div></div>
    <p class="note">People react to announcements, not only to laws in force: while a stricter rent law waits in Albany, owners already start emptying and selling flats, and developers file plans early to fall under the old rules. If the law then fails, those projects are missing later. Public ownership (municipalize, social housing) takes buildings out of this loop; audits cut warehousing. Lower building values also shrink the property tax base over five years, as assessments catch up.</p>`);
}
function avoidPanel() {
  const O = S.oc; if (!O) return '';
  return xSec('How taxpayers respond over time', `<p class="note">The tax revenue shown on this page already includes how much income top earners and firms report at the new rates. Avoidance keeps growing for about two years after a rise: residency changes, income moved to other years, profits booked elsewhere. After California raised top rates in 2012, 45% of the expected windfall was gone in the first year and 61% within two (Rauh and Shyu, 2024). Audits slow this down.</p>
    <div class="jtiles"><div class="jt"><span class="note">Revenue lost to growing avoidance</span><b class="num">${bn(O.lostB)}</b><span class="note">a year, on top of the immediate response</span></div><div class="jt"><span class="note">Top earners' income tax lost</span><b class="num">${pct(O.av.top * 100, 1)}</b><span class="note">of what they would pay</span></div><div class="jt"><span class="note">Business taxes lost</span><b class="num">${pct(O.av.corp * 100, 1)}</b><span class="note">of what firms would pay</span></div></div>`);
}
// ---------- land: where public homes can go ----------
const SITE_KIND = { approved: 'Approved', asright: 'Zoned; city buys land', fast: 'Fast track · ≈1 quarter', nycha: 'Tenant vote + fast track · ≈2 quarters', full: 'Full review + Council vote · ≈4 quarters' };
function siteState(x, st) {
  if (st.st === 'ok') return st.used >= x.homes - 1 ? ['Full', 'tag'] : ['Approved', 'tag good'];
  if (st.st === 'review') return [`In review, decision ${qLabel({ q: ((S.q - 1 + st.q - S.t) % 4) + 1, year: S.year + Math.floor((S.q - 1 + st.q - S.t) / 4) })}`, 'tag warn'];
  if (st.st === 'appeal') return ['At the Appeals Board', 'tag warn'];
  if (st.st === 'no') return ['Rejected', 'tag bad'];
  return ['Not proposed', 'tag'];
}
function sitesTable(compact) {
  const L = S.ld; if (!L) return '';
  const cap = sitesCap(S), lock = S.lost;
  const rows = SITES.map(x => { const st = L.sites[x.id], [lab, cls] = siteState(x, st), left = Math.max(0, x.homes - st.used);
    const ch = st.st === 'idle' ? Math.round(siteChance(S, x, st) * 100) : null;
    let act = '';
    if (!lock && st.st === 'idle') act = `<button class="btn" data-site="${x.id}">Propose</button>${x.kind === 'full' || x.kind === 'nycha' ? ` <button class="btn" data-site="${x.id}" data-inv="1" title="Parks, schools, transit and repairs for the neighbourhood, about $40,000 per home">+ community package ${bn(x.homes * 40000 / 1e9)}</button>` : ''}`;
    else if (!lock && st.st === 'no' && !st.appealed && x.kind !== 'nycha') act = `<button class="btn" data-site="${x.id}">Appeal</button>`;
    return `<tr><td><b>${esc(x.name)}</b>${compact ? '' : `<br><span class="note">${esc(x.note)}</span>`}</td><td class="r">${n0(left)}${st.used > 0 ? `<br><span class="note">${n0(st.used)} started</span>` : ''}</td><td>${esc(SITE_KIND[x.kind])}${x.extra ? `<br><span class="note">+$${k1(x.extra)} per home</span>` : ''}</td><td><span class="${cls}">${esc(lab)}</span>${ch != null ? `<br><span class="note">≈${ch}% chance if proposed</span>` : ''}</td><td class="r">${act}</td></tr>`; }).join('');
  return `<div class="jtiles"><div class="jt"><span class="note">Approved, not yet used</span><b class="num">${n0(cap.ok)}</b><span class="note">homes</span></div><div class="jt"><span class="note">In review</span><b class="num">${n0(cap.rev)}</b><span class="note">homes</span></div><div class="jt"><span class="note">Budget with no site</span><b class="num">${pct((1 - (L.useShare ?? 1)) * 100, 0)}</b><span class="note">last quarter</span></div></div>
    <div class="tblw"><table class="jlev sites"><thead><tr><th>Site</th><th class="r">Homes left</th><th>How it is approved</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-site]'); if (!b || !S) return; e.preventDefault(); if (proposeSite(S, b.dataset.site, b.dataset.inv === '1')) { changed(); render(); } });
function sitesPanel() {
  if (!S.ld) return '';
  return xSec('Where to build', `<p class="note">Money builds nothing without land. Public homes go to approved sites, cheapest first. Since the 2025 Charter amendments, publicly financed affordable housing can use a 30-day fast track at the Board of Standards and Appeals. Big sites still need a full public review and a Council vote, where the local member usually decides. A rejected project can go to the new Appeals Board (Mayor, Council Speaker, Borough President). NYCHA tenants vote before anything is built on their campus.</p>${sitesTable(false)}
    <p class="note">Capacities: Comptroller audit of vacant city land (2016), unused development rights on NYCHA campuses (2008, 2018), the 2024–25 neighbourhood rezonings, Willets Point, Brooklyn Marine Terminal and the Sunnyside Yard plan. How much is still free, the land price in rezoned areas and approval chances are our estimates.</p>`);
}
// ---------- roads, schools, hospitals, sea level ----------
function roadPanel() {
  const R = S.rd; if (!R) return '';
  return xSec('Cars, tolls and traffic', `<p class="note">Since 5 January 2025 drivers pay $9 to enter Manhattan below 60th Street. In the first year 73,000 fewer vehicles entered each day (−11%), crossings got faster and subway trips into the zone rose 9% (MTA). The toll rises to $12 in 2028 and $15 in 2031; the money pays for transit repairs. Change it under Laws → Road pricing.</p>
    <div class="jtiles"><div class="jt"><span class="note">Toll now</span><b class="num">$${R.toll}</b><span class="note">${R.susp > 0 ? 'paused by a court order' : 'peak, per day'}</span></div><div class="jt"><span class="note">Vehicles entering a day</span><b class="num">${n0(R.veh)}</b><span class="note">about 663,000 before the toll</span></div><div class="jt"><span class="note">Money for transit</span><b class="num">${bn(R.rev)}</b><span class="note">a year</span></div><div class="jt"><span class="note">Crossing speeds vs 2024</span><b class="num">${R.speed >= 1 ? '+' : '−'}${pct(Math.abs(R.speed - 1) * 100, 0)}</b><span class="note">morning rush</span></div></div>
    <p class="note">How strongly traffic reacts to the price is set from the first year. Effects outside the zone (traffic citywide, emissions, bus speeds) are our estimates.</p>`);
}
function schoolPanel() {
  const C = S.sc; if (!C) return '';
  return xSec('Class sizes', `<p class="note">A 2022 State law caps classes at 20 pupils in K–3, 23 in grades 4–8 and 25 in high school. 64% of classes complied in 2025–26; all must by the 2027–28 school year. That needs both teachers (estimates range from 12,000 to 16,300) and rooms: 495 schools are too crowded to meet the caps as they are. Change it under Laws → Class sizes and Plan → New school seats.</p>
    <div class="jtiles"><div class="jt"><span class="note">Classes within the caps</span><b class="num">${pct(C.comp, 0)}</b><span class="note">law requires ${pct(C.req, 0)} this school year</span></div><div class="jt"><span class="note">Extra teachers hired</span><b class="num">${n0(C.hired)}</b><span class="note">of about ${n0(SC0.tNeed)} needed · ${bn(C.cost)} a year</span></div><div class="jt"><span class="note">New seats opened</span><b class="num">${n0(C.seats)}</b><span class="note">${n0(C.newKids)} more pupils from new homes</span></div></div>
    <p class="note">Falling enrollment frees some rooms. How compliance depends on teachers and rooms, the teachers needed and the cost per seat are our estimates; the model does not measure what pupils learn.</p>`);
}
function hospPanel() {
  const H = S.hp; if (!H || !H.total) return '';
  return xSec('Hospital beds', `<p class="note">Beds are spread very unevenly: Manhattan has about 6 per 1,000 people, Queens about 1.5, against a US average of about 2.4. 63 hospitals have closed in New York State since 2000. When a borough runs short, ambulances travel further and emergency rooms fill. New beds go to the borough with the fewest.</p>
    <div class="jtiles"><div class="jt"><span class="note">Beds per 1,000, citywide</span><b class="num">${(H.total / S.pop * 1000).toFixed(2)}</b><span class="note">${n0(H.total)} beds</span></div><div class="jt"><span class="note">Fewest beds</span><b class="num">${esc(BOROUGHS.find(b => b.id === H.worst).name)}</b><span class="note">${pct((H.worstRatio || 1) * 100, 0)} of what its people need</span></div><div class="jt"><span class="note">Beds short</span><b class="num">${n0(H.short || 0)}</b><span class="note">in under-served boroughs · ${n0(H.closed)} closed since 2027</span></div></div>
    <p class="note">${BOROUGHS.map(b => `${esc(b.name)} ${(H.beds[b.id] / S.bor.find(x => x.id === b.id).pop * 1000).toFixed(1)}`).join(' · ')} beds per 1,000. Manhattan and Queens are reported figures; the Bronx, Brooklyn and Staten Island, the cost per bed and the effect on health are our estimates.</p>`);
}
function seaPanel() {
  const F = S.fl; if (!F) return '';
  return xSec('Rising seas and flood insurance', `<p class="note">The New York Panel on Climate Change expects the sea to rise 36–48 cm by the 2050s and 64–99 cm by the 2080s. Every centimetre makes storm floods reach further. About 53,000 properties in the city hold federal flood insurance; under FEMA's new pricing their premiums rise every year toward the full risk price, and some owners drop their cover. Uninsured families take the hit when a storm comes.</p>
    <div class="jtiles"><div class="jt"><span class="note">Sea level</span><b class="num">+${F.cm.toFixed(1)} cm</b><span class="note">since 1995–2014; storm floods ${pct((F.exp - 1) * 100, 0)} worse than in 2027</span></div><div class="jt"><span class="note">Average flood premium</span><b class="num">$${n0(F.prem)}</b><span class="note">a year; full-risk New York average ≈$1,834</span></div><div class="jt"><span class="note">Insured properties</span><b class="num">${n0(F.pol)}</b><span class="note">${pct((F.ins || 0.55) * 100, 0)} of homes in the flood zone (estimate)</span></div></div>
    <p class="note">Coastal protection (Plan) lowers both the damage and the premiums. The year-to-year path of the sea level, the premium cap and how many owners drop cover are our estimates.</p>`);
}
function auditPanel() {
  const a = auditChecks();
  return xSec('Does the model count anything twice?', `<p class="note">Several parts of the model act on the same thing: top earners can report less income, avoid tax over time or move away; people move both because a policy pays them and because it is popular. Each check below switches channels off one at a time, then compares the combined effect with outside evidence. These numbers are computed live from the current model.</p>
    <div class="tblw"><table class="jlev audit"><thead><tr><th>Check</th><th>Model</th><th>Evidence</th><th>Result</th></tr></thead><tbody>${a.map(x => `<tr><td><b>${esc(x.t)}</b><br><span class="note">${esc(x.note)}</span></td><td>${esc(x.model)}</td><td>${esc(x.ev)}</td><td><span class="${x.ok === true ? 'tag good' : x.ok === false ? 'tag bad' : 'tag'}">${x.ok === true ? 'Within range' : x.ok === false ? 'Out of range' : 'No benchmark'}</span></td></tr>`).join('')}</tbody></table></div>`);
}
const EXTRAS = {
  services: () => gridPanel() + subwayPanel() + roadPanel() + schoolPanel() + hospPanel(),
  economy: () => bizPanel() + projPanel(),
  plan: () => sitesPanel() + deliverPanel(),
  laws: () => landlordPanel(),
  taxes: () => avoidPanel(),
  labor: () => migPanel() + hhPanel(),
  climate: () => hazardPanel() + seaPanel(),
  sources: () => backtestPanel() + auditPanel(),
};
function addExtras() {
  const f = EXTRAS[tab], v = $('#v-' + tab); if (!f || !v || v.querySelector('.xsec')) return;
  const html = f(); if (!html) return; v.insertAdjacentHTML('beforeend', html);
  const G = S.cx && S.cx.gr;
  if ($('#gridFig') && G) { const hrs = G.sum.map((_, h) => h); lineChart($('#gridFig'), [{ name: 'Summer day', color: 'var(--red)', pts: hrs.map(h => [h, G.sum[h]]), dot: false, w: 2.5 }, { name: 'Winter day', color: 'var(--s1)', pts: hrs.map(h => [h, G.win[h]]), dot: false, w: 2.5 }, { name: 'Firm supply', color: 'var(--ink)', pts: [[0, G.firmS], [23, G.firmS]], dash: true, dot: false, w: 1.5 }], { xf: h => h + ':00', yf: v => n0(v) + ' MW', rlab: true }); }
  if ($('#bizFig')) { const h = S.hist; lineChart($('#bizFig'), [{ name: 'Opened', color: 'var(--good)', pts: h.map(x => [x.t, x.bizOpen || 0]), w: 2 }, { name: 'Closed', color: 'var(--red)', pts: h.map(x => [x.t, x.bizClose || 0]), w: 2 }, { name: 'Moved away', color: 'var(--ink2)', pts: h.map(x => [x.t, x.bizMoved || 0]), w: 2, dash: true }], { yf: v => n0(v), zero: true, rlab: true }); }
  if ($('#rpRent')) { const r = replayRent(); lineChart($('#rpRent'), [{ name: 'Recorded', color: 'var(--ink)', pts: r.years.map((y, i) => [y, r.obs[i]]).filter(p => p[1] != null), w: 2.5 }, { name: 'Model', color: 'var(--red)', pts: r.years.map((y, i) => [y, r.model[i]]), dash: true, w: 2 }], { xf: x => String(x), yf: v => v.toFixed(0) + '%', zero: true, rlab: true }); }
  if ($('#rpPermits')) { const r = replayPermits(); lineChart($('#rpPermits'), [{ name: 'Permits issued', color: 'var(--ink)', pts: r.years.map((y, i) => [y, r.obs[i]]).filter(p => p[1] != null), w: 2.5 }, { name: 'Model', color: 'var(--red)', pts: r.years.map((y, i) => [y, r.model[i]]), dash: true, w: 2 }, { name: 'Without expectations', color: 'var(--ink2)', pts: r.years.map((y, i) => [y, r.noExp[i]]), dash: true, dot: false, w: 1.5 }], { xf: x => String(x), yf: v => n0(v), zero: true, rlab: true }); }
  if ($('#btFig')) { const b = backtest(); lineChart($('#btFig'), [{ name: 'Recorded', color: 'var(--ink)', pts: b.years.map((y, i) => [y, b.actual[i]]), w: 2.5 }, { name: 'Model', color: 'var(--red)', pts: b.years.map((y, i) => [y, b.model[i]]), dash: true, w: 2 }], { xf: x => String(x), yf: v => n0(v), zero: true, rlab: true }); }
}

// ---------- small page illustrations ----------
const PILL = {
  ballot: `<svg viewBox="0 0 300 300"><rect class="red" x="105" y="30" width="90" height="120" transform="rotate(8 150 90)"/><rect class="pap" x="120" y="55" width="60" height="8" transform="rotate(8 150 90)"/><rect class="pap" x="120" y="75" width="40" height="8" transform="rotate(8 150 90)"/><rect class="ink" x="40" y="130" width="220" height="150"/><rect class="pap" x="95" y="142" width="110" height="10"/><rect class="red" x="40" y="200" width="220" height="14"/></svg>`,
  coins: `<svg viewBox="0 0 300 300">${[0, 1, 2, 3, 4, 5].map(i => `<ellipse class="ink" cx="95" cy="${250 - i * 22}" rx="60" ry="18"/><ellipse class="pap sk" cx="95" cy="${244 - i * 22}" rx="60" ry="18" stroke-width="5"/>`).join('')}${[0, 1, 2, 3].map(i => `<ellipse class="ink" cx="205" cy="${250 - i * 22}" rx="60" ry="18"/><ellipse class="${i === 3 ? 'red' : 'pap sk'}" cx="205" cy="${244 - i * 22}" rx="60" ry="18" stroke-width="5"/>`).join('')}</svg>`,
  scales: `<svg viewBox="0 0 300 300"><rect class="ink" x="144" y="40" width="12" height="220"/><rect class="ink" x="90" y="256" width="120" height="16"/><rect class="ink" x="40" y="70" width="220" height="10" transform="rotate(-6 150 75)"/><line class="sk" x1="55" y1="84" x2="30" y2="170" stroke-width="4"/><line class="sk" x1="55" y1="84" x2="85" y2="170" stroke-width="4"/><path class="ink" d="M20 170 H95 Q57 210 20 170 Z"/><line class="sk" x1="245" y1="62" x2="220" y2="150" stroke-width="4"/><line class="sk" x1="245" y1="62" x2="275" y2="150" stroke-width="4"/><path class="red" d="M210 150 H285 Q247 190 210 150 Z"/><circle class="red" cx="150" cy="38" r="14"/></svg>`,
  people: `<svg viewBox="0 0 300 300">${[[60, 'ink'], [120, 'red'], [180, 'ink'], [240, 'ink']].map(([x, c], i) => `<circle class="${c}" cx="${x}" cy="${120 + (i % 2) * 14}" r="26"/><path class="${c}" d="M${x - 34} 290 V${185 + (i % 2) * 14} Q${x} ${150 + (i % 2) * 14} ${x + 34} ${185 + (i % 2) * 14} V290 Z"/>`).join('')}</svg>`,
};
const PAGE_ILL = { decide: () => LILL.ledger, economy: () => LILL.factory, services: () => LILL.queue, labor: () => PILL.people, justice: () => PILL.scales, climate: () => LILL.tub, politics: () => PILL.ballot, budget: () => PILL.coins, map: () => LILL.crane };
function pageIll() { const f = PAGE_ILL[tab], v = $('#v-' + tab); if (!f || !v || v.querySelector('.pgill')) return; const h = v.querySelector(':scope > h1'); if (h) h.insertAdjacentHTML('beforebegin', `<div class="pgill ill" aria-hidden="true">${f()}</div>`); }

function addNum() { try { pageIll(); } catch (e) { } try { addExtras(); } catch (e) { console.error(e); } const h = $('#v-' + tab + ' > h1'); const i = TAB_GROUPS.flatMap(g => g[1]).indexOf(tab); if (h && i >= 0) h.dataset.no = '§' + (i + 1); }
function render() {
  header(); tabs();
  $$('.view').forEach(v => { const on = v.id === 'v-' + tab; v.classList.toggle('on', on); if (!on && v.innerHTML) v.innerHTML = ''; });
  try { VIEWS[tab](); } catch (err) {
    console.error(err);
    $('#v-' + tab).innerHTML = `<h1>This page could not be drawn</h1><p class="lead">Something in your saved plan does not fit this version of the game (${esc(err.message)}). Your plan is safe. Try another page, or start a new plan from the start screen.</p><p><button class="btn go" id="restartBtn">Start a new plan</button></p>`;
    const rb = $('#restartBtn'); if (rb) rb.onclick = () => { if (confirmReset()) boot(newGame({ mode })); };
  }
  if (S) { S.gv = S.gv || {}; S.gv[tab] = Math.max(S.gv[tab] ?? -1, S.t); }
  addNum();
  if (tab === 'learn') learnBind();
  addTip(tab);
}

// ---------- start screen ----------
let pickCity = 'nyc';
function startScreen() {
  $('#cities').innerHTML = CITIES.map(c => `<button class="city ${c.id === pickCity ? 'on' : ''}" data-c="${c.id}" ${c.ready ? '' : 'disabled'}><b>${esc(c.name)}</b><span>${esc(c.sub)}</span></button>`).join('');
  $$('#cities .city').forEach(b => b.onclick = () => { pickCity = b.dataset.c; startScreen(); });
  $$('#modeSeg button').forEach(b => b.onclick = () => { mode = b.dataset.m; $$('#modeSeg button').forEach(x => x.classList.toggle('on', x === b)); });
  let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  const shared = sharedPlanFromHash();
  if (shared) { $('#resumeNote').innerHTML = `Someone shared a plan with you: <b>${esc(shared.n || 'Shared plan')}</b>. <button class="btn go" id="openShared" style="margin-left:8px">Open it</button>`; $('#openShared').onclick = () => { const s = applyPlan(shared); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } boot(s); tab = 'overview'; render(); toast(`"${s.sharedName}" is loaded at the start of 2027. Its laws are applied as proposed, without Council votes or Albany. Run the quarters to see how it plays out, then submit your own version.`); }; }
  const dn = $('#dataNote'); if (dn) { const na = Object.values(LIVE.values || {}).filter(x => x.method === 'auto').length; dn.textContent = `Last data update: ${LIVE.generated || 'n/a'}` + (na ? ` · ${na} figures refreshed automatically` : ''); }
  if (!shared && saved && saved.v === 3 && saved.t > 0) { $('#resumeNote').innerHTML = `A saved plan exists (${esc(qLabel(saved))}). <button class="btn" id="resume" style="margin-left:8px">Resume it</button>`; $('#resume').onclick = () => boot(saved); }
  $('#pgfx').innerHTML = (POSTERS[(SITE && SITE.poster) || 'star'] || POSTERS.star)();
  { const g = $('#pgfx'), fit = () => g.setAttribute('preserveAspectRatio', innerWidth >= 1700 ? 'xMinYMid slice' : 'xMaxYMax meet'); fit(); addEventListener('resize', fit); }
  $('#introOpen').onclick = () => openIntro(0);
  $('#whyOpen').onclick = openPrologue;
  $('#teachOpen').onclick = openTeach; $('#teachTop').onclick = openTeach;
  $('#subStart').onclick = () => { let sv = null; try { sv = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
    const has = sv && sv.v === 3 && sv.hist && sv.t > 0;
    modal(`<h2 style="margin-top:0">Submit your plan</h2><p>No two runs end the same: storms, recessions and votes are partly left to chance, and every plan sets off its own chain of effects.</p><p><b>Found something that works?</b> Submit your plan and what you learned. Submissions go to the Plan Bureau team, and the best ideas are collected as proposals for real policy.</p>${has ? '<p class="note">You have a saved plan (' + esc(qLabel(sv)) + '). Open it to write down what you found and send it.</p>' : ''}<div class="row" style="gap:8px;margin-top:12px">${has ? '<button class="btn go" id="subGo">Open my plan and submit</button>' : '<button class="btn go" id="subNew">Start a plan</button>'}<button class="btn" id="mClose">Close</button></div>`);
    const g = $('#subGo'); if (g) g.onclick = () => { closeModal(); boot(sv); tab = 'submit'; render(); window.scrollTo({ top: 0 }); };
    const n = $('#subNew'); if (n) n.onclick = () => { closeModal(); $('#begin').focus(); }; };
  if (!whySeen() && !shared) openPrologue();
  
  $('#begin').onclick = () => { boot(newGame({ mode })); if (!introSeen()) openIntro(0); };
}
// bring saves from older versions up to date, so every page has the fields it needs
function migrate(s) {
  const f = newGame({ mode: s.mode, seed: s.seed });
  if (!s.d) s.d = f.d;
  Object.keys(f.d).forEach(k => { if (s.d[k] === undefined) s.d[k] = f.d[k]; });
  LAWS.forEach(l => { if (!s.pol[l.id]) s.pol[l.id] = l.opts[0].id; });
  if (s.plan.audit === undefined) s.plan.audit = f.plan.audit;
  if (!s.cx) s.cx = cityInit(s);
  if (s.plan.police === undefined) s.plan.police = 0; if (s.plan.prevent === undefined) s.plan.prevent = 0;
  if (!s.js) s.js = f.js;
  if (!s.cb) s.cb = f.cb;
  if (s.goals && s.goals.ghg === 20) s.goals.ghg = 39.4;
  Object.keys(f.plan.cap).forEach(k => { if (s.plan.cap[k] === undefined) s.plan.cap[k] = 0; });
  Object.keys(f.plan.train).forEach(k => { if (s.plan.train[k] === undefined) s.plan.train[k] = 0; });
  ['tax', 'fin', 'un', 'clim', 'reg', 'k'].forEach(k => { if (!s[k]) s[k] = f[k]; });
  const h0 = f.hist[0];
  (s.hist || []).forEach(h => Object.keys(h0).forEach(k => { if (h[k] === undefined) h[k] = h0[k]; }));
  return s;
}
function boot(state) {
  S = migrate(state); if (!S.decBase) S.decBase = decSnap(S); mode = S.mode; undoStack = []; projCache = null; mcCache = null; solveRes = null; taxDraft = null;
  $('#start').hidden = true; $('#app').hidden = false;
  const h = (location.hash || '').slice(1); if (VIEWS[h]) tab = h;
  render(); save();
}
$('#help').onclick = () => openIntro(0);
$('#next').onclick = () => { if ($('#modal').classList.contains('on')) return; runQuarter(); };
$('#undo').onclick = () => { if (!undoStack.length) return; S = JSON.parse(undoStack.pop()); projCache = null; mcCache = null; solveRes = null; taxDraft = null; save(); render(); };
$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
window.addEventListener('resize', () => { if (S) document.documentElement.style.setProperty('--barh', $('#bar').offsetHeight + 'px'); });
try { window.claude?.hot?.snapshot?.(() => S ? JSON.parse(JSON.stringify(S)) : null); } catch (e) { }
const startFn = data => { if (data && data.v === 3 && data.hist) boot(data); else startScreen(); };
if (window.claude?.hot?.ready) window.claude.hot.ready(startFn); else startFn(window.claude?.hot?.data ?? null);
}
