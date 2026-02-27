
// navigating-a-change-rehearsal.js
// Resilience-oriented rehearsal model with 3 modes.
// This is a conceptual decision coaching interface, not advice or prediction.

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fmt = (x) => Math.round(x).toString();
const pct = (x) => `${Math.round(x)}%`;

const sigmoid01 = (x) => 1 / (1 + Math.exp(-x)); // maps (-inf, +inf) -> (0,1)

// ----- DOM -----
const el = {
  // mode
  mode_clarify: document.getElementById("mode_clarify"),
  mode_location: document.getElementById("mode_location"),
  mode_offer: document.getElementById("mode_offer"),

  // sliders
  buffer: document.getElementById("buffer"),
  lifestyle: document.getElementById("lifestyle"),
  risk: document.getElementById("risk"),
  finance: document.getElementById("finance"),
  deal: document.getElementById("deal"),
  attach: document.getElementById("attach"),
  lev: document.getElementById("lev"),

  // slider values
  v_buffer: document.getElementById("v_buffer"),
  v_lifestyle: document.getElementById("v_lifestyle"),
  v_risk: document.getElementById("v_risk"),
  v_finance: document.getElementById("v_finance"),
  v_deal: document.getElementById("v_deal"),
  v_attach: document.getElementById("v_attach"),
  v_lev: document.getElementById("v_lev"),

  // labels + hints
  lbl_buffer: document.getElementById("lbl_buffer"),
  lbl_lifestyle: document.getElementById("lbl_lifestyle"),
  lbl_risk: document.getElementById("lbl_risk"),
  lbl_finance: document.getElementById("lbl_finance"),
  lbl_deal: document.getElementById("lbl_deal"),
  lbl_attach: document.getElementById("lbl_attach"),
  lbl_lev: document.getElementById("lbl_lev"),

  hint_buffer: document.getElementById("hint_buffer"),
  hint_lifestyle: document.getElementById("hint_lifestyle"),
  hint_risk: document.getElementById("hint_risk"),
  hint_finance: document.getElementById("hint_finance"),
  hint_deal: document.getElementById("hint_deal"),
  hint_attach: document.getElementById("hint_attach"),
  hint_lev: document.getElementById("hint_lev"),

  // toggles
  t_compete: document.getElementById("t_compete"),
  t_timeline: document.getElementById("t_timeline"),
  t_identity: document.getElementById("t_identity"),
  t_repair: document.getElementById("t_repair"),
  t_income: document.getElementById("t_income"),
  t_rate: document.getElementById("t_rate"),

  // pressure switch containers + copy (mode-aligned)
  stressTitle: document.getElementById("stressTitle"),
  toggle_compete: document.getElementById("toggle_compete"),
  toggle_timeline: document.getElementById("toggle_timeline"),
  toggle_identity: document.getElementById("toggle_identity"),
  toggle_repair: document.getElementById("toggle_repair"),
  toggle_income: document.getElementById("toggle_income"),
  toggle_rate: document.getElementById("toggle_rate"),
  lbl_t_compete: document.getElementById("lbl_t_compete"),
  lbl_t_timeline: document.getElementById("lbl_t_timeline"),
  lbl_t_identity: document.getElementById("lbl_t_identity"),
  lbl_t_repair: document.getElementById("lbl_t_repair"),
  lbl_t_income: document.getElementById("lbl_t_income"),
  lbl_t_rate: document.getElementById("lbl_t_rate"),
  sub_t_compete: document.getElementById("sub_t_compete"),
  sub_t_timeline: document.getElementById("sub_t_timeline"),
  sub_t_identity: document.getElementById("sub_t_identity"),
  sub_t_repair: document.getElementById("sub_t_repair"),
  sub_t_income: document.getElementById("sub_t_income"),
  sub_t_rate: document.getElementById("sub_t_rate"),

  // top KPI
  pkTitle: document.getElementById("pkTitle"),
  decisionNum: document.getElementById("decisionNum"),
  statusText: document.getElementById("statusText"),
  statusPill: document.getElementById("statusPill"),
  bandPill: document.getElementById("bandPill"),
  bandMarker: document.getElementById("bandMarker"),
  b0: document.getElementById("b0"),
  b1: document.getElementById("b1"),
  b2: document.getElementById("b2"),
  b3: document.getElementById("b3"),
  b4: document.getElementById("b4"),

  // balance viz
  pressureNum: document.getElementById("pressureNum"),
  protectionNum: document.getElementById("protectionNum"),
  whiplashNum: document.getElementById("whiplashNum"),

  pressureNum2: document.getElementById("pressureNum2"),
  protectionNum2: document.getElementById("protectionNum2"),
  pressureBar: document.getElementById("pressureBar"),
  protectionBar: document.getElementById("protectionBar"),
  pressureMeter: document.getElementById("pressureMeter"),
  protectionMeter: document.getElementById("protectionMeter"),
  pressureLine: document.getElementById("pressureLine"),
  protectionLine: document.getElementById("protectionLine"),
  pressureBreakdown: document.getElementById("pressureBreakdown"),
  protectionBreakdown: document.getElementById("protectionBreakdown"),

  // patterns
  patternPanel: document.getElementById("patternPanel"),
  patternPill: document.getElementById("patternPill"),
  patternSummary: document.getElementById("patternSummary"),
  patternChips: document.getElementById("patternChips"),
  patternTry: document.getElementById("patternTry"),

  // stress pill + buttons
  stressPill: document.getElementById("stressPill"),
  btnReset: document.getElementById("btnReset"),
  btnMaxStress: document.getElementById("btnMaxStress"),

  // fidelity
  t_sketch: document.getElementById("t_sketch"),
  btnMenu: document.getElementById("btnMenu"),
  btnPrint: document.getElementById("btnPrint"),
  fidelityMenu: document.getElementById("fidelityMenu"),

  // calibration drawer
  btnCal: document.getElementById("btnCal"),
  btnCalClose: document.getElementById("btnCalClose"),
  calDrawer: document.getElementById("calDrawer"),
};

