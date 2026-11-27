// ===== MODEL ASSUMPTIONS (no official source; every one is tested in the sensitivity tool) =====
const ASSUME = {
  unitCost: { v: 650000, name: 'Public construction cost per home ($)' },
  hhForm: { v: 18000, name: 'Latent household formation (homes/yr)' },
  privPermits: { v: 22000, name: 'Baseline private permits (homes/yr)' },
  workersPerUnit: { v: 0.8, name: 'Workers tied up per home in construction' },
  acqCost: { v: 250000, name: 'Price per apartment bought ($)' },
  flight: { v: 1, name: 'Top-earner exit response (×)' },
  climateResp: { v: 1, name: 'Investor response to laws (×)' },
  albany: { v: 0.22, name: 'Albany approval chance per quarter' },
  storeReach: { v: 15000, name: 'People served per city store' },
  storageCost: { v: 2.0e6, name: 'Battery storage cost ($/MW)' },
  windCost: { v: 6.0e6, name: 'Offshore wind cost ($/MW)' },
  effCost: { v: 4.0e6, name: 'Retrofit cost per MW of peak avoided ($)' },
  peakGrowth: { v: 25, name: 'Peak demand growth (MW/yr)' },
  expGrowth: { v: 0.030, name: 'Growth of existing city spending (/yr)' },
  jgCost: { v: 55000, name: 'Job-guarantee cost per worker ($/yr)' },
  seatCost: { v: 35000, name: 'Child-care seat build cost ($)' },
  seatOp: { v: 22000, name: 'Child-care seat running cost ($/yr)' },
  careTake: { v: 0.45, name: 'Families wanting care for under-5s (share)' },
  aideRatio: { v: 0.135, name: 'Home-care aides needed per person 65+' },
  bondRate: { v: 0.062, name: 'Debt service on new bonds (/yr)' },
  storm: { v: 1, name: 'Severity of storms and shocks (×)' },
  eTop: { v: 0.4, name: 'Top 1% taxable-income response to tax rates' },
  eCorp: { v: 0.3, name: 'Business tax base response to rates' },
  eSales: { v: 0.4, name: 'Sales tax base response (shopping in NJ, online)' },
  eProp4: { v: 0.2, name: 'Commercial property response to tax rates' },
  passThrough: { v: 0.5, name: 'Share of apartment property tax passed to renters' },
  overrun: { v: 1.12, name: 'Average cost overrun on public projects (×)' },
  adminCap: { v: 6, name: 'New plan spending agencies can absorb ($B/yr)' },
  migNet: { v: 1, name: 'Households moving in or out over net gains and losses (×)' },
  stayWork: { v: 0.35, name: 'Share of leavers who keep their city job and commute in' },
  matElast: { v: 0.2, name: 'Construction price rise per 100% more building in the city' },
  reviewCap: { v: 1, name: 'Plan review and permit capacity (×)' },
  installCap: { v: 900, name: 'Batteries, solar and retrofits the trades can install (MW/yr)' },
  convert: { v: 1, name: 'Landlords taking controlled flats off the market (×)' },
  avoidLR: { v: 1, name: 'Long-run growth of tax avoidance (×)' },
};
const A0 = () => Object.fromEntries(Object.entries(ASSUME).map(([k, o]) => [k, o.v]));

// ===== LAWS =====
// effects: privBuild (× private permits), rentG (pp/yr rent growth), climate (long-run business climate shift ÷8), flight (%/qtr top earners), support (static Δ),
// info (planning information quality), op ($B/yr operating cost), capex ($B one-off), legal (risk points/qtr), albany (needs State approval)
const LAWS = [
  { id: 'housing', name: 'Housing tenure', opts: [
    { id: 'h0', name: 'Rent stabilization as is', desc: 'About 1 million stabilized units; the Rent Guidelines Board sets yearly increases.', prec: 'NYC rent stabilization since 1969.', fx: {} },
    { id: 'h1', name: 'Rent freeze on stabilized units', desc: '0% increases for stabilized leases. Cheap for the city, but older buildings lose maintenance money.', prec: 'Real: RGB froze 1- and 2-year leases in June 2026 (7–1 vote).', src: 'rentFreeze', fx: { rentG: -1.2, climate: -0.3, support: 2, maint: -0.15, privBuild: 0.97 } },
    { id: 'h2', name: 'Universal rent control', desc: 'All rentals capped at inflation. Rent laws are State law, so Albany must agree.', prec: 'Berlin\'s Mietendeckel (2020) was struck down by Germany\'s Constitutional Court in 2021.', fx: { rentG: -3, climate: -1.2, support: 5, maint: -0.35, privBuild: 0.6, legal: 1, albany: true } },
    { id: 'h3', name: 'Municipalize with compensation', desc: 'City buys large rental portfolios at market value and runs them as social housing (rent ≈ 25% of income). Unlocks the acquisition budget.', prec: 'Red Vienna built ~64,000 municipal flats 1923–34; Vienna\'s city landlord still runs about 220,000.', fx: { rentG: -1.5, climate: -0.5, support: 3, privBuild: 0.85, legal: 0.6, acquire: true } },
    { id: 'h4', name: 'Expropriate without compensation', desc: 'Seize large landlords\' buildings. Violates the Fifth Amendment Takings Clause; courts and capital react hard.', prec: 'Berlin\'s 2021 "Deutsche Wohnen enteignen" referendum won 59.1% but even it assumed compensation; never implemented.', fx: { rentG: -3, climate: -9, support: 1, privBuild: 0.15, flight: -2.5, legal: 9, seize: true } },
  ]},
  { id: 'land', name: 'Land', opts: [
    { id: 'l0', name: 'Current property tax classes', desc: 'Four property classes with very different effective rates.', prec: 'NYC system since 1981 (S7000A).', fx: {} },
    { id: 'l1', name: 'Land value tax shift', desc: 'Tax land, not buildings: vacant lots and parking become expensive to hold. Needs Albany.', prec: 'Pittsburgh used a split-rate land tax from 1913 to 2001.', fx: { privBuild: 1.15, support: -1, climate: 0.3, legal: 0.3, albany: true } },
    { id: 'l2', name: 'Public land bank', desc: 'City buys and holds land, giving it to non-profit and public builders at no cost. Lowers public construction cost about 8%.', prec: 'Vienna\'s land fund (wohnfonds_wien) since 1984.', fx: { op: 0.3, costMult: 0.92, legal: 0.2 } },
  ]},
  { id: 'energy', name: 'Energy ownership', opts: [
    { id: 'e0', name: 'Con Edison, regulated', desc: 'Investor-owned utility, rates set by the State PSC.', prec: 'Status quo.', fx: {} },
    { id: 'e1', name: 'Public renewables build-out', desc: 'Use the State power authority (NYPA) to build city renewables and storage at public borrowing cost: energy investments 10% cheaper.', prec: 'Real: Build Public Renewables Act (2023) lets NYPA build renewables.', fx: { energyCost: 0.9, support: 1 } },
    { id: 'e2', name: 'Municipalize Con Edison', desc: 'Buy the utility through condemnation (≈ $60B incl. debt, bond-financed, 8 quarters of court process). Rates fall ~10% after.', prec: 'Long Island Power Authority took over LILCO in 1998.', fx: { capex: 60, energyCost: 0.85, climate: -0.4, legal: 2.5, conEd: true } },
  ]},
  { id: 'food', name: 'Food distribution', opts: [
    { id: 'f0', name: 'Market plus SNAP', desc: 'Private grocers; federal SNAP feeds about 1.78M New Yorkers.', prec: 'Status quo.', src: 'snap', fx: {} },
    { id: 'f1', name: 'Five city-owned grocery stores', desc: 'One store per borough on city land, staples 30% below retail. About $30M per store.', prec: 'Real: Mamdani pilot, first store at La Marqueta, East Harlem.', src: 'grocery', fx: { storesCap: 5, support: 1 } },
    { id: 'f2', name: 'Public grocery network', desc: 'Scale city stores to a citywide network. Set the build rate in the Plan.', prec: 'Cooperative and municipal stores in Vienna, Bologna; Atlanta tried a city grocery pilot (2024).', fx: { storesCap: 9999, support: 2 } },
    { id: 'f3', name: 'Staple price controls', desc: 'Legal maximum prices on staples. Cheaper food now, but private grocers stock less.', prec: 'US price controls 1971–74; Venezuela\'s controls (2003–) brought shortages.', fx: { foodPrice: -0.1, privFood: -2.5, support: 3, black: 2, legal: 1.5 } },
    { id: 'f4', name: 'Ration cards for staples', desc: 'Every resident gets a monthly staples quota. Hunger falls, but choice and support fall too.', prec: 'UK rationing 1940–54; GDR and USSR ration cards.', fx: { ration: true, support: -6, black: 3, op: 0.5 } },
  ]},
  { id: 'transit', name: 'Transit fares', opts: [
    { id: 't0', name: '$3.00 fare', desc: 'Base fare since Jan 2026.', prec: 'Status quo.', src: 'fare', fx: {} },
    { id: 't1', name: 'Fare-free buses', desc: 'Replace ~$0.65B/yr of bus fares. The MTA is a State authority, so Albany must agree.', prec: 'NYC fare-free bus pilot on 5 routes, 2023–24.', src: 'farebox', fx: { op: 0.7, rides: 0.06, support: 2, albany: true } },
    { id: 't2', name: 'Fare-free transit', desc: 'Buses and subway free: replace ~$3.6B/yr of fares.', prec: 'Luxembourg made all public transport free in 2020; Tallinn in 2013.', src: 'farebox', fx: { op: 3.7, rides: 0.15, support: 4, albany: true } },
  ]},
  { id: 'health', name: 'Health care', opts: [
    { id: 'm0', name: 'Public hospitals + NYC Care', desc: 'NYC Health + Hospitals safety net.', prec: 'Status quo.', fx: {} },
    { id: 'm1', name: 'Universal municipal primary care', desc: 'Community clinics in every district, free at point of use. Needs ~8,000 more health workers.', prec: 'Cuba\'s polyclinic system; Brazil\'s Family Health teams.', fx: { op: 1.2, life: 0.06, support: 2, healthNeed: 8000 } },
    { id: 'm2', name: 'City single-payer pilot', desc: 'City pays all residents\' care. Needs State and federal waivers.', prec: 'NY Health Act: proposed in Albany for years, never enacted.', fx: { op: 6, life: 0.1, support: 3, climate: -0.4, legal: 1.5, albany: true, healthNeed: 15000 } },
  ]},
  { id: 'elder', name: 'Elder care', opts: [
    { id: 'o0', name: 'Medicaid home care via agencies', desc: '1.43M New Yorkers are 65+ (2023), up 53% since 2000. Care comes from private agencies paid by Medicaid.', prec: 'Status quo.', src: 'old', fx: {} },
    { id: 'o1', name: 'Home-care co-ops, $25/h wage floor', desc: 'City-backed worker co-ops employ aides at a living wage; fewer quit, more join.', prec: 'Cooperative Home Care Associates (Bronx, 1985) is the largest worker co-op in the US.', fx: { op: 1.5, aideGrow: 0.006, support: 2, morale: 0.001 } },
  ]},
  { id: 'safety', name: 'Public safety', opts: [
    { id: 'z0', name: 'NYPD + Office of Community Safety', desc: '34,700 officers; a $260M Office of Community Safety coordinates mental-health and violence programs.', prec: 'Real 2026 set-up.', src: 'ocs260', fx: {} },
    { id: 'z1', name: 'Department of Community Safety', desc: 'Civilian teams answer most of the ~200,000 mental-health 911 calls a year, freeing police time. ≈ $1.1B/yr.', prec: 'Denver STAR (2020) and Albuquerque Community Safety send civilian responders; studies found fewer low-level arrests.', src: 'ocs', council: { cs: 0.3 }, fx: { op: 0.85, prevent: 0.85, lowlevel: -0.15, trust: 4, support: 1 } },
    { id: 'z2', name: 'Hire 5,000 more officers', desc: 'Expand the NYPD to ~39,700. ≈ $0.75B/yr.', prec: 'Planned by the previous administration, cancelled in 2026. US studies find more police cut homicides but raise low-level arrests, mostly of Black residents (Chalfin et al. 2022).', council: { prog: 0.25, main: 0.85, cs: 0.95 }, fx: { op: 0.75, lowlevel: 0.15, trust: -3, support: 1 } },
    { id: 'z3', name: 'Care, not cops', desc: 'Civilian teams for mental-health, homeless and noise calls; violence interrupters in every high-violence precinct; police keep violent crime. Shifts ≈ $1B a year from NYPD overtime and patrol to the new department.', prec: 'NYC Crisis Management System (violence interrupters, since 2014); Denver STAR; Camden NJ rebuilt its police with community policing in 2013.', src: 'ocs', fx: { op: 0.2, prevent: 1, police: -1, lowlevel: -0.3, trust: 6, support: -1, legal: 0.5 } },
  ]},
  { id: 'drugs', name: 'Drugs and overdose', opts: [
    { id: 'x0', name: 'Two overdose prevention centers', desc: 'Possession of most drugs is a crime; cannabis is legal since 2021. OnPoint NYC runs two supervised consumption sites in Manhattan.', prec: 'Status quo since Nov 2021, the first sanctioned sites in the US.', src: 'od', fx: {} },
    { id: 'x1', name: 'Prevention centers in every borough', desc: 'Ten supervised sites, naloxone everywhere, treatment on demand. ≈ $0.3B/yr. Federal law still forbids such sites, so the US Attorney could close them.', prec: 'Studies of the two NYC sites found no rise in nearby crime (Chalfin et al. 2023). Vancouver, Lisbon and Zurich run many.', fx: { op: 0.3, od: -0.12, legal: 1.2, support: -0.5 } },
    { id: 'x2', name: 'Treatment, not jail', desc: 'Prosecutors and police route possession and low-level drug arrests to treatment and housing instead of Rikers. ≈ $0.2B/yr.', prec: 'Brooklyn and Manhattan DAs already decline many possession cases; Seattle LEAD diversion (2011).', fx: { op: 0.2, od: -0.05, jail: -0.06, lowlevel: -0.1, trust: 2 } },
    { id: 'x3', name: 'Decriminalize possession', desc: 'Small amounts of any drug become a civil fine with a referral to treatment. Needs State law.', prec: 'Portugal decriminalized in 2001 alongside large treatment spending. Oregon did it in 2021 with slow treatment funding and recriminalized in 2024; studies found no clear effect on deaths either way.', fx: { jail: -0.1, lowlevel: -0.2, trust: 2, support: -2.5, albany: true } },
  ]},
  { id: 'evict', name: 'Evictions', opts: [
    { id: 'v0', name: 'Right to Counsel + Good Cause', desc: 'Free lawyers for low-income tenants in Housing Court (since 2017); State Good Cause law (2024) limits evictions without reason. About 1,500 households a month are still evicted by marshals.', prec: 'Status quo.', src: 'evict', fx: {} },
    { id: 'v1', name: 'Full Right to Counsel + arrears fund', desc: 'Enough lawyers for every tenant who qualifies, plus a city fund that pays arrears for tenants who fall behind after a job loss or illness. ≈ $0.45B/yr.', prec: 'NYC\'s Right to Counsel was the first in the US; represented tenants mostly keep their homes (Office of Civil Justice reports).', fx: { op: 0.45, evict: -0.35, support: 1 } },
    { id: 'v2', name: 'No eviction into the street', desc: 'Before any eviction for arrears, the city pays the debt or moves the household into a public home. Landlords get paid; nobody goes to a shelter. ≈ $1B/yr.', prec: 'Vienna\'s eviction-prevention service (FAWOS) and Finland\'s Housing First keep evictions into homelessness rare.', fx: { op: 1.0, evict: -0.7, support: 1.5, privBuild: 0.98 } },
    { id: 'v3', name: 'Eviction moratorium', desc: 'Stop all residential evictions. Needs State law; landlords lose income, some stop maintaining buildings.', prec: 'New York had one from March 2020 to January 2022; the US Supreme Court struck down part of it in 2021.', fx: { evict: -0.95, privBuild: 0.92, maint: 0.3, legal: 2, support: 0.5, albany: true } },
  ]},
  { id: 'work', name: 'Ownership of enterprises', opts: [
    { id: 'w0', name: 'Private firms', desc: 'Status quo.', prec: '', fx: {} },
    { id: 'w1', name: 'Worker co-op conversion fund', desc: 'Finance buy-outs of retiring owners\' firms by their workers.', prec: 'Real: NYC Worker Cooperative Business Development Initiative (since 2015); Mondragon, Spain.', fx: { op: 0.2, morale: 0.004, support: 1 } },
    { id: 'w2', name: 'Mandatory codetermination', desc: 'Workers elect half of the board in firms over 500 staff. Corporate law is State/Delaware law.', prec: 'Germany\'s Mitbestimmungsgesetz (1976).', fx: { morale: 0.006, climate: -1, legal: 2.5, support: 1 } },
    { id: 'w3', name: 'Socialize large enterprises', desc: 'Take over banks and large firms. Far outside a city\'s legal powers; capital and firms leave.', prec: 'Soviet nationalization 1917–; France nationalized banks in 1982, then privatized from 1986.', fx: { climate: -15, flight: -5, legal: 10, support: -2, morale: -0.01, nationalize: true } },
  ]},
  { id: 'labor', name: 'Jobs & wages', opts: [
    { id: 'j0', name: 'Labor market as is', desc: 'Unemployment 4.8% (Sept 2026).', prec: 'Status quo.', src: 'unempSep', fx: {} },
    { id: 'j1', name: 'Job guarantee', desc: 'City offers a $20/h public job to everyone who wants one: care work, maintenance, retrofits. ~$55k per worker-year.', prec: 'Argentina\'s Jefes y Jefas (2002); India\'s MGNREGA (2005).', fx: { jg: true, support: 3 } },
    { id: 'j2', name: 'Pay ratio cap 1:5', desc: 'No employer may pay its top earner more than 5× its lowest wage.', prec: 'Yugoslav self-management wage scales; Portland\'s CEO pay-ratio surtax (2017) is a mild version.', fx: { flight: -1.5, climate: -4, support: 2, legal: 3, morale: -0.002 } },
  ]},
  { id: 'care', name: 'Child care', opts: [
    { id: 'c0', name: '2-K, 3-K and pre-K rollout', desc: 'Nearly 100,000 children in 3-K/pre-K; 2-K grows from 2,000 to 12,000 seats in fall 2027 with $1.2B from the State.', prec: 'Real 2026 policy.', src: 'twoK', fx: {} },
    { id: 'c1', name: 'Universal child care 0–5', desc: 'A free seat for every child under 5 whose family wants one. More families ask, so you must build seats and train educators in the Plan.', prec: 'Quebec\'s low-fee child care (1997) raised mothers\' employment markedly.', fx: { universal: true, support: 4 } },
  ]},
  { id: 'cuny', name: 'Higher education', opts: [
    { id: 'u0', name: 'CUNY tuition as is', desc: 'About 247,000 students (Fall 2025).', prec: 'Status quo.', src: 'cuny', fx: {} },
    { id: 'u1', name: 'Tuition-free CUNY', desc: 'Restore free tuition. ≈ $0.7B/yr. More students, and 5,000 more training seats a year for the plan.', prec: 'City College and CUNY were tuition-free from 1847 until the 1976 fiscal crisis.', fx: { op: 0.7, cunyCap: 5000, support: 2 } },
  ]},
  { id: 'method', name: 'Planning method', opts: [
    { id: 'p0', name: 'Annual budget process', desc: 'Agencies bid, OMB and Council decide once a year.', prec: 'Status quo.', fx: { info: 0.55 } },
    { id: 'p1', name: 'Material balances (Gosplan)', desc: 'A central office balances every resource in physical units and issues targets. Bulk procurement cuts costs 5%, but agencies hoard and misreport.', prec: 'USSR Gosplan 1928–91.', fx: { info: 0.45, op: 0.3, costMult: 0.95, support: -1, noise: 1.4 } },
    { id: 'p2', name: 'Cybernetic planning', desc: 'Real-time data from every agency and supplier feeds a planning room. $1.5B build, information quality rises over 6 quarters.', prec: 'Chile\'s Project Cybersyn (1971–73).', fx: { info: 0.8, infoRamp: 6, capex: 1.5, op: 0.4, support: -1 } },
    { id: 'p3', name: 'Participatory planning', desc: 'Neighborhood assemblies set priorities; slower but trusted.', prec: 'Porto Alegre participatory budget (1989); Kerala People\'s Plan (1996).', fx: { info: 0.65, op: 0.2, support: 4, lag: 1 } },
    { id: 'p4', name: 'Market socialism', desc: 'Public and co-op firms compete with prices; the plan sets only investment.', prec: 'Oskar Lange\'s model (1936); Yugoslavia 1950s–80s.', fx: { info: 0.75, climate: -0.3, morale: 0.003 } },
  ]},
  { id: 'road', name: 'Road pricing', opts: [
    { id: 'r0', name: 'Congestion pricing as is', desc: '$9 a day to drive into Manhattan below 60th Street, rising to $12 in 2028 and $15 in 2031. The MTA runs it under State law; the money pays for transit.', prec: 'In force since 5 January 2025: 73,000 fewer vehicles a day (−11%) and about $550M for the MTA in the first year.', src: 'congestion', fx: {} },
    { id: 'r1', name: 'Full $15 toll now', desc: 'Skip the phase-in. Fewer cars and more transit money sooner; drivers and outer-borough commuters object. Albany must agree.', prec: 'The original 2024 plan set $15 before it was paused.', src: 'congestion', fx: { support: -1, albany: true } },
    { id: 'r2', name: 'Citywide road charge', desc: '$15 for the zone plus a per-mile charge on every car trip in the city. Large cuts in traffic and emissions; needs State law and will be fought in court.', prec: 'Singapore has charged by road and time since 1998; Stockholm’s congestion tax since 2007.', fx: { support: -3, legal: 0.5, albany: true } },
    { id: 'r3', name: 'Scrap congestion pricing', desc: 'Ask Albany to end the toll. Traffic and delays return; the MTA loses about $0.5B a year for repairs and signals.', prec: 'Paused in June 2024, then restarted at a lower price; Washington tried to end it in 2025.', fx: { support: 1, albany: true } },
  ]},
  { id: 'classsize', name: 'Class sizes', opts: [
    { id: 'cs0', name: 'Comply slowly, with exemptions', desc: 'The present course: hire about 1,500 teachers a year and grant exemptions to overcrowded schools. Full compliance is due in the 2027–28 school year.', prec: 'State class size law (2022): 64% of classes complied in 2025–26.', src: 'classSize', fx: {} },
    { id: 'cs1', name: 'Fully fund the class size law', desc: 'Hire about 4,000 teachers a year until the caps (20 in K–3, 23 in grades 4–8, 25 in high school) are met. Space limits how far hiring alone gets; build seats in the Plan.', prec: 'IBO estimates 16,300 teachers at $1.5–1.7B a year for full compliance.', src: 'classSize', fx: { support: 1, morale: 0.002 } },
    { id: 'cs2', name: 'Ask Albany for a delay', desc: 'Seek a State law pushing the deadline back. Saves money; the teachers union and parents object.', prec: 'The city asked for more time in 2026 and planned for full compliance by 2030.', src: 'classSize', fx: { support: -1, morale: -0.002, albany: true } },
  ]},
  { id: 'carbon', name: 'Climate rules', opts: [
    { id: 'g0', name: 'Local Law 97 as written', desc: 'Large buildings must cut emissions 40% by 2030 and 80% by 2050; new buildings are all-electric. Owners can still buy credits and delay.', prec: 'NYC Climate Mobilization Act (2019); all-electric new buildings (Local Law 154 of 2021).', fx: {} },
    { id: 'g1', name: 'Strict Local Law 97', desc: 'No credits or delays: fines for every building over its cap from 2027, and a city fund for co-ops and rent-stabilized buildings.', prec: 'Climate advocates\' proposals during the 2023–24 Local Law 97 rule-making.', fx: { op: 0.4, climate: -0.2, support: -0.5, elec: 0.01 } },
    { id: 'g2', name: 'Fossil heating phase-out', desc: 'Every oil or gas boiler that breaks after 2028 must be replaced by a heat pump; the city pays half for low-income homes.', prec: 'Phase-out rules in Germany\'s Building Energy Act (2024) and the Netherlands.', fx: { op: 1.2, climate: -0.4, support: -1.5, rentG: 0.2, elec: 0.03 } },
    { id: 'g3', name: 'Streets for transit', desc: 'Bus lanes on every major street, fewer parking spaces and car-free blocks. More bus riders, fewer car trips; drivers object.', prec: 'Paris under Mayor Hidalgo (2014–26); Barcelona superblocks.', fx: { op: 0.25, support: -1, rides: 0.05, car: -0.08 } },
  ]},
  { id: 'firms', name: 'How public enterprises are run', opts: [
    { id: 'k0', name: 'City agencies, civil-service rules', desc: 'Public housing, stores and utilities are run like today\'s agencies: line budgets, slow procurement, few incentives either way.', prec: 'Status quo.', fx: {} },
    { id: 'k1', name: 'Output targets', desc: 'Managers are judged on units delivered. Output rises at first, but they hide spare capacity, hoard inputs, cut quality and over-report results.', prec: 'Soviet enterprises under gross-output plans; Berliner (1957), Kornai (1980).', fx: { support: -1 } },
    { id: 'k2', name: 'Self-financing enterprises', desc: 'Each enterprise must cover its costs from its revenue (khozraschet). Hard budgets cut waste and raise quality; loss-makers shrink and lay off staff.', prec: 'Soviet khozraschet reforms (1965, 1987); Hungary\'s New Economic Mechanism (1968).', fx: { op: 0.1, morale: -0.001 } },
    { id: 'k3', name: 'Worker self-management', desc: 'Elected workers\' councils run each enterprise and share its income. Quality and morale rise; councils push wages up and hire cautiously.', prec: 'Yugoslavia 1950–89; Ward (1958) "The firm in Illyria".', fx: { morale: 0.004, support: 2 } },
    { id: 'k4', name: 'Negotiated coordination', desc: 'Enterprises, workers, users and the bureau negotiate plans together. Better information and trust, more meetings.', prec: 'Devine (1988) "Democracy and Economic Planning"; Kerala\'s People\'s Plan.', fx: { op: 0.15, support: 1.5, lag: 0.5 } },
  ]},
];

