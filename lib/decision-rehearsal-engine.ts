// decision-rehearsal-engine.ts
// Pure TypeScript port of the Decision Rehearsal scoring model.
// No DOM. No side effects. All exports are pure functions or data.

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
const sigmoid01 = (x: number) => 1 / (1 + Math.exp(-x))

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModeKey = 'clarify' | 'location' | 'offer'
export type BandKey = 'fragile' | 'reactive' | 'managing' | 'stable' | 'resilient'

export interface SliderState {
  buffer: number
  lifestyle: number
  risk: number
  finance: number
  deal: number
  attach: number
  lev: number
}

export interface ToggleState {
  t_compete: boolean
  t_timeline: boolean
  t_identity: boolean
  t_repair: boolean
  t_income: boolean
  t_rate: boolean
}

export interface BreakdownItem {
  name: string
  value: number
}

export interface PatternResult {
  tag: string
  summary: string
  drivers: string[]
  try: string[]
}

export interface BandInfo {
  name: string
  key: BandKey
  min: number
  max: number
}

export interface ComputeResult {
  score: number
  raw: number
  resource: number
  demand: number
  leftTitle: string
  rightTitle: string
  left: BreakdownItem[]
  right: BreakdownItem[]
  whiplash: number
  band: BandInfo
  statusText: string
  pattern: PatternResult
}

// ─── Config ───────────────────────────────────────────────────────────────────

const BANDS: BandInfo[] = [
  { name: 'Fragile',   key: 'fragile',   min: 0,  max: 30  },
  { name: 'Reactive',  key: 'reactive',  min: 31, max: 50  },
  { name: 'Managing',  key: 'managing',  min: 51, max: 70  },
  { name: 'Stable',    key: 'stable',    min: 71, max: 85  },
  { name: 'Resilient', key: 'resilient', min: 86, max: 100 },
]

export interface SliderConfig {
  label: string
  hint: string
}

export interface ModeDefaults {
  buffer: number
  lifestyle: number
  risk: number
  finance: number
  deal: number
  attach: number
  lev: number
  stress: Omit<ToggleState, never>
}

export interface ModeConfig {
  key: ModeKey
  name: string
  topMetric: string
  leftTitle: string
  rightTitle: string
  sliderMap: Record<keyof SliderState, SliderConfig>
  defaults: ModeDefaults
}

export const MODES: Record<ModeKey, ModeConfig> = {
  clarify: {
    key: 'clarify',
    name: 'Clarifying the change',
    topMetric: 'Resilience to explore',
    leftTitle: 'Load',
    rightTitle: 'Capacity',
    sliderMap: {
      buffer:    { label: 'Flexibility Buffer',    hint: 'How much slack you have if plans shift (time, money, energy).' },
      lifestyle: { label: 'Identity Clarity',      hint: 'How clear you are on what\'s changing and what you want.' },
      risk:      { label: 'Ambiguity Stress',      hint: 'How much uncertainty is weighing on you right now.' },
      finance:   { label: 'Emotional Grounding',   hint: 'How steady you feel day-to-day while thinking about this.' },
      deal:      { label: 'Support Stability',     hint: 'How supported you feel by people, routines, and logistics.' },
      attach:    { label: 'Attachment Intensity',  hint: 'How much you\'re bonding to a specific outcome too early.' },
      lev:       { label: 'Urgency Pressure',      hint: 'How rushed you feel (internal or external).' },
    },
    defaults: {
      buffer: 82, lifestyle: 84, risk: 30, finance: 82, deal: 78, attach: 28, lev: 26,
      stress: { t_compete: false, t_timeline: false, t_identity: false, t_repair: false, t_income: false, t_rate: false },
    },
  },
  location: {
    key: 'location',
    name: 'Testing a location',
    topMetric: 'Sustainability of Direction',
    leftTitle: 'Strain',
    rightTitle: 'Support',
    sliderMap: {
      buffer:    { label: 'Personal Buffer',      hint: 'If this location surprises you, how much slack do you have?' },
      lifestyle: { label: 'Lifestyle Alignment',  hint: 'Would daily life here support your routines and values?' },
      risk:      { label: 'Volatility Exposure',  hint: 'How uncertain or changeable this location feels (costs, stability).' },
      finance:   { label: 'Ongoing cost strain',  hint: 'How heavy the ongoing costs feel relative to your life.' },
      deal:      { label: 'Opportunity Access',   hint: 'Access to jobs, services, community, and growth.' },
      attach:    { label: 'Pull Toward This Place', hint: 'How emotionally pulled you feel toward living here.' },
      lev:       { label: 'Support Proximity',    hint: 'How close you\'d be to people/support that matter to you.' },
    },
    defaults: {
      buffer: 80, lifestyle: 86, risk: 28, finance: 32, deal: 78, attach: 30, lev: 76,
      stress: { t_compete: false, t_timeline: false, t_identity: false, t_repair: false, t_income: false, t_rate: false },
    },
  },
  offer: {
    key: 'offer',
    name: 'Preparing an offer',
    topMetric: 'Steadiness Under Pressure',
    leftTitle: 'Pressure',
    rightTitle: 'Protection',
    sliderMap: {
      buffer:    { label: 'Financial Cushion',       hint: 'How covered you are if the deal shifts or costs rise.' },
      lifestyle: { label: 'Life fit (this home)',    hint: 'How well this specific home supports your day-to-day life.' },
      risk:      { label: 'Property Surprises',      hint: 'Inspection/maintenance uncertainty and unknowns.' },
      finance:   { label: 'Monthly tightness',       hint: 'How tight the monthly payment feels for your comfort.' },
      deal:      { label: 'Protections in writing',  hint: 'Contingencies, credits, repairs, buydowns—protections you can point to in writing.' },
      attach:    { label: 'Attachment Intensity',    hint: 'How much you feel you "need" this home to work out.' },
      lev:       { label: 'Walk-away Power',         hint: 'How real it feels to walk away (alternatives, time, flexibility).' },
    },
    defaults: {
      buffer: 82, lifestyle: 84, risk: 24, finance: 28, deal: 78, attach: 30, lev: 74,
      stress: { t_compete: false, t_timeline: false, t_identity: false, t_repair: false, t_income: false, t_rate: false },
    },
  },
}