// ----- MODE CONFIG -----
// We intentionally reuse the same 7 slider controls, but their labels/meaning differ by mode.
// This keeps the UI simple while allowing different psych constructs per mode.
const MODES = {
  clarify: {
    key: "clarify",
    name: "Clarifying the change",
    topMetric: "Resilience to explore",
    leftTitle: "Load",
    rightTitle: "Capacity",
    sliderMap: {
      buffer: { label: "Flexibility Buffer", hint: "How much slack you have if plans shift (time, money, energy)."},
      lifestyle:{ label: "Identity Clarity", hint: "How clear you are on what’s changing and what you want."},
      risk:     { label: "Ambiguity Stress", hint: "How much uncertainty is weighing on you right now."},
      finance:  { label: "Emotional Grounding", hint: "How steady you feel day-to-day while thinking about this."},
      deal:     { label: "Support Stability", hint: "How supported you feel by people, routines, and logistics."},
      attach:   { label: "Attachment Intensity", hint: "How much you’re bonding to a specific outcome too early."},
      lev:      { label: "Urgency Pressure", hint: "How rushed you feel (internal or external)."},
    },
    defaults: {
      buffer: 82, lifestyle: 84, risk: 30, finance: 82, deal: 78, attach: 28, lev: 26,
      stress: { compete:false, timeline:false, identity:false, repair:false, income:false, rate:false }
    },
    bands: [
      { name:"Fragile", min:0,  max:30, key:"fragile"},
      { name:"Reactive",min:31, max:50, key:"reactive"},
      { name:"Managing",min:51, max:70, key:"managing"},
      { name:"Stable",  min:71, max:85, key:"stable"},
      { name:"Resilient",min:86,max:100,key:"resilient"},
    ]
  },
  location: {
    key: "location",
    name: "Testing a location",
    topMetric: "Sustainability of Direction",
    leftTitle: "Strain",
    rightTitle: "Support",
    sliderMap: {
      buffer: { label: "Personal Buffer", hint: "If this location surprises you, how much slack do you have?"},
      lifestyle:{ label: "Lifestyle Alignment", hint: "Would daily life here support your routines and values?"},
      risk:     { label: "Volatility Exposure", hint: "How uncertain or changeable this location feels (costs, stability)."},
      finance:  { label: "Ongoing cost strain", hint: "How heavy the ongoing costs feel relative to your life."},
      deal:     { label: "Opportunity Access", hint: "Access to jobs, services, community, and growth."},
      attach:   { label: "Pull Toward This Place", hint: "How emotionally pulled you feel toward living here."},
      lev:      { label: "Support Proximity", hint: "How close you’d be to people/support that matter to you."},
    },
    defaults: {
      buffer: 80, lifestyle: 86, risk: 28, finance: 32, deal: 78, attach: 30, lev: 76,
      stress: { compete:false, timeline:false, identity:false, repair:false, income:false, rate:false }
    },
    bands: [
      { name:"Fragile", min:0,  max:30, key:"fragile"},
      { name:"Reactive",min:31, max:50, key:"reactive"},
      { name:"Managing",min:51, max:70, key:"managing"},
      { name:"Stable",  min:71, max:85, key:"stable"},
      { name:"Resilient",min:86,max:100,key:"resilient"},
    ]
  },
  offer: {
    key: "offer",
    name: "Preparing an offer",
    topMetric: "Steadiness Under Pressure",
    leftTitle: "Pressure",
    rightTitle: "Protection",
    sliderMap: {
      buffer: { label: "Financial Cushion", hint: "How covered you are if the deal shifts or costs rise."},
      lifestyle:{ label: "Life fit (this home)", hint: "How well this specific home supports your day-to-day life."},
      risk:     { label: "Property Surprises", hint: "Inspection/maintenance uncertainty and unknowns."},
      finance:  { label: "Monthly tightness", hint: "How tight the monthly payment feels for your comfort."},
      deal:     { label: "Protections in writing", hint: "Contingencies, credits, repairs, buydowns—protections you can point to in writing."},
      attach:   { label: "Attachment Intensity", hint: "How much you feel you ‘need’ this home to work out."},
      lev:      { label: "Walk-away Power", hint: "How real it feels to walk away (alternatives, time, flexibility)."},
    },
    defaults: {
      buffer: 82, lifestyle: 84, risk: 24, finance: 28, deal: 78, attach: 30, lev: 74,
      stress: { compete:false, timeline:false, identity:false, repair:false, income:false, rate:false }
    },
    bands: [
      { name:"Fragile", min:0,  max:30, key:"fragile"},
      { name:"Reactive",min:31, max:50, key:"reactive"},
      { name:"Managing",min:51, max:70, key:"managing"},
      { name:"Stable",  min:71, max:85, key:"stable"},
      { name:"Resilient",min:86,max:100,key:"resilient"},
    ]
  }
};