const TRAIN = [
  { id: 'constr', name: 'Construction apprenticeships', qtrs: 4, cost: 25000, to: 'constr', max: 20000 },
  { id: 'nurse', name: 'Nursing (RN/LPN)', qtrs: 8, cost: 60000, to: 'health', max: 10000 },
  { id: 'teach', name: 'Teacher residencies', qtrs: 8, cost: 40000, to: 'gov', max: 10000 },
  { id: 'elec', name: 'Energy trades (electricians, heat pumps)', qtrs: 6, cost: 35000, to: 'constr', max: 10000 },
  { id: 'ece', name: 'Early childhood educators', qtrs: 4, cost: 20000, to: 'health', max: 15000 },
  { id: 'aide', name: 'Home-care aides (short course)', qtrs: 1, cost: 4000, to: 'health', max: 30000, short: true },
  { id: 'plan', name: 'Planners & data analysts', qtrs: 4, cost: 30000, to: 'gov', max: 3000 },
  { id: 'doc', name: 'Medical school + residency', qtrs: 28, cost: 400000, to: 'health', max: 1000 },
];

const CAPITAL = [
  { id: 'build', name: 'New public housing', max: 15, step: 0.1, note: 'At the current cost per unit' },
  { id: 'nycha', name: 'NYCHA repairs (on top of ~$3B)', max: 6, step: 0.1, note: '$78.3B needed over 20 years ≈ $3.9B/yr' },
  { id: 'acq', name: 'Buy rental buildings', max: 20, step: 0.5, note: 'Needs "Municipalize with compensation"' },
  { id: 'storage', name: 'Battery storage', max: 4, step: 0.1, note: '≈ $2.0M per MW, online after 4 quarters' },
  { id: 'solar', name: 'Rooftop & community solar', max: 3, step: 0.1, note: '≈ $3.0M per MW, 25% counts at peak' },
  { id: 'wind', name: 'Offshore wind into Zone J', max: 6, step: 0.1, note: '≈ $6.0M per MW, 16-quarter lead time' },
  { id: 'eff', name: 'Building retrofits', max: 5, step: 0.1, note: '≈ $4M per MW of peak avoided, cuts emissions' },
  { id: 'stores', name: 'Public grocery stores', max: 3, step: 0.03, note: '≈ $30M per store, opens after 6 quarters' },
  { id: 'care', name: 'Child-care centers', max: 6, step: 0.1, note: '≈ $35,000 per seat, opens after 4 quarters; each seat then costs ≈ $22,000/yr to run' },
  { id: 'cuny', name: 'CUNY & training colleges', max: 2, step: 0.05, note: 'Each $1B adds ≈ 8,000 training seats a year' },
  { id: 'water', name: 'Water mains & sewers (on top of DEP plan)', max: 3, step: 0.1, note: 'DEP already plans $33.3B over 10 years; paid by water bills, not taxes' },
  { id: 'waste', name: 'Recycling & compost plants', max: 1, step: 0.05, note: 'Raises the 18.8% diversion rate; cuts export costs' },
  { id: 'coast', name: 'Coastal flood protection', max: 3, step: 0.1, note: '1.3M people live in or next to the 100-year floodplain; ≈$15B for full protection (assumption)' },
  { id: 'cool', name: 'Cooling: AC for low-income homes, trees, cooling centers', max: 1, step: 0.05, note: '≈500 New Yorkers die from heat each year' },
  { id: 'fleet', name: 'Electric buses, garbage trucks and city fleet', max: 1.5, step: 0.05, note: 'The City runs about 30,000 vehicles; diesel buses and trucks are the hardest part of transport emissions' },
  { id: 'transit', name: 'Transit capacity: signals, buses, bus lanes', max: 3, step: 0.1, note: 'About 1.3B subway and 440M bus trips in 2025; modern signals let more trains run per hour' },
  { id: 'schools', name: 'New school seats', max: 3, step: 0.1, note: '≈ $200,000 per seat (assumption), open after 12 quarters; needed to meet the class size law in crowded districts' },
  { id: 'hosp', name: 'Hospital beds', max: 2, step: 0.05, note: '≈ $2.5M per bed (assumption), open after 12 quarters, built in the borough with the fewest beds per person' },
];
const PLAN_START = { cap: Object.fromEntries(CAPITAL.map(c => [c.id, 0])), train: Object.fromEntries(TRAIN.map(t => [t.id, 0])), homeless: 20, bond: 70, audit: 0.05, police: 0, prevent: 0 };

// ===== RNG =====
function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }

// ===== INITIAL STATE =====
// city unemployment rate at the start (BLS, latest month), as a share
function U0() { return LV('city.unemp', 4.8) / 100; }
function newGame(opts = {}) {
  const sectors = {}; SECTORS.forEach(x => sectors[x.id] = x.jobs * 1000);
  const s = {
    v: 3, city: 'nyc', mode: opts.mode || 'real', seed: opts.seed || 20270101, t: 0, year: 2027, q: 1,
    A: A0(),
    pop: 8585000, popGrowth: 0,
    age: { k04: 495000, k517: 1250000, a1864: 5340000, s65: 1500000 },
    bor: BOROUGHS.map(b => ({ id: b.id, pop: b.pop, units: b.units, pov: b.pov, unemp: b.unemp, pubUnits: 0, stores: 0, w: 1 })),
    h: { units: 3799438, shortage: 400000, vacancy: 1.41, rentIdx: 100, nychaCond: 40, nychaUnits: 177565, social: 0, stabCond: 60,
      pipePriv: [], pipePub: [], cost: 650000, costIdx: 1, shelter: 85600, street: 4504, done: 0, pubDone: 0 },
    f: { insec: 0.146, stores: 0, storePipe: [], priv: 1, black: 0, shortage: 0 },
    e: { peak: 11005, firm: 10984, gwh: 50000, storage: 0, solar: 0, wind: 0, eff: 0, pipe: [], price: 100, ghg: 49.0, conEdQ: -1, conEdOwned: false },
    tr: { rides: 1740 },
    lab: { sectors, unemployed: Math.round(4270000 * U0()), lf: 4270000, trainees: [], jg: 0, morale: 1, lfpBoost: 0 },
    hl: { life: 82.9 },
    ed: { teacherGap: 6900, enroll: 884600 },
    cc: { seats: 100000 + 2000 + 109000 * 0.5, newSeats: 0, pipe: [{ q: 3, n: 10000 }], workersGap: 0 },
    cu: { enroll: 247000, capInv: 0 },
    el: { aides: 200000 },
    wt: { mgd: LV('city.water', 990), cond: 50, breaks: 550, bill: 1224 },
    ws: { divert: 18.8, inv: 0, tons: 3.2 },
    sf: { shoot: LV('city.shoot', 688), officers: 34700 },
    js: jsInit(),
    cx: null,
    el2029: null, lost: false,
    ec: { top: 100, climate: 100, gcp: 1400, exportsB: 0, importsB: 0 },
    b: { rev: 125.8, exp: 125.8, newDebt: 0, debtService: 0, deficit: 0, streak: 0, fcb: false, headroom: 40, payGo: 0, savings: 0, reserves: 7.2, draw: 0 },
    support: 50, legal: 0, info: 0.55, methodQ: 0,
    pol: Object.fromEntries(LAWS.map(l => [l.id, l.opts[0].id])),
    pending: {}, active: {},
    plan: JSON.parse(JSON.stringify(PLAN_START)),
    goals: { shortage: 200000, shelter: 40000, insec: 7, margin: 500, ghg: 39.4, unemp: 4, life: 83.5, support: 50, care: 90 },
    scen: [], log: [], hist: [], lastReport: null,
    tax: JSON.parse(JSON.stringify(TAX0)), taxPending: null, k: {},
    fin: { notch: 0, outlook: 0, badQ: 0, goodQ: 0, macro: 0, recession: 0, pensionAdj: 0, wtr: 0 },
    un: { civ: 3, uni: 3, done: {} }, decision: null,
    clim: { protect: 0, cool: 0, heat: 500, floodLoss: 0 },
    reg: { moved: 0 },
    d: deepInit(),
    cb: cbInit(),
    oc: ocInit(), ex: { pend: {}, opt: {}, repay: 0, rushQ: 0, rushTot: 0, repaid: 0 },
    ld: ldInit(), rd: null, sc: scInit(), hp: null, fl: flInit(),
  };
  s.k.pov0 = cityPov(s);
  s.k.pit0 = GROUPS.reduce((a, g) => a + g.units * pitUnit(g.share * AGI0 / g.units, TAX0), 0);
  s.h.pipeAppr = []; s.h.rentPolicy = 0; s.h.propPass = 0;
  for (let i = 0; i < 8; i++) s.h.pipePriv.push({ q: i + 1, n: i < 4 ? 7000 : 5200 });
  s.ec.gcp = calcGCP(s) * (s.d ? s.d.prodMul || 1 : 1);
  const ex = calcTrade(s); s.ec.exportsB = ex.exp; s.ec.importsB = ex.exp; s.ec.imp0 = ex.exp; s.ec.pop0 = s.pop;
  s.cx = cityInit(s);
  s.hp = hpInit();
  s.rd = { veh: 590000, toll: 9, rev: 0.55, speed: 1.23, susp: 0, cit: 0 };
  record(s);
  return s;
}

function optOf(s, lawId) { const law = LAWS.find(l => l.id === lawId); return law.opts.find(o => o.id === s.pol[lawId]) || law.opts[0]; }
function fxAll(s) {
  const fx = { privBuild: 1, rentG: 0, climate: 0, flight: 0, support: 0, op: 0, legal: 0, maint: 0, costMult: 1, energyCost: 1, privFood: 0, foodPrice: 0, black: 0, rides: 0, life: 0, healthNeed: 0, morale: 0, pit: 0, biz: 0, prop: 0, info: 0.55, noise: 1, lag: 0, storesCap: 0, crime: 0, lowlevel: 0, trust: 0, prevent: 0, police: 0, od: 0, jail: 0, evict: 0, aideGrow: 0, cunyCap: 0 };
  const flags = {};
  LAWS.forEach(l => {
    const o = optOf(s, l.id); const e = o.fx || {};
    for (const k in e) {
      const v = e[k];
      if (typeof v === 'boolean') { flags[k] = v; continue; }
      if (k === 'privBuild' || k === 'costMult' || k === 'energyCost') fx[k] *= v;
      else if (k === 'info' || k === 'noise' || k === 'storesCap') fx[k] = v;
      else if (k === 'capex' || k === 'infoRamp') continue;
      else fx[k] = (fx[k] || 0) + v;
    }
  });
  return { fx, flags };
}

function calcGCP(s) { let g = 0; SECTORS.forEach(x => g += s.lab.sectors[x.id] / 1000 * x.prod); return (g / 1000 + 70 * s.h.rentIdx / 100) * s.lab.morale; }
function calcTrade(s) { let e = 0; SECTORS.forEach(x => e += s.lab.sectors[x.id] / 1000 * x.prod * x.exp); return { exp: e / 1000 * s.lab.morale }; }
function careNeed(s, flags) { return s.age.k04 * (flags.universal ? 0.65 : s.A.careTake); }
function trainCap(s, fx) { return 40000 + s.cu.capInv * 8000 + (fx.cunyCap || 0); }
function voteShare(s) { return 50.4 + (s.support - 50) * 0.9; }
const RATINGS = ['AAA', 'AA+', 'AA', 'AA−', 'A+', 'A', 'A−', 'BBB+', 'BBB', 'BBB−', 'BB+'];
function ratingName(n) { return RATINGS[Math.max(0, Math.min(RATINGS.length - 1, 2 + n))] + ' (S&P scale)'; }
function applyDecision(s, id, optId) {
  const c = CONTRACTS.find(x => x.id === id), o = RAISE_OPTS.find(x => x.id === optId) || RAISE_OPTS[1];
  s.un.done[id] = o.r;
  if (c.uniformed) s.un.uni = o.r; else if (id === 'dc37') s.un.civ = o.r; else s.un.civ = (s.un.civ * 0.6 + o.r * 0.4) / 1;
  if (o.r < 3) { s.lab.morale -= 0.01; s.fin.wtr = 4; s.support -= 1.5; }
  if (o.r > 3) { s.lab.morale += 0.006; s.support += 1; }
  s.decision = null;
}

// ===== TAXES, WHO PAYS, POLITICS, FINANCE =====
// City tax revenue FY2027 (NYC Council June 2026 forecast, $B): property 37.32, PIT+PTET 21.35, business corporate 7.43, UBT 1.63, sales 11.60, transfer 3.93, other 6.63
const TAX0 = { pit: [3.078, 3.762, 3.819, 3.876], mill: 0, prop: [19.843, 12.439, 11.108, 10.848], corp: 8.85, ubt: 4.0, sales: 4.5, rptt: 1.425, commuter: 0, pat: 1 };
const TAXDEF = [
  { id: 'pit0', g: 'pit', i: 0, name: 'Income tax, first $12k', unit: '%', min: 2, max: 5, step: 0.001, who: 'albany' },
  { id: 'pit1', g: 'pit', i: 1, name: 'Income tax, $12k–25k', unit: '%', min: 2, max: 6, step: 0.001, who: 'albany' },
  { id: 'pit2', g: 'pit', i: 2, name: 'Income tax, $25k–50k', unit: '%', min: 2, max: 6, step: 0.001, who: 'albany' },
  { id: 'pit3', g: 'pit', i: 3, name: 'Income tax, over $50k', unit: '%', min: 2, max: 7, step: 0.001, who: 'albany' },
  { id: 'mill', g: 'mill', name: 'Extra rate on income over $1M', unit: '%', min: 0, max: 5, step: 0.1, who: 'albany' },
  { id: 'prop0', g: 'prop', i: 0, name: 'Property tax, class 1 (1–3 family homes)', unit: '%', min: 15, max: 26, step: 0.01, who: 'council' },
  { id: 'prop1', g: 'prop', i: 1, name: 'Property tax, class 2 (apartment buildings)', unit: '%', min: 9, max: 17, step: 0.01, who: 'council' },
  { id: 'prop2', g: 'prop', i: 2, name: 'Property tax, class 3 (utilities)', unit: '%', min: 8, max: 15, step: 0.01, who: 'council' },
  { id: 'prop3', g: 'prop', i: 3, name: 'Property tax, class 4 (commercial)', unit: '%', min: 8, max: 15, step: 0.01, who: 'council' },
  { id: 'corp', g: 'corp', name: 'Business corporation tax', unit: '%', min: 5, max: 14, step: 0.05, who: 'albany' },
  { id: 'ubt', g: 'ubt', name: 'Unincorporated business tax', unit: '%', min: 2, max: 7, step: 0.05, who: 'albany' },
  { id: 'sales', g: 'sales', name: 'City sales tax (state adds 4.375%)', unit: '%', min: 3.5, max: 6, step: 0.125, who: 'albany' },
  { id: 'rptt', g: 'rptt', name: 'Real property transfer tax (homes over $500k)', unit: '%', min: 0.5, max: 4, step: 0.025, who: 'albany' },
  { id: 'commuter', g: 'commuter', name: 'Commuter tax on non-resident earnings', unit: '%', min: 0, max: 1, step: 0.05, who: 'albany', note: 'Repealed by Albany in 1999' },
  { id: 'pat', g: 'pat', name: 'Pied-à-terre tax on $5M+ second homes', unit: 'on/off', min: 0, max: 1, step: 1, who: 'albany', note: 'In force since July 2026, ≈$0.5B/yr' },
];
// Eleven income groups of tax filers. Shares derived from NYC Comptroller (2024): top 10% ≈ 500k units, avg $687k, 63% of income; top 1% 37%.
// Lower-decile split is a model assumption. renter = share renting (assumption, 69% of households rent citywide).
const GROUPS = [
  { id: 'd1', name: 'Bottom 10%', units: 500e3, share: 0.004, renter: 0.9 },
  { id: 'd2', name: '10–20%', units: 500e3, share: 0.013, renter: 0.9 },
  { id: 'd3', name: '20–30%', units: 500e3, share: 0.021, renter: 0.85 },
  { id: 'd4', name: '30–40%', units: 500e3, share: 0.029, renter: 0.8 },
  { id: 'd5', name: '40–50%', units: 500e3, share: 0.037, renter: 0.75 },
  { id: 'd6', name: '50–60%', units: 500e3, share: 0.046, renter: 0.7 },
  { id: 'd7', name: '60–70%', units: 500e3, share: 0.056, renter: 0.65 },
  { id: 'd8', name: '70–80%', units: 500e3, share: 0.070, renter: 0.55 },
  { id: 'd9', name: '80–90%', units: 500e3, share: 0.094, renter: 0.45 },
  { id: 'p90', name: 'Top 10–1%', units: 450e3, share: 0.26, renter: 0.4 },
  { id: 'p99', name: 'Top 1%', units: 50e3, share: 0.37, renter: 0.3 },
];
const AGI0 = 545e9;
// cash and near-cash transfers (SNAP, SSI, EITC, Social Security) that AGI misses, $ per unit in 2027 — rough estimate
const TRANSF = [17000, 13000, 9000, 6000, 4000, 2500, 1500, 1000, 500, 0, 0];
function resources(s, inc, i) { return inc + TRANSF[i] * Math.pow(1.03, s.t / 4); }
function gIncome(s, g, i) { const top = i === 10 ? s.ec.top / 100 : i === 9 ? 0.5 + 0.5 * s.ec.top / 100 : 1; return g.share * AGI0 / g.units * Math.pow(1.03, s.t / 4) * top; }
function pitUnit(inc, tx) { const ti = Math.max(0, inc - 8000), b = [12000, 25000, 50000]; let t = 0, lo = 0; for (let k = 0; k < 4; k++) { const hi = k < 3 ? b[k] : Infinity; if (ti > lo) t += (Math.min(ti, hi) - lo) * tx.pit[k] / 100; lo = hi; } if (inc > 1e6) t += (inc - 1e6) * 0.85 * tx.mill / 100; return t; }
const PIT_E = [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.08, 0.15, 0.4];
const CONS = GROUPS.map((g, i) => g.units * Math.pow(g.share * AGI0 / g.units, 0.65));
const CONS_T = CONS.reduce((a, b) => a + b, 0);
// Revenue ($B/yr) by tax with behavioral response, plus who pays ($ per filer unit) by group
function taxCalc(s, tx) {
  const T0 = TAX0, A = s.A, t = s.t, gr = Math.pow(1.03, t / 4), clim = s.ec.climate / 100;
  const inc = GROUPS.map((g, i) => gIncome(s, g, i));
  const emp = s.lab ? (s.lab.lf - s.lab.unemployed) / (4270000 * 0.952) : 1;
  // PIT
  const O = s.oc, av = O ? O.av : { top: 0, corp: 0 };
  let pitSum = 0, pitTop = 0; const pitG = GROUPS.map((g, i) => { const t1 = pitUnit(inc[i], tx), t0 = pitUnit(inc[i], T0); const e = i === 10 ? A.eTop : PIT_E[i]; const resp = t0 > 0 ? Math.pow(t1 / t0, -e) : 1; const v = g.units * t1 * resp * (i < 9 ? emp : 1);
    const r = v * (O ? O.u[i] : 1) * (i >= 9 ? 1 - av.top : 1); pitSum += r; if (i >= 9) pitTop += r; return v; });
  const kPit = 21.35e9 / s.k.pit0; const pit = pitSum * kPit / 1e9;
  // property tax by class: levy FY27 $37.32B split by FY26 class shares
  const lev0 = [0.143, 0.392, 0.083, 0.383].map(x => x * 37.32);
  const eP = [0.05, 0.1, 0, A.eProp4];
  const mkt = (0.7 + 0.3 * (s.h ? s.h.rentIdx / 100 : 1) * Math.pow(clim, 0.5)) * Math.pow(1.02, t / 4);
  const soc = s.h ? (1 - s.h.social / s.h.units * 0.6) : 1;
  const propC = lev0.map((l, c) => l * Math.pow(tx.prop[c] / T0.prop[c], 1 - eP[c]) * mkt * (c === 1 ? soc * (O ? O.val2 : 1) : 1));
  const patRev = tx.pat ? 0.5 * Math.pow(1.02, t / 4) : 0;
  const prop = propC.reduce((a, b) => a + b, 0) - (T0.pat && !tx.pat ? 0 : 0);
  const corp = 7.43 * Math.pow(tx.corp / T0.corp, 1 - A.eCorp) * Math.pow(clim, 1.3) * gr * (1 - av.corp);
  const ubt = 1.63 * Math.pow(tx.ubt / T0.ubt, 1 - A.eCorp) * Math.pow(clim, 1.3) * gr * (1 - av.corp);
  const gcpF = s.ec.gcp / 1400;
  const sales = 11.6 * Math.pow(tx.sales / T0.sales, 1 - A.eSales) * gcpF * Math.pow(1.025, t / 4) * (1 + ((s.pop || 8585000) / 8585000 - 1) * 0.6);
  const rptt = 3.93 * Math.pow(tx.rptt / T0.rptt, 1 - 0.8) * Math.pow(clim, 1.5) * gr;
  const commuter = 141 * gr * tx.commuter / 100 * (1 - 0.5 * tx.commuter) * (1 + (O ? O.commAdd : 0) / 1e6);
  const other = 6.63 * Math.pow(1.025, t / 4);
  const parts = { 'Property tax': prop - (tx.pat ? 0 : 0.5 * Math.pow(1.02, t / 4)), 'Income tax (incl. PTET)': pit, 'Business corporation tax': corp, 'Unincorporated business tax': ubt, 'Sales tax': sales, 'Transfer tax': rptt, 'Commuter tax': commuter, 'Other taxes': other };
  // who pays: $ per unit per group (own residents only)
  const units = GROUPS.map(g => g.units);
  const owner = GROUPS.map(g => 1 - g.renter);
  const wOwn = GROUPS.map((g, i) => g.units * owner[i] * Math.pow(inc[i], 0.6)); const wOwnT = wOwn.reduce((a, b) => a + b, 0);
  const wRent = GROUPS.map((g, i) => g.units * g.renter * Math.min(60000, Math.max(9000, 0.4 * inc[i]))); const wRentT = wRent.reduce((a, b) => a + b, 0);
  const capShare = [0.005, 0.005, 0.01, 0.01, 0.015, 0.02, 0.025, 0.03, 0.08, 0.3, 0.5];
  const pay = GROUPS.map((g, i) => {
    const c = CONS[i] / CONS_T;
    let v = pitG[i] * kPit;
    v += propC[0] * 1e9 * wOwn[i] / wOwnT;
    v += propC[1] * 1e9 * (A.passThrough * wRent[i] / wRentT + (1 - A.passThrough) * (wOwn[i] / wOwnT * 0.3 + capShare[i] * 0.7));
    v += propC[2] * 1e9 * c + propC[3] * 1e9 * (0.5 * c + 0.5 * capShare[i]);
    v += (corp + ubt) * 1e9 * (0.7 * capShare[i] + 0.3 * (g.share));
    v += sales * 1e9 * 0.85 * c + other * 1e9 * 0.7 * c + rptt * 1e9 * (0.3 * c + 0.7 * capShare[i]);
    return v / g.units;
  });
  return { parts, pitTop: pitTop * kPit / 1e9, total: Object.values(parts).reduce((a, b) => a + b, 0), pat: patRev, pay, inc, rate: pay.map((p, i) => p / resources(s, inc[i], i)) };
}
// Net yearly gain or loss per filer unit from your laws, plan and taxes, by group ($)
function distribution(s) {
  const now = taxCalc(s, s.tax), base = taxCalc(s, TAX0);
  const { fx, flags } = fxAll(s);
  const inc = now.inc;
  const wLow = GROUPS.map((g, i) => g.units * Math.max(0.2, 1.3 - 0.11 * i)); const wLowT = wLow.reduce((a, b) => a + b, 0);
  const wEq = GROUPS.map(g => g.units); const wEqT = wEq.reduce((a, b) => a + b, 0);
  const benefit = { rent: [], care: [], fares: [], food: [], jobs: [], health: [], social: [] };
  const careTotal = Math.max(0, (s.cc.usable ?? s.cc.seats) - 156500) * 26000;
  const fareTotal = s.pol.transit === 't2' ? (440e6 + 1.3e9) * 3 : s.pol.transit === 't1' ? 440e6 * 3 : 0;
  const foodTotal = s.f.stores * s.A.storeReach * 500;
  const jgTotal = s.lab.jg * 30000;
  const healthTotal = s.pol.health === 'm2' ? s.pop * 3000 * 0.5 : s.pol.health === 'm1' ? s.pop * 400 : 0;
  const socialTotal = s.h.social * 19692 * 0.3;
  GROUPS.forEach((g, i) => {
    const rentPaid = Math.min(60000, Math.max(9000, 0.4 * inc[i]));
    benefit.rent.push(g.renter * rentPaid * s.h.rentPolicy / 100);
    benefit.care.push(careTotal * wEq[i] / wEqT / g.units);
    benefit.fares.push(fareTotal * wLow[i] / wLowT / g.units);
    benefit.food.push(i < 5 ? foodTotal / 5 / g.units : 0);
    benefit.jobs.push(i === 0 ? jgTotal * 0.6 / g.units : i === 1 ? jgTotal * 0.4 / g.units : 0);
    benefit.health.push(healthTotal * (i < 7 ? wLow[i] : wLow[i] * 0.3) / wLowT / g.units);
    benefit.social.push(i >= 1 && i <= 5 ? socialTotal / 5 / g.units : 0);
  });
  return GROUPS.map((g, i) => {
    const taxD = now.pay[i] - base.pay[i];
    const ben = Object.keys(benefit).reduce((a, k) => a + benefit[k][i], 0);
    const net = ben - taxD;
    return { id: g.id, name: g.name, inc: inc[i], taxRate: now.rate[i] * 100, taxRate0: base.rate[i] * 100, taxD, ben, net, netPct: net / resources(s, inc[i], i) * 100, res: resources(s, inc[i], i), parts: Object.fromEntries(Object.keys(benefit).map(k => [k, benefit[k][i]])) };
  });
}
// ---- City Council ----
const BLOCS = [
  { id: 'prog', name: 'Progressive Caucus', seats: 24, color: 'var(--s1)' },
  { id: 'main', name: 'Mainstream Democrats', seats: 14, color: 'var(--s3)' },
  { id: 'cs', name: 'Common Sense Caucus (moderate Dems + 5 Republicans)', seats: 13, color: 'var(--s2)' },
];
// Council whip assumptions per law option (share of each bloc voting yes at 50% public support). Model judgment, not polling.
const COUNCIL_TILT = { h1: [1, 0.6, 0.1], h3: [0.85, 0.35, 0.05], h4: [0.1, 0, 0], l2: [1, 0.8, 0.3], e1: [1, 0.85, 0.4], e2: [0.8, 0.3, 0], f1: [1, 0.9, 0.5], f2: [1, 0.6, 0.15], f3: [0.6, 0.1, 0], f4: [0.3, 0, 0], m1: [1, 0.8, 0.3], o1: [1, 0.7, 0.2], z1: [1, 0.6, 0.1], z2: [0.25, 0.85, 0.95], z3: [0.85, 0.2, 0], x1: [0.9, 0.35, 0.05], x2: [1, 0.6, 0.15], v1: [1, 0.8, 0.3], v2: [1, 0.55, 0.1], w1: [1, 0.8, 0.3], w2: [0.8, 0.2, 0], w3: [0.15, 0, 0], j1: [1, 0.5, 0.1], j2: [0.6, 0.05, 0], c1: [1, 0.9, 0.4], u1: [1, 0.9, 0.5], p1: [0.7, 0.3, 0.05], p2: [0.7, 0.4, 0.1], p3: [1, 0.8, 0.3], p4: [0.6, 0.5, 0.2], k1: [0.55, 0.35, 0.1], k2: [0.6, 0.75, 0.6], k3: [0.95, 0.4, 0.05], k4: [0.95, 0.6, 0.15], g1: [1, 0.7, 0.2], g2: [0.9, 0.45, 0.05], g3: [0.95, 0.5, 0.05], r1: [0.9, 0.5, 0.1], r2: [0.7, 0.25, 0], r3: [0.2, 0.6, 0.9], cs1: [1, 0.9, 0.6], cs2: [0.2, 0.5, 0.7] };
LAWS.forEach(l => l.opts.forEach(o => { const t = COUNCIL_TILT[o.id]; if (t) o.council = { prog: t[0], main: t[1], cs: t[2] }; }));
function lawRadical(o) {
  const e = o.fx || {};
  return (e.op || 0) * 0.4 + (e.capex || 0) * 0.02 + (e.legal || 0) * 0.6 + Math.max(0, -(e.climate || 0)) * 0.8 + (e.seize || e.nationalize ? 4 : 0) + Math.max(0, -(e.rentG || 0)) * 0.5 + ((e.privFood || 0) < 0 ? 1.5 : 0) + (e.ration ? 3 : 0) - Math.max(0, e.support || 0) * 0.1;
}
function councilVote(s, o) {
  const r = lawRadical(o), sh = (s.support - 50) / 100;
  const tilt = o.council || {};
  const p = { prog: tilt.prog ?? (0.95 - Math.max(0, r - 6) * 0.15), main: tilt.main ?? (0.9 - r * 0.12), cs: tilt.cs ?? (0.7 - r * 0.25) };
  const by = BLOCS.map(b => ({ id: b.id, yes: Math.round(b.seats * Math.max(0, Math.min(1, p[b.id] + sh))) }));
  const yes = by.reduce((a, b) => a + b.yes, 0);
  return { yes, no: 51 - yes, pass: yes >= 26, by };
}
function propTaxVote(s, tx) {
  // homeowners' class 1 and renters' class 2 hikes are toxic; commercial hikes are easier. Cuts pass easily.
  const d = tx.prop.map((v, c) => v / TAX0.prop[c] - 1); const sh = (s.support - 50) / 100;
  const hikeRes = Math.max(0, d[0]) * 6 + Math.max(0, d[1]) * 4 + Math.max(0, d[2]) * 1 + Math.max(0, d[3]) * 1.5;
  const p = { prog: 0.85 - Math.max(0, d[0]) * 4 - Math.max(0, d[1]) * 2 + sh, main: 0.8 - hikeRes * 1.4 + sh, cs: 0.6 - hikeRes * 3 + sh };
  const by = BLOCS.map(b => ({ id: b.id, yes: Math.round(b.seats * Math.max(0, Math.min(1, p[b.id]))) }));
  const yes = by.reduce((a, b) => a + b.yes, 0);
  return { yes, no: 51 - yes, pass: yes >= 26, by };
}
// ---- Union contracts (Taylor Law: public-sector strikes are illegal in New York) ----
const CONTRACTS = [
  { id: 'dc37', at: [2027, 1], name: 'DC 37 (90,000 civilian workers)', desc: 'The contract expired on 6 Nov 2026. DC 37 usually sets the pattern for all civilian unions. Each 1% a year across the workforce costs ≈ $0.6B in year one and compounds.', share: 0.6 },
  { id: 'pba', at: [2027, 2], name: 'Police and fire unions (PBA, UFA)', desc: 'Both contracts expired in July 2025. Uniformed unions can go to binding arbitration if talks fail.', share: 0.25, uniformed: true },
  { id: 'uft', at: [2027, 4], name: 'UFT (120,000 teachers and staff)', desc: 'Contract expires Nov 2027. Teachers usually follow the civilian pattern.', share: 0.15 },
];
const RAISE_OPTS = [{ id: 'r2', r: 2, label: '2% a year', d: 'Below inflation. Saves money; morale and union support fall, work-to-rule slows agencies for a year.' }, { id: 'r3', r: 3, label: '3% a year', d: 'Matches the last pattern (3% a year, 3.25% in the final year).' }, { id: 'r4', r: 4, label: '4% a year', d: 'Real raises. Costs more every year; morale and support rise.' }];