export interface ToggleUICopy {
  label: string
  sub: string
}
export interface StressUIConfig {
  title: string
  show: Array<keyof ToggleState extends `t_${infer K}` ? K : never>
  copy: Partial<Record<string, ToggleUICopy>>
}

export const STRESS_UI: Record<ModeKey, { title: string; show: string[]; copy: Record<string, ToggleUICopy> }> = {
  clarify: {
    title: 'Mindset nudges',
    show: ['timeline', 'identity', 'compete'],
    copy: {
      timeline: { label: 'Need an answer soon',    sub: 'A deadline (real or self-imposed) is pushing speed.' },
      identity: { label: 'Identity swirl',          sub: 'It feels like this change says something big about who you are.' },
      compete:  { label: 'Comparison pressure',     sub: 'Other people\'s timelines or choices are pulling you.' },
    },
  },
  location: {
    title: 'Context stressors',
    show: ['timeline', 'compete', 'identity', 'income'],
    copy: {
      timeline: { label: 'Timing constraint',               sub: 'Work / school / lease timing narrows options.' },
      compete:  { label: 'Market hype',                     sub: 'Noise, headlines, or friends make it feel urgent.' },
      identity: { label: '"This place is the new me"',      sub: 'You\'re projecting a future self onto a location.' },
      income:   { label: 'Budget wobble',                   sub: 'Income or expenses feel uncertain in the near term.' },
    },
  },
  offer: {
    title: 'Pressure switches',
    show: ['compete', 'timeline', 'identity', 'repair', 'income', 'rate'],
    copy: {
      compete:  { label: 'Bidding war vibe',          sub: 'Scarcity / competition energy.' },
      timeline: { label: 'Time pressure',             sub: 'Deadline / forced speed.' },
      identity: { label: '"This is my home" story',  sub: 'Identity projection mode.' },
      repair:   { label: 'Surprise repair',           sub: 'Example: a $15k hit.' },
      income:   { label: 'Income wobble',             sub: 'Temporary dip.' },
      rate:     { label: 'Rate shock',                sub: 'Financing gets harder.' },
    },
  },
}

// ─── Band helpers ─────────────────────────────────────────────────────────────

export function bandFor(score: number): BandInfo {
  const s = clamp(score, 0, 100)
  return BANDS.find(b => s >= b.min && s <= b.max) ?? BANDS[BANDS.length - 1]
}

export function bandKeyFromScore(score: number): BandKey {
  const s = clamp(score, 0, 100)
  if (s <= 30) return 'fragile'
  if (s <= 50) return 'reactive'
  if (s <= 70) return 'managing'
  if (s <= 85) return 'stable'
  return 'resilient'
}

// Band solid colors (for setting --meterColor on sub-meters)
export const BAND_COLORS: Record<BandKey, string> = {
  fragile:   '#e05a6f',
  reactive:  '#f08c57',
  managing:  '#f2c76b',
  stable:    '#2bbfa7',
  resilient: '#1f9f7b',
}