// Mode-aligned pressure switch copy.
// We reuse the same underlying stress keys, but only show the ones that make sense per mode.
const STRESS_UI = {
  clarify: {
    title: 'Mindset nudges',
    show: ['timeline','identity','compete'],
    copy: {
      timeline: { label: 'Need an answer soon', sub: 'A deadline (real or self-imposed) is pushing speed.' },
      identity: { label: 'Identity swirl', sub: 'It feels like this change says something big about who you are.' },
      compete:  { label: 'Comparison pressure', sub: 'Other people’s timelines or choices are pulling you.' },
    }
  },
  location: {
    title: 'Context stressors',
    show: ['timeline','compete','identity','income'],
    copy: {
      timeline: { label: 'Timing constraint', sub: 'Work / school / lease timing narrows options.' },
      compete:  { label: 'Market hype', sub: 'Noise, headlines, or friends make it feel urgent.' },
      identity: { label: '“This place is the new me”', sub: 'You’re projecting a future self onto a location.' },
      income:   { label: 'Budget wobble', sub: 'Income or expenses feel uncertain in the near term.' },
    }
  },
  offer: {
    title: 'Pressure switches',
    show: ['compete','timeline','identity','repair','income','rate'],
    copy: {
      compete:  { label: 'Bidding war vibe', sub: 'Scarcity / competition energy.' },
      timeline: { label: 'Time pressure', sub: 'Deadline / forced speed.' },
      identity: { label: '“This is my home” story', sub: 'Identity projection mode.' },
      repair:   { label: 'Surprise repair', sub: 'Example: a $15k hit.' },
      income:   { label: 'Income wobble', sub: 'Temporary dip.' },
      rate:     { label: 'Rate shock', sub: 'Financing gets harder.' },
    }
  }
};

let mode = "offer"; // current mode

// Keep per-mode slider positions so switching modes doesn’t reset the user.
const stateByMode = {
  clarify: null,
  location: null,
  offer: null,
};

function stateFromDefaults(modeKey){
  const d = MODES[modeKey].defaults;
  return {
    buffer: d.buffer,
    lifestyle: d.lifestyle,
    risk: d.risk,
    finance: d.finance,
    deal: d.deal,
    attach: d.attach,
    lev: d.lev,
    stress: { ...d.stress }
  };
}

function applyState(st){
  if (!st) return;
  isHydrating = true;
  el.buffer.value = st.buffer;
  el.lifestyle.value = st.lifestyle;
  el.risk.value = st.risk;
  el.finance.value = st.finance;
  el.deal.value = st.deal;
  el.attach.value = st.attach;
  el.lev.value = st.lev;

  if (el.t_compete) el.t_compete.checked = !!st.stress?.compete;
  if (el.t_timeline) el.t_timeline.checked = !!st.stress?.timeline;
  if (el.t_identity) el.t_identity.checked = !!st.stress?.identity;
  if (el.t_repair) el.t_repair.checked = !!st.stress?.repair;
  if (el.t_income) el.t_income.checked = !!st.stress?.income;
  if (el.t_rate) el.t_rate.checked = !!st.stress?.rate;

  isHydrating = false;
}

let isHydrating = false;

// ----- STATE -----
function getState(){
  return {
    buffer: +el.buffer.value,
    lifestyle: +el.lifestyle.value,
    risk: +el.risk.value,
    finance: +el.finance.value,
    deal: +el.deal.value,
    attach: +el.attach.value,
    lev: +el.lev.value,
    stress: {
      compete: !!el.t_compete?.checked,
      timeline: !!el.t_timeline?.checked,
      identity: !!el.t_identity?.checked,
      repair: !!el.t_repair?.checked,
      income: !!el.t_income?.checked,
      rate: !!el.t_rate?.checked,
    }
  };
}

function applyDefaults(mKey){
  const cfg = MODES[mKey];
  isHydrating = true;

  el.buffer.value = cfg.defaults.buffer;
  el.lifestyle.value = cfg.defaults.lifestyle;
  el.risk.value = cfg.defaults.risk;
  el.finance.value = cfg.defaults.finance;
  el.deal.value = cfg.defaults.deal;
  el.attach.value = cfg.defaults.attach;
  el.lev.value = cfg.defaults.lev;

  if (el.t_compete) el.t_compete.checked = cfg.defaults.stress.compete;
  if (el.t_timeline) el.t_timeline.checked = cfg.defaults.stress.timeline;
  if (el.t_identity) el.t_identity.checked = cfg.defaults.stress.identity;
  if (el.t_repair) el.t_repair.checked = cfg.defaults.stress.repair;
  if (el.t_income) el.t_income.checked = cfg.defaults.stress.income;
  if (el.t_rate) el.t_rate.checked = cfg.defaults.stress.rate;

  isHydrating = false;
  updateUI();
  stateByMode[mKey] = getState();
}