// ===== DEEP ECONOMY LAYER =====
// Public enterprises, information, queues, informal economy, corruption, investment cycle, transit, protest.
// Behavioural parameters follow the planning literature (Kornai 1980, 1986; Weitzman 1980; Berliner 1957; Ward 1958;
// Estrin 1983; Medina 2011). Their sizes are model assumptions, listed in Sources and tested in Scenarios.
const REGIMES = {
  k0: { prod: 0.97, name: 'City agencies', conceal: 0.03, hoard: 0.05, quality: 0, soft: 1.0, wage: 0, push: 1.0, hunger: 0.05, info: 0, falsify: 0 },
  k1: { prod: 0.95, name: 'Output targets', conceal: 0.12, hoard: 0.18, quality: -0.6, soft: 1.0, wage: 0, push: 1.06, hunger: 0.25, info: -0.03, falsify: 0.05 },
  k2: { prod: 1.04, name: 'Self-financing', conceal: 0.05, hoard: 0.06, quality: 0.25, soft: 0.3, wage: 0.15, push: 0.98, hunger: 0.05, info: 0.01, falsify: 0.01 },
  k3: { prod: 1.0, name: 'Worker self-management', conceal: 0.06, hoard: 0.08, quality: 0.3, soft: 0.6, wage: 0.6, push: 1.0, hunger: 0.15, info: 0, falsify: 0.01 },
  k4: { prod: 1.01, name: 'Negotiated coordination', conceal: 0.04, hoard: 0.07, quality: 0.2, soft: 0.8, wage: 0.2, push: 0.99, hunger: 0.1, info: 0.04, falsify: 0.01 },
};
const COMMUTE0 = { BX: 43.9, BK: 42.1, MN: 31.4, QN: 43.1, SI: 43.5 }; // minutes one way, ACS 5-year 2020–24
function deepInit() {
  return {
    conceal: 0.03, hoardNow: 0.05, quality: 100, dataGap: 3, phantom: 0, subsidy: 0, closures: 0,
    stalled: 0, stalledB: 0, hunger: 0.05,
    waitlist: 241000, waitYears: 0, lottery: 600, queueMin: 0, spill: 0,
    informal: 8, leak: 1.5, late: 80.7, scandal: 0,
    crowd: 1.0, transitCap: 0, commute: Object.assign({}, COMMUTE0), commuteAvg: 41.2,
    protest: 0, epidemic: 0, auditFound: 0, supPen: 0, peWeight: 0,
  };
}
function peWeight(s) {
  // share of the city economy run by public enterprises (public housing, city stores, utilities, socialized firms)
  const hs = (s.h.nychaUnits + s.h.social + s.bor.reduce((a, b) => a + b.pubUnits, 0)) / s.h.units;
  const st = Math.min(1, (s.f.stores || 0) / 150) * 0.1;
  const en = s.e.conEdOwned ? 0.12 : 0;
  const fi = s.pol.work === 'w3' ? 0.35 : s.pol.work === 'w2' ? 0.1 : s.pol.work === 'w1' ? 0.04 : 0;
  return Math.min(1, hs * 0.6 + st + en + fi);
}
// before production: how enterprises and data shape the plan's efficiency and costs
function deepPre(s, fx, P, rep, ev, R) {
  const D = s.d || (s.d = deepInit());
  const g = REGIMES[s.pol.firms] || REGIMES.k0;
  const w = D.peWeight = peWeight(s);
  const audit = 1 - Math.exp(-(P.audit || 0) / 0.15); // 0..1 effectiveness of statistics & inspection
  D.audit = audit;
  // ratchet: firms that know next year's target is based on this year's report hide capacity (Weitzman 1980)
  const ratchet = s.pol.firms === 'k1' ? 1.6 : 1;
  const concealT = g.conceal * ratchet * (1 - 0.7 * audit);
  D.conceal += (concealT - D.conceal) * 0.3;
  D.hoardNow += (g.hoard * (1 - 0.4 * audit) - D.hoardNow) * 0.3;
  const falsify = g.falsify * (1 - 0.8 * audit);
  D.dataGap = (D.conceal + falsify) * 100 * (0.4 + 0.6 * w) + 2;
  // late contracts: 80.7% of City contracts were registered late in FY2024 (NYC Council / Comptroller)
  D.late = Math.max(20, Math.min(98, 80.7 + (s.capUse - 60) * 0.12 - (s.lab.plannersTrained || 0) / 600 - audit * 6));
  // corruption and procurement leakage rise with fast-growing programmes, fall with audits
  const growth = Math.max(0, (s.capUse || 0) - 60) / 100;
  D.leak = Math.max(0.5, Math.min(12, 1.5 + growth * 6 + (s.pol.firms === 'k1' ? 1.5 : 0) + w * 2 - audit * 2.5));
  D.hunger = g.hunger;
  // quality drifts with incentives: quantity targets erode it (Kornai 1980)
  D.quality = Math.max(40, Math.min(115, D.quality + g.quality * (0.3 + 0.7 * w) + (100 - D.quality) * 0.02));
  // effects on the rest of the model
  const infoPen = D.dataGap / 100 * 0.6 - g.info;
  s.info = Math.max(0.2, Math.min(0.95, s.info - infoPen * 0.3));
  D.prodMul = 1 + w * ((g.prod || 1) - 1);
  const effMul = (1 - D.leak / 100) * (1 + (g.push - 1) * w) * (1 - (D.late - 80.7) / 600) * (0.96 + 0.04 * s.lab.morale);
  const costMul = 1 + D.hoardNow * (0.3 + 0.7 * w) * 0.5;
  // audits uncover phantom output
  if (ev && D.phantom > 300 && audit > 0.2 && R() < audit * 0.5) {
    const found = D.phantom * (0.5 + 0.5 * audit); D.phantom -= found; D.auditFound += found;
    rep.events.push({ k: 'warn', t: 'Audit finds phantom completions', d: `Inspectors find that about ${Math.round(found).toLocaleString('en-US')} public homes reported as finished are not ready for tenants. Under output targets, managers report to the target, not to reality.` });
    s.support -= 1;
  }
  return { effMul, costMul, wageAdd: g.wage * w };
}
// after production: queues, informal economy, transit, protest, shocks
function deepPost(s, ctx, rep, ev, R) {
  const D = s.d, H = s.h, F = s.f, L = s.lab, g = REGIMES[s.pol.firms] || REGIMES.k0, w = D.peWeight;
  const unemp = (L.unemployed / L.lf) * 100;
  // reported vs real: falsified completions accumulate as phantom homes
  D.phantom += (H.pubDone || 0) * g.falsify * (1 - 0.8 * D.audit);
  // soft budget constraint: losses of public enterprises are covered by the city (Kornai 1986)
  const peCost = (ctx.storeOps || 0) + (s.e.conEdOwned ? 1.2 : 0) + (H.social / 1e5) * 0.6 + (s.pol.work === 'w3' ? 2.5 : 0);
  const lossRate = 0.08 + D.hoardNow * 0.5 + (100 - D.quality) / 300 - (g.soft < 0.5 ? 0.05 : 0);
  const losses = Math.max(0, peCost * lossRate);
  D.subsidy = losses * g.soft;
  const uncovered = losses - D.subsidy;
  if (uncovered > 0.05) { const jobs = uncovered * 1e9 / 90000 / 4; L.unemployed += jobs; D.closures += jobs; }
  // public housing waiting list: 241,000 families (IBO 2025); turnover 2.3% a year (NYCHA 2022)
  const placements = (s.h.nychaUnits * 0.023 / 4) + (H.pubDone || 0) * 0.5 + H.social * 0.004 / 4;
  const applicants = 241000 * (0.012 + Math.max(0, H.rentG - 3) * 0.002 + (H.shortage / 400000 - 1) * 0.006) / 4 * (1 + (s.h.rentIdx / 100 - 1));
  D.waitlist = Math.max(20000, D.waitlist + applicants - placements);
  D.waitYears = D.waitlist / Math.max(1, placements * 4);
  // housing lottery: 6 million applications for 10,000 units in 2024 (HPD)
  const affordable = Math.max(2500, 10000 + (H.pubDone || 0) * 4 * 0.6);
  D.lottery = 600 * (10000 / affordable) * Math.pow(H.shortage / 400000, 0.5);
  // controlled prices create queues; excess demand spills into the private market
  const ctl = (s.pol.food === 'f3' ? 1 : 0) + (s.pol.food === 'f4' ? 1.5 : 0);
  D.queueMin = Math.max(0, ctl * (6 + 70 * Math.min(1, F.shortage * 5)) + (F.stores > 0 ? 3 * Math.min(1, F.stores / 50) : 0));
  D.spill = Math.max(0, (D.waitlist / 241000 - 1) * 0.6) + (s.pol.housing === 'h1' || s.pol.housing === 'h2' ? 0.4 : 0);
  H.rentIdx *= 1 + D.spill * 0.08 / 100;
  // informal economy: grows with controls, taxes and unemployment, shrinks with enforcement and job guarantees
  const informalT = 8 + F.black * 0.08 + ctl * 2 + Math.max(0, unemp - 4.8) * 0.6 + (s.tax.ubt - 4) * 0.6 + (s.tax.sales - 4.5) * 0.8 - D.audit * 2 - Math.min(2, L.jg / 40000);
  D.informal += (Math.max(4, Math.min(30, informalT)) - D.informal) * 0.25;
  // transit: crowding = riders against capacity; capacity grows with signals, buses and BRT
  D.transitCap += (ctx.transitB || 0) * 0.004;
  const ridersIdx = s.tr.rides / 1740 * (1 - (D.epidemic > 0 ? 0.35 : 0));
  D.crowd = ridersIdx / (1 + D.transitCap);
  if (s.cx && s.cx.netIdx0) D.crowd = 0.5 * D.crowd + 0.5 * s.cx.netIdx / s.cx.netIdx0;
  const outer = s.bor.filter(b => b.id !== 'MN').reduce((a, b) => a + b.pubUnits, 0) / Math.max(1, s.bor.reduce((a, b) => a + b.pubUnits, 0));
  let tot = 0, pw = 0;
  s.bor.forEach(b => { const m = COMMUTE0[b.id] * (1 + 0.35 * Math.max(0, D.crowd - 1)) * (1 - Math.min(0.15, D.transitCap * 0.5)) * (b.id !== 'MN' ? 1 + Math.max(0, outer - 0.8) * 0.02 : 1); D.commute[b.id] = m; tot += m * b.pop; pw += b.pop; });
  D.commuteAvg = tot / pw;
  // protest pressure (0–100): queues, rents, commutes, unemployment, cuts, phantom output
  const pT = Math.max(0, D.queueMin * 0.6 + Math.max(0, H.rentG - 4) * 6 + Math.max(0, D.commuteAvg - 41.2) * 2 + Math.max(0, unemp - 5.5) * 6 + (s.b.savings || 0) * 4 + Math.max(0, 85 - D.quality) * 0.5 + (D.scandal > 0 ? 10 : 0));
  D.protest += (Math.min(100, pT) - D.protest) * 0.35;
  D.supPen = D.protest * 0.06 + Math.max(0, D.commuteAvg - 41.2) * 0.3 + D.queueMin * 0.05 + Math.max(0, D.waitYears - 40) * 0.01;
  if (D.scandal > 0) D.scandal--;
  if (D.epidemic > 0) D.epidemic--;
  if (ev) {
    if (D.protest > 45 && R() < (D.protest - 40) / 120) rep.events.push({ k: 'bad', t: 'Protests at City Hall', d: `Thousands march over ${D.queueMin > 15 ? 'queues at city stores' : H.rentG > 5 ? 'rising rents' : D.commuteAvg > 44 ? 'crowded trains and long commutes' : 'job losses'}. Council members grow nervous.` }), s.support -= 2;
    if (R() < D.leak / 250) { D.scandal = 4; s.support -= 3; rep.events.push({ k: 'bad', t: 'Procurement scandal', d: `Investigators find inflated invoices and no-show contracts in fast-growing programmes. About ${D.leak.toFixed(1)}% of new spending is leaking. Audits reduce this.` }); }
    if (R() < 0.006) { D.epidemic = 4; L.unemployed += L.lf * 0.03; s.fin.recession = Math.max(s.fin.recession, 3); rep.events.push({ k: 'bad', t: 'New epidemic wave', d: 'A respiratory epidemic empties trains and offices for a year: ridership falls by a third, hospitals fill and tax receipts drop.' }); }
  }
}


// ===== CLIMATE: emissions by sector, 1.5 °C pathway and the city's share of the carbon budget =====
// Start: about 49 Mt CO2e a year (2024 inventory ≈ 25% below 2005, so 2005 ≈ 65.3 Mt).
// Split used here: buildings ≈ 68% (electricity 25%, on-site gas and oil 43%), transportation ≈ 28%, waste ≈ 4%.
const GHG2005 = 65.3, GHG2019 = 55.5; // 2019 was about 15% below 2005
const CLIMATE = {
  ll97: t => { const y = 2027 + t / 4; return y <= 2030 ? 49 + (GHG2005 * 0.6 - 49) * (y - 2027) / 3 : GHG2005 * 0.6 + (GHG2005 * 0.2 - GHG2005 * 0.6) * (y - 2030) / 20; },
  // IPCC AR6: global greenhouse gases 43% below 2019 by 2030 and 60% by 2035 in 1.5 °C pathways
  path15: t => { const y = 2027 + t / 4; return y <= 2030 ? 49 + (GHG2019 * 0.57 - 49) * (y - 2027) / 3 : GHG2019 * 0.57 + (GHG2019 * 0.4 - GHG2019 * 0.57) * Math.min(1, (y - 2030) / 5); },
  // equal per-person share of the remaining global 1.5 °C budget: ~130 Gt CO2 from the start of 2026 (Forster et al. 2026, IGCC 2025) × 8.585M / 8.2B people ≈ 136 Mt, minus 2026 (≈ 49 Mt)
  budget0: 136, used2526: 49, embodiedPerHome: 25,
};
function cbInit() { return { elec: 0.10, ev: 0.03, cum: 0, bElec: 12.25, bFuel: 21.07, trans: 13.72, waste: 1.96, emb: 0, left: CLIMATE.budget0 - CLIMATE.used2526, carKm: 1 }; }
function emissions(s, fx, C, rep, ev, R, E, divert) {
  const CB = s.cb || (s.cb = cbInit());
  const yr = s.t / 4;
  // electrification of heat: Local Law 97 and all-electric new buildings, plus retrofits and climate rules
  const effAdd = (C.eff || 0) / 4 * 0.008;
  CB.elec = Math.min(0.95, CB.elec + (0.006 + (fx.elec || 0)) / 4 + effAdd + (s.h.done || 0) / s.h.units * 0.9);
  // electric vehicles: market trend plus the city fleet
  CB.ev = Math.min(0.9, CB.ev + (0.012 + (C.fleet || 0) * 0.006) / 4);
  // car traffic: people and jobs, minus transit shift; crowded trains push people into cars
  const jobs = (s.lab.lf - s.lab.unemployed) / (4270000 * 0.952);
  const crowd = s.d ? s.d.crowd : 1;
  CB.carKm = (s.pop / 8585000) * Math.pow(jobs, 0.6) * (1 - Math.min(0.25, (s.tr.rides / 1740 - 1) * 0.7)) * (1 + Math.max(0, crowd - 1) * 0.25) * (1 + (fx.car || 0));
  // grid: new city wind and solar, plus a slowly cleaner State grid (State climate law)
  const grid = Math.max(0.05, (1 - Math.min(0.9, E.cleanShare)) * Math.pow(0.99, yr));
  const load = (E.gwh / 50000) * (1 + (CB.elec - 0.10) * 0.45);
  const cold = (s.q === 1 && ev && R() < 0.3) ? 1.06 : 1;
  CB.bElec = 12.25 * grid * load;
  CB.bFuel = 21.07 * (1 - (CB.elec - 0.10) / 0.9) * Math.max(0.35, 1 - E.eff / 7000) * (s.h.units / 3799438) * cold;
  CB.trans = 13.72 * CB.carKm * (1 - CB.ev) / 0.97 * Math.pow(0.995, yr) + 0.5 * (1 - Math.min(1, (C.fleet || 0) * yr * 0.15));
  CB.trans -= 0.5;
  CB.waste = 1.96 * (1 - (divert - 18.8) / 80);
  if (cold > 1) rep.notes.push('A cold winter: buildings burned more gas and oil this quarter.');
  const total = CB.bElec + CB.bFuel + CB.trans + CB.waste;
  // embodied carbon of new homes (materials; not counted in the city inventory)
  CB.emb = (s.h.done || 0) * 4 * CLIMATE.embodiedPerHome / 1e6;
  CB.cum += total / 4;
  CB.left = CLIMATE.budget0 - CLIMATE.used2526 - CB.cum;
  return total;
}


// ===== SAFETY & JUSTICE =====
// Starting values: NYPD 2025 year-end (121,542 major felonies, 305 murders, 688 shootings), DOC FY2026 average daily
// jail population 6,954, DOHMH 1,873 overdose deaths in 2025, ~1,500 marshal evictions a month in 2025 (DOI / Open Data).
// Coefficients: police elasticity of violent crime −0.34, property −0.17 (Chalfin & McCrary 2018); more officers raise
// low-level arrests (Chalfin, Hansen, Weisburst & Williams 2022). Prevention effect (−5% violent crime per $1B/yr at full
// strength, lag ~1.5 years) is an assumption from evaluations of youth jobs (Heller 2014; Gelber et al. 2016) and violence
// interruption (Butts et al. 2015); treat it as uncertain.
const JS0 = { felony: 121542, murder: 305, jail: 6954, od: 1873, evict: 18000, officers: 34700, beds: 4160, nypd: 6.7, perOfficer: 160000, jailMarginal: 200000 };
function jsInit() { return { felony: JS0.felony, murder: JS0.murder, jail: JS0.jail, od: JS0.od, evict: JS0.evict, officers: JS0.officers, trust: 50, prev: 0, low: 1, viol: 1, prop: 1, cost: 0, supPen: 0, overCap: 0 }; }
function justice(s, fx, P, unempRate) {
  const J = s.js || (s.js = jsInit()); const SF = s.sf;
  const pol = (P.police || 0) + (fx.police || 0);            // $B/yr change to the NYPD budget
  const z2 = s.pol.safety === 'z2' ? 5000 * Math.min(1, (s.active.z2 || 0) / 8) : 0;
  const offT = JS0.officers + z2 + pol * 1e9 / JS0.perOfficer * 0.75;   // 75% of a budget change moves headcount, the rest overtime and equipment
  J.officers += (Math.max(15000, offT) - J.officers) * 0.25;   // hiring and attrition take time
  const dO = J.officers / JS0.officers - 1;
  J.prev += ((P.prevent || 0) + (fx.prevent || 0) - J.prev) * 0.15;   // prevention reaches full effect after ~1.5 years
  const pov = cityPov(s) - (s.k.pov0 || 18.2), un = unempRate - U0();
  const social = Math.max(0.6, 1 + pov * 0.03 + un * 4);
  const trend = Math.pow(0.98, s.t / 4);
  const pr = Math.min(3, J.prev);
  const violT = trend * social * (1 - 0.34 * dO) * (1 - 0.05 * pr) * (1 + fx.crime * 2.5) * (1 + ((s.d && s.d.protest) || 0) * 0.002);
  const propT = trend * social * (1 - 0.17 * dO) * (1 - 0.03 * pr) * (1 + Math.max(0, ((s.d && s.d.informal) || 8) - 8) / 100);
  J.viol += (violT - J.viol) * 0.3; J.prop += (propT - J.prop) * 0.3;
  J.murder = JS0.murder * J.viol; SF.shoot = LV('city.shoot', 688) * J.viol; J.felony = JS0.felony * (0.55 * J.viol + 0.45 * J.prop);
  SF.officers = J.officers;
  J.low = Math.max(0.3, 1 + dO * 1.2 + fx.lowlevel);          // index of low-level arrests and summonses (2026 = 1)
  const jailT = JS0.jail * trend * (0.55 + 0.45 * J.viol) * (0.8 + 0.2 * J.low) * (1 + fx.jail);
  J.jail += (jailT - J.jail) * 0.2;
  J.overCap = Math.max(0, J.jail - JS0.beds);                   // Local Law 192 of 2019: Rikers to close by Aug 2027; the borough jails hold 4,160
  if (s.t >= 3 && J.overCap > 0) s.legal = (s.legal || 0) + J.overCap / JS0.beds * 0.4;
  const odT = JS0.od * Math.pow(0.95, s.t / 4) * (1 + fx.od) * (1 + pov * 0.02) * (1 + (s.h.shelter - 85600) / 85600 * 0.1) * (1 - 0.02 * pr);
  J.od += (odT - J.od) * 0.25;
  const evT = JS0.evict * (1 + (s.h.rentG - 3.5) * 0.05) * (1 + pov * 0.03 + un * 3) * (1 + fx.evict);
  J.evict += (Math.max(0, evT) - J.evict) * 0.3;
  J.trust += (50 + fx.trust - dO * 15 - (J.low - 1) * 10 + J.prev * 2 - (J.viol - 1) * 20 - J.trust) * 0.2;
  J.cost = (P.police || 0) + (P.prevent || 0) + (J.jail - JS0.jail) * JS0.jailMarginal / 1e9;
  J.supPen = (J.viol - 1) * 30 - (J.trust - 50) * 0.04;
}


