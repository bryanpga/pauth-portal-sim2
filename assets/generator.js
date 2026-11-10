/* Random data generation. Every login produces a fresh member roster; the
   requests for a member are generated the first time that member is opened. */
window.GEN = (() => {
  const R = window.REF;
  const DAY = 86400000;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const newSeed = () => (Math.random() * 2 ** 32) >>> 0;

  class Rng {
    constructor(seed = newSeed()) { this.r = mulberry32(seed); }
    next() { return this.r(); }
    int(a, b) { return a + Math.floor(this.r() * (b - a + 1)); }
    float(a, b) { return a + this.r() * (b - a); }
    pick(arr) { return arr[Math.floor(this.r() * arr.length)]; }
    chance(p) { return this.r() < p; }
    digits(n) { let s = ''; for (let i = 0; i < n; i++) s += this.int(0, 9); return s; }
    weighted(items, w = (x) => x.weight) {
      const total = items.reduce((s, x) => s + w(x), 0);
      let roll = this.r() * total;
      for (const x of items) { roll -= w(x); if (roll < 0) return x; }
      return items[items.length - 1];
    }
    sample(arr, n) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a.slice(0, Math.min(n, a.length));
    }
  }

  const round2 = (n) => Math.round(n * 100) / 100;
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const addDays = (t, n) => t + n * DAY;

  // NPI with a valid Luhn check digit (prefix 80840 per the NPI standard).
  function npi(rng) {
    const base = '1' + rng.digits(8);
    let sum = 24; // constant contribution of the 80840 prefix
    for (let i = 0; i < 9; i++) {
      let d = +base[8 - i];
      if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return base + ((10 - (sum % 10)) % 10);
  }

  // Stable provider registry so the same practice keeps the same NPI/TIN within a session.
  function providerRegistry(rng) {
    const reg = {};
    for (const c of R.categories) for (const p of c.providers) {
      reg[p] = { name: p, npi: npi(rng), tin: rng.int(10, 99) + '-' + rng.digits(7), phone: phone(rng), network: rng.chance(0.85) ? 'In-Network' : 'Out-of-Network' };
    }
    return reg;
  }

  function phone(rng) { return `(${rng.int(201, 989)}) ${rng.int(201, 989)}-${rng.digits(4)}`; }

  function member(rng, idx) {
    const gender = rng.chance(0.52) ? 'F' : 'M';
    const first = rng.pick(R.firstNames[gender]);
    const last = rng.pick(R.lastNames);
    const plan = rng.weighted(R.plans);
    const isMedicare = plan.prefix.startsWith('MA') || plan.prefix === 'DSN';
    const age = isMedicare ? rng.int(65, 92) : plan.prefix === 'MCD' ? rng.int(1, 64) : rng.int(19, 64);
    const dob = new Date(startOfToday() - (age * 365.25 + rng.int(0, 364)) * DAY);
    const [city, state, zip3] = rng.pick(R.places);
    const termed = rng.chance(0.08);
    const effective = new Date(addDays(startOfToday(), -rng.int(120, 2400)));
    effective.setDate(1);
    const term = termed ? new Date(addDays(startOfToday(), -rng.int(5, 90))) : null;
    return {
      id: plan.prefix + rng.digits(9),
      suffix: rng.chance(0.7) ? '01' : '0' + rng.int(2, 4),
      first, last, gender,
      middle: rng.chance(0.6) ? String.fromCharCode(65 + rng.int(0, 25)) : '',
      dob: dob.getTime(),
      plan: plan.name,
      planPrefix: plan.prefix,
      group: plan.group ? 'GRP' + rng.digits(6) : (plan.prefix === 'MCD' ? 'MCD-' + state : 'IND'),
      employer: plan.group ? rng.pick(R.employers) : '',
      eligibility: termed ? 'Termed' : 'Active',
      effective: effective.getTime(),
      term: term ? term.getTime() : null,
      pcp: rng.pick(R.pcps),
      address: `${rng.int(100, 9899)} ${rng.pick(R.streets)} ${rng.pick(R.streetTypes)}`,
      city, state, zip: zip3 + rng.digits(2),
      phone: phone(rng),
      relationship: rng.weighted([{ v: 'Subscriber', weight: 70 }, { v: 'Spouse', weight: 18 }, { v: 'Dependent', weight: 12 }]).v,
      lastActivity: addDays(startOfToday(), -rng.int(0, 120)),
      idx
    };
  }

  function roster() {
    const rng = new Rng();
    const count = rng.int(40, 140);
    const seen = new Set();
    const members = [];
    const ymd = (a) => (a ? new Date(a[0], a[1] - 1, a[2]).getTime() : null);
    R.fixedMembers.forEach((f, i) => {
      const plan = R.plans.find((p) => p.name === f.plan);
      seen.add(f.id);
      members.push({
        ...f, planPrefix: plan.prefix, dob: ymd(f.dob), effective: ymd(f.effective), term: ymd(f.term),
        lastActivity: addDays(startOfToday(), -rng.int(0, 30)), idx: -1 - i
      });
    });
    for (let i = 0; i < count; i++) {
      const m = member(rng, i);
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      members.push(m);
    }
    members.sort((a, b) => a.last.localeCompare(b.last) || a.first.localeCompare(b.first));
    return { generatedAt: Date.now(), providers: providerRegistry(rng), members };
  }

  // Request-level outcome drives line statuses, dates and payment.
  const OUTCOMES = [
    { key: 'approved',  label: 'Approved',             weight: 32 },
    { key: 'denied',    label: 'Denied',               weight: 20 },
    { key: 'partial',   label: 'Partially Approved',   weight: 14 },
    { key: 'review',    label: 'In Clinical Review',   weight: 12 },
    { key: 'info',      label: 'Additional Info Requested', weight: 9 },
    { key: 'received',  label: 'Received',             weight: 7 },
    { key: 'cancelled', label: 'Cancelled',            weight: 6 }
  ];

  function requests(m, providers) {
    const rng = new Rng();
    const plan = R.plans.find((p) => p.name === m.plan);
    const n = rng.chance(0.06) ? 0 : rng.weighted([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => ({ v, weight: v <= 4 ? 10 : v <= 8 ? 5 : 2 }))).v;
    const list = [];
    const today = startOfToday();
    for (let i = 0; i < n; i++) list.push(request(rng, m, plan, providers, today));
    list.sort((a, b) => b.submitted - a.submitted);
    return { generatedAt: Date.now(), list };
  }

  function request(rng, m, plan, providers, today) {
    const cat = rng.pick(R.categories);
    const outcome = rng.weighted(OUTCOMES);
    const open = ['review', 'info', 'received'].includes(outcome.key);
    const providerName = rng.pick(cat.providers);
    const provider = providers[providerName];
    const pos = rng.pick(cat.pos);

    // Open requests were submitted recently with future service dates; decided ones span the past 18 months.
    const submitted = (open ? addDays(today, -rng.int(0, 12)) : addDays(today, -rng.int(20, 540))) + rng.int(7 * 60, 18 * 60) * 60000;
    const submittedDay = new Date(submitted).setHours(0, 0, 0, 0);
    const dosFrom = open ? addDays(today, rng.int(3, 45)) : addDays(submittedDay, rng.int(2, 21));
    const multiDay = cat.key === 'pt' || cat.key === 'infusion' || cat.key === 'dme';
    const dosTo = multiDay && rng.chance(0.5) ? addDays(dosFrom, rng.int(14, 90)) : dosFrom;
    const decided = open ? null : addDays(submittedDay, rng.int(2, 14)) + rng.int(8 * 60, 17 * 60) * 60000;
    const urgent = rng.chance(0.15);

    const icdCodes = rng.sample(cat.icd, rng.int(1, Math.min(4, cat.icd.length)));
    const lineCount = rng.int(1, Math.min(6, cat.codes.length));
    const codes = rng.sample(cat.codes, lineCount);

    // Line statuses
    let statuses;
    switch (outcome.key) {
      case 'approved': statuses = codes.map(() => 'APPROVED'); break;
      case 'denied': statuses = codes.map(() => 'DENY'); break;
      case 'partial':
        if (codes.length === 1) codes.push(rng.pick(cat.codes.filter((c) => c !== codes[0])) || codes[0]);
        statuses = codes.map(() => (rng.chance(0.5) ? 'APPROVED' : 'DENY'));
        if (!statuses.includes('APPROVED')) statuses[0] = 'APPROVED';
        if (!statuses.includes('DENY')) statuses[statuses.length - 1] = 'DENY';
        break;
      case 'cancelled': statuses = codes.map(() => 'VOID'); break;
      case 'received': statuses = codes.map(() => 'RECEIVED'); break;
      default: statuses = codes.map(() => 'PEND');
    }
    const adjStatus = { approved: 'Adjudicated', denied: 'Adjudicated', partial: 'Adjudicated', review: 'Pended', info: 'Pended', received: 'In Process', cancelled: 'Voided' }[outcome.key];
    const sharedDenial = rng.pick(R.denials);
    const pendReason = rng.pick(R.pendReasons);

    let dedLeft = plan.deductible ? (rng.chance(0.45) ? rng.int(0, Math.min(plan.deductible, 600)) : 0) : 0;
    let copayUsed = false;

    const lines = codes.map(([code, desc, base, [umin, umax]], i) => {
      const unitCount = rng.int(umin, umax);
      const charges = Math.round(base * unitCount * rng.float(0.95, 1.35));
      const status = statuses[i];
      const line = {
        n: i + 1, code, desc, dosFrom, dosTo: multiDay ? dosTo : dosFrom, pos,
        pointers: linePointers(rng, icdCodes.length),
        modifier: rng.chance(0.2) ? rng.pick(['RT', 'LT', '26', 'TC', '59', 'GT', '95', 'KX']) : '',
        unit: cat.units, unitCount, charges, status, adjStatus,
        allowed: 0, deductible: 0, copay: 0, coins: 0, paid: 0,
        requestedUnits: unitCount, approvedUnits: 0,
        reason: null, remark: null, note: ''
      };
      if (status === 'APPROVED') {
        const allowed = round2(charges * rng.float(0.42, 0.88));
        const ded = Math.min(dedLeft, allowed); dedLeft -= ded;
        const copay = !copayUsed && cat.key !== 'lab' ? Math.min(plan.copay, allowed - ded) : 0;
        if (copay) copayUsed = true;
        const coins = round2((allowed - ded - copay) * plan.coins);
        Object.assign(line, { allowed, deductible: round2(ded), copay: round2(copay), coins, paid: round2(allowed - ded - copay - coins), approvedUnits: unitCount, reason: ['CO-45', 'Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement.'] });
      } else if (status === 'DENY') {
        line.reason = outcome.key === 'denied' && rng.chance(0.7) ? sharedDenial : rng.pick(R.denials);
        line.remark = rng.chance(0.6) ? rng.pick(R.remarks) : null;
      } else if (status === 'PEND') {
        line.note = pendReason;
      } else if (status === 'VOID') {
        line.note = rng.pick(['Withdrawn by requesting provider', 'Duplicate request — see related authorization', 'Member no longer requires service']);
      } else {
        line.note = 'Received — awaiting intake review';
      }
      return line;
    });

    const sum = (k) => round2(lines.reduce((s, l) => s + l[k], 0));
    const totalCharges = sum('charges');
    const allowed = sum('allowed');
    const paid = sum('paid');
    const decidedOutcome = ['approved', 'denied', 'partial'].includes(outcome.key);
    const interest = paid > 0 && rng.chance(0.08) ? round2(paid * rng.float(0.002, 0.012)) : 0;
    const recovery = paid > 0 && rng.chance(0.07) ? round2(Math.min(paid, rng.int(15, 250))) : 0;
    const okPay = decidedOutcome ? addDays(decided, rng.int(0, 3)) : null;
    const paidDate = okPay ? addDays(okPay, rng.int(1, 3)) : null;
    const net = round2(paid + interest - recovery);
    const arBal = recovery && rng.chance(0.4) ? round2(rng.int(10, 180)) : 0;

    const payment = {
      adjustment: decidedOutcome ? round2(totalCharges - allowed) : 0,
      deductible: sum('deductible'),
      coinsurance: sum('coins'),
      copay: sum('copay'),
      totalPayment: paid,
      arBalance: arBal,
      arEligible: arBal > 0 ? 'Yes' : 'No',
      interest,
      recovery,
      net,
      okPayDate: okPay,
      paidDate,
      checkNumber: net > 0 ? (rng.chance(0.75) ? 'EFT' + rng.digits(9) : rng.digits(8)) : '',
      planCrn: decidedOutcome && rng.chance(0.25) ? 'CRN' + rng.digits(10) : '',
      allowed,
      payable: net
    };

    const yymmdd = new Date(submitted).toISOString().slice(2, 10).replace(/-/g, '');
    const history = buildHistory(rng, outcome.key, submitted, decided, urgent);

    return {
      id: 'PA' + yymmdd + rng.digits(6),
      claimNumber: decidedOutcome ? yymmdd + rng.digits(8) : '',
      category: cat.label,
      categoryKey: cat.key,
      type: rng.pick(['Outpatient', 'Outpatient', 'Professional', cat.key === 'dme' ? 'DME' : 'Outpatient']),
      priority: urgent ? 'Urgent' : 'Standard',
      status: outcome.label,
      statusKey: outcome.key,
      submitted, decided, dosFrom, dosTo,
      validFrom: outcome.key === 'approved' || outcome.key === 'partial' ? dosFrom : null,
      validTo: outcome.key === 'approved' || outcome.key === 'partial' ? addDays(dosTo, rng.pick([30, 60, 90, 180])) : null,
      provider: provider.name, providerNpi: provider.npi, providerTin: provider.tin, providerPhone: provider.phone, network: provider.network,
      requestingProvider: m.pcp,
      pos,
      icd: icdCodes,
      lines,
      totalCharges,
      payment,
      reviewer: decidedOutcome ? rng.pick(R.reviewers) : (outcome.key === 'review' ? rng.pick(R.reviewers) : ''),
      channel: rng.pick(['Portal', 'Portal', 'Fax', 'Phone', 'EDI 278']),
      trackingNumber: 'TRN' + rng.digits(12),
      dueBy: open ? addDays(submitted, urgent ? 3 : 14) : null,
      history
    };
  }

  // Distinct diagnosis pointers filled left to right (A, then B, C, D); unused slots are null.
  function linePointers(rng, n) {
    const all = Array.from({ length: n }, (_, i) => i + 1);
    const primary = rng.chance(0.6) ? 1 : rng.int(1, n);
    const rest = rng.sample(all.filter((x) => x !== primary), n - 1).filter(() => rng.chance(0.35));
    const ptrs = [primary, ...rest].slice(0, 4);
    while (ptrs.length < 4) ptrs.push(null);
    return ptrs;
  }

  function buildHistory(rng, key, submitted, decided, urgent) {
    const h = [{ t: submitted, e: 'Request received', d: 'Submitted via provider portal' }];
    const t1 = submitted + rng.int(1, 8) * 3600000;
    if (key === 'received') return h;
    h.push({ t: t1, e: 'Intake complete', d: urgent ? 'Expedited review — 72 hour turnaround' : 'Standard review — 14 day turnaround' });
    if (key === 'cancelled') { h.push({ t: t1 + rng.int(1, 48) * 3600000, e: 'Request cancelled', d: 'Cancelled at provider request' }); return h; }
    h.push({ t: t1 + rng.int(2, 12) * 3600000, e: 'Clinical review started', d: 'Assigned to utilization management' });
    if (key === 'info') { h.push({ t: t1 + rng.int(30, 60) * 3600000, e: 'Additional information requested', d: 'Fax/portal upload of clinical documentation requested' }); return h; }
    if (key === 'review') return h;
    h.push({ t: decided, e: 'Determination issued', d: { approved: 'Service approved as requested', denied: 'Service denied — see line details', partial: 'One or more lines denied — see line details' }[key] });
    return h;
  }

  return { roster, requests, Rng };
})();