// ----- SCORING (RESILIENCE-ORIENTED) -----
// General approach:
// - Compute ResourceIndex and DemandIndex in 0..100.
// - Score = 50 + (ResourceIndex - DemandIndex) * scale.
// - Then apply a gentle curve so middling states don't feel overly negative.
// - Provide breakdown lists for "Pressure/Protection" style visualization.
function compute(modeKey, s){
  if (modeKey === "clarify") return computeClarify(s);
  if (modeKey === "location") return computeLocation(s);
  return computeOffer(s);
}

function computeClarify(s){
  // Mode 1: Clarifying the change
  // Intent: measure steadiness to explore (readiness), not correctness.
  // Resources = buffers that keep you steady.
  // Demands = pressures that make the choice feel heavier than it needs to right now.

  // Resources
  const identityClarity = s.lifestyle;        // clarity on what you want / what's changing
  const emotionalGrounding = s.finance;      // steadiness day-to-day
  const flexibility = s.buffer;              // slack if plans shift
  const support = s.deal;                    // stability of support/routines/logistics

  // Demands
  const ambiguity = s.risk;                  // uncertainty weight
  const attachment = s.attach;               // bonding to a specific outcome too early
  const urgency = s.lev;                     // rushed feeling

  // Small nudges (kept gentle in this mode)
  const stressBoost =
    (s.stress.timeline ? 5 : 0) +
    (s.stress.identity ? 5 : 0) +
    (s.stress.compete ? 4 : 0);

  // Agency dampener: when you have flexibility + support, urgency hurts less.
  const agency = clamp((flexibility + support) / 2, 0, 100);
  const urgencyAdj = clamp(urgency * (1 - 0.35 * (agency / 100)), 0, 100);

  const resource = clamp(
    0.28*identityClarity + 0.28*emotionalGrounding + 0.26*flexibility + 0.18*support,
    0, 100
  );

  const demand = clamp(
    0.33*attachment + 0.37*ambiguity + 0.24*urgencyAdj + stressBoost,
    0, 100
  );

  let raw = 50 + (resource - demand) * 0.85;

  // Readiness bonus: strong resources create disproportionate steadiness.
  if (resource > 75) raw += (resource - 75) * 0.45;

  // Curve for human feel: avoid "everything is bad" when you're mid-range.
  const curved = clamp(100 * sigmoid01((raw - 50) / 12), 0, 100);

  const left = [
    { name:"Urgency pressure (adjusted by agency)", value: urgencyAdj },
    { name:"Ambiguity stress", value: ambiguity },
    { name:"Attachment intensity", value: attachment },
    { name:"Extra pressure (toggles)", value: clamp(stressBoost*4.0, 0, 100) },
  ];
  const right = [
    { name:"Identity clarity", value: identityClarity },
    { name:"Emotional grounding", value: emotionalGrounding },
    { name:"Flexibility buffer", value: flexibility },
    { name:"Support stability", value: support },
  ];

  const whiplash = clamp(0.42*attachment + 0.36*ambiguity - 0.34*emotionalGrounding, 0, 100);

  return {
    score: curved,
    raw,
    resource,
    demand,
    leftTitle: MODES.clarify.leftTitle,
    rightTitle: MODES.clarify.rightTitle,
    left,
    right,
    whiplash,
  };
}

function computeLocation(s){
  // Resources (Support)
  const buffer = s.buffer;
  const lifestyle = s.lifestyle;
  const supportProx = s.lev;
  const opportunity = s.deal;

  // Demands (Strain)
  const volatility = s.risk;
  const costStrain = s.finance;
  const pull = s.attach;

  const stressBoost =
    (s.stress.timeline ? 6 : 0) +
    (s.stress.compete ? 4 : 0);

  const resource = clamp(
    0.28*lifestyle + 0.24*buffer + 0.24*supportProx + 0.24*opportunity,
    0, 100
  );

  // Pull can be good, but if volatility/cost are high, it becomes destabilizing.
  const pullPenalty = clamp(pull * ((volatility + costStrain) / 200), 0, 100);

  const demand = clamp(
    0.38*costStrain + 0.34*volatility + 0.18*pullPenalty + stressBoost,
    0, 100
  );

  let raw = 50 + (resource - demand) * 0.90;
  if (resource > 75) raw += (resource - 75) * 0.35;

  const curved = clamp(100 * sigmoid01((raw - 50) / 12), 0, 100);

  const left = [
    { name:"Ongoing cost strain", value: costStrain },
    { name:"Volatility exposure", value: volatility },
    { name:"Unhelpful pull (when strain is high)", value: pullPenalty },
  ];
  const right = [
    { name:"Lifestyle alignment", value: lifestyle },
    { name:"Personal buffer", value: buffer },
    { name:"Support proximity", value: supportProx },
    { name:"Opportunity access", value: opportunity },
  ];

  const whiplash = clamp(0.35*volatility + 0.30*costStrain - 0.35*buffer, 0, 100);

  return {
    score: curved,
    raw,
    resource,
    demand,
    leftTitle: MODES.location.leftTitle,
    rightTitle: MODES.location.rightTitle,
    left,
    right,
    whiplash,
  };
}