// ===== CITY DETAIL: districts, households, project delivery, hourly grid, subway lines, firms, heat & floods =====
// Sources and assumptions:
// - Project delivery: NYS Comptroller (2024) reviewed 5,128 NYC capital projects: 64% delayed ≥3 months, 48.4% ≥3 years,
//   ~40% more than 20% over budget, overall overrun ≈18% (conservative). NYC Comptroller audit of DDC (Dec 2025): 80% behind
//   schedule, average delay ≈3.5 years.
// - Grid: Zone J summer peak ≈11,000 MW (NYISO); NYC is summer-peaking. The Zone J winter peak (≈7,600 MW) and the load added by
//   full heat-pump electrification (≈9,000 MW at the winter peak) are MODEL ASSUMPTIONS from NYISO's statewide winter/summer ratio.
// - Subway: Lexington Ave express runs at ≈112% of the MTA loading guideline in the AM peak (MTA rider report via NBC 2018) and
//   carries ≈1.3M riders a weekday (Second Ave Subway FEIS). Other line loads and rider counts are rounded ASSUMPTIONS.
// - Firms: ≈200,000 businesses; ≈19,800 started in 2025; quarterly closures 4,900–8,400 (NYCEDC Economic Snapshot).
// - Heat: ≈525 heat-related deaths a year 2018–2022 (NYC DOHMH 2025). District heat risk here is an APPROXIMATION of the
//   Health Department's Heat Vulnerability Index from poverty, age and education.
// - Floods: floodplain population by district from NYC Open Data / DCP (live data file).
const PROJ0 = { late: 0.64, late3: 0.484, ovr: 1.18 };
const SUB_LINES = [
  { id: 'lexx', name: 'Lexington Ave express (4, 5)', r: 800, load: 112, w: { BX: 0.35, MN: 0.45, BK: 0.2 } },
  { id: 'lexl', name: 'Lexington Ave local (6)', r: 500, load: 100, w: { BX: 0.4, MN: 0.6 } },
  { id: 'flush', name: 'Flushing (7)', r: 450, load: 102, w: { QN: 0.8, MN: 0.2 } },
  { id: 'qblvd', name: 'Queens Blvd (E, F, M, R)', r: 700, load: 100, w: { QN: 0.75, MN: 0.25 } },
  { id: 'canar', name: 'Canarsie (L)', r: 300, load: 98, w: { BK: 0.75, MN: 0.25 } },
  { id: 'sev', name: '7th Ave (1, 2, 3)', r: 900, load: 95, w: { BX: 0.15, MN: 0.5, BK: 0.35 } },
  { id: 'eighth', name: '8th Ave (A, C)', r: 650, load: 88, w: { BK: 0.45, QN: 0.15, MN: 0.4 } },
  { id: 'bway', name: 'Broadway (N, Q, R, W)', r: 600, load: 85, w: { BK: 0.45, QN: 0.25, MN: 0.3 } },
  { id: 'sixth', name: '6th Ave (B, D)', r: 450, load: 82, w: { BX: 0.35, BK: 0.4, MN: 0.25 } },
  { id: 'secav', name: 'Second Ave (Q)', r: 200, load: 75, w: { MN: 1 } },
  { id: 'nassau', name: 'Nassau / Jamaica (J, Z)', r: 180, load: 78, w: { BK: 0.6, QN: 0.3, MN: 0.1 } },
  { id: 'xtown', name: 'Crosstown (G)', r: 130, load: 70, w: { BK: 0.7, QN: 0.3 } },
];
const GRID_SHAPE = {
  sum: [0.66, 0.62, 0.6, 0.59, 0.6, 0.63, 0.68, 0.74, 0.8, 0.85, 0.89, 0.92, 0.95, 0.97, 0.99, 1, 1, 0.99, 0.96, 0.93, 0.89, 0.83, 0.76, 0.7],
  win: [0.7, 0.67, 0.65, 0.64, 0.65, 0.69, 0.78, 0.88, 0.93, 0.92, 0.9, 0.89, 0.88, 0.87, 0.87, 0.88, 0.92, 0.99, 1, 0.98, 0.95, 0.9, 0.83, 0.76],
  heat: [0.75, 0.75, 0.78, 0.8, 0.85, 0.95, 1, 0.95, 0.85, 0.75, 0.68, 0.62, 0.6, 0.6, 0.62, 0.68, 0.78, 0.9, 0.95, 0.92, 0.88, 0.84, 0.8, 0.77],
  ev: [0.5, 0.45, 0.4, 0.35, 0.3, 0.3, 0.3, 0.25, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.25, 0.3, 0.45, 0.7, 0.9, 1, 0.95, 0.85, 0.7, 0.6],
  sol: [0, 0, 0, 0, 0, 0, 0.05, 0.15, 0.35, 0.55, 0.75, 0.9, 1, 0.98, 0.9, 0.75, 0.55, 0.3, 0.1, 0, 0, 0, 0, 0],
};
const WIN0 = 7600, ELEC_WIN = 9000, EV_MW = 4000, BIZ0 = 200000;
const BIZ_SECT = [
  { id: 'retail', name: 'Shops, restaurants, personal services', sh: 0.38, sales: 1, rent: 1.2, wage: 1, corp: 0.2 },
  { id: 'prof', name: 'Offices: finance, tech, professional', sh: 0.3, sales: 0.1, rent: 0.8, wage: 0.2, corp: 1.2 },
  { id: 'health', name: 'Health, care and social services', sh: 0.15, sales: 0, rent: 0.5, wage: 0.6, corp: 0.3 },
  { id: 'ind', name: 'Industry, construction, logistics', sh: 0.1, sales: 0.2, rent: 1, wage: 0.5, corp: 0.6 },
  { id: 'other', name: 'Other', sh: 0.07, sales: 0.4, rent: 0.8, wage: 0.6, corp: 0.5 },
];
const TEN = { own: { MN: 0.24, BX: 0.19, BK: 0.3, QN: 0.45, SI: 0.69 }, pubh: { MN: 0.1, BX: 0.11, BK: 0.08, QN: 0.03, SI: 0.05 } };
const PROX = { MN: 1, BK: 0.9, QN: 0.7, BX: 0.6, SI: 0.25 };
const CDB = { 1: 'MN', 2: 'BX', 3: 'BK', 4: 'QN', 5: 'SI' };
function normInv(p) { p = Math.min(0.999, Math.max(0.001, p)); const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239], b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572], c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]; const q = p < 0.02425 ? Math.sqrt(-2 * Math.log(p)) : p > 0.97575 ? Math.sqrt(-2 * Math.log(1 - p)) : null; if (q !== null) { const x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); return p < 0.5 ? x : -x; } const r = p - 0.5, t = r * r; return (((((a[0] * t + a[1]) * t + a[2]) * t + a[3]) * t + a[4]) * t + a[5]) * r / (((((b[0] * t + b[1]) * t + b[2]) * t + b[3]) * t + b[4]) * t + 1); }
function cityTax(tx, inc) { const p = tx.pit, br = [12000, 25000, 50000]; let t = Math.min(inc, br[0]) * p[0] / 100 + Math.max(0, Math.min(inc, br[1]) - br[0]) * p[1] / 100 + Math.max(0, Math.min(inc, br[2]) - br[1]) * p[2] / 100 + Math.max(0, inc - br[2]) * p[3] / 100; if (inc > 1e6) t += (inc - 1e6) * (tx.mill || 0) / 100; return t; }
function cityInit(s) {
  const cd = LIVE && LIVE.cd && Object.keys(LIVE.cd).length >= 59 ? LIVE.cd : null;
  const out = { cd: null, hh: null, pr: { started: 0, late: PROJ0.late, late3: PROJ0.late3, ovr: PROJ0.ovr, extraB: 0, avgDelayQ: 14 },
    net: SUB_LINES.map(l => ({ id: l.id, inv: 0, cap: 1, load: l.load })), netIdx0: 0, netIdx: 0,
    gr: null, biz: { n: BIZ0, open: 4950, close: 5200, moved: 400, com: 100, sect: BIZ_SECT.map(x => ({ id: x.id, n: BIZ0 * x.sh, net: 0 })) },
    hz: { heatYr: 0, heatEvent: false, flood: null, flash: null, lastYear: 2027 } };
  const tot = SUB_LINES.reduce((a, l) => a + l.r, 0); out.netIdx0 = out.netIdx = SUB_LINES.reduce((a, l) => a + l.r * l.load, 0) / tot;
  if (cd) {
    const ids = Object.keys(cd).filter(k => cd[k] && cd[k].pop > 0);
    const zs = k => { const v = ids.map(i => cd[i][k] || 0), m = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length) || 1; return i => ((cd[i][k] || 0) - m) / sd; };
    const zp = zs('pov'), zo = zs('o65'), zb = zs('bach');
    const sc = ids.map(i => [i, zp(i) + 0.5 * zo(i) - 0.5 * zb(i)]).sort((a, b) => a[1] - b[1]);
    const hvi = {}; sc.forEach(([i], k) => hvi[i] = 1 + Math.floor(k / sc.length * 5));
    const gpr = {}; ids.forEach(i => { const d = cd[i], b = CDB[i[0]]; gpr[i] = PROX[b] * Math.min(2, d.pov / 18) * (1 - d.bach / 100); });
    const gmax = Math.max(...Object.values(gpr));
    out.cd = {}; ids.forEach(i => { const d = cd[i]; out.cd[i] = { b: CDB[i[0]], pop: d.pop, units: d.units, pov0: d.pov, pov: d.pov, burd: d.burd, crime0: d.crime, crime: d.crime, fp: d.fp || 0, hvi: hvi[i], gp: gpr[i] / gmax, rent: 100, rentG: 3.5, disp: 0, dispYr: 0, pub: 0, pubRecent: 0, heatD: 0, heatYr: 0, floodHit: 0 }; });
    // synthetic households: 2,500 drawn in proportion to district population (seeded, so every run starts the same)
    let r = 12345; const R = () => (r = r * 16807 % 2147483647) / 2147483647; const gauss = () => { let u = 0, v = 0; while (u === 0) u = R(); v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const P = ids.reduce((a, i) => a + cd[i].pop, 0); const hh = [];
    ids.forEach(i => { const d = cd[i], b = CDB[i[0]], B0 = BOROUGHS.find(x => x.id === b), n = Math.max(2, Math.round(2500 * d.pop / P));
      const med = B0.inc * Math.exp(-0.035 * (d.pov - B0.pov));
      for (let k = 0; k < n; k++) {
        const inc = Math.max(6000, med * Math.exp(0.85 * gauss()));
        const u = R(); const ten = u < TEN.own[b] ? 'own' : u < TEN.own[b] + TEN.pubh[b] ? 'nycha' : R() < 0.44 ? 'stab' : 'mkt';
        const m = 0.3 * Math.exp(normInv(Math.min(0.95, Math.max(0.05, d.burd / 100))) * 0.5);
        const ratio = Math.min(0.9, m * Math.exp(0.5 * gauss()));
        const rent = ten === 'own' ? 0 : ten === 'nycha' ? inc * 0.3 : inc * ratio * (ten === 'stab' ? 0.85 : 1);
        hh.push({ cd: i, b, ten, ten0: ten, inc, inc0: inc, rent, rent0: rent, emp: R() > B0.unemp / 100, emp0: true, disp: 0, left: false, shelter: false, moved: false, old: R() < d.o65 / 100, kids: R() < 0.28 });
      } });
    hh.forEach(h => h.emp0 = h.emp);
    out.hh = hh;
  }
  return out;
}
function cityStep(s, ctx) {
  const X = s.cx || (s.cx = cityInit(s)); const { C, E, H, fx, R, ev, rep, sandbox } = ctx; const P = s.plan;
  const rnd = ev ? R : (() => { let z = (s.t + 7) * 9301 % 233280; return () => (z = (z * 9301 + 49297) % 233280) / 233280; })();
  // --- big projects: delays and cost overruns ---
  const PR = X.pr, capB = Object.keys(C).reduce((a, k) => a + C[k], 0) / 4;
  const strain = Math.max(0, 1 - (ctx.capF || 1)), audit = Math.min(1, (P.audit || 0) / 0.4), info = s.info || 0.8;
  const late = Math.min(0.92, Math.max(0.25, PROJ0.late * (1 + strain * 0.8) * (1 - audit * 0.25) * (1 - (info - 0.8) * 0.5)));
  const late3 = Math.min(0.85, Math.max(0.1, PROJ0.late3 * (1 + strain * 1.0) * (1 - audit * 0.3) * (1 - (info - 0.8) * 0.6)));
  const ovr = Math.max(1.03, PROJ0.ovr * (1 + strain * 0.5) * (1 - audit * 0.08) * (1 - (info - 0.8) * 0.2) * (ev ? 1 + (rnd() - 0.5) * 0.06 : 1));
  const w = PR.started > 0 ? Math.min(0.3, capB / Math.max(1, PR.started)) : 1;
  PR.late += (late - PR.late) * w; PR.late3 += (late3 - PR.late3) * w; PR.ovr += (ovr - PR.ovr) * w;
  PR.started += capB; PR.extraB += capB * (PR.ovr - 1); PR.avgDelayQ = 2 + PR.late * 6 + PR.late3 * 14;
  // --- hourly grid on the summer and winter peak days ---
  const CB = s.cb || { elec: 0.1, ev: 0.03 }; const stor = E.storage || 0, sol = E.solar || 0;
  const elecMW = Math.max(0, (CB.elec - 0.1) / 0.9) * ELEC_WIN * Math.max(0.5, 1 - (E.eff || 0) / 4000);
  const evMW = (CB.ev || 0) * EV_MW;
  const shave = (arr) => { if (stor <= 0) return arr; const a = arr.slice(); let left = stor * 4; for (let it = 0; it < 40 && left > 0; it++) { const mx = Math.max(...a), i = a.indexOf(mx); const second = [...a].sort((x, y) => y - x)[1]; const cut = Math.min(stor, mx - second + 50, left); a[i] -= cut; left -= cut; } return a; };
  const sum = shave(GRID_SHAPE.sum.map((f, h) => E.peak * f + evMW * GRID_SHAPE.ev[h] * 0.6 - sol * GRID_SHAPE.sol[h] * 0.7));
  const winBase = WIN0 * (E.peak / 11005);
  const win = shave(GRID_SHAPE.win.map((f, h) => winBase * f + elecMW * GRID_SHAPE.heat[h] + evMW * GRID_SHAPE.ev[h] * 0.6));
  const firmW = E.firm * 1.03 - (sol * 0.25);
  const pS = Math.max(...sum), pW = Math.max(...win);
  X.gr = { sum, win, firmS: E.firm, firmW, peakS: pS, peakW: pW, hS: sum.indexOf(pS), hW: win.indexOf(pW), marginW: firmW - pW, binding: pW > pS ? 'winter' : 'summer' };
  if (s.q === 1 && X.gr.marginW < -150 && ev && !sandbox && rnd() < 0.5) { s.support -= 3; rep.events.push({ k: 'bad', t: 'Winter blackout', d: `On the coldest evening, demand reached ${Math.round(pW)} MW, ${Math.round(-X.gr.marginW)} MW more than firm supply. Heat pumps and chargers now peak in winter; storage and retrofits are the fix.` }); }
  // --- subway: crowding line by line ---
  let addInv = (C.transit || 0) / 4; const bp = {}; s.bor.forEach((b, i) => bp[b.id] = b.pop / BOROUGHS[i].pop);
  const rideF = (s.tr.rides / 1740) * (s.d && s.d.epidemic > 0 ? 0.65 : 1);
  X.net.forEach((n, k) => { const L0 = SUB_LINES[k]; const dem = Object.keys(L0.w).reduce((a, b) => a + L0.w[b] * (bp[b] || 1), 0); n.load = L0.load * rideF * dem / n.cap; });
  while (addInv > 0.001) { const tgt = X.net.filter(n => n.inv < 2).sort((a, b) => b.load - a.load)[0]; if (!tgt) break; const put = Math.min(addInv, 2 - tgt.inv); tgt.inv += put; tgt.cap = 1 + 0.12 * tgt.inv; addInv -= put; }
  const tot = SUB_LINES.reduce((a, l) => a + l.r, 0); X.netIdx = X.net.reduce((a, n, k) => a + SUB_LINES[k].r * n.load, 0) / tot;
  // --- firms: openings, closings and moves out of the city ---
  const Bz = X.biz, tx = s.tax, gcpG = (s.ec.gcp / (X.gcpPrev || s.ec.gcp) - 1) * 4; X.gcpPrev = s.ec.gcp;
  Bz.com *= 1 + (0.02 + gcpG * 0.5) / 4;
  const taxI = { corp: tx.corp / 8.85 - 1 + (tx.ubt / 4 - 1) * 0.5, prop: tx.prop[3] / 10.848 - 1, sales: tx.sales / 4.5 - 1, wage: fx.wageCost || 0 };
  const climF = (s.ec.climate || 100) / 100, safety = s.js ? s.js.viol - 1 : 0, rec = s.fin && s.fin.recession > 0 ? 1 : 0;
  let O = 0, Cl = 0, M = 0;
  Bz.sect.forEach((x, k) => { const d = BIZ_SECT[k]; const cost = d.corp * taxI.corp * 0.6 + d.rent * ((Bz.com / (100 * Math.pow(1.025, s.t / 4)) - 1) * 0.8 + taxI.prop * 0.3) + d.sales * taxI.sales * 0.5 + d.wage * taxI.wage + safety * 0.4;
    const o = 4950 * d.sh * Math.pow(climF, 1.2) * Math.max(0.3, 1 + (gcpG - 0.02) * 2 - cost * 0.7 - rec * 0.12);
    const c = 4950 * d.sh * Math.max(0.5, 1 + cost * 0.8 + rec * 0.15 - (climF - 1) * 0.5);
    const m = c * Math.min(0.5, 0.08 + Math.max(0, cost) * 0.4);
    x.n += o - c; x.net = o - c; O += o; Cl += c; M += m; });
  Bz.open = O; Bz.close = Cl; Bz.moved = M; Bz.n = Bz.sect.reduce((a, x) => a + x.n, 0);
  s.ec.climate = Math.max(10, Math.min(115, s.ec.climate + Math.max(-0.5, Math.min(0.5, (Bz.open - Bz.close) / 1000))));
  // --- districts: rents, displacement, public homes, crime ---
  const yr = s.year; if (yr !== X.hz.lastYear) { X.hz.lastYear = yr; X.hz.heatYr = 0; if (X.cd) Object.values(X.cd).forEach(d => { d.heatYr = 0; d.dispYr = 0; }); }
  if (X.cd) {
    const cds = Object.entries(X.cd); const stabProt = s.pol.housing === 'h0' ? 0.44 : 0.6; const evictCut = fx.evict || 0;
    const need = {}; s.bor.forEach(b => need[b.id] = cds.filter(([, d]) => d.b === b.id).reduce((a, [, d]) => a + d.pop * d.burd, 0));
    const evW = cds.reduce((a, [, d]) => a + d.pop * d.pov, 0);
    cds.forEach(([id, d]) => {
      const bo = s.bor.find(b => b.id === d.b), B0 = BOROUGHS.find(b => b.id === d.b);
      const prevPub = X.pubPrev ? X.pubPrev[d.b] : bo.pubUnits; const add = Math.max(0, bo.pubUnits - prevPub) * d.pop * d.burd / (need[d.b] || 1);
      d.pub += add; d.pubRecent = d.pubRecent * 0.85 + add;
      d.rentG = H.rentG * (0.8 + 0.5 * d.gp) - 50 * d.pubRecent / d.units;
      d.rent *= 1 + d.rentG / 400;
      const renters = d.units * 0.66;
      const pressure = Math.max(0, d.rentG - 3) / 100;
      const evQ = (s.js ? s.js.evict : 18000) / 4 * d.pop * d.pov / evW;
      const disp = renters * pressure * 0.25 / 4 * (1 - stabProt) * (0.5 + d.gp) + evQ;
      d.disp += disp; d.dispYr += disp;
      d.pov = d.pov0 * bo.pov / B0.pov - Math.min(4, d.disp / d.pop * 100 * 0.3);
      d.crime = d.crime0 * (s.js ? 0.55 * s.js.viol + 0.45 * s.js.prop : 1) * Math.sqrt(Math.max(0.3, d.pov / d.pov0));
    });
    X.pubPrev = {}; s.bor.forEach(b => X.pubPrev[b.id] = b.pubUnits);
    X.dispYr = cds.reduce((a, [, d]) => a + d.dispYr, 0);
  }
  // --- heat waves and floods by district ---
  const HZ = X.hz; HZ.heatEvent = !!ctx.heatWave; HZ.flood = null; HZ.flash = null;
  if (s.q === 3 && X.cd) {
    const cds = Object.values(X.cd); const wsum = cds.reduce((a, d) => a + d.pop * Math.pow(d.hvi, 1.5), 0);
    const deaths = (s.clim ? s.clim.heat : 500) * (HZ.heatEvent ? 1.35 : 1);
    cds.forEach(d => { const x = deaths * d.pop * Math.pow(d.hvi, 1.5) / wsum; d.heatYr = x; d.heatD += x; });
    HZ.heatYr = deaths;
  }
  if (ctx.hurricane && X.cd) { const prot = s.clim ? s.clim.protect : 0; const hit = Object.entries(X.cd).filter(([, d]) => d.fp > 0).map(([id, d]) => { const n = d.fp * (1 - prot) * (0.6 + rnd() * 0.4); d.floodHit += n; return [id, n]; }).sort((a, b) => b[1] - a[1]); HZ.flood = { hit: hit.slice(0, 6), total: hit.reduce((a, x) => a + x[1], 0) }; }
  if (ev && !sandbox && s.q === 3 && X.cd && rnd() < 0.06) {
    const sewer = Math.min(1, (C.water || 0) / 4 / 1.5 + (s.wt ? (s.wt.cond - 60) / 200 : 0));
    const cds = Object.entries(X.cd).map(([id, d]) => [id, d.pop * (d.pov / 20) * (d.fp > 0 ? 1.5 : 1)]).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const deaths = Math.round(13 * (1 - sewer * 0.6) * (0.5 + rnd()));
    HZ.flash = { hit: cds.map(x => x[0]), deaths };
    s.support -= 1.5; s.hl.life -= deaths * 0.0005;
    rep.events.push({ k: 'bad', t: 'Cloudburst floods basement homes', d: `Up to three inches of rain in an hour overwhelm the sewers. ${deaths} people die, most in illegal basement apartments in ${HZ.flash.hit.slice(0, 3).map(cdLabel).join(', ')}. Sewer upgrades and legal, safe basement units reduce the toll (Ida, 2021, killed 13 New Yorkers).` });
  }
  // --- households: who wins, who loses ---
  if (X.hh) {
    const stabG = s.pol.housing === 'h1' ? 0 : 2.75; const wageG = 0.03 + (fx.wageCost ? fx.wageCost * 0.5 : 0);
    const newPub = s.bor.reduce((a, b) => a + b.pubUnits, 0) - (X.pubTot || 0); X.pubTot = s.bor.reduce((a, b) => a + b.pubUnits, 0);
    const pLottery = Math.min(0.2, Math.max(0, newPub) / 1300000);
    let rr = (s.t * 7919 + 17) % 2147483647; const HR = () => (rr = rr * 16807 % 2147483647) / 2147483647;
    X.hh.forEach(h => {
      if (h.left) return;
      const ml = s.oc && s.oc.hhLeave; if (ml && HR() < (h.inc < 60000 ? ml.low : h.inc < 200000 ? ml.mid : ml.high)) { h.left = true; return; }
      const bo = s.bor.find(b => b.id === h.b); const d = X.cd[h.cd];
      if (HR() < 0.06) h.emp = HR() > bo.unemp / 100;
      h.inc *= 1 + wageG / 4;
      if (h.ten === 'mkt') h.rent *= 1 + (d ? d.rentG : H.rentG) / 400; else if (h.ten === 'stab') h.rent *= 1 + stabG / 400; else if (h.ten === 'nycha' || h.ten === 'pub') h.rent = 0.3 * h.inc * (h.ten === 'pub' ? 0.85 : 1);
      if ((h.ten === 'mkt' || h.ten === 'stab') && d) { const pr = d.dispYr > 0 ? (d.dispYr / (d.units * 0.66)) / 4 * (h.ten === 'stab' ? 0.4 : 1.4) * (h.inc < 40000 ? 1.8 : 0.6) : 0;
        if (HR() < pr) { h.disp++; if (HR() < 0.3) h.left = true; else if (h.inc < 25000 && HR() < 0.25) h.shelter = true; else { h.rent *= 1.15; h.moved = true; } } }
      if ((h.ten === 'mkt' || h.ten === 'stab' || h.shelter) && h.inc < 90000 && HR() < pLottery * (h.rent / h.inc > 0.3 || h.shelter ? 2.5 : 0.8)) { h.ten = 'pub'; h.shelter = false; h.rent = 0.25 * h.inc; }
    });
  }
}
function cdLabel(id) { const b = CDB[id[0]]; const B0 = BOROUGHS.find(x => x.id === b); return `${B0.name} ${+id.slice(1)}`; }
function hhSummary(s) {
  const X = s.cx; if (!X || !X.hh) return null;
  const grp = (name, f) => { const a = X.hh.filter(f); if (!a.length) return null;
    const left = h => h.inc * (h.emp ? 1 : 0.45) - cityTax(s.tax, h.inc) - h.rent, left0 = h => h.inc0 * (h.emp0 ? 1 : 0.45) - cityTax(TAX0, h.inc0) - h.rent0;
    const live = a.filter(h => !h.left); const ch = live.map(h => (left(h) / Math.max(1, left0(h)) - 1) * 100).sort((x, y) => x - y);
    return { name, n: a.length, money: ch.length ? ch[Math.floor(ch.length / 2)] : 0, burden: live.filter(h => h.ten !== 'own' && h.rent / Math.max(1, h.inc) > 0.3).length / Math.max(1, live.filter(h => h.ten !== 'own').length) * 100,
      burden0: a.filter(h => h.ten0 !== 'own' && h.rent0 / Math.max(1, h.inc0) > 0.3).length / Math.max(1, a.filter(h => h.ten0 !== 'own').length) * 100,
      disp: a.filter(h => h.disp > 0).length / a.length * 100, pub: a.filter(h => h.ten === 'pub').length / a.length * 100, left: a.filter(h => h.left).length / a.length * 100, shelter: a.filter(h => h.shelter).length / a.length * 100 }; };
  const incs = X.hh.map(h => h.inc0).sort((a, b) => a - b), t1 = incs[Math.floor(incs.length / 3)], t2 = incs[Math.floor(incs.length * 2 / 3)];
  return { n: X.hh.length, rows: [
    grp('Market-rate renters', h => h.ten0 === 'mkt'), grp('Rent-stabilized tenants', h => h.ten0 === 'stab'), grp('Public housing (NYCHA)', h => h.ten0 === 'nycha'), grp('Homeowners', h => h.ten0 === 'own'),
    grp(`Lower third (under $${Math.round(t1 / 1000)}k)`, h => h.inc0 < t1), grp('Middle third', h => h.inc0 >= t1 && h.inc0 < t2), grp(`Top third (over $${Math.round(t2 / 1000)}k)`, h => h.inc0 >= t2),
    grp('Households with someone 65+', h => h.old), grp('Households with children', h => h.kids),
    ...['BX', 'BK', 'MN', 'QN', 'SI'].map(b => grp(BOROUGHS.find(x => x.id === b).name, h => h.b === b)),
  ].filter(Boolean) };
}
// ===== BACK-TEST: murders 2015–2025 with the justice equations =====
// Actual: NYPD year-end murders. Inputs: NYC annual unemployment (BLS LAUS, rounded). The model uses only the trend (−2%/yr) and
// unemployment (+4% violent crime per point); it has no term for the 2020 pandemic disruption.
const BACKTEST = { years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025], murders: [352, 335, 292, 295, 319, 468, 488, 438, 391, 382, 305], unemp: [5.7, 5.2, 4.6, 4.1, 4.0, 12.3, 9.9, 5.7, 5.3, 5.3, 5.2] };
function backtest() {
  const B = BACKTEST, u0 = B.unemp[0], m0 = B.murders[0];
  const model = B.years.map((y, i) => m0 * Math.pow(0.98, y - 2015) * (1 + 4 * (B.unemp[i] - u0) / 100));
  const naive = B.years.map(() => m0);
  const mape = a => a.reduce((s, v, i) => s + Math.abs(v - B.murders[i]) / B.murders[i], 0) / a.length * 100;
  const ex = [0, 1, 2, 3, 4, 8, 9, 10];
  const mapeX = a => ex.reduce((s, i) => s + Math.abs(a[i] - B.murders[i]) / B.murders[i], 0) / ex.length * 100;
  return { years: B.years, actual: B.murders, model, naive, mape: mape(model), mapeNaive: mape(naive), mapeNoCovid: mapeX(model), mapeNaiveNoCovid: mapeX(naive) };
}