// ─── Internal compute helpers ─────────────────────────────────────────────────

interface ComputeInput extends SliderState {
  stress: {
    compete: boolean
    timeline: boolean
    identity: boolean
    repair: boolean
    income: boolean
    rate: boolean
  }
}

function buildInput(sliders: SliderState, toggles: ToggleState): ComputeInput {
  return {
    ...sliders,
    stress: {
      compete:  toggles.t_compete,
      timeline: toggles.t_timeline,
      identity: toggles.t_identity,
      repair:   toggles.t_repair,
      income:   toggles.t_income,
      rate:     toggles.t_rate,
    },
  }
}

function statusTextFor(key: BandKey): string {
  switch (key) {
    case 'resilient': return 'Strong steadiness'
    case 'stable':    return 'Mostly steady'
    case 'managing':  return 'Managing the load'
    case 'reactive':  return 'Reactive / easily shaken'
    default:          return 'Fragile under stress'
  }
}

// ─── Mode compute functions ───────────────────────────────────────────────────

function computeClarify(s: ComputeInput): Omit<ComputeResult, 'band' | 'statusText' | 'pattern'> {
  const identityClarity   = s.lifestyle
  const emotionalGrounding = s.finance
  const flexibility        = s.buffer
  const support            = s.deal
  const ambiguity          = s.risk
  const attachment         = s.attach
  const urgency            = s.lev

  const stressBoost =
    (s.stress.timeline ? 5 : 0) +
    (s.stress.identity ? 5 : 0) +
    (s.stress.compete  ? 4 : 0)

  const agency     = clamp((flexibility + support) / 2, 0, 100)
  const urgencyAdj = clamp(urgency * (1 - 0.35 * (agency / 100)), 0, 100)

  const resource = clamp(
    0.28 * identityClarity + 0.28 * emotionalGrounding + 0.26 * flexibility + 0.18 * support,
    0, 100,
  )
  const demand = clamp(
    0.33 * attachment + 0.37 * ambiguity + 0.24 * urgencyAdj + stressBoost,
    0, 100,
  )

  let raw = 50 + (resource - demand) * 0.85
  if (resource > 75) raw += (resource - 75) * 0.45

  const score   = clamp(100 * sigmoid01((raw - 50) / 12), 0, 100)
  const whiplash = clamp(0.42 * attachment + 0.36 * ambiguity - 0.34 * emotionalGrounding, 0, 100)

  const left: BreakdownItem[] = [
    { name: 'Urgency pressure (adjusted by agency)', value: urgencyAdj },
    { name: 'Ambiguity stress',                      value: ambiguity },
    { name: 'Attachment intensity',                  value: attachment },
    { name: 'Extra pressure (toggles)',               value: clamp(stressBoost * 4.0, 0, 100) },
  ]
  const right: BreakdownItem[] = [
    { name: 'Identity clarity',       value: identityClarity },
    { name: 'Emotional grounding',    value: emotionalGrounding },
    { name: 'Flexibility buffer',     value: flexibility },
    { name: 'Support stability',      value: support },
  ]

  return {
    score, raw, resource, demand, whiplash,
    leftTitle: MODES.clarify.leftTitle,
    rightTitle: MODES.clarify.rightTitle,
    left, right,
  }
}

function computeLocation(s: ComputeInput): Omit<ComputeResult, 'band' | 'statusText' | 'pattern'> {
  const buffer     = s.buffer
  const lifestyle  = s.lifestyle
  const supportProx = s.lev
  const opportunity = s.deal
  const volatility  = s.risk
  const costStrain  = s.finance
  const pull        = s.attach

  const stressBoost =
    (s.stress.timeline ? 6 : 0) +
    (s.stress.compete  ? 4 : 0)

  const resource = clamp(
    0.28 * lifestyle + 0.24 * buffer + 0.24 * supportProx + 0.24 * opportunity,
    0, 100,
  )

  const pullPenalty = clamp(pull * ((volatility + costStrain) / 200), 0, 100)
  const demand = clamp(
    0.38 * costStrain + 0.34 * volatility + 0.18 * pullPenalty + stressBoost,
    0, 100,
  )

  let raw = 50 + (resource - demand) * 0.90
  if (resource > 75) raw += (resource - 75) * 0.35

  const score    = clamp(100 * sigmoid01((raw - 50) / 12), 0, 100)
  const whiplash = clamp(0.35 * volatility + 0.30 * costStrain - 0.35 * buffer, 0, 100)

  const left: BreakdownItem[] = [
    { name: 'Ongoing cost strain',                      value: costStrain },
    { name: 'Volatility exposure',                      value: volatility },
    { name: 'Unhelpful pull (when strain is high)',     value: pullPenalty },
  ]
  const right: BreakdownItem[] = [
    { name: 'Lifestyle alignment', value: lifestyle },
    { name: 'Personal buffer',     value: buffer },
    { name: 'Support proximity',   value: supportProx },
    { name: 'Opportunity access',  value: opportunity },
  ]

  return {
    score, raw, resource, demand, whiplash,
    leftTitle: MODES.location.leftTitle,
    rightTitle: MODES.location.rightTitle,
    left, right,
  }
}