function computeOffer(s){
  // Mode 3: Preparing an offer on a specific home
  // Resources (Protection)
  const cushion = s.buffer;      // financial cushion
  const safeguards = s.deal;     // protections in writing
  const walkaway = s.lev;        // walk-away power
  const fitRaw = s.lifestyle;    // life fit (this home)

  // Demands (Pressure)
  const tightness = s.finance;   // monthly tightness
  const surprises = s.risk;      // property surprises
  const attachment = s.attach;   // attachment intensity

  // Pressure switches matter most here.
  const stressPressure =
    (s.stress.compete ? 10 : 0) +
    (s.stress.timeline ? 10 : 0) +
    (s.stress.identity ? 8 : 0) +
    (s.stress.repair ? 10 : 0) +
    (s.stress.income ? 10 : 0) +
    (s.stress.rate ? 10 : 0);

  // Fit is meaningful, but not a substitute for protection.
  // Cap the positive impact of fit and reduce it when attachment is high.
  const fitCapped = Math.min(fitRaw, 80);
  const fitEff = clamp(fitCapped * (1 - 0.25 * (attachment / 100)), 0, 100);

  const resource = clamp(
    0.34*cushion + 0.28*safeguards + 0.28*walkaway + 0.10*fitEff,
    0, 100
  );

  // Attachment is a destabilizer; strong cushion reduces its impact.
  const attachImpact = clamp(attachment * (1 - (0.40 * (cushion / 100))), 0, 100);

  // Normalize stress so toggles don't overwhelm everything else.
  const stressNorm = clamp(stressPressure * 1.4, 0, 100);

  const demand = clamp(
    0.30*tightness + 0.28*surprises + 0.26*attachImpact + 0.16*stressNorm,
    0, 100
  );

  let raw = 50 + (resource - demand) * 1.05;
  if (resource > 75) raw += (resource - 75) * 0.50;

  // Curve for human feel
  const curved = clamp(100 * sigmoid01((raw - 50) / 11), 0, 100);

  const left = [
    { name:"Monthly tightness", value: tightness },
    { name:"Property surprises", value: surprises },
    { name:"Attachment intensity (adjusted by cushion)", value: attachImpact },
    { name:"Extra pressure (toggles)", value: stressNorm },
  ];
  const right = [
    { name:"Financial cushion", value: cushion },
    { name:"Protections in writing", value: safeguards },
    { name:"Walk-away power", value: walkaway },
    { name:"Life fit (this home)", value: fitEff },
  ];

  const whiplash = clamp(0.50*attachImpact + 0.30*stressNorm - 0.40*walkaway, 0, 100);

  return {
    score: curved,
    raw,
    resource,
    demand,
    leftTitle: MODES.offer.leftTitle,
    rightTitle: MODES.offer.rightTitle,
    left,
    right,
    whiplash,
  };
}

// ----- BANDS + PALETTE -----
function bandFor(cfg, score){
  for (const b of cfg.bands){
    if (score >= b.min && score <= b.max) return b;
  }
  return cfg.bands[cfg.bands.length - 1];
}

function applyBandUI(band){
  // Set palette state on <html> so CSS can align the whole UI (including sliders) to the current band.
  document.documentElement.setAttribute("data-band", band.key);

  // Pills (no inline colors; CSS owns the palette)
  el.statusPill.textContent = band.name;
  el.statusPill.classList.add("accent");

  el.bandPill.textContent = band.name;
  el.bandPill.classList.add("band");
}

function setBandLabels(cfg){
  // Band names are identical across all modes — no relabeling needed.
  // If modes diverge in the future, use:
  //   el.b0.querySelector("strong").textContent = cfg.bands[0].name;
}


// ----- METER COLORS (align sub-meters to the same band palette) -----
function bandKeyFromScore(score){
  const s = clamp(score, 0, 100);
  if (s <= 30) return "fragile";
  if (s <= 50) return "reactive";
  if (s <= 70) return "managing";
  if (s <= 85) return "stable";
  return "resilient";
}

function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function colorForBand(key){
  const v = cssVar(`--band-${key}`);
  return v || cssVar("--band-resilient");
}

function setMeterPalette(elMeter, key){
  if (!elMeter) return;
  elMeter.style.setProperty("--meterColor", colorForBand(key));
}

function updateStressUIForMode(modeKey){
  const cfg = STRESS_UI[modeKey] || STRESS_UI.offer;
  if (el.stressTitle) el.stressTitle.textContent = cfg.title;

  const map = {
    compete: {
      wrap: el.toggle_compete, input: el.t_compete, lbl: el.lbl_t_compete, sub: el.sub_t_compete,
    },
    timeline: {
      wrap: el.toggle_timeline, input: el.t_timeline, lbl: el.lbl_t_timeline, sub: el.sub_t_timeline,
    },
    identity: {
      wrap: el.toggle_identity, input: el.t_identity, lbl: el.lbl_t_identity, sub: el.sub_t_identity,
    },
    repair: {
      wrap: el.toggle_repair, input: el.t_repair, lbl: el.lbl_t_repair, sub: el.sub_t_repair,
    },
    income: {
      wrap: el.toggle_income, input: el.t_income, lbl: el.lbl_t_income, sub: el.sub_t_income,
    },
    rate: {
      wrap: el.toggle_rate, input: el.t_rate, lbl: el.lbl_t_rate, sub: el.sub_t_rate,
    },
  };

  const showSet = new Set(cfg.show);
  for (const key of Object.keys(map)){
    const t = map[key];
    const isShown = showSet.has(key);
    if (t.wrap) t.wrap.style.display = isShown ? "flex" : "none";

    // When hidden, turn it off so it doesn't affect scores.
    if (!isShown && t.input) t.input.checked = false;

    // Update copy when present.
    const c = cfg.copy[key];
    if (isShown && c){
      if (t.lbl) t.lbl.textContent = c.label;
      if (t.sub) t.sub.textContent = c.sub;
    }
  }

  // "Turn on all pressure" only makes sense in offer mode.
  if (el.btnMaxStress) el.btnMaxStress.style.display = (modeKey === 'offer') ? 'inline-flex' : 'none';
}