// ===== LAND: where public homes can be built =====
// Capacities: Comptroller 2016 audit (53,116 homes possible on 1,459 vacant city-owned properties), Stringer 2008 and CBC 2018
// (unused development rights on NYCHA campuses), the five 2024–25 neighbourhood rezonings, Willets Point, Brooklyn Marine Terminal
// and the Sunnyside Yard master plan. Reviews follow the 2025 Charter amendments: BSA fast track for publicly financed
// affordable housing (about 30 days), full public review with a Council vote for big sites, an Appeals Board after a rejection.
const SITES = [
  { id: 'willets', name: 'Willets Point, phase 2', b: 'QN', homes: 1400, kind: 'approved', extra: 0, lead: 0, opp: 0, src: 'willets', note: 'Already approved; the first 880 homes opened in 2026.' },
  { id: 'rezoned', name: 'Sites inside the five 2024–25 rezonings', b: 'mix', split: { MN: 9500, QN: 26700, BK: 4600, BX: 7000 }, homes: 14300, kind: 'asright', extra: 150000, lead: 0, opp: 0, src: 'rezonings', note: 'Zoning already allows housing (Midtown South, Long Island City, Jamaica, Atlantic Avenue, Bronx Metro-North: 47,800 homes). The city must buy the land; we assume it can get 30% of it.' },
  { id: 'lotsBK', name: 'Vacant city lots, Brooklyn', b: 'BK', homes: 12900, kind: 'fast', extra: 0, lead: 0, opp: 0.1, src: 'landBank', note: 'Comptroller count of 21,570 possible homes in 2016; we assume 60% are still free.' },
  { id: 'lotsQN', name: 'Vacant city lots, Queens', b: 'QN', homes: 15600, kind: 'fast', extra: 0, lead: 0, opp: 0.1, flood: true, src: 'landBank', note: '26,025 possible homes in 2016, many on the Rockaway peninsula in the flood zone; we assume 60% are still free.' },
  { id: 'lotsBX', name: 'Vacant city lots, Bronx', b: 'BX', homes: 1600, kind: 'fast', extra: 0, lead: 0, opp: 0.1, src: 'landBank', note: '2,665 possible homes in 2016; we assume 60% are still free.' },
  { id: 'lotsMS', name: 'Vacant city lots, Manhattan and Staten Island', b: 'mix', split: { MN: 1, SI: 1 }, homes: 1700, kind: 'fast', extra: 0, lead: 0, opp: 0.15, src: 'landBank', note: 'About 2,850 possible homes in 2016; we assume 60% are still free.' },
  { id: 'nychaMN', name: 'NYCHA campuses, Manhattan', b: 'MN', homes: 35000, kind: 'nycha', extra: 0, lead: 1, opp: 0.4, src: 'nychaLand', note: '30.5 million sq ft of unused development rights, about 35,000 homes (Manhattan Borough President, 2008). Tenants vote first.' },
  { id: 'nychaOut', name: 'NYCHA campuses, other boroughs', b: 'mix', split: { BK: 13, BX: 12, QN: 5, SI: 1.5 }, homes: 31500, kind: 'nycha', extra: 0, lead: 1, opp: 0.4, src: 'nychaLand', note: 'The rest of the 58 million sq ft CBC counted citywide; the split by borough is our estimate. Tenants vote first.' },
  { id: 'bmt', name: 'Brooklyn Marine Terminal, Red Hook', b: 'BK', homes: 6000, kind: 'full', extra: 100000, lead: 4, opp: 0.45, src: 'bmt', note: 'Vision plan for 6,000 homes passed the task force 17–8 in 2025; environmental review still to come. Extra cost is our estimate for site work.' },
  { id: 'sunny', name: 'Sunnyside Yard deck, Queens', b: 'QN', homes: 12000, kind: 'full', extra: 1200000, lead: 8, opp: 0.3, src: 'sunnyside', note: '12,000 homes on a deck over an active rail yard; the 2020 plan priced the deck at $14.4B, about $1.2M per home on top of building.' },
];
const SITE_REVIEW = { approved: 0, asright: 0, fast: 1, nycha: 2, full: 3 };
function ldInit() { const o = {}; SITES.forEach(x => o[x.id] = { st: x.kind === 'approved' || x.kind === 'asright' ? 'ok' : 'idle', q: 0, used: 0, invest: false, appealed: false }); return { sites: o, noLand: 0, useShare: 1, investDue: 0, lastMsg: '' }; }
function siteChance(s, x, st) {
  if (s.mode === 'sandbox') return 1;
  const sup = (s.support - 50) / 100, inv = st.invest ? 0.15 : 0;
  if (x.kind === 'fast') return Math.min(0.98, Math.max(0.3, 0.92 * (1 - x.opp * 0.3) + sup / 2 + inv / 2));
  if (x.kind === 'nycha') return Math.min(0.95, Math.max(0.1, 0.55 + sup + ((s.h.nychaCond || 40) > 50 ? 0.1 : 0) + inv));
  return Math.min(0.97, Math.max(0.05, 0.9 * (1 - x.opp) + sup + inv));
}
function proposeSite(s, id, invest) {
  const L = s.ld || (s.ld = ldInit()); const x = SITES.find(y => y.id === id), st = L.sites[id]; if (!x || !st) return false;
  if (st.st === 'idle' || (st.st === 'no' && !st.appealed && x.kind !== 'nycha')) {
    if (st.st === 'no') { st.appealed = true; st.st = 'appeal'; st.q = s.t + 1; return true; }
    st.st = 'review'; st.q = s.t + SITE_REVIEW[x.kind] + (x.id === 'sunny' || x.id === 'bmt' ? 1 : 0); st.invest = !!invest;
    if (invest) L.investDue += x.homes * 40000 / 1e9; // community investment package, about $40k per home (recent rezonings: $34–51k)
    return true;
  }
  return false;
}
function sitesStep(s, rep, ev, R) {
  const L = s.ld || (s.ld = ldInit());
  SITES.forEach(x => { const st = L.sites[x.id];
    if ((st.st === 'review' || st.st === 'appeal') && s.t >= st.q) {
      const p = st.st === 'appeal' ? (s.mode === 'sandbox' ? 1 : Math.min(0.9, Math.max(0.1, 0.45 + (s.support - 50) / 100))) : siteChance(s, x, st);
      const ok = ev ? R() < p : p >= 0.5;
      const who = st.st === 'appeal' ? 'The Affordable Housing Appeals Board (Mayor, Council Speaker, Borough President)' : x.kind === 'fast' ? 'The Board of Standards and Appeals' : x.kind === 'nycha' ? 'NYCHA tenants' : 'The City Council';
      st.st = ok ? 'ok' : 'no';
      if (ev) rep.events.push({ k: ok ? 'good' : 'bad', t: ok ? `Site approved: ${x.name}` : `Site rejected: ${x.name}`, d: ok ? `${who} approved up to ${Math.round(x.homes).toLocaleString('en-US')} public homes here.` : `${who} voted it down.${x.kind === 'full' && !st.appealed ? ' You can take it to the new Appeals Board.' : ''}` });
    } });
}
// spend the public building budget on approved sites, cheapest first; returns homes started and their borough split
function sitesBuild(s, dollars, cost, mat) {
  const L = s.ld || (s.ld = ldInit()); const B0 = dollars; let left = dollars, homes = 0, lead = 0; const byB = { BX: 0, BK: 0, MN: 0, QN: 0, SI: 0 };
  SITES.filter(x => L.sites[x.id].st === 'ok').sort((a, b) => a.extra - b.extra).forEach(x => {
    const st = L.sites[x.id], rem = x.homes - st.used; if (rem <= 0 || left <= 0) return;
    const c = cost + x.extra * mat, n = Math.min(rem, left / c); st.used += n; left -= n * c; homes += n; lead = Math.max(lead, x.lead);
    if (x.b === 'mix') { const tot = Object.values(x.split).reduce((a, b) => a + b, 0); Object.keys(x.split).forEach(k => byB[k] += n * x.split[k] / tot); } else byB[x.b] += n;
  });
  L.useShare = B0 > 0 ? 1 - left / B0 : 1; L.noLand = B0 > 0 ? left / cost : 0;
  return { homes, byB, lead };
}
function sitesCap(s) { const L = s.ld || ldInit(); let ok = 0, rev = 0, idle = 0; SITES.forEach(x => { const st = L.sites[x.id], rem = x.homes - st.used; if (st.st === 'ok') ok += rem; else if (st.st === 'review' || st.st === 'appeal') rev += rem; else if (st.st === 'idle') idle += rem; }); return { ok, rev, idle }; }

// ===== ROADS: congestion pricing (Manhattan below 60th Street since 5 Jan 2025) =====
// First year: 73,000 fewer vehicles a day (−11%), about $550M for the MTA, subway trips into the zone +9%, buses +8.4%.
const ROAD0 = { veh: 663000, k: -Math.log(0.89) / 9, rev: 0.55 };
function tollNow(s) { const o = s.pol.road || 'r0'; if (o === 'r3') return 0; if (o === 'r1' || o === 'r2') return 15; return s.year >= 2031 ? 15 : s.year >= 2028 ? 12 : 9; }
function roadStep(s, fx, rep, ev, R) {
  const RD = s.rd || (s.rd = { veh: 590000, toll: 9, rev: 0.55, speed: 1.23, susp: 0, cit: 0 });
  if (RD.susp > 0) RD.susp--;
  let toll = RD.susp > 0 ? 0 : tollNow(s);
  R(); if (ev && toll > 0 && s.mode !== 'sandbox' && RD.susp === 0 && R() < 0.015) { RD.susp = 2; toll = 0; rep.events.push({ k: 'bad', t: 'Federal order pauses the toll', d: 'Washington moves to stop congestion pricing and a court pauses tolling while the case runs. Traffic returns to the zone for about six months.' }); }
  const popF = s.pop / 8585000;
  RD.toll = toll; RD.veh = ROAD0.veh * Math.exp(-ROAD0.k * toll) * popF;
  const d = 1 - RD.veh / (ROAD0.veh * popF), dd = d - 0.11; // change against 2025–26, which is already in the starting data
  RD.cit = s.pol.road === 'r2' ? 1 : 0;
  RD.rev = RD.veh * 365 * toll * 0.284 / 1e9 + (RD.cit ? 2.5 : 0);
  RD.speed = 1 + 2.1 * d + (RD.cit ? 0.08 : 0);
  fx.car = (fx.car || 0) - 0.25 * dd - (RD.cit ? 0.12 : 0);
  fx.rides = (fx.rides || 0) + 0.3 * dd + (RD.cit ? 0.04 : 0);
  if (s.d) s.d.transitCap += Math.max(-0.002, (RD.rev - ROAD0.rev) * 0.004 / 4);
}

// ===== SCHOOLS: the State class-size law (full compliance due in the 2027–28 school year) =====
// 64% of classes complied in 2025–26 (DOE). Estimates of extra teachers needed range from about 10,000–12,000 to 16,300
// (IBO, $1.5–1.7B a year). Only about 20,000 of the new seats funded will open by the deadline (Class Size Matters).
const SC0 = { comp: 64, tNeed: 12000, sNeed: 50000, seatCost: 200000, tCost: 0.000105 };
function scInit() { return { comp: 64, hired: 0, seats: 0, pipe: [{ q: 6, n: 10000 }, { q: 10, n: 10000 }], req: 80, cost: 0, freed: 0, newKids: 0 }; }
function schoolStep(s, C, eff, pubDone, privDone) {
  const SC = s.sc || (s.sc = scInit()); const pol = s.pol.classsize || 'cs0';
  const sy = s.q >= 3 ? s.year : s.year - 1; // school year starting in September
  SC.req = pol === 'cs2' && s.delayCS ? 80 : sy >= 2027 ? 100 : 80;
  const pace = pol === 'cs1' ? 4000 : pol === 'cs2' ? 600 : 1500; // teachers a year
  const short = Math.max(0, (s.ed.teacherGap || 0) - 3000) / 10000;
  SC.hired = Math.min(SC.tNeed || SC0.tNeed, SC.hired + pace / 4 * Math.max(0.3, 1 - short));
  if (C.schools > 0) SC.pipe.push({ q: s.t + 12, n: C.schools / 4 * 1e9 * eff / SC0.seatCost });
  SC.pipe = SC.pipe.filter(x => { if (x.q <= s.t) { SC.seats += x.n; return false; } return true; });
  SC.freed = Math.max(0, 884600 - (s.ed.enroll || 884600));
  SC.newKids += (pubDone + privDone) * 0.2;
  const space = (SC.seats + SC.freed * 0.5 - SC.newKids) / SC0.sNeed, teach = SC.hired / SC0.tNeed;
  SC.comp = Math.max(40, Math.min(100, SC0.comp + 36 * Math.min(Math.max(0, teach), Math.max(0, space) + 0.25)));
  SC.cost = SC.hired * SC0.tCost;
  if (SC.comp < SC.req - 1 && s.mode !== 'sandbox') s.legal += (SC.req - SC.comp) / 100 * 0.3;
}

// ===== HOSPITALS: beds per 1,000 people by borough =====
// Manhattan ≈6, Queens ≈1.5 (Council hearing 2024); Bronx, Brooklyn and Staten Island are our estimates below 3.
// US and State average ≈2.4. H+H acute beds were 78.8% full in FY2026. 63 hospitals closed statewide since 2000.
const HP0 = { rate: { MN: 6.0, BX: 2.8, BK: 2.4, QN: 1.5, SI: 2.3 }, need: 2.4, perBed: 2.5e6 };
function hpInit() { const b = {}; BOROUGHS.forEach(x => b[x.id] = HP0.rate[x.id] * x.pop / 1000); return { beds: b, pipe: [], closed: 0, ratio: 1, worst: 'QN' }; }
function hospStep(s, C, eff, rep, ev, R) {
  const HP = s.hp || (s.hp = hpInit());
  if (C.hosp > 0) { const worst = s.bor.slice().sort((a, b) => HP.beds[a.id] / a.pop - HP.beds[b.id] / b.pop)[0].id; HP.pipe.push({ q: s.t + 12, n: C.hosp / 4 * 1e9 * eff / HP0.perBed, b: worst }); }
  HP.pipe = HP.pipe.filter(x => { if (x.q <= s.t) { HP.beds[x.b] += x.n; return false; } return true; });
  const pChance = s.pol.health === 'm2' ? 0.02 : 0.05;
  if (ev && s.mode !== 'sandbox' && R() < pChance) { const b = ['BK', 'QN', 'BX', 'MN'][Math.floor(R() * 4)]; const n = 150 + Math.round(R() * 150); HP.beds[b] = Math.max(0, HP.beds[b] - n); HP.closed += n; rep.events.push({ k: 'bad', t: 'A hospital closes', d: `A struggling hospital in ${BOROUGHS.find(x => x.id === b).name} closes, taking about ${n} beds with it. Nearby emergency rooms fill up.` }); }
  const old = s.age.s65 / s.pop, need = HP0.need * (1 + (old - 0.175) * 3) * (s.pol.health === 'm2' ? 1.08 : s.pol.health === 'm1' ? 1.03 : 1) * (s.d && s.d.epidemic > 0 ? 1.3 : 1);
  const tot = Object.values(HP.beds).reduce((a, b) => a + b, 0); HP.need = need; HP.total = tot;
  HP.ratio = tot / (need * s.pop / 1000);
  HP.worst = s.bor.slice().sort((a, b) => HP.beds[a.id] / a.pop - HP.beds[b.id] / b.pop)[0].id;
  // a borough short of beds sends half its overflow elsewhere; the rest waits longer in emergency rooms
  HP.short = s.bor.reduce((a, b) => a + Math.max(0, need * b.pop / 1000 - HP.beds[b.id]), 0);
  HP.worstRatio = HP.beds[HP.worst] / (need * s.bor.find(b => b.id === HP.worst).pop / 1000);
  return HP.short / (need * s.pop / 1000) * 0.5 + Math.max(0, 1 - HP.ratio);
}

// ===== SEA LEVEL AND FLOOD INSURANCE =====
// NPCC 2024: mid-range rise of 36–48 cm by the 2050s and 64–99 cm by the 2080s (baseline 1995–2014). About 53,000 NYC
// properties hold federal flood insurance; average premium $1,152 in 2021; full-risk New York average ≈$1,834 under Risk
// Rating 2.0; yearly increases are capped. Higher premiums cut existing policies by 5–13% (Gourevitch et al.).
function flInit() { return { cm: 8, prem: 1500, pol: 53000, exp: 1 }; }
function seaStep(s) {
  const F = s.fl || (s.fl = flInit()); const yr = s.t / 4;
  F.cm = 8 + 0.9 * yr + 0.02 * yr * yr;
  F.exp = 1 + (F.cm - 8) / 35;
  const prot = s.clim ? s.clim.protect : 0, target = 1834 * F.exp * (1 - 0.5 * prot);
  const old = F.prem; F.prem = Math.min(old * Math.pow(1.18, 0.25), old + (target - old) * 0.25);
  F.pol = Math.max(20000, F.pol * (1 - Math.max(0, F.prem / old - 1) * 0.5));
  F.ins = F.pol / 53000 * 0.55; // share of floodplain homes insured, about 55% today (assumption)
  return F.exp;
}

// ===== REPLAYS: run parts of the model on real episodes =====
const REPLAY = {
  rent: { years: [2019, 2020, 2021, 2022, 2023, 2024], obs: { 2019: 5.5, 2020: 6.5, 2022: 9.9, 2024: 9.2 }, pioc: [3.2, 3.0, 4.2, 8.1, 3.9, 6.3], allowed: [1.5, 0, 0.75, 3.25, 3.0, 2.75] },
  permits: { years: [2019, 2020, 2021, 2022, 2023, 2024], obs: [null, null, 23352, 68610, 16359, 15626] },
};
function replayRent() { const R0 = REPLAY.rent; let d = 5.5; const model = [d]; for (let i = 0; i < R0.years.length - 1; i++) { d = d + 0.6 * (R0.pioc[i] - R0.allowed[i]) - (d - 5.5) * 0.04; model.push(+d.toFixed(2)); } return { years: R0.years, model, obs: R0.years.map(y => R0.obs[y] ?? null) }; }
function replayPermits() { const base = 22000, rush = base * 8.5 * 0.25; return { years: REPLAY.permits.years, model: REPLAY.permits.years.map(y => y <= 2021 ? base : y === 2022 ? Math.round(base * 0.75 + rush) : Math.round(base * 0.75)), noExp: REPLAY.permits.years.map(y => y <= 2021 ? base : Math.round(base * 0.75)), obs: REPLAY.permits.obs }; }

// ===== OPEN CITY, DELIVERY LIMITS, BEHAVIOURAL RESPONSES =====
// Households move in and out as their net gain from city policy changes (CBC 2026: net domestic loss ≈114,000 in 2025,
// across all income groups). Some leavers keep their city job and commute in (RPA: ≈1 million commuters, $141B earnings).
// Delivery: plan review (DOB), building materials, installers for batteries/solar/retrofits, agency hiring.
// Responses: controlled flats taken off the market (HVS 2023: 26,310 stabilized units vacant and not for rent; Diamond,
// McQuade & Qian 2019: −15% rental supply where conversion was legal), buildings losing money (RGB: ≈10% of pre-1974
// stabilized units), tax avoidance that grows after a rise (Rauh & Shyu 2024: 45% of the windfall gone in year one, 61% by year two).
const OC0 = { comm: 1000000, wh0: 26310, stab: 1000000, distress: 0.10, pioc: 5.3, base: 70 };
const PERS_UNIT = 8585000 / 4950000;
const MIG_M = [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.06, 0.08, 0.15, 0.2];
function ocA(s, k) { const v = s.A[k]; return v == null ? ASSUME[k].v : v; }
function ocInit() {
  return { u: GROUPS.map(() => 1), flowQ: 0, migYr: 0, migG: GROUPS.map(() => 0), commAdd: 0, leftUnits: 0,
    hire: 1, mat: 1, revBack: 0, revWait: 0, revCap: 0, revDays: 25.4, revLoad: 1, instQ: [], instWait: 0, instCap: ASSUME.installCap.v / 4, elecTrained: 0,
    wh: OC0.wh0, whExtra: 0, distress: OC0.distress, abandoned: 0, acqMul: 1, val2: 1, maintAdj: 0, gap: OC0.pioc - 3,
    av: { top: 0, corp: 0 }, lostB: 0, hhLeave: { low: 0, mid: 0, high: 0 }, evDist: false };
}
// before production: hiring, materials prices, review and install capacity
function ocPre(s, C, fx) {
  const O = s.oc || (s.oc = ocInit());
  const L = s.lab, ur = L.unemployed / L.lf;
  // agencies hire faster when pay rises and the labour market is slack; 3.5%/quarter ≈ the old 15%/yr growth
  O.hire *= 1 + 0.035 + (s.un.civ - 3) * 0.006 + (ur - U0()) * 0.25;
  // materials and subcontractor prices: about $70B of construction a year in the city (NYBC); the plan adds to it
  const phys = ['build', 'nycha', 'storage', 'solar', 'wind', 'eff', 'care', 'cuny', 'water', 'waste', 'coast', 'cool', 'transit'].reduce((a, k) => a + (C[k] || 0), 0);
  const vol = phys / OC0.base;
  const matT = 1 + ocA(s, 'matElast') * vol;
  O.mat += (matT - O.mat) * 0.25;
  // plan review: DOB took 25.4 days from filing to approval in FY2026, up from 20.3 with only 5% more filings (MMR 2026)
  O.revCap = ocA(s, 'privPermits') / 4 * ocA(s, 'reviewCap') * Math.pow(O.hire / Math.pow(1.035, s.t + 1), 0.5) * (1 + (L.plannersTrained || 0) / 20000);
  // installers for batteries, rooftop solar and retrofits; energy-trades graduates add about 0.1 MW a year each
  O.instCap = (ocA(s, 'installCap') + O.elecTrained * 0.1) / 4;
  return O;
}
// public homes leave land-use approval, then wait for plan review and permits; waits grow fast as filings pile up
function ocReview(s, H, released, privStart, lag) {
  const O = s.oc, pub = released.reduce((a, x) => a + x.n, 0), retro = ((s.plan.cap.eff || 0) + (s.plan.cap.solar || 0)) * 250;
  const load = (privStart + pub + retro) / Math.max(1, O.revCap);
  O.revDays = Math.min(400, 25.4 * Math.pow(Math.max(0.6, load), 3));
  O.revLoad = load;
  const dq = Math.round(Math.max(0, O.revDays - 25.4) / 91);
  O.revWait = dq; O.revBack = dq > 0 ? pub : 0;
  released.forEach(x => H.pipePub.push({ q: s.t + lag + dq, n: x.n, split: x.split }));
}
// batteries, solar and retrofits are paid for, then wait for installers
function ocInstall(s, E, done) {
  const O = s.oc; done.forEach(x => O.instQ.push({ k: x.k, mw: x.mw }));
  let cap = O.instCap;
  while (cap > 0 && O.instQ.length) { const x = O.instQ[0]; const m = Math.min(x.mw, cap); E[x.k] += m; x.mw -= m; cap -= m; if (x.mw <= 0.01) O.instQ.shift(); }
  O.instWait = O.instQ.reduce((a, x) => a + x.mw, 0);
}
// after the quarter: who moves, what landlords and taxpayers do
function ocPost(s, ctx) {
  const O = s.oc; if (!O) return; const { TC, H, ev, rep, R, sandbox } = ctx;
  // 1. households: net yearly gain or loss from your laws, plan and taxes, as % of their resources
  // expectations: a tax package waiting in Albany already counts half, because people move before rates change
  let dist = distribution(s);
  if (s.taxPending && s.taxPending.tx) { const dE = distribution(Object.assign({}, s, { tax: s.taxPending.tx })); dist = dist.map((g, i) => Object.assign({}, g, { netPct: 0.5 * g.netPct + 0.5 * dE[i].netPct })); }
  let units = 0;
  const audit = s.d ? s.d.audit || 0 : 0;
  dist.forEach((g, i) => {
    const m = MIG_M[i] * ocA(s, 'migNet');
    const rate = (g.netPct < 0 ? -g.netPct * m : -g.netPct * m * 0.7) / 100; // + = extra leaving, per year
    O.migG[i] = rate;
    const n = GROUPS[i].units * O.u[i] * rate / 4;
    O.u[i] = Math.max(0.5, O.u[i] * (1 - rate / 4));
    units += n;
    if (n > 0) O.commAdd += n * 0.8 * ocA(s, 'stayWork');
  });
  O.leftUnits += units;
  O.flowQ = -units * PERS_UNIT;
  O.migYr = O.flowQ * 4;
  const avg = (a, b) => O.migG.slice(a, b).reduce((x, y) => x + y, 0) / (b - a);
  O.hhLeave = { low: Math.max(0, avg(0, 4)) / 4, mid: Math.max(0, avg(4, 9)) / 4, high: Math.max(0, avg(9, 11)) / 4 };
  // 2. rent-controlled buildings: costs (RGB price index 5.3% in 2026) against allowed rent increases
  const pol = s.pol.housing, infl = ((s.fin && s.fin.inflation) || 0) * 100;
  const allowed = pol === 'h1' ? 0 : pol === 'h2' ? 3 : 3.0;
  const taxPush = (s.tax.prop[1] / TAX0.prop[1] - 1) * 28.8 / 4;
  O.gap = OC0.pioc + infl + taxPush - allowed;
  const socialShare = Math.min(0.9, H.social / OC0.stab);
  O.distress = Math.max(0.03, Math.min(0.6, O.distress + 0.006 * O.gap / 4 - socialShare * 0.01 - (O.distress - OC0.distress) * 0.01));
  O.maintAdj = -(O.distress - OC0.distress) * 1.2;
  O.acqMul = Math.max(0.6, 1 - (O.distress - OC0.distress) * 1.5);
  const v2T = 1 - 0.6 * (O.distress - OC0.distress) - (pol === 'h2' ? 0.06 : 0) - (pol === 'h4' ? 0.15 : 0);
  O.val2 += (v2T - O.val2) * 0.05; // class 2 assessments phase in over five years
  if (O.distress > 0.2) { const lost = OC0.stab * (O.distress - 0.2) * 0.004 * (1 - socialShare); O.abandoned += lost; H.units -= lost; H.shortage += lost;
    if (ev && !sandbox && !O.evDist) { O.evDist = true; rep.events.push({ k: 'bad', t: 'Landlords walk away from buildings', d: `About ${pct0(O.distress)} of rent-stabilized flats are now in buildings that lose money. Some owners stop paying their loans and let the buildings decay, as in the 1970s. Buying distressed buildings is cheaper now (about ${Math.round((1 - O.acqMul) * 100)}% below normal prices).` }); } }
  else if (O.distress > 0.16 && ev && !sandbox && R() < 0.08) rep.events.push({ k: 'warn', t: 'Foreclosures on rent-stabilized portfolios', d: `Lenders move to foreclose on a large portfolio of rent-stabilized buildings. Costs are rising ${O.gap.toFixed(1)} points a year faster than allowed rents. Tenants report repairs going undone.` });
  // 3. controlled flats taken off the market: kept empty, merged, sold to owner-occupiers
  const whOf = p => { const al = p === 'h1' ? 0 : 3.0, gp = OC0.pioc + infl + taxPush - al; return (p === 'h2' ? 2200000 : OC0.stab) * (0.006 * Math.max(0, gp - 2.3) + (p === 'h2' ? 0.04 : 0)); };
  // expectations: owners start emptying and selling flats as soon as a stricter rent law is sent to Albany
  const pendH = s.pending && s.pending.housing, whBase = whOf(pol), whExp = pendH ? 0.5 * whBase + 0.5 * whOf(pendH) : whBase;
  O.antWh = pendH ? Math.max(0, whExp - whBase) : 0;
  const whT = OC0.wh0 + whExp * ocA(s, 'convert') * (1 - 0.4 * audit) * (1 - socialShare * 0.5);
  const dW = (whT - O.wh) * 0.06; O.wh += dW; H.units -= dW; H.shortage += dW; O.whExtra = O.wh - OC0.wh0;
  // 4. tax avoidance grows for about two years after a rise, then levels off
  const g = GROUPS[10], inc = gIncome(s, g, 10);
  const tx = s.taxPending && s.taxPending.tx ? { pit: s.tax.pit.map((v, i) => (v + s.taxPending.tx.pit[i]) / 2), mill: (s.tax.mill + s.taxPending.tx.mill) / 2, corp: (s.tax.corp + s.taxPending.tx.corp) / 2, ubt: (s.tax.ubt + s.taxPending.tx.ubt) / 2 } : s.tax;
  const rTop = pitUnit(inc, tx) / Math.max(1, pitUnit(inc, TAX0)), rCorp = (tx.corp / TAX0.corp + tx.ubt / TAX0.ubt) / 2;
  const k = ocA(s, 'avoidLR') * (1 - 0.3 * audit);
  O.av.top += (0.11 * k * Math.log(Math.max(1, rTop)) - O.av.top) * 0.12;
  O.av.corp += (0.10 * k * Math.log(Math.max(1, rCorp)) - O.av.corp) * 0.12;
  O.lostB = O.av.top / (1 - O.av.top) * (TC.pitTop || 0) + O.av.corp / (1 - O.av.corp) * ((TC.parts['Business corporation tax'] || 0) + (TC.parts['Unincorporated business tax'] || 0));
}
function pct0(x) { return Math.round(x * 100) + '%'; }