function computeOffer(s: ComputeInput): Omit<ComputeResult, 'band' | 'statusText' | 'pattern'> {
  const cushion    = s.buffer
  const safeguards = s.deal
  const walkaway   = s.lev
  const fitRaw     = s.lifestyle
  const tightness  = s.finance
  const surprises  = s.risk
  const attachment = s.attach

  const stressPressure =
    (s.stress.compete   ? 10 : 0) +
    (s.stress.timeline  ? 10 : 0) +
    (s.stress.identity  ?  8 : 0) +
    (s.stress.repair    ? 10 : 0) +
    (s.stress.income    ? 10 : 0) +
    (s.stress.rate      ? 10 : 0)

  const fitCapped  = Math.min(fitRaw, 80)
  const fitEff     = clamp(fitCapped * (1 - 0.25 * (attachment / 100)), 0, 100)

  const resource = clamp(
    0.34 * cushion + 0.28 * safeguards + 0.28 * walkaway + 0.10 * fitEff,
    0, 100,
  )

  const attachImpact = clamp(attachment * (1 - 0.40 * (cushion / 100)), 0, 100)
  const stressNorm   = clamp(stressPressure * 1.4, 0, 100)

  const demand = clamp(
    0.30 * tightness + 0.28 * surprises + 0.26 * attachImpact + 0.16 * stressNorm,
    0, 100,
  )

  let raw = 50 + (resource - demand) * 1.05
  if (resource > 75) raw += (resource - 75) * 0.50

  const score    = clamp(100 * sigmoid01((raw - 50) / 11), 0, 100)
  const whiplash = clamp(0.50 * attachImpact + 0.30 * stressNorm - 0.40 * walkaway, 0, 100)

  const left: BreakdownItem[] = [
    { name: 'Monthly tightness',                           value: tightness },
    { name: 'Property surprises',                          value: surprises },
    { name: 'Attachment intensity (adjusted by cushion)',   value: attachImpact },
    { name: 'Extra pressure (toggles)',                    value: stressNorm },
  ]
  const right: BreakdownItem[] = [
    { name: 'Financial cushion',       value: cushion },
    { name: 'Protections in writing',  value: safeguards },
    { name: 'Walk-away power',         value: walkaway },
    { name: 'Life fit (this home)',    value: fitEff },
  ]

  return {
    score, raw, resource, demand, whiplash,
    leftTitle: MODES.offer.leftTitle,
    rightTitle: MODES.offer.rightTitle,
    left, right,
  }
}

// ─── Pattern detection ────────────────────────────────────────────────────────