// ----- MODE UI -----
function setMode(mKey){
  // Save current mode state before switching
  if (mode && stateByMode[mode]){
    stateByMode[mode] = getState();
  } else if (mode && !stateByMode[mode]){
    stateByMode[mode] = getState();
  }

  mode = mKey;
  const cfg = MODES[mode];

  // aria for buttons
  const setChecked = (btn, checked) => {
    btn.setAttribute("aria-checked", checked ? "true" : "false");
    btn.classList.toggle("isOn", checked);
  };
  setChecked(el.mode_clarify, mode === "clarify");
  setChecked(el.mode_location, mode === "location");
  setChecked(el.mode_offer, mode === "offer");

  // top metric label
  el.pkTitle.textContent = cfg.topMetric;

  // relabel sliders
  for (const k of ["buffer","lifestyle","risk","finance","deal","attach","lev"]){
    el["lbl_"+k].textContent = cfg.sliderMap[k].label;
    el["hint_"+k].textContent = cfg.sliderMap[k].hint;
  }

  // band labels
  setBandLabels(cfg);

  // mode-aligned pressure switch copy + visibility
  updateStressUIForMode(mode);

  // Restore previous positions for this mode, or initialize from defaults once.
  if (!stateByMode[mode]) stateByMode[mode] = stateFromDefaults(mode);
  applyState(stateByMode[mode]);

  updateUI();
}


// ----- PATTERNS -----

function detectPattern(modeKey, s, d){
  // Return a single “active pattern” object that helps the person understand what’s driving
  // the current scores — without sounding like a diagnosis or advice.
  //
  // Rules of thumb:
  // - Summary: one plain-language explanation of what’s happening.
  // - Drivers: 2–3 “because…” statements.
  // - Try: 1–2 low-effort experiments (not prescriptions).

  if (modeKey === "offer"){
    // Offer prep is where attachment + competitiveness most often distort tradeoffs.
    if (s.attach >= 65 && s.lev <= 45){
      return {
        tag: "Hard to let go",
        summary: "This home feels like it has to work out. When a home feels “must-win,” it becomes harder to hold boundaries during negotiation.",
        drivers: [
          "You’re already emotionally invested in this outcome.",
          "Walking away doesn’t feel very real right now."
        ],
        try: [
          "Write one sentence: “I walk away if _____.” Keep it visible while you decide.",
          "Pick one safeguard you won’t trade away (inspection, credit, repair, or price)."
        ]
      };
    }
    if (s.finance >= 65 && s.buffer <= 50){
      return {
        tag: "Tight monthly comfort",
        summary: "The monthly stretch looks heavy compared to your cushion. That can make small setbacks feel big and increase day-to-day stress.",
        drivers: [
          "Monthly stretch is high.",
          "Your cushion is limited if costs rise or the timeline drags."
        ],
        try: [
          "Lower stretch one notch (price, rate, down payment, or debt) and re-check steadiness.",
          "Decide your “sleep well” payment before thinking about competitiveness."
        ]
      };
    }
    if (s.risk >= 60 && s.deal <= 45){
      return {
        tag: "Too many unknowns",
        summary: "There are meaningful unknowns, but protections are light. That increases the chance of regret if surprises appear after you commit.",
        drivers: [
          "Property surprises are high (inspection/maintenance uncertainty).",
          "Deal safeguards are low (less protection in writing)."
        ],
        try: [
          "Choose one protection to keep (inspection window, credit, repairs, or price).",
          "If you waive one safeguard, replace it with another (credit, price, warranty, insurance)."
        ]
      };
    }
    return {
      tag: "Steady enough to proceed",
      summary: "Right now, your protections are keeping up with pressure. You’re more likely to stay steady even if the deal shifts a bit.",
      drivers: [
        "Protection is keeping pace with pressure.",
        "Attachment looks manageable relative to options."
      ],
      try: [
        "Before you submit: name your top 1–2 “must keep” terms.",
        "If pressure toggles turn on, add one protection before increasing commitment."
      ]
    };
  }

  if (modeKey === "clarify"){
    // “Clarifying the change” is identity + uncertainty: protect steadiness and agency.
    if (s.lev >= 65 && s.buffer <= 55){
      return {
        tag: "Rushed without a floor",
        summary: "You may feel a strong need to change quickly, but your grounding isn’t fully in place yet. That can make any option feel urgent.",
        drivers: [
          "Demand/urgency is running high.",
          "Your buffer/grounding isn’t fully supporting you."
        ],
        try: [
          "Name what deadline is real vs. imagined (one sentence each).",
          "Do one stabilizing step first (sleep, schedule, money snapshot) before narrowing."
        ]
      };
    }
    if (s.risk >= 60 && s.lifestyle <= 55){
      return {
        tag: "Unclear direction",
        summary: "There’s a lot of uncertainty and the direction isn’t crisp yet. When the direction is fuzzy, decisions can start to feel heavy and confusing.",
        drivers: [
          "Ambiguity / unknowns are high.",
          "Clarity about what you want is still forming."
        ],
        try: [
          "Write 3 bullets: “I’m moving toward…” (not a plan — just a direction).",
          "Pick one question to answer before you narrow (e.g., commute, support, cost, space)."
        ]
      };
    }
    return {
      tag: "Grounded exploration",
      summary: "You have enough steadiness to explore without forcing commitment. This is a good place to test options and learn what you actually need.",
      drivers: [
        "Your grounding looks supportive.",
        "Demand is present but not dominating."
      ],
      try: [
        "Explore two options in parallel for one week (keeps optionality real).",
        "If attachment rises, pause and name what it represents (safety, identity, relief, status)."
      ]
    };
  }

  // location mode (zip / neighborhood)
  if (s.finance >= 60 && s.lifestyle >= 70){
    return {
      tag: "Fit vs. cost tension",
      summary: "This location might really fit your day-to-day life — and it might also ask more from your budget than feels sustainable long term.",
      drivers: [
        "Lifestyle alignment is high.",
        "Cost reality is pulling up strain."
      ],
      try: [
        "Try one nearby micro-location or housing type that keeps the lifestyle benefits at lower cost.",
        "Choose the top 1–2 location benefits you’d actually pay extra for."
      ]
    };
  }
  if (s.lev <= 45 && s.lifestyle <= 55){
    return {
      tag: "Support may be thin",
      summary: "This location might not support you the way you want. When support feels far away, the move can feel heavier over time.",
      drivers: [
        "Support/connection feels limited here.",
        "Lifestyle alignment isn’t strong enough to offset that."
      ],
      try: [
        "Name one support you’d want within 20 minutes (people, services, community).",
        "Compare a second location that improves support even if it’s less exciting."
      ]
    };
  }
  return {
    tag: "Steady scouting",
    summary: "This looks workable. The key decision is what you want to prioritize as you narrow — cost, fit, support, or flexibility.",
    drivers: [
      "Support is keeping up.",
      "Strain isn’t taking over."
    ],
    try: [
      "Choose your top 2 “must haves” for location before you look at listings.",
      "If strain rises, add buffer (time/money) or adjust expectations rather than forcing it."
    ]
  };
}