// ===== MODEL AUDIT: do overlapping channels count the same thing twice? =====
// Each check runs the model with a channel switched off and compares the combined effect with outside evidence.
function auditChecks() {
  const run = (setup, A, n) => { const s = newGame({ seed: 11 }); s.mode = 'sandbox'; if (A) Object.assign(s.A, A); if (setup) setup(s); for (let i = 0; i < n; i++) step(s, { events: false }); return s; };
  const out = [];
  // 1. top earners: four channels (reported income, growing avoidance, moving away, law-driven flight)
  { const off = { eTop: 0, avoidLR: 0, migNet: 0 }, tax = s => { s.tax.mill = 3; };
    const er = n => { const gm = run(tax, off, n).taxNow.total - run(null, off, n).taxNow.total, gr = run(tax, null, n).taxNow.total - run(null, null, n).taxNow.total; return 1 - gr / gm; };
    const e1 = er(4), e2 = er(8);
    out.push({ t: 'Top earners: how much of a tax rise is lost', model: `${Math.round(e1 * 100)}% after one year, ${Math.round(e2 * 100)}% after two`, ev: '45% after one year, 61% after two (California 2012)', ok: e1 > 0.35 && e1 < 0.6 && e2 > 0.45 && e2 < 0.7, note: 'Reported income, growing avoidance and moving away together. No double counting found: the sum of the channels on their own is close to the combined effect.', src: 'rauhShyu' }); }
  // 2. baseline migration against 2025
  { const s = run(null, null, 4); const pop0 = 8585000, nat = pop0 * (0.0119 - 0.0074), dom = s.pop - pop0 - nat;
    out.push({ t: 'Moves in and out with no policy change', model: `${dom < 0 ? '−' : '+'}${Math.round(Math.abs(dom) / 1000)}k a year net`, ev: 'about −48k in 2025 (−114k to the rest of the US, +66k from abroad)', ok: dom < -20000 && dom > -80000, note: 'The model does not split domestic and international moves.', src: 'cbcMig' }); }
  // 3. policy-driven moves: the support channel overlapped with the new net-gain channel
  { const plan = s => { s.pol.transit = 't2'; s.plan.cap.care = 6; s.pol.health = 'm1'; };
    const all = run(plan, null, 20).pop - run(null, null, 20).pop, noNet = run(plan, { migNet: 0 }, 20).pop - run(null, { migNet: 0 }, 20).pop;
    out.push({ t: 'Free transit, child care and clinics: who moves in', model: `+${Math.round(all / 1000)}k people over five years, ${Math.round((1 - noNet / Math.max(1, all)) * 100)}% through the net-gain channel`, ev: 'no direct evidence found', ok: null, note: 'Fixed: popularity and net gain both pulled people in for the same reason; the popularity channel now counts half as much. The size of the net-gain channel is our assumption; treat the result as an upper estimate.', src: null }); }
  // 4. rent control and supply
  { const b = run(null, null, 20), h = run(s => { s.pol.housing = 'h2'; }, null, 20); const lost = (h.oc.whExtra + h.oc.abandoned) / 2200000;
    out.push({ t: 'Universal rent control: flats taken off the market', model: `${(lost * 100).toFixed(1)}% of controlled flats in five years`, ev: '15% of covered rental supply in the long run (San Francisco; conversion was easier there)', ok: lost < 0.1, note: 'Fewer new private buildings come on top, through a separate, smaller channel.', src: 'dmq' }); }
  // 5. buildings falling into disrepair vs owners walking away
  { const f = run(s => { s.pol.housing = 'h1'; }, null, 20); const decay = f.h.stabCond < 50;
    out.push({ t: 'Rent freeze: poor upkeep and abandonment', model: decay ? 'both channels active' : `upkeep-related losses ${decay ? 'on' : 'not yet triggered'}; ${Math.round(f.oc.abandoned).toLocaleString('en-US')} flats abandoned`, ev: 'should not both count the same buildings', ok: !decay, note: 'Within five years the two do not overlap. Over a longer run they would, and would need a rule to share out the lost flats.', src: null }); }
  // 6. business taxes: reported profits, growing avoidance, firms closing or leaving
  { const off = { eCorp: 0, avoidLR: 0 }, tax = s => { s.tax.corp = 11.85; };
    const gm = run(tax, off, 8).taxNow.total - run(null, off, 8).taxNow.total, gr = run(tax, null, 8).taxNow.total - run(null, null, 8).taxNow.total;
    out.push({ t: 'Business taxes: how much of a rise is lost', model: `${Math.round((1 - gr / gm) * 100)}% after two years`, ev: 'no New York estimate found', ok: null, note: 'Three channels: reported profits, growing avoidance, firms closing or leaving. Not checked against evidence yet.', src: null }); }
  return out;
}