function detectPattern(mode: ModeKey, sliders: SliderState, toggles: ToggleState): PatternResult {
  const s = sliders

  if (mode === 'offer') {
    if (s.attach >= 65 && s.lev <= 45) {
      return {
        tag: 'Hard to let go',
        summary: 'This home feels like it has to work out. When a home feels "must-win," it becomes harder to hold boundaries during negotiation.',
        drivers: [
          'You\'re already emotionally invested in this outcome.',
          'Walking away doesn\'t feel very real right now.',
        ],
        try: [
          'Write one sentence: "I walk away if _____." Keep it visible while you decide.',
          'Pick one safeguard you won\'t trade away (inspection, credit, repair, or price).',
        ],
      }
    }
    if (s.finance >= 65 && s.buffer <= 50) {
      return {
        tag: 'Tight monthly comfort',
        summary: 'The monthly stretch looks heavy compared to your cushion. That can make small setbacks feel big and increase day-to-day stress.',
        drivers: [
          'Monthly stretch is high.',
          'Your cushion is limited if costs rise or the timeline drags.',
        ],
        try: [
          'Lower stretch one notch (price, rate, down payment, or debt) and re-check steadiness.',
          'Decide your "sleep well" payment before thinking about competitiveness.',
        ],
      }
    }
    if (s.risk >= 60 && s.deal <= 45) {
      return {
        tag: 'Too many unknowns',
        summary: 'There are meaningful unknowns, but protections are light. That increases the chance of regret if surprises appear after you commit.',
        drivers: [
          'Property surprises are high (inspection/maintenance uncertainty).',
          'Deal safeguards are low (less protection in writing).',
        ],
        try: [
          'Choose one protection to keep (inspection window, credit, repairs, or price).',
          'If you waive one safeguard, replace it with another (credit, price, warranty, insurance).',
        ],
      }
    }
    return {
      tag: 'Steady enough to proceed',
      summary: 'Right now, your protections are keeping up with pressure. You\'re more likely to stay steady even if the deal shifts a bit.',
      drivers: [
        'Protection is keeping pace with pressure.',
        'Attachment looks manageable relative to options.',
      ],
      try: [
        'Before you submit: name your top 1–2 "must keep" terms.',
        'If pressure toggles turn on, add one protection before increasing commitment.',
      ],
    }
  }

  if (mode === 'clarify') {
    if (s.lev >= 65 && s.buffer <= 55) {
      return {
        tag: 'Rushed without a floor',
        summary: 'You may feel a strong need to change quickly, but your grounding isn\'t fully in place yet. That can make any option feel urgent.',
        drivers: [
          'Demand/urgency is running high.',
          'Your buffer/grounding isn\'t fully supporting you.',
        ],
        try: [
          'Name what deadline is real vs. imagined (one sentence each).',
          'Do one stabilizing step first (sleep, schedule, money snapshot) before narrowing.',
        ],
      }
    }
    if (s.risk >= 60 && s.lifestyle <= 55) {
      return {
        tag: 'Unclear direction',
        summary: 'There\'s a lot of uncertainty and the direction isn\'t crisp yet. When the direction is fuzzy, decisions can start to feel heavy and confusing.',
        drivers: [
          'Ambiguity / unknowns are high.',
          'Clarity about what you want is still forming.',
        ],
        try: [
          'Write 3 bullets: "I\'m moving toward…" (not a plan — just a direction).',
          'Pick one question to answer before you narrow (e.g., commute, support, cost, space).',
        ],
      }
    }
    return {
      tag: 'Grounded exploration',
      summary: 'You have enough steadiness to explore without forcing commitment. This is a good place to test options and learn what you actually need.',
      drivers: [
        'Your grounding looks supportive.',
        'Demand is present but not dominating.',
      ],
      try: [
        'Explore two options in parallel for one week (keeps optionality real).',
        'If attachment rises, pause and name what it represents (safety, identity, relief, status).',
      ],
    }
  }

  // location mode
  if (s.finance >= 60 && s.lifestyle >= 70) {
    return {
      tag: 'Fit vs. cost tension',
      summary: 'This location might really fit your day-to-day life — and it might also ask more from your budget than feels sustainable long term.',
      drivers: [
        'Lifestyle alignment is high.',
        'Cost reality is pulling up strain.',
      ],
      try: [
        'Try one nearby micro-location or housing type that keeps the lifestyle benefits at lower cost.',
        'Choose the top 1–2 location benefits you\'d actually pay extra for.',
      ],
    }
  }
  if (s.lev <= 45 && s.lifestyle <= 55) {
    return {
      tag: 'Support may be thin',
      summary: 'This location might not support you the way you want. When support feels far away, the move can feel heavier over time.',
      drivers: [
        'Support/connection feels limited here.',
        'Lifestyle alignment isn\'t strong enough to offset that.',
      ],
      try: [
        'Name one support you\'d want within 20 minutes (people, services, community).',
        'Compare a second location that improves support even if it\'s less exciting.',
      ],
    }
  }
  return {
    tag: 'Steady scouting',
    summary: 'This looks workable. The key decision is what you want to prioritize as you narrow — cost, fit, support, or flexibility.',
    drivers: [
      'Support is keeping up.',
      'Strain isn\'t taking over.',
    ],
    try: [
      'Choose your top 2 "must haves" for location before you look at listings.',
      'If strain rises, add buffer (time/money) or adjust expectations rather than forcing it.',
    ],
  }
}

// ─── Public compute ───────────────────────────────────────────────────────────

export function compute(mode: ModeKey, sliders: SliderState, toggles: ToggleState): ComputeResult {
  const s = buildInput(sliders, toggles)
  let partial: Omit<ComputeResult, 'band' | 'statusText' | 'pattern'>

  if (mode === 'clarify')  partial = computeClarify(s)
  else if (mode === 'location') partial = computeLocation(s)
  else partial = computeOffer(s)

  const band       = bandFor(partial.score)
  const statusText = statusTextFor(band.key)
  const pattern    = detectPattern(mode, sliders, toggles)

  return { ...partial, band, statusText, pattern }
}