// ----- UI RENDER -----
function renderBreakdown(container, items, emphasis = "left"){
  container.innerHTML = "";
  for (const it of items.slice(0, 4)){
    const row = document.createElement("div");
    row.className = "bdRow";
    row.innerHTML = `
      <div class="bdName">${it.name}</div>
      <div class="bdVal">${fmt(it.value)}/100</div>
    `;
    container.appendChild(row);
  }
}

function setBar(elBar, elLine, value){
  // value in 0..100
  elBar.style.width = `${clamp(value, 0, 100)}%`;
  // Show a status label on the sub-text element
  const v = clamp(value, 0, 100);
  elLine.textContent = v >= 70 ? "High" : v >= 40 ? "Moderate" : "Low";
}


function setRangeFill(rangeEl){
  if (!rangeEl) return;
  const min = Number(rangeEl.min || 0);
  const max = Number(rangeEl.max || 100);
  const val = Number(rangeEl.value || 0);
  const p = clamp(((val - min) / (max - min)) * 100, 0, 100);
  // Use current band accent so sliders feel connected to the score state.
  rangeEl.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${p}%, rgba(15,35,32,.18) ${p}%, rgba(15,35,32,.18) 100%)`;
}


function updateUI(){
  if (isHydrating) return;

  const cfg = MODES[mode];
  const s = getState();

  // slider readouts
  el.v_buffer.textContent = s.buffer;
  el.v_lifestyle.textContent = s.lifestyle;
  el.v_risk.textContent = s.risk;
  el.v_finance.textContent = s.finance;
  el.v_deal.textContent = s.deal;
  el.v_attach.textContent = s.attach;
  el.v_lev.textContent = s.lev;

  // color-fill the range tracks so they visually align with the current score band
  setRangeFill(el.buffer);
  setRangeFill(el.lifestyle);
  setRangeFill(el.risk);
  setRangeFill(el.finance);
  setRangeFill(el.deal);
  setRangeFill(el.attach);
  setRangeFill(el.lev);


  const d = compute(mode, s);

  // Top KPI
  el.decisionNum.textContent = fmt(d.score);

  // Status language aligned to resilience framing
  const band = bandFor(cfg, d.score);
  applyBandUI(band);

  el.statusText.textContent = (band.key === "resilient") ? "Strong steadiness"
                       : (band.key === "stable") ? "Mostly steady"
                       : (band.key === "managing") ? "Managing the load"
                       : (band.key === "reactive") ? "Reactive / easily shaken"
                       : "Fragile under stress";

  // marker position
  el.bandMarker.style.left = `${clamp(d.score, 0, 100)}%`;

  // Summary numbers + bars
  el.pressureNum.textContent = fmt(d.demand);
  el.protectionNum.textContent = fmt(d.resource);
  el.whiplashNum.textContent = fmt(d.whiplash);

  el.pressureNum2.textContent = `${fmt(d.demand)}/100`;
  el.protectionNum2.textContent = `${fmt(d.resource)}/100`;

  // Update titles (reuse existing headings in DOM if present)
  const leftTitleEl = document.querySelector("[data-left-title]");
  const rightTitleEl = document.querySelector("[data-right-title]");
  if (leftTitleEl) leftTitleEl.textContent = d.leftTitle;
  if (rightTitleEl) rightTitleEl.textContent = d.rightTitle;

  // Stress pill — count active pressure switches
  if (el.stressPill) {
    const stressKeys = ["t_compete","t_timeline","t_identity","t_repair","t_income","t_rate"];
    const activeCount = stressKeys.filter(k => el[k]?.checked).length;
    el.stressPill.textContent = activeCount === 0 ? "Off" : `${activeCount} on`;
  }

  setBar(el.pressureBar, el.pressureLine, d.demand);
  setBar(el.protectionBar, el.protectionLine, d.resource);

  // Color sub-meters so they visually match the score bands.
  // Pressure: higher is harder, so we invert for "goodness".
  setMeterPalette(el.pressureMeter, bandKeyFromScore(100 - d.demand));
  // Protection: higher is better.
  setMeterPalette(el.protectionMeter, bandKeyFromScore(d.resource));

  renderBreakdown(el.pressureBreakdown, d.left);
  renderBreakdown(el.protectionBreakdown, d.right);

  // Pattern panel
  const pat = detectPattern(mode, s, d);
  el.patternPill.textContent = pat.tag;
  el.patternSummary.textContent = pat.summary;

  el.patternChips.innerHTML = "";
  for (const [idx, chip] of pat.drivers.slice(0,3).entries()){
    const span = document.createElement("div");
    span.className = idx === 0 ? "chip isAccent" : "chip";
    span.textContent = chip;
    el.patternChips.appendChild(span);
  }

  el.patternTry.innerHTML = "";
  for (const tip of pat.try.slice(0,2)){
    const li = document.createElement("li");
    li.textContent = tip;
    el.patternTry.appendChild(li);
  }
}

// ----- EVENTS -----
function bind(){
  // Mode buttons
  el.mode_clarify?.addEventListener("click", () => setMode("clarify"));
  el.mode_location?.addEventListener("click", () => setMode("location"));
  el.mode_offer?.addEventListener("click", () => setMode("offer"));

  // sliders + toggles
  const inputs = [el.buffer, el.lifestyle, el.risk, el.finance, el.deal, el.attach, el.lev,
    el.t_compete, el.t_timeline, el.t_identity, el.t_repair, el.t_income, el.t_rate
  ].filter(Boolean);

  for (const i of inputs){
    i.addEventListener("input", updateUI);
    i.addEventListener("change", updateUI);
  }

  el.btnReset?.addEventListener("click", () => applyDefaults(mode));
  el.btnMaxStress?.addEventListener("click", () => {
    if (el.t_compete) el.t_compete.checked = true;
    if (el.t_timeline) el.t_timeline.checked = true;
    if (el.t_identity) el.t_identity.checked = true;
    if (el.t_repair) el.t_repair.checked = true;
    if (el.t_income) el.t_income.checked = true;
    if (el.t_rate) el.t_rate.checked = true;
    updateUI();
  });

  // Fidelity menu behavior (existing UI)
  el.btnMenu?.addEventListener("click", () => {
    const open = el.fidelityMenu?.getAttribute("aria-hidden") !== "false";
    el.fidelityMenu?.classList.toggle("open", open);
    el.fidelityMenu?.setAttribute("aria-hidden", open ? "false" : "true");
  });

  // Sketch toggle
  const applySketch = (on) => document.body.classList.toggle("sketch", !!on);
  el.t_sketch?.addEventListener("change", () => applySketch(el.t_sketch.checked));
  document.addEventListener("keydown", (e) => {
    if (e.shiftKey && (e.key === "F" || e.key === "f")){
      el.t_sketch.checked = !el.t_sketch.checked;
      applySketch(el.t_sketch.checked);
    }
  });

  // Calibration drawer
  el.btnCal?.addEventListener("click", () => el.calDrawer?.classList.add("open"));
  el.btnCalClose?.addEventListener("click", () => el.calDrawer?.classList.remove("open"));

  // Save as PDF / Print
  el.btnPrint?.addEventListener("click", () => window.print());

}

function init(){
  bind();
  // Seed per-mode memory with defaults (so switching modes preserves your adjustments).
  stateByMode.clarify = stateFromDefaults("clarify");
  stateByMode.location = stateFromDefaults("location");
  stateByMode.offer = stateFromDefaults("offer");

  // Start in offer mode (most concrete rehearsal scenario)
  setMode("offer");
}

init();