// ===== CORE: simulate one quarter =====
function step(s, o = {}) {
  const R = rng(s.seed + s.t * 7919);
  const ev = o.events !== false;
  for (const k in ASSUME) if (s.A[k] == null) s.A[k] = ASSUME[k].v;
  const A = s.A;
  if (s.decision) applyDecision(s, s.decision.id, 'r3');
  const rep = { t: s.t, label: qLabel(s), events: [], notes: [] };
  const { fx, flags } = fxAll(s);
  const P = s.plan;
  const sandbox = s.mode === 'sandbox';
  roadStep(s, fx, rep, ev && s.mode !== 'sandbox', R);
  sitesStep(s, rep, ev, R);
  const seaExp = seaStep(s);
  const C = (s.b.fcb && !sandbox) ? Object.fromEntries(Object.keys(P.cap).map(k => [k, 0])) : P.cap;

  // --- Albany & courts ---
  // Albany is in session January–June; the State budget is due April 1, so most deals land in Q2.
  const sess = sandbox ? 1 : s.q === 1 ? 0.6 : s.q === 2 ? 1.5 : 0;
  s.pendAge = s.pendAge || {};
  for (const lawId in s.pending) {
    const optId = s.pending[lawId]; s.pendAge[lawId] = (s.pendAge[lawId] || 0) + 1;
    const chance = sandbox ? 1 : Math.max(0, sess * (A.albany + (s.support - 50) / 200));
    const ok = ev ? R() < chance : (sandbox || (s.q === 2 && chance >= 0.15 && s.pendAge[lawId] >= 1));
    if (ok) { s.pol[lawId] = optId; delete s.pending[lawId]; delete s.pendAge[lawId]; rep.events.push({ k: 'good', t: 'Albany approves', d: `The State Legislature passed the enabling law for "${optName(lawId, optId)}". It takes effect this quarter.` }); }
  }
  if (s.taxPending) {
    const tp = s.taxPending; tp.age = (tp.age || 0) + 1;
    const hard = tp.tx.commuter > s.tax.commuter ? 0.4 : 1;
    const chance = sandbox ? 1 : Math.max(0, sess * (A.albany + (s.support - 50) / 200) * hard * 1.2);
    const ok = ev ? R() < chance : (sandbox || (s.q === 2 && chance >= 0.12));
    if (ok) {
      const full = sandbox || !ev || R() < 0.6;
      const nt = JSON.parse(JSON.stringify(s.tax));
      TAXDEF.filter(d => d.who === 'albany').forEach(d => { const cur = d.i != null ? s.tax[d.g][d.i] : s.tax[d.g]; const want = d.i != null ? tp.tx[d.g][d.i] : tp.tx[d.g]; const v = full ? want : (d.g === 'pat' ? want : cur + (want - cur) / 2); if (d.i != null) nt[d.g][d.i] = v; else nt[d.g] = v; });
      s.tax = nt; s.taxPending = null;
      rep.events.push({ k: full ? 'good' : 'warn', t: full ? 'Albany passes your tax package' : 'Albany passes a watered-down tax package', d: full ? 'The State budget includes the city tax changes you asked for. They apply from this quarter.' : 'Legislators met you halfway: each requested rate change was cut in half.' });
    } else if (ev && s.q === 2 && R() < 0.35) { s.taxPending = null; rep.events.push({ k: 'bad', t: 'Albany rejects your tax package', d: 'The State budget passed without your tax request. You can send it again next session (January).' }); }
  }
  LAWS.forEach(l => { const o2 = optOf(s, l.id); s.active[o2.id] = (s.active[o2.id] || 0) + 1; });
  s.legal = Math.max(0, s.legal * 0.85 + fx.legal);
  if (!sandbox && ev && !s.lost) {
    let worst = null; LAWS.forEach(l => { const o2 = optOf(s, l.id); const lg = (o2.fx || {}).legal || 0; if (lg > 0 && (!worst || lg > worst.lg)) worst = { l, o2, lg }; });
    if (worst && s.active[worst.o2.id] > 1 && R() < worst.lg / 30 + s.legal / 400) {
      s.pol[worst.l.id] = worst.l.opts[0].id;
      rep.events.push({ k: 'bad', t: 'Court strikes down a law', d: `A federal or State court enjoined "${worst.o2.name}". The policy reverts to "${worst.l.opts[0].name}". Money already spent is lost.` });
      s.support -= 2; s.ec.climate -= 1;
    }
  }

  // --- planning information quality ---
  const meth = optOf(s, 'method');
  s.methodQ = s.pol.method === s._lastMethod ? s.methodQ + 1 : 1; s._lastMethod = s.pol.method;
  let infoT = fx.info;
  if (meth.fx.infoRamp) infoT = 0.5 + (fx.info - 0.5) * Math.min(1, s.methodQ / meth.fx.infoRamp);
  infoT += Math.min(0.08, (s.lab.plannersTrained || 0) / 40000);
  s.info = s.info + (infoT - s.info) * 0.4;
  const noise = (1 - s.info) * 0.25 * fx.noise;
  const exec = () => ev ? 1 + (R() * 2 - 1) * noise : 1;
  const F0 = s.fin;
  const OC = ocPre(s, C, fx);
  const lawLoad = LAWS.filter(l => s.pol[l.id] !== l.opts[0].id).length * 0.5;
  const load = Object.keys(C).reduce((a, k) => a + C[k], 0) + Math.max(0, fx.op) + lawLoad;
  s.adminCap = A.adminCap * OC.hire + (s.lab.plannersTrained || 0) / 1000;
  const capF = load > s.adminCap ? Math.pow(s.adminCap / load, 0.35) : 1;
  s.capUse = load / s.adminCap * 100;
  if (capF < 0.97) rep.notes.push(`Agencies are overloaded: the plan asks them to run $${load.toFixed(1)}B/yr of new work, about ${Math.round(s.capUse)}% of what they can absorb. Projects slip and waste rises. Train planners or phase the plan in.`);
  const DP = deepPre(s, fx, P, rep, ev, R);
  fx.costMult *= DP.costMul;
  const eff = DP.effMul * (0.72 + 0.28 * s.info) * capF * (F0.wtr > 0 ? 0.95 : 1) / Math.pow(s.cx && s.cx.pr ? s.cx.pr.ovr / 1.06 : (A.overrun > 0 ? A.overrun : 1), 0.5);
  const effK = eff / OC.mat;
  if (F0.wtr > 0) F0.wtr--;

  // --- demography (age groups) ---
  const G = s.age;
  const births = s.pop * 0.0119 / 4, deaths = s.pop * 0.0074 / 4;
  const a04 = G.k04 / 20, a517 = G.k517 / 52, a1864 = G.a1864 / 240;
  G.k04 += births - a04; G.k517 += a04 - a517; G.a1864 += a517 - a1864 - deaths * 0.25; G.s65 += a1864 - deaths * 0.75;

  // --- labor & training ---
  const L = s.lab;
  let trainCost = 0;
  const capSeats = trainCap(s, fx); let asked = 0; TRAIN.forEach(tp => { if (!tp.short) asked += P.train[tp.id]; });
  const scale = asked > capSeats ? capSeats / asked : 1; s.trainScale = scale;
  if (scale < 1) rep.notes.push(`Training: you asked for ${Math.round(asked).toLocaleString('en-US')} seats a year but CUNY and the colleges can only run ${Math.round(capSeats).toLocaleString('en-US')}. Invest in CUNY capacity or make CUNY tuition-free.`);
  TRAIN.forEach(tp => { const n = P.train[tp.id] / 4 * (tp.short ? 1 : scale); if (n > 0) { L.trainees.push({ due: s.t + tp.qtrs, n, to: tp.to, id: tp.id }); trainCost += n * tp.cost / 1e9; } });
  L.trainees = L.trainees.filter(x => {
    if (x.due <= s.t) {
      const n = x.n * (0.8 + 0.2 * s.info);
      L.sectors[x.to] += n;
      const u = Math.min(L.unemployed * 0.4, n * 0.6); L.unemployed -= u;
      const rest = n - u; L.sectors.retail -= rest * 0.5; L.sectors.leis -= rest * 0.5;
      if (x.id === 'elec') OC.elecTrained += n;
      if (x.id === 'plan') L.plannersTrained = (L.plannersTrained || 0) + n;
      if (x.id === 'teach') s.ed.teacherGap = Math.max(-5000, s.ed.teacherGap - n);
      if (x.id === 'ece') s.cc.educators = (s.cc.educators || 0) + n;
      if (x.id === 'aide') s.el.aides = Math.max(s.el.aides, Math.min(s.el.aides + n, (s.el.need || s.age.s65 * s.A.aideRatio) * 1.05));
      return false;
    }
    return true;
  });
  const climT = 100 + fx.climate * 8 * A.climateResp - (s.legal > 10 ? (s.legal - 10) * 1.5 : 0);
  s.ec.climate = Math.max(10, Math.min(115, s.ec.climate + (climT - s.ec.climate) * 0.15));
  const flightQ = fx.flight * A.flight / 100 + (s.ec.climate - 100) / 4000;
  s.ec.top = Math.max(15, s.ec.top * (1 + flightQ) + (100 - s.ec.top) * (fx.flight === 0 ? 0.01 : 0));
  const finDrift = (s.ec.top - 100) / 100 * 0.08 + (s.ec.climate - 100) / 100 * 0.04;
  ['fin', 'info', 'prof'].forEach(k => { const target = SECTORS.find(x => x.id === k).jobs * 1000 * (1 + finDrift * (k === 'fin' ? 3 : 1.5)); L.sectors[k] += (target - L.sectors[k]) * 0.15; });
  if (flags.nationalize) { L.sectors.fin *= 0.97; }
  // child care seats → parents join the labor force
  const CC = s.cc;
  if (C.care > 0) { const n = C.care / 4 * 1e9 / A.seatCost * effK * exec(); CC.pipe.push({ q: s.t + 4 + fx.lag, n }); }
  CC.pipe = CC.pipe.filter(x => { if (x.q <= s.t + 1) { CC.newSeats += x.n; CC.seats += x.n; return false; } return true; });
  const cNeed = careNeed(s, flags);
  const eduNeed = CC.newSeats / 7, eduHave = (CC.educators || 0) + 2000; // existing slack ≈ 2,000 educators (assumption)
  const staffed = Math.min(1, eduHave / Math.max(1, eduNeed));
  const usable = CC.seats - CC.newSeats * (1 - staffed);
  CC.coverage = Math.min(1, usable / cNeed); CC.need = cNeed; CC.usable = usable;
  if (staffed < 0.95) rep.notes.push(`Child care: ${Math.round((1 - staffed) * CC.newSeats).toLocaleString('en-US')} new seats sit empty for lack of educators. Train early childhood educators.`);
  const lfpT = Math.max(0, usable - 156500) * 0.5 / s.age.a1864 * 100; // pts of participation
  L.lfpBoost += (lfpT - L.lfpBoost) * 0.25;
  const lfNow = s.age.a1864 * 0.7996 * (1 + L.lfpBoost / 80);
  const newEntrants = lfNow - L.lf; L.lf = lfNow; L.unemployed += newEntrants * 0.35; L.sectors.health += newEntrants * 0.2; L.sectors.other += newEntrants * 0.45;
  L.sectors.health *= 1.0025;
  const uTarget = L.lf * (U0() + (100 - s.ec.climate) * 0.0006 + Math.max(0, 1 - L.sectors.fin / 514310) * 0.05 + (s.fin.recession > 0 ? 0.02 : 0));
  L.unemployed += (uTarget - L.unemployed - L.jg) * 0.15;
  L.unemployed = Math.max(L.lf * 0.025, L.unemployed);
  if (flags.jg) { const fr = L.lf * 0.03; const hire = Math.max(0, L.unemployed - fr); L.jg += hire; L.unemployed -= hire; L.jg = Math.max(0, L.jg - Math.max(0, L.lf * 0.03 - L.unemployed)); }
  else if (L.jg > 0) { L.unemployed += L.jg * 0.6; L.jg = 0; }
  const jgCost = L.jg * A.jgCost / 1e9;
  L.morale = Math.max(0.75, Math.min(1.08, L.morale + fx.morale - (s.f.shortage > 0.03 ? 0.004 : 0) - (s.e.blackout ? 0.003 : 0) + (1 - L.morale) * 0.05));
  const unempRate = L.unemployed / L.lf;

  // --- housing ---
  const H = s.h;
  H.cost = A.unitCost * H.costIdx * fx.costMult * OC.mat;
  const resWorkers = 0.45 * L.sectors.constr + L.jg * 0.15;
  const inPipe = H.pipePriv.reduce((a, x) => a + x.n, 0) + H.pipePub.reduce((a, x) => a + x.n, 0);
  const room = Math.max(0, resWorkers / A.workersPerUnit - inPipe);
  let privStart = A.privPermits / 4 * fx.privBuild * Math.pow(s.ec.climate / 100, 1.5) * (1 + Math.max(0, (2 - H.vacancy)) * 0.05);
  const SB = sitesBuild(s, C.build / 4 * eff * 1e9, H.cost, OC.mat);
  let pubStart = SB.homes * exec();
  const buildUse = s.ld.useShare;
  if (C.build > 0 && buildUse < 0.95) rep.notes.push(`Land: ${Math.round((1 - buildUse) * 100)}% of the public building budget has no approved site and is not spent. Propose sites under Plan & balances → Where to build.`);
  const DD = s.d; const hung = 1 + DD.hunger * DD.peWeight;
  const totalStart = privStart + pubStart * hung;
  if (totalStart > room) {
    const over = totalStart / Math.max(1, room);
    H.costIdx *= 1 + Math.min(0.03, (over - 1) * 0.01);
    const k = room / totalStart; privStart *= k; const want = pubStart; pubStart *= k; DD.stalled += want - pubStart;
    rep.notes.push(`Construction capacity is the bottleneck: not enough trained workers for all planned starts. ${Math.round(DD.stalled).toLocaleString('en-US')} public homes are paid for but stalled. Costs are rising.`);
  } else {
    H.costIdx *= 1.006;
    if (DD.stalled > 0) { const rel = Math.min(DD.stalled, (room - totalStart) / hung); pubStart += rel; DD.stalled -= rel; }
  }
  DD.stalledB = DD.stalled * A.unitCost * H.costIdx / 1e9;
  const lag = 8 + fx.lag;
  H.pipePriv.push({ q: s.t + lag, n: privStart });
  // expectations: when a law that would cut private building is waiting in Albany, developers file early so their projects
  // fall under the old rules. Calibrated on 421-a: a 25% drop in viable starts brought ≈47,000 extra permits in 2022.
  { const EX = s.ex || (s.ex = { pend: {}, opt: {}, repay: 0, rushQ: 0, rushTot: 0, repaid: 0 }); EX.rushQ = 0;
    for (const lawId in s.pending) { const law = LAWS.find(l => l.id === lawId); const o = law.opts.find(x => x.id === s.pending[lawId]), cur = optOf(s, lawId);
      const f1 = (o.fx || {}).privBuild ?? 1, f0 = (cur.fx || {}).privBuild ?? 1, drop = Math.max(0, (f0 - f1) / f0), age = s.pendAge[lawId] || 0;
      if (drop > 0 && age <= 2) { const tot = Math.min(A.privPermits * 3, A.privPermits * 8.5 * drop) * Math.pow(s.ec.climate / 100, 1.5), part = tot / 2;
        EX.pend[lawId] = (EX.pend[lawId] || 0) + part; EX.opt[lawId] = o.id; EX.rushQ += part; EX.rushTot += part;
        H.pipePriv.push({ q: s.t + lag + 2, n: part });
        if (age <= 1 && ev && !sandbox) rep.events.push({ k: 'warn', t: 'Developers rush to file', d: `With "${o.name}" waiting in Albany, developers file plans for about ${Math.round(part).toLocaleString('en-US')} homes this quarter to get in under the old rules, as they did before 421-a ran out in 2022.` }); } }
    for (const lawId in EX.pend) if (!s.pending[lawId]) { if (s.pol[lawId] !== EX.opt[lawId]) EX.repay += EX.pend[lawId]; delete EX.pend[lawId]; delete EX.opt[lawId]; }
    if (EX.repay > 1) { const r = Math.min(EX.repay, EX.repay / 4 + 1); EX.repay -= r; EX.repaid += r; H.pipePriv.push({ q: s.t + lag, n: -Math.min(r, privStart * 0.9) }); } }
  const wSum = s.bor.reduce((a, b) => a + b.w, 0) || 1;
  // public homes first pass land-use approval: fast-track review (≈90 days, 2025 Charter reform) plus ≈6 months pre-certification
  H.pipeAppr = H.pipeAppr || [];
  const sbT = Object.values(SB.byB).reduce((a, b) => a + b, 0) || 1;
  H.pipeAppr.push({ q: s.t + 1 + SB.lead + fx.lag, n: pubStart, split: s.bor.map(b => SB.homes > 0 ? SB.byB[b.id] / sbT : b.w / wSum) });
  const relA = []; H.pipeAppr = H.pipeAppr.filter(x => { if (x.q <= s.t) { relA.push(x); return false; } return true; });
  ocReview(s, H, relA, privStart, lag);
  let privDone = 0, pubDone = 0;
  H.pipePriv = H.pipePriv.filter(x => { if (x.q <= s.t + 1) { privDone += x.n; return false; } return true; });
  H.pipePub = H.pipePub.filter(x => { if (x.q <= s.t + 1) { pubDone += x.n; s.bor.forEach((b, i) => { b.pubUnits += x.n * x.split[i]; b.units += x.n * x.split[i]; }); return false; } return true; });
  s.bor.forEach(b => b.units += privDone * ({ BK: 0.33, QN: 0.24, MN: 0.18, BX: 0.2, SI: 0.05 }[b.id]));
  if (flags.acquire && C.acq > 0) { H.social += C.acq / 4 * 1e9 / (A.acqCost * OC.acqMul) * eff; }
  if (flags.seize) { H.social += 60000; }
  const nychaGap = (3.0 + C.nycha * effK - 3.9);
  H.nychaCond = Math.max(0, Math.min(100, H.nychaCond + nychaGap * 0.9));
  const nychaLost = H.nychaCond < 35 ? (35 - H.nychaCond) * 40 : 0;
  H.stabCond = Math.max(10, Math.min(90, H.stabCond + fx.maint + (H.social > 0 ? 0.05 : 0) + OC.maintAdj));
  const decay = 1200 + nychaLost + Math.max(0, 50 - H.stabCond) * 60;
  const netUnits = privDone + pubDone - decay;
  H.units += netUnits; H.done = privDone + pubDone; H.pubDone = pubDone;
  schoolStep(s, C, effK, pubDone, privDone);
  H.shortage = Math.max(0, H.shortage + s.popGrowth / 2.45 + A.hhForm / 4 - netUnits);
  H.vacancy = Math.max(0.4, Math.min(7, 1.41 + (400000 - H.shortage) / 60000));
  const rentG = 3.5 + (2 - H.vacancy) * 1.2 + fx.rentG - (H.social / H.units) * 6;
  H.rentIdx *= 1 + rentG / 400; H.rentG = rentG;
  H.rentPolicy = (H.rentPolicy || 0) + (-fx.rentG + (H.social / H.units) * 6) / 4;
  const ppT = 0.25 * A.passThrough * (s.tax.prop[1] / TAX0.prop[1] - 1);
  H.rentIdx *= (1 + ppT) / (1 + (H.propPass || 0)); H.rentPolicy -= (ppT - (H.propPass || 0)) * 100; H.propPass = ppT;
  const homelessUnits = pubDone * P.homeless / 100 + Math.min(H.social * 0.002, 2000);
  const inflow = 13000 * (1 + (rentG - 3) * 0.06) * (1 + (s.f.insec - 0.146)) + (s.migrants || 0) + ((s.js ? s.js.evict : 18000) - 18000) / 4 * 0.6;
  const outflow = 12600 + homelessUnits * 2.4 + (flags.acquire || flags.seize ? 300 : 0);
  H.shelter = Math.max(5000, H.shelter + (inflow - outflow) * exec() * 0.5);
  H.street = Math.max(300, H.street * (1 + (inflow - outflow) / 400000));
  s.migrants = 0;

  // --- food ---
  const F = s.f;
  const storesCap = fx.storesCap;
  let storeCost = 0;
  if (storesCap > 0) {
    const want = storesCap === 5 ? Math.max(0, 5 - F.stores - F.storePipe.length) : (C.stores / 4) * 1e9 / 30e6 * eff;
    const n = Math.floor(want + ((want % 1) > (ev ? R() : 0.5) ? 1 : 0));
    for (let i = 0; i < n; i++) { F.storePipe.push({ q: s.t + 6 + fx.lag, b: pickBorough(s, R) }); storeCost += 0.03; }
  }
  F.storePipe = F.storePipe.filter(x => { if (x.q <= s.t + 1) { F.stores++; s.bor.find(b => b.id === x.b).stores++; return false; } return true; });
  const storeOps = F.stores * 0.004;
  const covered = Math.min(0.9, F.stores * A.storeReach / s.pop);
  F.priv = Math.max(0.55, Math.min(1, F.priv + fx.privFood / 100 + (fx.privFood === 0 ? (1 - F.priv) * 0.3 : 0)));
  const pubFood = covered * 0.25;
  const supply = F.priv * (1 - pubFood * 0.2) + pubFood;
  F.shortage = Math.max(0, 1 - supply) * exec();
  F.black = Math.max(0, F.black * 0.8 + fx.black * 0.5 + F.shortage * 30);
  const povF = cityPov(s) / (s.k.pov0 || 18.2);
  let insT = 0.146 * povF * (1 + (H.rentIdx / 100 - 1) * 0.5) * (1 + fx.foodPrice) - covered * 0.146 * 0.35 + F.shortage * 0.8 + (s.snapCut || 0);
  if (flags.ration) insT = Math.min(insT, 0.03 + F.shortage * 0.5);
  F.insec = Math.max(0.01, F.insec + (insT - F.insec) * 0.35);

  // --- energy ---
  const E = s.e;
  const ec = fx.energyCost * (2 - eff) * OC.mat;
  ['storage', 'solar', 'wind', 'eff'].forEach(k => {
    const b = C[k] / 4; if (b <= 0) return;
    const per = { storage: A.storageCost, solar: 3.0e6, wind: A.windCost, eff: A.effCost }[k];
    const lagQ = { storage: 4, solar: 2, wind: 16, eff: 3 }[k];
    E.pipe.push({ q: s.t + lagQ + fx.lag, k, mw: b * 1e9 / (per * ec) * exec() });
  });
  const instDone = []; E.pipe = E.pipe.filter(x => { if (x.q <= s.t + 1) { if (x.k === 'wind') E[x.k] += x.mw; else instDone.push(x); return false; } return true; });
  ocInstall(s, E, instDone);
  if (s.pol.energy === 'e2') { if (E.conEdQ < 0) E.conEdQ = 0; E.conEdQ++; if (E.conEdQ === 8) { E.conEdOwned = true; rep.events.push({ k: 'good', t: 'Con Edison now public', d: 'Condemnation is complete. The city-owned utility no longer pays shareholder returns; rates fall about 10%.' }); } }
  else if (!E.conEdOwned) E.conEdQ = -1;
  E.peak += A.peakGrowth / 4;
  E.firm = 10984 + E.storage * 0.9 + E.solar * 0.25 + E.wind * 0.25 + E.eff;
  const heat = (s.q === 3 && ev && R() < 0.35) ? 1.04 : 1;
  if (heat > 1) rep.events.push({ k: 'warn', t: 'Heat wave', d: 'A heat wave pushes peak demand about 4% above normal.' });
  E.margin = E.firm - E.peak * heat;
  E.blackout = E.margin < -150 && s.q === 3 && (!ev || R() < 0.5);
  if (E.blackout && ev) rep.events.push({ k: 'bad', t: 'Rolling blackouts', d: `Supply fell ${Math.round(-E.margin)} MW short of peak demand. Con Edison cut power to parts of the city.` });
  E.gwh = 50000 * (s.pop / 8585000) - E.eff * 2.5;
  E.cleanShare = (E.solar * 1.15 + E.wind * 3.9) / E.gwh;
  // --- water & waste ---
  const W = s.wt;
  W.cond = Math.max(0, Math.min(100, W.cond + (C.water * effK * 1.6 - 0.25) / 4 * 4));
  W.breaks = 550 * (1 + (50 - W.cond) / 60);
  W.mgd = LV('city.water', 990) * (s.pop / 8585000) - E.eff * 0.01;
  W.bill *= 1 + (0.03 + C.water / 4.5 * 0.25) / 4;
  const WS = s.ws;
  WS.inv += C.waste / 4 * effK;
  WS.divert = Math.min(55, 18.8 + WS.inv * 6);
  WS.tons = 3.2 * (s.pop / 8585000) * (1 - (WS.divert - 18.8) / 100);
  const wasteSave = (3.2 - WS.tons) * 0.13; // $130 per ton exported (assumption), $B/yr
  E.ghg = emissions(s, fx, C, rep, ev, R, E, WS.divert);
  E.price *= 1 + (0.035 - (E.conEdOwned ? 0.1 / 4 * (E.conEdQ < 12 ? 1 : 0) : 0) - (fx.energyCost < 1 ? 0.004 : 0)) / 4;

  // --- transit, health, education, elder care, safety ---
  s.tr.rides += (1740 * (1 + fx.rides) - s.tr.rides) * 0.25;
  const healthNeed = 1028250 * 1.01 + fx.healthNeed;
  const healthGap = Math.max(0, healthNeed - L.sectors.health) / healthNeed;
  const EL = s.el; EL.aides *= 1 + 0.0025 + fx.aideGrow; EL.need = s.age.s65 * A.aideRatio; EL.ratio = EL.aides / EL.need;
  const bedGap = hospStep(s, C, effK, rep, ev && !sandbox, R);
  s.hl.life -= bedGap * 0.12 / 4;
  s.hl.life += (fx.life * (1 - healthGap * 5) + ((s.k.pov0 || 18.2) - cityPov(s)) * 0.004 - (F.insec - 0.146) * 0.3 - (H.shelter - 85600) / 85600 * 0.02 - (s.js ? (s.js.od / JS0.od - 1) * 0.08 + (s.js.viol - 1) * 0.04 : 0) + 0.03 - Math.max(0, 1 - EL.ratio) * 0.15) / 4 * exec();
  s.ed.enroll = 884600 * (s.age.k517 / 1250000) * (1 - s.t * 0.004);
  s.cu.capInv += C.cuny / 4 * effK;
  s.cu.enroll = 247000 * (fx.cunyCap ? 1.12 : 1) * Math.pow(1.01, s.t / 4);
  justice(s, fx, P, unempRate);

  // --- economy ---
  s.ec.gcp = calcGCP(s) * (s.d ? s.d.prodMul || 1 : 1);
  s.ec.exportsB = calcTrade(s).exp;
  s.ec.importsB = s.ec.imp0 * (s.pop / s.ec.pop0) * (1 - (E.cleanShare || 0) * 0.05);
  const povDelta = (unempRate - U0()) * 40 + (H.rentG - 3.5) * 0.15 - L.lfpBoost * 0.4 - (L.jg / L.lf) * 25;
  s.bor.forEach((b, i) => { const base = BOROUGHS[i].pov; b.pov += ((base + povDelta * (base / 18)) - b.pov) * 0.2; b.unemp = BOROUGHS[i].unemp * (unempRate / U0()); });

  // --- population ---
  const natural = births - deaths;
  const domestic = (OC.flowQ || 0) - s.pop * 0.0048 / 4 + (400000 - H.shortage) * 0.02 + (s.support - 50) * 60 - (100 - s.ec.top) * 150 - Math.max(0, unempRate - 0.05) * s.pop * 0.03 / 4 - (E.blackout ? 5000 : 0) - F.shortage * s.pop * 0.01 + (CC.coverage - 0.7) * 3000;
  s.popGrowth = natural + domestic;
  // migrants by age: families with children leave most
  G.k04 += domestic * 0.12; G.k517 += domestic * 0.25; G.a1864 += domestic * 0.5; G.s65 += domestic * 0.13;
  s.pop = G.k04 + G.k517 + G.a1864 + G.s65;
  const pr = s.pop / s.bor.reduce((a, b) => a + b.pop, 0); s.bor.forEach(b => b.pop *= pr);

  // --- budget ($B/yr) ---
  const B = s.b;
  const TC = taxCalc(s, s.tax); s.taxNow = TC;
  const aid = (21.2 + 10.6 * (1 - (s.fedCut || 0))) * Math.pow(1.02, s.t / 4);
  const enterprise = E.conEdOwned ? 1.2 : 0;
  B.revParts = Object.assign({}, TC.parts, { 'State & federal aid': aid, 'Other non-tax revenue': 4.1 * Math.pow(1.02, s.t / 4), 'Public enterprises': enterprise });
  { const infl = Math.max(0, (s.d.informal - 8) / 100); B.revParts['Sales tax'] *= 1 - infl * 0.8; B.revParts['Unincorporated business tax'] *= 1 - infl; B.revParts['Income tax (incl. PTET)'] *= 1 - infl * 0.3; }
  if (flags.nationalize) { B.revParts['Business corporation tax'] *= 0.5; B.revParts['Unincorporated business tax'] *= 0.5; }
  if (F0.recession > 0) { B.revParts['Income tax (incl. PTET)'] *= 0.9; B.revParts['Sales tax'] *= 0.95; B.revParts['Transfer tax'] *= 0.7; }
  B.rev = Object.values(B.revParts).reduce((a, b) => a + b, 0);
  const wage = 0.75 * s.un.civ + 0.25 * s.un.uni + DP.wageAdd;
  B.baseExp = B.baseExp || 125.8; const base = B.baseExp;
  B.baseExp *= Math.pow(1 + A.expGrowth + 0.48 * (wage - 3) / 100 + (F0.inflation || 0), 0.25);
  const shelterCost = (H.shelter - 85600) * 70000 / 1e9;
  const careOps = CC.newSeats * A.seatOp / 1e9 * (staffed);
  const prog = fx.op + jgCost + trainCost * 4 + storeOps + careOps - wasteSave;
  const capTotal = Object.keys(C).reduce((a, k) => a + (k === 'water' ? 0 : k === 'stores' ? 0 : k === 'acq' && !flags.acquire ? 0 : k === 'build' ? C[k] * buildUse : C[k]), 0) / 4 + (s.ld.investDue > 0 ? Math.min(s.ld.investDue, 0.25) : 0) + storeCost + (s.pol.energy === 'e2' && E.conEdQ === 1 ? 60 : 0) + (s.pol.method === 'p2' && s.methodQ === 1 ? 1.5 : 0);
  let bonds = capTotal * P.bond / 100; let payGo = capTotal - bonds;
  if (s.b.fcb && !sandbox && P.cap && Object.values(P.cap).some(v => v > 0)) rep.notes.push('Financial Control Board: new capital spending is frozen until the budget balances.');
  if (bonds > B.headroom && !sandbox) { payGo += bonds - B.headroom; bonds = B.headroom; rep.notes.push('Debt limit reached: the State constitution caps city borrowing. Capital beyond the limit is paid from the operating budget.'); }
  B.headroom = Math.max(0, B.headroom - bonds + (B.headroom < 40 ? 0.6 : 0));
  B.newDebt += bonds;
  F0.rate = A.bondRate + 0.0025 * F0.notch + F0.macro;
  B.debtService = (B.debtService || 0) + bonds * F0.rate;
  B.expParts = { 'Existing city services': base, 'New programs (laws, care, training)': prog, 'Shelter cost change': shelterCost, 'Pension contribution change': F0.pensionAdj, 'Debt service on plan bonds': B.debtService, 'Pay-as-you-go capital': payGo * 4, 'Storm damage repairs': s.clim.floodLoss || 0, 'Enterprise losses covered': s.d.subsidy, 'Statistics and audits': P.audit || 0, 'Police, prevention and jails (change)': s.js ? s.js.cost : 0, 'Stalled projects (carrying cost)': s.d.stalledB * 0.04, 'Class size: extra teachers': s.sc ? s.sc.cost : 0 };
  if (s.ld.investDue > 0) s.ld.investDue = Math.max(0, s.ld.investDue - 0.25);
  s.clim.floodLoss = (s.clim.floodLoss || 0) * 0.5;
  const expRaw = Object.values(B.expParts).reduce((a, b) => a + b, 0);
  B.savings = Math.max(0, Math.min(4, expRaw - B.rev));
  if (B.savings > 0) B.expParts['Agency savings (service cuts)'] = -B.savings;
  // Rainy Day Fund ($2.0B) + Retiree Health Benefits Trust ($5.2B): one-time money, drawn after routine savings run out
  if (B.reserves === undefined) B.reserves = 7.2;
  const gap0 = expRaw - B.savings - B.rev; B.draw = 0;
  if (gap0 > 0 && B.reserves > 0) { B.draw = Math.min(gap0, B.reserves * 4); B.reserves -= B.draw / 4; B.expParts['Drawn from reserves (one-time)'] = -B.draw; }
  else if (gap0 < 0 && B.reserves < 7.2) { const dep = Math.min(-gap0, (7.2 - B.reserves) * 4); B.reserves += dep / 4; B.expParts['Deposit to Rainy Day Fund'] = dep; B.draw = -dep; }
  B.exp = expRaw - B.savings - B.draw;
  B.deficit = B.rev - B.exp;
  B.capTotal = capTotal * 4; B.bonds = bonds * 4;
  if (B.deficit < -0.1) B.streak++; else B.streak = 0;
  if (!sandbox && !B.fcb && B.streak >= 4) { B.fcb = true; rep.events.push({ k: 'bad', t: 'Financial Control Board takes over', d: 'Four straight quarters of operating deficits triggered a "control period" under the 1975 Financial Emergency Act. The State board now freezes new programs and capital starts until the budget balances.' }); s.support -= 6; }
  if (B.fcb && B.deficit >= 0 && B.draw <= 0 && B.savings < 2) { B.fcb = false; rep.events.push({ k: 'good', t: 'Control period ends', d: 'The budget is balanced again; the Financial Control Board returns to oversight only.' }); }

  // --- credit rating (GO bonds: Moody's Aa2, S&P AA, Fitch AA, KBRA AA+) ---
  const stress = (B.savings > 3 ? 1 : 0) + (B.draw > 1 ? 1 : 0) + (B.reserves < 2 ? 1 : 0) + (B.deficit < -0.5 ? 1 : 0) + (B.fcb ? 2 : 0) + (B.newDebt / B.rev > 0.5 ? 1 : 0);
  if (stress >= 2) { F0.badQ++; F0.goodQ = 0; } else if (stress === 0) { F0.goodQ++; F0.badQ = 0; } else { F0.badQ = Math.max(0, F0.badQ - 1); }
  if (F0.badQ === 2 && F0.outlook >= 0) { F0.outlook = -1; rep.events.push({ k: 'warn', t: 'Outlook cut to negative', d: 'Rating agencies warn that recurring spending is outpacing recurring revenue.' }); }
  if (F0.badQ >= 4) { F0.notch++; F0.badQ = 0; rep.events.push({ k: 'bad', t: 'Credit rating downgraded', d: `New York City's bonds lose a notch (now ${ratingName(F0.notch)}). Every new bond costs about 0.25 points more interest.` }); }
  if (F0.goodQ >= 12 && F0.notch > -1) { F0.notch--; F0.goodQ = 0; F0.outlook = 0; rep.events.push({ k: 'good', t: 'Credit rating upgraded', d: `Agencies reward two years of balanced budgets (now ${ratingName(F0.notch)}).` }); }
  // --- macro cycle, pensions ---
  if (F0.recession > 0) { F0.recession--; if (F0.recession === 0) rep.events.push({ k: 'good', t: 'Recession ends', d: 'Hiring and tax receipts recover.' }); }
  F0.macro *= 0.9; F0.inflation = (F0.inflation || 0) * 0.8;
  if (s.q === 3) { // fiscal year ends 30 June: pension returns known
    const ret = ev ? 0.07 + (R() * 2 - 1) * 0.12 : 0.07;
    const adj = -(ret - 0.07) / 0.06 * 1.26;
    F0.pensionAdj = F0.pensionAdj * 0.6 + adj * A.storm;
    if (ev && Math.abs(ret - 0.07) > 0.06) rep.events.push({ k: ret > 0.07 ? 'good' : 'bad', t: ret > 0.07 ? 'Strong pension returns' : 'Pension fund losses', d: `The five city pension funds (≈$326B) returned ${(ret * 100).toFixed(1)}% against a 7% target. Required city contributions ${ret > 0.07 ? 'fall' : 'rise'} by about $${Math.abs(adj).toFixed(1)}B a year, spread over five years.` });
  }
  // --- union contracts ---
  CONTRACTS.forEach(c => {
    if (s.un.done[c.id] || s.year !== c.at[0] || s.q !== c.at[1]) return;
    if (ev && !o.auto && !sandbox) { s.decision = { id: c.id, t: `Contract talks: ${c.name}`, d: c.desc, opts: RAISE_OPTS }; }
    else applyDecision(s, c.id, 'r3');
  });
  // --- Council adopts the budget each June ---
  if (s.q === 2 && !sandbox) {
    if (B.deficit < -0.5 && s.support < 45) { Object.keys(P.cap).forEach(k => P.cap[k] *= 0.8); rep.events.push({ k: 'warn', t: 'Council trims your budget', d: `The City Council adopted the budget only after cutting plan capital by 20% (support ${Math.round(s.support)}%, deficit $${(-B.deficit).toFixed(1)}B).` }); }
    else if (ev) rep.events.push({ k: 'good', t: 'Budget adopted', d: 'The Council adopted the city budget by the July 1 deadline.' });
  }
  // --- climate: heat and floods ---
  const CL = s.clim;
  CL.protect = Math.min(1, CL.protect + C.coast / 4 * effK / 15);
  CL.cool = Math.min(1, CL.cool + C.cool / 4 * effK / 2.5);
  CL.heat = 500 * Math.pow(1.01, s.t / 4) * (1 - CL.cool * 0.4) * (E.blackout ? 1.3 : 1) * (1 - (s.hl.life - 82.9) * 0.02);
  // --- region: firms and jobs moving to NJ, Long Island, Connecticut ---
  const finJobs = L.sectors.fin + L.sectors.info + L.sectors.prof;
  s.reg.moved = Math.max(0, (514310 + 215350 + 800660) - finJobs) * 0.6;
  s.reg.commuters = 1000000 * (finJobs / 1530320) * (1 - s.tax.commuter * 0.1);

  // --- support ---
  deepPost(s, { storeOps, transitB: C.transit || 0 }, rep, ev && !sandbox, R);
  const sat = 50 - s.d.supPen - (s.js ? s.js.supPen : 0) + fx.support * 1.2 - (H.rentG - 3.5) * 1.5 - (H.shortage - 400000) / 25000 - (F.insec - 0.146) * 80 - (unempRate - U0()) * 120 - F.shortage * 150 - F.black * 0.3 - (E.blackout ? 6 : 0) - (B.fcb ? 8 : 0) - B.savings * 0.8 + (s.tr.rides / 1740 - 1) * 20 + (s.hl.life - 82.9) * 4 + (L.jg > 0 ? 1 : 0) - (s.ec.top < 70 ? 3 : 0) + (CC.coverage - 0.7) * 10 - (W.breaks - 550) / 100 - (W.bill / 1224 - 1) * 5 - Math.max(0, 0.95 - EL.ratio) * 20;
  ocPost(s, { TC, H, ev: ev, rep, R, sandbox });
  const TB = taxCalc(s, TAX0); const tb = TC.pay.reduce((a, p, i) => a + (i < 10 ? (p - TB.pay[i]) * GROUPS[i].units : 0), 0) / (AGI0 * 0.63 * Math.pow(1.03, s.t / 4));
  const satT = sat - tb * 400 + (s.un.civ - 3) * 1.5 - (F0.recession > 0 ? 3 : 0) - (CL.heat - 500) / 100;
  s.support += (Math.max(5, Math.min(90, satT)) - s.support) * 0.25;
  s.bor.forEach((b, i) => { b.support = s.support + (BOROUGHS[i].pov - 18) * (fx.support > 2 ? 0.4 : -0.1) + (b.pubUnits / b.pop) * 400 + b.stores * 0.5; });

  // --- 2029 election (general election Tuesday 6 Nov 2029, inside Q4 2029) ---
  if (s.year === 2029 && s.q === 4 && !s.el2029) {
    const share = voteShare(s) + (ev && !sandbox ? (R() * 2 - 1) * 3 : 0);
    s.el2029 = { share, won: share >= 50 || sandbox };
    if (s.el2029.won) rep.events.push({ k: 'good', t: 'Re-elected in November 2029', d: `Your administration wins a second term with ${share.toFixed(1)}% of the vote (2025: 50.4%). The plan continues.` });
    else {
      s.lost = true;
      LAWS.forEach(l => s.pol[l.id] = l.opts[0].id); s.pending = {};
      Object.keys(P.cap).forEach(k => P.cap[k] *= 0.3); Object.keys(P.train).forEach(k => P.train[k] *= 0.5);
      rep.events.push({ k: 'bad', t: 'Voted out in November 2029', d: `You lose with ${share.toFixed(1)}% of the vote. The new mayor (in office 1 Jan 2030) repeals your laws and cuts plan investment by 70%. You can watch the consequences, or undo and try again.` });
    }
  }

  // --- random events ---
  let hurri = false;
  if (ev && !sandbox) {
    const r = R(); const sv = A.storm;
    if (r < 0.07) { s.ec.top *= 1 - 0.04 * sv; L.sectors.fin *= 1 - 0.015 * sv; rep.events.push({ k: 'bad', t: 'Wall Street downturn', d: 'Securities profits slump. Income tax receipts from top earners fall; finance trims jobs.' }); }
    else if (r < 0.12 && s.q >= 3) { H.costIdx *= 1 + 0.01 * sv; s.f.priv *= 1 - 0.03 * sv; W.cond -= 2 * sv; rep.events.push({ k: 'bad', t: 'Coastal storm', d: 'A tropical storm floods parts of the waterfront and strains sewers. About a third of the Hunts Point food market sits in the 100-year floodplain; supply is disrupted.' }); }
    else if (r < 0.18) { s.fedCut = Math.min(0.3, (s.fedCut || 0) + 0.08 * sv); s.snapCut = Math.min(0.03, (s.snapCut || 0) + 0.01 * sv); rep.events.push({ k: 'bad', t: 'Federal funding cut', d: 'Washington trims grants and shifts SNAP costs to states. Federal aid to the city drops about 8%.' }); }
    else if (r < 0.23) { s.migrants = 6000 * sv; rep.events.push({ k: 'warn', t: 'New arrivals', d: 'A new wave of asylum seekers arrives; the right-to-shelter consent decree requires the city to house them.' }); }
    else if (r < 0.27) { H.costIdx *= 1 + 0.015 * sv; rep.events.push({ k: 'warn', t: 'Tariffs raise material prices', d: 'Steel and lumber prices rise; construction costs up about 1.5%.' }); }
    else if (r < 0.31 && (fx.climate < -2 || L.morale < 0.95)) { L.morale -= 0.01; rep.events.push({ k: 'bad', t: 'Strike wave', d: 'Unions strike over conditions and pay; output dips this quarter.' }); }
    else if (r < 0.34 && s.q === 1) { W.cond -= 3 * sv; rep.events.push({ k: 'warn', t: 'Deep freeze', d: 'A cold snap cracks old cast-iron water mains across the city.' }); }
    else if (r < 0.36 && s.q >= 3) { hurri = true; const exp = (1 - s.clim.protect) * seaExp; const unins = s.fl ? 1 - s.fl.ins : 0.45; H.shelter += 3000 * exp * unins; s.clim.floodLoss = 10 * exp * sv; H.units -= 20000 * exp; H.shortage += 20000 * exp; s.f.priv *= 1 - 0.08 * exp; rep.events.push({ k: 'bad', t: 'Hurricane makes landfall', d: `A Sandy-class storm floods the coast. With ${Math.round(s.clim.protect * 100)}% of the waterfront protected, damage is about $${(10 * exp).toFixed(1)}B and ${Math.round(20000 * exp).toLocaleString('en-US')} homes are lost for now.` }); }
    else if (r < 0.40 && !F0.recession) { F0.recession = 5; s.ec.top *= 0.95; L.unemployed += L.lf * 0.02; rep.events.push({ k: 'bad', t: 'National recession', d: 'The US economy contracts. Income, sales and transfer tax receipts drop for about five quarters; unemployment rises.' }); }
    else if (r < 0.42) { F0.macro += 0.0075; F0.inflation = 0.01; rep.events.push({ k: 'warn', t: 'Interest rates and prices jump', d: 'Inflation picks up and the Fed raises rates. New city bonds cost more and contract prices rise.' }); }
  }
  try { cityStep(s, { C, E, H, fx, R, ev, rep, sandbox, capF, heatWave: heat > 1, hurricane: hurri }); } catch (e) { if (typeof console !== 'undefined') console.error('cityStep', e); }
  if ((s.snapCut || 0) > 0) s.snapCut *= 0.97;
  if ((s.fedCut || 0) > 0) s.fedCut *= 0.97;

  // --- advisor notes ---
  if (E.margin < 0) rep.notes.push(`Power: firm supply is ${Math.round(-E.margin)} MW below the summer peak. NYISO already flags a Zone J shortfall; storage or retrofits are the fastest fixes.`);
  if (H.shortage > 380000) rep.notes.push('Housing: the shortage is still near 400,000 homes. Starts take 8 quarters to finish, so build now for 2029.');
  if (B.streak >= 1 && B.streak < 4 && !B.fcb && !sandbox) rep.notes.push(`Warning: ${B.streak} deficit quarter${B.streak > 1 ? 's' : ''} in a row. At 4, the State Financial Control Board takes over. Raise revenue (property tax needs no Albany vote) or cut programs.`);
  if (B.deficit < -2) rep.notes.push(`Budget: operating deficit of $${(-B.deficit).toFixed(1)}B/yr. Four deficit quarters in a row trigger State control.`);
  if (F.shortage > 0.02) rep.notes.push(fx.privFood < 0 ? 'Food: private grocers are stocking less under price controls; queues are forming. Public stores or relaxed controls would help.' : `Food: supply is running ${(F.shortage * 100).toFixed(1)}% short of need after a disruption; it recovers over the next quarters.`);
  if (s.ec.top < 85) rep.notes.push('Tax base: top earners are leaving. They paid nearly half of city income tax, so this hits revenue directly.');
  if (s.info < 0.5) rep.notes.push('Planning: information quality is low, so results vary widely from targets. Train planners or change the method.');
  if (EL.ratio < 0.93) rep.notes.push(`Elder care: ${Math.round(EL.need - EL.aides).toLocaleString('en-US')} home-care aides short as the 65+ population grows. Short courses take one quarter.`);
  if (s.year === 2029 && s.q <= 3 && !s.el2029) rep.notes.push(`Election in November 2029: projected vote share ${voteShare(s).toFixed(1)}%. Below 50% you lose office.`);

  s.t++; s.q++; if (s.q > 4) { s.q = 1; s.year++; }
  s.lastReport = rep; if (s.log) { s.log.unshift(rep); if (s.log.length > 40) s.log.pop(); }
  record(s);
  return rep;
}

function pickBorough(s, R) {
  let best = null, bs = -1;
  s.bor.forEach(b => { const sc = (b.pov * b.pop / 1e5) * b.w / (1 + b.stores) * (0.8 + R() * 0.4); if (sc > bs) { bs = sc; best = b.id; } });
  return best;
}
function cityPov(s) { const p = s.bor.reduce((a, b) => a + b.pop, 0); return s.bor.reduce((a, b) => a + b.pov * b.pop, 0) / p; }
function optName(lawId, optId) { return LAWS.find(l => l.id === lawId).opts.find(o => o.id === optId).name; }
function qLabel(s) { return `Q${s.q} ${s.year}`; }

function snapshotKPIs(s) {
  return {
    t: s.t, label: qLabel(s), pop: s.pop, shortage: s.h.shortage, vacancy: s.h.vacancy, rent: s.h.rentIdx, shelter: s.h.shelter, street: s.h.street,
    done: s.h.done * 4, pubDone: s.h.pubDone * 4, nycha: s.h.nychaCond, social: s.h.social,
    insec: s.f.insec * 100, stores: s.f.stores, foodShort: s.f.shortage * 100, black: s.f.black,
    margin: s.e.margin ?? (s.e.firm - s.e.peak), peak: s.e.peak, firm: s.e.firm, ghg: s.e.ghg, clean: (s.e.cleanShare || 0) * 100, price: s.e.price,
    unemp: s.lab.unemployed / s.lab.lf * 100, jg: s.lab.jg, gcp: s.ec.gcp, top: s.ec.top, climate: s.ec.climate, exports: s.ec.exportsB, imports: s.ec.importsB,
    rev: s.b.rev, exp: s.b.exp, deficit: s.b.deficit, debt: s.b.newDebt, life: s.hl.life, support: s.support, info: s.info * 100, legal: s.legal, rides: s.tr.rides,
    pov: cityPov(s), teacherGap: s.ed.teacherGap, constr: s.lab.sectors.constr, health: s.lab.sectors.health,
    care: (s.cc.coverage ?? Math.min(1, s.cc.seats / (s.age.k04 * s.A.careTake))) * 100, seats: s.cc.seats, k04: s.age.k04, k517: s.age.k517, a1864: s.age.a1864, s65: s.age.s65,
    enroll: s.ed.enroll, aides: (s.el.ratio ?? s.el.aides / (s.age.s65 * s.A.aideRatio)) * 100, breaks: s.wt.breaks, bill: s.wt.bill, divert: s.ws.divert, shoot: s.sf.shoot, dispYr: s.cx ? s.cx.dispYr || 0 : 0, biz: s.cx ? s.cx.biz.n : 200000, bizOpen: s.cx ? s.cx.biz.open : 4950, bizClose: s.cx ? s.cx.biz.close : 5200, bizMoved: s.cx ? s.cx.biz.moved : 400, peakW: s.cx && s.cx.gr ? s.cx.gr.peakW : 7600, marginW: s.cx && s.cx.gr ? s.cx.gr.marginW : 3000, subMax: s.cx ? Math.max(...s.cx.net.map(n => n.load)) : 112, projLate3: s.cx ? s.cx.pr.late3 * 100 : 48.4, ovr: s.cx ? (s.cx.pr.ovr - 1) * 100 : 18, heatYr: s.cx ? s.cx.hz.heatYr : 0, felony: s.js.felony, murder: s.js.murder, jail: s.js.jail, od: s.js.od, evict: s.js.evict, trust: s.js.trust, officers: s.js.officers, lowlevel: s.js.low * 100, prevB: s.js.prev, vote: voteShare(s), fcb: s.b.fcb ? 1 : 0, lost: s.lost ? 1 : 0, heat: s.clim.heat, protect: s.clim.protect * 100, notch: s.fin.notch, bondRate: (s.fin.rate ?? s.A.bondRate) * 100, capUse: s.capUse ?? 0, moved: s.reg.moved, commuters: s.reg.commuters ?? 1000000, taxRev: s.taxNow ? s.taxNow.total : 89.9, wage: 0.75 * s.un.civ + 0.25 * s.un.uni, reserves: s.b.reserves ?? 7.2, ghgB: s.cb ? s.cb.bElec + s.cb.bFuel : 33.3, ghgT: s.cb ? s.cb.trans : 13.7, ghgW: s.cb ? s.cb.waste : 1.96, ghgEmb: s.cb ? s.cb.emb : 0, budgetLeft: s.cb ? s.cb.left : 38, elecShare: s.cb ? s.cb.elec * 100 : 10, evShare: s.cb ? s.cb.ev * 100 : 3, path15: CLIMATE.path15(s.t), ll97: CLIMATE.ll97(s.t), migYr: s.oc ? s.oc.migYr : 0, rushTot: s.ex ? s.ex.rushTot : 0, antWh: s.oc ? s.oc.antWh || 0 : 0, landOk: s.ld ? sitesCap(s).ok : 0, noLand: s.ld ? (1 - s.ld.useShare) * 100 : 0, veh: s.rd ? s.rd.veh : 590000, toll: s.rd ? s.rd.toll : 9, mtaRev: s.rd ? s.rd.rev : 0.55, classComp: s.sc ? s.sc.comp : 64, classReq: s.sc ? s.sc.req : 80, beds1000: s.hp && s.hp.total ? s.hp.total / s.pop * 1000 : 2.9, bedRatio: s.hp ? (s.hp.worstRatio || 1) * 100 : 100, bedShort: s.hp ? s.hp.short || 0 : 0, seaCm: s.fl ? s.fl.cm : 8, floodPrem: s.fl ? s.fl.prem : 1500, floodPol: s.fl ? s.fl.pol : 53000,  leftUnits: s.oc ? s.oc.leftUnits : 0, commAll: (s.reg.commuters ?? 1000000) + (s.oc ? s.oc.commAdd : 0), revWait: s.oc ? s.oc.revWait : 0, revDays: s.oc ? s.oc.revDays : 25.4, mat: s.oc ? (s.oc.mat - 1) * 100 : 0, instWait: s.oc ? s.oc.instWait : 0, whExtra: s.oc ? s.oc.whExtra : 0, distress: s.oc ? s.oc.distress * 100 : 10, abandoned: s.oc ? s.oc.abandoned : 0, avoidB: s.oc ? s.oc.lostB : 0, hire: s.oc ? s.oc.hire : 1, waitlist: s.d.waitlist, waitYears: s.d.waitYears, lottery: s.d.lottery, queueMin: s.d.queueMin, informal: s.d.informal, leak: s.d.leak, late: s.d.late, stalled: s.d.stalled, stalledB: s.d.stalledB, crowd: s.d.crowd * 100, commute: s.d.commuteAvg, protest: s.d.protest, dataGap: s.d.dataGap, quality: s.d.quality, subsidy: s.d.subsidy, phantom: s.d.phantom, peWeight: s.d.peWeight * 100, rateTop: s.taxNow ? s.taxNow.rate[10] * 100 : 12.6, rateLow: s.taxNow ? (s.taxNow.rate[0] + s.taxNow.rate[1] + s.taxNow.rate[2]) / 3 * 100 : 12.1,
  };
}
function record(s) { s.hist.push(snapshotKPIs(s)); }

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function lite(s) { const { hist, log, scen, cx, ...rest } = s; const c = clone(rest); if (cx) { const { hh, ...cr } = cx; c.cx = clone(cr); c.cx.hh = null; } c.hist = [hist[hist.length - 1]]; c.log = null; c.scen = []; return c; }
function project(s, n = 8, opt = {}) { const c = lite(s); if (opt.A) Object.assign(c.A, opt.A); if (opt.seed) c.seed = opt.seed; for (let i = 0; i < n; i++) step(c, { events: !!opt.events }); return c.hist; }

// ===== PLANNING TOOLS =====
const GOALDEF = {
  shortage: { better: -1, scale: 200000 }, shelter: { better: -1, scale: 45000 }, insec: { better: -1, scale: 7 }, margin: { better: 1, scale: 500 },
  ghg: { better: -1, scale: 10, goal: g => 49 * (1 - g / 100) }, unemp: { better: -1, scale: 1 }, life: { better: 1, scale: 0.6 }, support: { better: 1, scale: 10 }, care: { better: 1, scale: 20 },
};
function goalVal(s, k) { const d = GOALDEF[k]; return d.goal ? d.goal(s.goals[k]) : s.goals[k]; }
function gap(s, k, v) { const d = GOALDEF[k], g = goalVal(s, k); return Math.max(0, (d.better < 0 ? v - g : g - v) / d.scale); }

// Solver: pattern search over every plan lever, minimising unmet goals + cost, with the budget rules as hard penalties.
function solverVars(s) {
  const { fx, flags } = fxAll(s);
  const v = [];
  CAPITAL.forEach(c => { if ((c.id === 'acq' && !flags.acquire) || (c.id === 'stores' && fx.storesCap !== 9999)) return; v.push({ g: 'cap', id: c.id, max: c.max }); });
  TRAIN.forEach(t => v.push({ g: 'train', id: t.id, max: t.max }));
  v.push({ g: 'rule', id: 'homeless', max: 60 }); v.push({ g: 'rule', id: 'bond', max: 100 });
  return v;
}
function getV(p, x) { return x.g === 'cap' ? p.cap[x.id] : x.g === 'train' ? p.train[x.id] : p[x.id]; }
function setV(p, x, val) { val = Math.max(0, Math.min(x.max, val)); if (x.g === 'cap') p.cap[x.id] = val; else if (x.g === 'train') p.train[x.id] = val; else p[x.id] = val; }
function planCost(p) { return CAPITAL.reduce((a, c) => a + p.cap[c.id], 0) + TRAIN.reduce((a, t) => a + p.train[t.id] * t.cost / 1e9, 0); }
function evalPlan(s, plan, goals, tax) {
  const c = lite(s); c.plan = clone(plan); const n = Math.max(4, 20 - s.t);
  if (tax) { c.tax.prop[3] = TAX0.prop[3] * (1 + tax.c4 / 100); if (tax.mill > c.tax.mill) { const tx = clone(c.tax); tx.mill = tax.mill; if (c.mode === 'real') c.taxPending = { tx, age: 0 }; else c.tax.mill = tax.mill; } }
  let fcbQ = 0, defSum = 0;
  for (let i = 0; i < n; i++) { step(c, { events: false }); if (c.b.fcb) fcbQ++; if (c.b.deficit < 0) defSum += -c.b.deficit; }
  const end = c.hist[c.hist.length - 1];
  let unmet = 0; goals.forEach(k => unmet += Math.min(3, gap(c, k, end[k])));
  const score = unmet * 10 + planCost(plan) * 0.08 + fcbQ * 6 + defSum * 0.4 + Math.max(0, -c.b.deficit) * 3 + c.b.streak * 2 + (c.lost ? 25 : 0);
  return { score, end, fcbQ, unmet };
}
function* solveGen(s, goals, opt = {}) {
  const vars = solverVars(s); let plan = clone(s.plan); plan.bond = 100;
  let tax = opt.tax ? { c4: Math.max(0, (s.tax.prop[3] / TAX0.prop[3] - 1) * 100), mill: s.tax.mill } : null;
  let best = evalPlan(s, plan, goals, tax); let evals = 1;
  const tv = [{ id: 'c4', max: 30 }, { id: 'mill', max: 4 }];
  const phases = [{ tax: false, fracs: [0.4, 0.2, 0.1, 0.05, 0.025] }];
  if (opt.tax) phases.push({ tax: true, fracs: [0.25, 0.1, 0.05, 0.025] });
  for (const ph of phases) for (const f of ph.fracs) {
    let improved = true, sweeps = 0;
    while (improved && sweeps < 3) {
      improved = false; sweeps++;
      if (ph.tax) for (const x of tv) for (const dir of [1, -1]) { const t2 = clone(tax); t2[x.id] = Math.max(0, Math.min(x.max, t2[x.id] + dir * f * x.max)); if (t2[x.id] === tax[x.id]) continue; const r = evalPlan(s, plan, goals, t2); evals++; if (r.score < best.score - 1e-6) { tax = t2; best = r; improved = true; } }
      for (const x of vars) {
        for (const dir of [1, -1]) {
          const p2 = clone(plan); setV(p2, x, getV(plan, x) + dir * f * x.max);
          if (getV(p2, x) === getV(plan, x)) continue;
          const r = evalPlan(s, p2, goals, tax); evals++;
          if (r.score < best.score - 1e-6) { plan = p2; best = r; improved = true; }
        }
        yield { evals, best, plan, tax, frac: f };
      }
    }
  }
  return { evals, best, plan, tax, done: true };
}

// Monte Carlo: same plan, random events + assumptions drawn ±15%
const UNC = ['unitCost', 'hhForm', 'privPermits', 'flight', 'climateResp', 'albany', 'storeReach', 'windCost', 'peakGrowth', 'expGrowth', 'careTake', 'aideRatio', 'storm', 'migNet', 'matElast', 'convert', 'avoidLR', 'installCap'];
function monteCarlo(s, runs = 40, n) {
  n = n || Math.max(4, 20 - s.t);
  const out = [];
  for (let r = 0; r < runs; r++) {
    const R = rng(9001 + r * 131 + s.t * 7);
    const A = {}; UNC.forEach(k => A[k] = s.A[k] * (0.85 + R() * 0.3));
    out.push(project(s, n, { A, events: true, seed: 5000 + r * 977 }));
  }
  const keys = Object.keys(out[0][0]).filter(k => typeof out[0][0][k] === 'number');
  const band = {};
  keys.forEach(k => {
    band[k] = out[0].map((h, i) => { const vals = out.map(o => o[i][k]).sort((a, b) => a - b); const q = p => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))]; return { t: h.t, p10: q(0.1), p50: q(0.5), p90: q(0.9) }; });
  });
  const goalsMet = Object.keys(GOALDEF).map(k => ({ k, p: out.filter(o => gap(s, k, o[o.length - 1][k]) === 0).length / runs }));
  return { ends: out.map(o => o[o.length - 1]), band, goalsMet, runs, fcbP: out.filter(o => o.some(h => h.fcb)).length / runs, loseP: out.filter(o => o[o.length - 1].lost).length / runs };
}
// Sensitivity: each assumption −25% / +25%, effect on one indicator at the end of the plan
function sensitivity(s, metric) {
  const n = Math.max(4, 20 - s.t); const base = project(s, n); const b = base[base.length - 1][metric];
  return Object.keys(ASSUME).map(k => {
    const v0 = s.A[k] ?? ASSUME[k].v, lo = project(s, n, { A: { [k]: v0 * 0.75 } }), hi = project(s, n, { A: { [k]: v0 * 1.25 } });
    return { k, name: ASSUME[k].name, lo: lo[lo.length - 1][metric] - b, hi: hi[hi.length - 1][metric] - b };
  }).sort((x, y) => (Math.abs(y.hi - y.lo)) - (Math.abs(x.hi - x.lo)));
}

// Material balances (annual)
function balances(s) {
  const { fx, flags } = fxAll(s); const P = s.plan; const H = s.h; const L = s.lab; const E = s.e;
  const pipePub = H.pipePub.filter(x => x.q <= s.t + 4).reduce((a, x) => a + x.n, 0);
  const pipePriv = H.pipePriv.filter(x => x.q <= s.t + 4).reduce((a, x) => a + x.n, 0);
  const hhNeed = H.shortage / Math.max(1, 20 - s.t) * 4 + Math.max(0, s.popGrowth) * 4 / 2.45 + s.A.hhForm;
  const inPipe = H.pipePriv.reduce((a, x) => a + x.n, 0) + H.pipePub.reduce((a, x) => a + x.n, 0);
  const resWorkers = 0.45 * L.sectors.constr + L.jg * 0.15;
  const foodNeed = 19.0 * s.pop / 8585000;
  const covered = Math.min(0.9, s.f.stores * s.A.storeReach / s.pop);
  const capWant = Object.keys(P.cap).reduce((a, k) => a + (k === 'water' ? 0 : k === 'acq' && !flags.acquire ? 0 : k === 'stores' && fx.storesCap !== 9999 ? 0 : P.cap[k]), 0);
  const healthNeed = 1028250 * 1.01 + fx.healthNeed;
  const cNeed = careNeed(s, flags);
  const cSoon = s.cc.seats + s.cc.pipe.filter(x => x.q <= s.t + 4).reduce((a, x) => a + x.n, 0);
  const askedSeats = TRAIN.filter(t => !t.short).reduce((a, t) => a + P.train[t.id], 0);
  const aideNeed = s.age.s65 * s.A.aideRatio;
  return [
    { id: 'homes', name: 'Homes', unit: 'units/yr', need: hhNeed, have: pipePub + pipePriv, how: `To close the ${fmt(H.shortage)}-home shortage by Q4 2031 you need ${fmt(H.shortage / Math.max(1, 20 - s.t) * 4)} net new homes a year, plus ${fmt(s.A.hhForm)} for latent household formation and ${fmt(Math.max(0, s.popGrowth) * 4 / 2.45)} for population growth. Supply = homes due in the next 4 quarters (private ${fmt(pipePriv)}, public ${fmt(pipePub)}).`, src: 'shortfall' },
    { id: 'crew', name: 'Construction crews', unit: 'workers', need: inPipe * s.A.workersPerUnit, have: resWorkers, how: `Each home under construction ties up ≈${s.A.workersPerUnit} workers for 2 years. In pipeline: ${fmt(inPipe)} homes. Supply = 45% of ${fmt(L.sectors.constr)} construction jobs plus job-guarantee helpers.`, src: 'jobs' },
    { id: 'food', name: 'Food supply', unit: 'B lb/yr', need: foodNeed, have: foodNeed * (1 - s.f.shortage), dec: 1, how: `≈19 billion lb of food flow through NYC a year. Public stores cover ${(covered * 100).toFixed(1)}% of residents. Private supply index ${(s.f.priv * 100).toFixed(0)}%.`, src: 'foodFlow' },
    { id: 'access', name: 'Food access', unit: 'people', need: s.f.insec * s.pop, have: s.f.stores * s.A.storeReach, how: `${fmt(s.f.insec * s.pop)} residents are food insecure. Each city store is assumed to serve ≈${fmt(s.A.storeReach)} regular shoppers with staples 30% below retail.`, src: 'grocery30' },
    { id: 'peak', name: 'Summer peak power', unit: 'MW', need: E.peak, have: E.firm, how: `Zone J peak ≈ ${fmt(E.peak)} MW (+${s.A.peakGrowth} MW/yr from electrification). Firm supply counts storage at 90%, solar and wind at 25%, retrofits 1:1.`, src: 'star' },
    { id: 'energy', name: 'Clean electricity', unit: 'GWh/yr', need: E.gwh, have: E.solar * 1.15 + E.wind * 3.9, how: `NYC uses ≈50,000 GWh/yr. City-built solar yields ≈1.15 GWh per MW, offshore wind ≈3.9 GWh per MW.`, src: 'energy' },
    { id: 'water', name: 'Drinking water', unit: 'M gal/day', need: s.wt.mgd, have: 1300, how: `NYC used ${Math.round(LV('city.water', 990))} million gallons a day in ${LIVE.values && LIVE.values['city.water'] ? LIVE.values['city.water'].asOf : 2025}. The upstate reservoirs comfortably exceed that (≈1,300 shown as working capacity, assumption); the binding problem is pipes: ${fmt(s.wt.breaks)} main breaks a year.`, src: 'water' },
    { id: 'care', name: 'Child-care seats', unit: 'children', need: cNeed, have: cSoon, how: `${fmt(s.age.k04)} children under 5; ${flags.universal ? '65% (universal)' : Math.round(s.A.careTake * 100) + '%'} of families want a seat. Seats: 3-K/pre-K ≈100,000, 2-K (12,000 from fall 2027), half of 109,000 ACS vouchers, plus your new centers. Educators needed: 1 per 7 children.`, src: 'prek' },
    { id: 'aides', name: 'Home-care aides', unit: 'workers', need: aideNeed, have: s.el.aides, how: `${fmt(s.age.s65)} residents are 65+. At ≈${s.A.aideRatio} aides per older resident the city needs ${fmt(aideNeed)}. 187,000 home health workers were counted in 2018; the model starts at 200,000.`, src: 'aides' },
    { id: 'nurses', name: 'Health workers', unit: 'workers', need: healthNeed, have: L.sectors.health, how: `1,028,250 health & social assistance jobs (Sept 2026) plus ${fmt(fx.healthNeed)} needed by your health laws.`, src: 'jobs' },
    { id: 'teachers', name: 'Teachers for class-size law', unit: 'teachers', need: 6900, have: 6900 - s.ed.teacherGap, how: `The IBO estimates ~6,900 more teachers are needed for the State class-size mandate. Enrollment is falling (now ${fmt(s.ed.enroll)}), which eases the need slowly.`, src: 'classSize' },
    { id: 'seats', name: 'Training seats', unit: 'seats/yr', need: askedSeats, have: trainCap(s, fx), how: `Your training plan asks for ${fmt(askedSeats)} seats a year (excluding short aide courses). CUNY (≈247,000 students) and the colleges can run ${fmt(trainCap(s, fx))} plan seats (assumption) plus what you build.`, src: 'cuny' },
    { id: 'agency', name: 'Agency capacity', unit: '$B/yr of new work', need: Object.keys(P.cap).reduce((a, k) => a + P.cap[k], 0) + Math.max(0, fx.op) + LAWS.filter(l => s.pol[l.id] !== l.opts[0].id).length * 0.5, have: s.adminCap ?? s.A.adminCap, dec: 1, how: `City agencies can absorb about $${(s.adminCap ?? s.A.adminCap).toFixed(1)}B a year of new programs and projects (assumption, growing 15% a year plus trained planners). Each new law takes about $0.5B a year of agency effort to implement. Beyond that, projects slip and waste rises.`, src: 'budget' },
    { id: 'capital', name: 'Capital', unit: '$B/yr', need: capWant, have: Math.min(capWant * P.bond / 100, s.b.headroom * 4) + capWant * (1 - P.bond / 100), dec: 1, how: `Your plan invests $${capWant.toFixed(1)}B/yr (water is paid by water bills). ${P.bond}% is bond-financed; remaining debt headroom ≈ $${s.b.headroom.toFixed(0)}B (assumption).`, src: 'budget' },
    { id: 'budget', name: 'Operating budget', unit: '$B/yr', need: s.b.exp, have: s.b.rev, dec: 1, how: `Revenue $${s.b.rev.toFixed(1)}B vs spending $${s.b.exp.toFixed(1)}B. FY2027 adopted budget: $125.8B.`, src: 'budget' },
    { id: 'trade', name: 'External earnings', unit: '$B/yr', need: s.ec.importsB, have: s.ec.exportsB, dec: 0, how: `Food, fuel and goods are bought from outside with dollars earned by selling finance, tech, tourism and services to the rest of the world.`, src: 'gdp' },
  ];
}

function fmt(n) { n = Math.round(n); return n.toLocaleString('en-US'); }

if (typeof module !== 'undefined') module.exports = { auditChecks, ocInit, OC0, SITES, ldInit, proposeSite, sitesCap, siteChance, tollNow, scInit, hpInit, flInit, replayRent, replayPermits, REPLAY, ROAD0, SC0, HP0, cityInit, cityStep, hhSummary, backtest, BACKTEST, SUB_LINES, BIZ_SECT, GRID_SHAPE, cdLabel, JS0, jsInit, CLIMATE, cbInit, REGIMES, deepInit, LIVE, LV, U0, TAX0, TAXDEF, GROUPS, BLOCS, CONTRACTS, RAISE_OPTS, taxCalc, distribution, councilVote, propTaxVote, applyDecision, ratingName, lawRadical, SOURCES, BOROUGHS, SECTORS, LAWS, TRAIN, CAPITAL, HIST, CITIES, ASSUME, GOALDEF, newGame, step, project, balances, fxAll, snapshotKPIs, clone, cityPov, qLabel, fmt, optOf, solveGen, monteCarlo, sensitivity, evalPlan, voteShare, gap, goalVal, lite };
