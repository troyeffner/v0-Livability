'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  MODES,
  STRESS_UI,
  BAND_COLORS,
  bandKeyFromScore,
  compute,
  type ModeKey,
  type SliderState,
  type ToggleState,
} from '@/lib/decision-rehearsal-engine'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModeMemory = Partial<Record<ModeKey, { sliders: SliderState; toggles: ToggleState }>>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultSliders(mode: ModeKey): SliderState {
  const d = MODES[mode].defaults
  return { buffer: d.buffer, lifestyle: d.lifestyle, risk: d.risk, finance: d.finance, deal: d.deal, attach: d.attach, lev: d.lev }
}

function defaultToggles(mode: ModeKey): ToggleState {
  return { ...MODES[mode].defaults.stress }
}

/** Returns a CSS linear-gradient string for a range thumb fill. */
function sliderFill(value: number): string {
  const p = Math.max(0, Math.min(100, value))
  return `linear-gradient(to right, var(--accent) 0%, var(--accent) ${p}%, rgba(15,35,32,.18) ${p}%, rgba(15,35,32,.18) 100%)`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SliderRowProps {
  id: keyof SliderState
  label: string
  hint: string
  value: number
  onChange: (key: keyof SliderState, val: number) => void
}

function SliderRow({ id, label, hint, value, onChange }: SliderRowProps) {
  return (
    <div className="row">
      <div className="row-top">
        <div className="label">{label}</div>
        <div className="value"><span>{Math.round(value)}</span>/100</div>
      </div>
      <input
        type="range"
        min={0} max={100}
        value={value}
        style={{ background: sliderFill(value) }}
        onChange={e => onChange(id, Number(e.target.value))}
      />
      <div className="hint">{hint}</div>
    </div>
  )
}

interface ToggleRowProps {
  id: string
  label: string
  sub: string
  checked: boolean
  visible: boolean
  onChange: (key: string, val: boolean) => void
}

function ToggleRow({ id, label, sub, checked, visible, onChange }: ToggleRowProps) {
  if (!visible) return null
  return (
    <div className="toggle">
      <div>
        <label htmlFor={id}>{label}</label>
        <small>{sub}</small>
      </div>
      <label className="switch" aria-label={`Toggle ${label}`}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(id, e.target.checked)}
        />
        <span className="slider" />
      </label>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DrPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [mode, setModeState] = useState<ModeKey>('offer')
  const [sliders, setSliders] = useState<SliderState>(() => defaultSliders('offer'))
  const [toggles, setToggles] = useState<ToggleState>(() => defaultToggles('offer'))
  const [isSketch, setIsSketch] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCalOpen, setIsCalOpen] = useState(false)

  // Per-mode memory: preserve slider/toggle positions across mode switches
  const modeMemory = useRef<ModeMemory>({
    clarify:  { sliders: defaultSliders('clarify'),  toggles: defaultToggles('clarify') },
    location: { sliders: defaultSliders('location'), toggles: defaultToggles('location') },
    offer:    { sliders: defaultSliders('offer'),    toggles: defaultToggles('offer') },
  })

  // ── Scoring ────────────────────────────────────────────────────────────────
  const result = useMemo(() => compute(mode, sliders, toggles), [mode, sliders, toggles])

  // ── Mode switching ─────────────────────────────────────────────────────────
  const switchMode = useCallback((next: ModeKey) => {
    // Save current state
    modeMemory.current[mode] = { sliders, toggles }
    // Restore next or use defaults
    const mem = modeMemory.current[next]
    setModeState(next)
    setSliders(mem?.sliders ?? defaultSliders(next))
    setToggles(mem?.toggles ?? defaultToggles(next))
  }, [mode, sliders, toggles])

  // ── Slider handler ─────────────────────────────────────────────────────────
  const handleSlider = useCallback((key: keyof SliderState, val: number) => {
    setSliders(prev => ({ ...prev, [key]: val }))
  }, [])

  // ── Toggle handler ─────────────────────────────────────────────────────────
  const handleToggle = useCallback((id: string, val: boolean) => {
    // id is like "t_compete" — map back to ToggleState key
    const key = id as keyof ToggleState
    setToggles(prev => ({ ...prev, [key]: val }))
  }, [])

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setSliders(defaultSliders(mode))
    setToggles(defaultToggles(mode))
    modeMemory.current[mode] = {
      sliders: defaultSliders(mode),
      toggles: defaultToggles(mode),
    }
  }, [mode])

  // ── Max stress ─────────────────────────────────────────────────────────────
  const handleMaxStress = useCallback(() => {
    setToggles({
      t_compete: true, t_timeline: true, t_identity: true,
      t_repair: true,  t_income: true,  t_rate: true,
    })
  }, [])

  // ── Keyboard shortcut (Shift+F → toggle sketch) ───────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        setIsSketch(s => !s)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Close menu on outside click ───────────────────────────────────────────
  useEffect(() => {
    if (!isMenuOpen) return
    const handler = (e: MouseEvent) => {
      const menu = document.getElementById('dr-options-menu')
      const btn  = document.getElementById('dr-menu-btn')
      if (menu && !menu.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [isMenuOpen])

  // ── Derived values ─────────────────────────────────────────────────────────
  const { score, demand, resource, whiplash, band, statusText, pattern, left, right, leftTitle, rightTitle } = result

  const modeConfig   = MODES[mode]
  const stressUI     = STRESS_UI[mode]
  const activeCount  = Object.values(toggles).filter(Boolean).length
  const stressPillText = activeCount === 0 ? 'Off' : `${activeCount} on`

  // Marker position on band bar
  const markerLeft = `${Math.max(0, Math.min(100, score))}%`

  // Sub-meter colors
  const pressureMeterColor  = BAND_COLORS[bandKeyFromScore(100 - demand)]
  const protectionMeterColor = BAND_COLORS[bandKeyFromScore(resource)]

  const pressureLabel   = demand  >= 70 ? 'High' : demand  >= 40 ? 'Moderate' : 'Low'
  const protectionLabel = resource >= 70 ? 'High' : resource >= 40 ? 'Moderate' : 'Low'

  // Band label active class
  const activeBandIdx = ['fragile','reactive','managing','stable','resilient'].indexOf(band.key)

  return (
    <div
      id="dr-root"
      data-band={band.key}
      className={isSketch ? 'sketch' : undefined}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header>
        <div className="headerRow">
          <h1>Navigating a Change — Decision Rehearsal</h1>
          <div className="headerActions">
            <button
              id="dr-menu-btn"
              className="iconbtn secondary"
              aria-label="Open options"
              onClick={() => setIsMenuOpen(o => !o)}
            >
              ⋯
            </button>
            <div
              id="dr-options-menu"
              className={`menu${isMenuOpen ? ' open' : ''}`}
              aria-hidden={!isMenuOpen}
            >
              <div className="menuTitle">Options</div>
              <div className="menuRow">
                <div>
                  <div className="menuLabel">Sketch view</div>
                  <div className="menuHelp">Use for conceptual interviews.</div>
                </div>
                <label className="switch" aria-label="Toggle sketch view">
                  <input
                    type="checkbox"
                    checked={isSketch}
                    onChange={e => setIsSketch(e.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </div>

              <div className="menuRow" style={{ marginTop: 10 }}>
                <div>
                  <div className="menuLabel">Save as PDF</div>
                  <div className="menuHelp">Opens your browser print dialog.</div>
                </div>
                <button className="secondary" type="button" onClick={() => window.print()}>
                  Print
                </button>
              </div>

              <div className="menuHint">
                Tip: Press <strong>Shift</strong> + <strong>F</strong> to toggle.
              </div>
            </div>
          </div>
        </div>

        <p>
          <strong>What this is:</strong> a rehearsal map for decision pressure.<br />
          <strong>What this isn&apos;t:</strong> financial advice or a prediction engine.
        </p>

        <div className="modeBar" role="radiogroup" aria-label="Where are you right now?">
          <div className="modePrompt">Where are you right now?</div>
          <div className="modeButtons">
            {(['clarify', 'location', 'offer'] as ModeKey[]).map(m => (
              <button
                key={m}
                className="modeBtn"
                type="button"
                role="radio"
                aria-checked={mode === m ? 'true' : 'false'}
                onClick={() => switchMode(m)}
              >
                {MODES[m].name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Two-column layout ──────────────────────────────────────────────── */}
      <div className="layout">

        {/* Left — Controls */}
        <section className="card">
          <div className="controls">
            <div className="section-title">
              <h2>Your sliders</h2>
              <div className="pill accent">Rehearsal mode</div>
            </div>

            {/* Sliders */}
            {(Object.keys(modeConfig.sliderMap) as (keyof SliderState)[]).map(key => (
              <SliderRow
                key={key}
                id={key}
                label={modeConfig.sliderMap[key].label}
                hint={modeConfig.sliderMap[key].hint}
                value={sliders[key]}
                onChange={handleSlider}
              />
            ))}

            {/* Pressure switches */}
            <div className="section-title" style={{ marginTop: 14 }}>
              <h2>{stressUI.title}</h2>
              <div className="pill">{stressPillText}</div>
            </div>

            <div className="grid2">
              {(['compete', 'timeline', 'identity', 'repair', 'income', 'rate'] as const).map(key => {
                const toggleKey = `t_${key}` as keyof ToggleState
                const copy = stressUI.copy[key]
                const visible = stressUI.show.includes(key)
                return (
                  <ToggleRow
                    key={key}
                    id={toggleKey}
                    label={copy?.label ?? key}
                    sub={copy?.sub ?? ''}
                    checked={toggles[toggleKey]}
                    visible={visible}
                    onChange={handleToggle}
                  />
                )
              })}
            </div>

            <div className="btnrow">
              <button className="secondary" type="button" onClick={handleReset}>
                Reset
              </button>
              {mode === 'offer' && (
                <button className="danger" type="button" onClick={handleMaxStress}>
                  Turn on all pressure
                </button>
              )}
            </div>

            <div className="smallprint">
              This is a simplified rehearsal map. It&apos;s here to help you think clearly
              under pressure — not to predict outcomes.
            </div>
          </div>
        </section>

        {/* Right — Visualizations */}
        <section className="card">
          <div className="viz">

            {/* Primary KPI */}
            <div className="primaryKPI">
              <div className="pkTop">
                <div className="pkTitle">{modeConfig.topMetric}</div>
                <div className="pkValue">{Math.round(score)}/100</div>
              </div>

              <div className="pkStatusRow">
                <div className="pkStatusLeft">
                  <div className="pkStatus">{statusText}</div>
                  <div className="pill accent">{band.name}</div>
                </div>
                <div className="pill band">{band.name}</div>
              </div>

              <div className="pkSub">
                {modeConfig.topMetric}: how OK you&apos;ll be if the deal shifts, drags, or fails.
              </div>

              {/* Band bar */}
              <div className="bandsWrap" aria-label="Score bands visualization">
                <div className="bandsTop">
                  <div className="t">Score bands</div>
                  <div className="m">Marker shows where you are right now.</div>
                </div>
                <div
                  className="bandBar"
                  role="img"
                  aria-label="Bands: 0–30 Overloaded, 31–50 Strained, 51–70 Managing, 71–85 Steady, 86–100 Resilient"
                >
                  <div className="seg fragile" />
                  <div className="seg reactive" />
                  <div className="seg managing" />
                  <div className="seg stable" />
                  <div className="seg resilient" />
                  <div className="bandMarker" style={{ left: markerLeft }} />
                </div>
                <div className="bandLabels">
                  {[
                    { label: 'Overloaded', range: '0–30' },
                    { label: 'Strained',   range: '31–50' },
                    { label: 'Managing',   range: '51–70' },
                    { label: 'Steady',     range: '71–85' },
                    { label: 'Resilient',  range: '86–100' },
                  ].map((b, i) => (
                    <div key={b.label} className={`b${i === activeBandIdx ? ' active' : ''}`}>
                      <strong>{b.label}</strong>
                      <span className="r">{b.range}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini metrics */}
              <div className="pkMiniRow">
                <div className="mini">
                  <div className="k">Pressure</div>
                  <div className="v">{Math.round(demand)}/100</div>
                </div>
                <div className="mini">
                  <div className="k">Protection</div>
                  <div className="v">{Math.round(resource)}/100</div>
                </div>
                <div className="mini">
                  <div className="k">Emotional Whiplash</div>
                  <div className="v">{Math.round(whiplash)}/100</div>
                </div>
              </div>

              {/* Calibration note */}
              <div className="calNote">
                <div>
                  <strong>Calibration note:</strong> these numbers don&apos;t measure your emotions.
                  They approximate <strong>decision pressure</strong> — how likely you are to feel
                  steady vs. reactive if the deal changes.
                </div>
                <button className="linkbtn" type="button" onClick={() => setIsCalOpen(o => !o)}>
                  {isCalOpen ? 'Close' : 'Details'}
                </button>
              </div>

              {/* Calibration drawer */}
              <div className={`drawer${isCalOpen ? ' open' : ''}`} aria-label="Score calibration panel">
                <div className="dhead">
                  <div className="t">Score calibration (quick)</div>
                  <button className="linkbtn" type="button" onClick={() => setIsCalOpen(false)}>
                    Close
                  </button>
                </div>
                <div className="dbody">
                  {[
                    { name: 'Overloaded — "This could knock you over."', range: '0–19',
                      desc: 'High urgency + low protection. People tend to rush, concede, or avoid hard info.',
                      tip: 'Best move: strengthen one protector before deciding.' },
                    { name: 'Strained — "You can still steer, but it\'s hard."', range: '20–39',
                      desc: 'You may feel pulled toward concessions. External pressure can take over.',
                      tip: 'Best move: add one real option or one safeguard.' },
                    { name: 'Managing — "Mostly okay, but spikes are likely."', range: '40–59',
                      desc: 'Usually fine, but one weak spot can flip you into urgency.',
                      tip: 'Best move: stabilize your weakest link.' },
                    { name: 'Steady — "You\'ll be okay either way."', range: '60–79',
                      desc: 'You can negotiate without panic. Losing the deal would sting, not destabilize.',
                      tip: 'Best move: protect what\'s working (don\'t trade away safeguards under urgency).' },
                    { name: 'Resilient — "This decision can\'t break you."', range: '80–100',
                      desc: 'Strong safety net + strong safeguards + real options. You can walk away cleanly.',
                      tip: 'Best move: optimize for fit without losing stability.' },
                  ].map((b, i) => (
                    <div key={i} className="band" style={i === 4 ? { marginBottom: 0 } : undefined}>
                      <div className="btop">
                        <div className="name">{b.name}</div>
                        <div className="range">{b.range}</div>
                      </div>
                      <div>{b.desc}</div>
                      <ul><li>{b.tip}</li></ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pressure + Protection meters */}
            <div className="stage" style={{ minHeight: 'auto' }}>
              <div className="dash">
                {/* Pressure meter */}
                <div
                  className="meter cardish"
                  style={{ '--meterColor': pressureMeterColor } as React.CSSProperties}
                >
                  <div className="mtop">
                    <div className="mname">
                      {leftTitle}{' '}
                      <span style={{ color: 'rgba(170,179,200,.9)', fontWeight: 650 }}>
                        (urgency + risk + pull)
                      </span>
                    </div>
                    <div className="mval">{Math.round(demand)}/100</div>
                  </div>
                  <div className="bar">
                    <div
                      className="fill"
                      style={{ width: `${Math.max(0, Math.min(100, demand))}%` }}
                    />
                  </div>
                  <div className="msub">{pressureLabel}</div>
                  <div className="breakdown">
                    {left.slice(0, 4).map((item, i) => (
                      <div key={i} className="item">
                        <div className="left">
                          <div className="t">{item.name}</div>
                        </div>
                        <div className="n">{Math.round(item.value)}/100</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Protection meter */}
                <div
                  className="meter cardish"
                  style={{ '--meterColor': protectionMeterColor } as React.CSSProperties}
                >
                  <div className="mtop">
                    <div className="mname">
                      {rightTitle}{' '}
                      <span style={{ color: 'rgba(170,179,200,.9)', fontWeight: 650 }}>
                        (safety + safeguards + options)
                      </span>
                    </div>
                    <div className="mval">{Math.round(resource)}/100</div>
                  </div>
                  <div className="bar">
                    <div
                      className="fill"
                      style={{ width: `${Math.max(0, Math.min(100, resource))}%` }}
                    />
                  </div>
                  <div className="msub">{protectionLabel}</div>
                  <div className="breakdown">
                    {right.slice(0, 4).map((item, i) => (
                      <div key={i} className="item">
                        <div className="left">
                          <div className="t">{item.name}</div>
                        </div>
                        <div className="n">{Math.round(item.value)}/100</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pattern panel */}
            <div className="pattern">
              <div className="pattern-top">
                <div className="title">Active Pattern</div>
                <div className="pill">{pattern.tag}</div>
              </div>
              <p>{pattern.summary}</p>
              <div className="chips">
                {pattern.drivers.slice(0, 3).map((driver, i) => (
                  <div key={i} className={`chip${i === 0 ? ' isAccent' : ''}`}>
                    {driver}
                  </div>
                ))}
              </div>
              <div className="try">
                <div className="h">Try next</div>
                <ul>
                  {pattern.try.slice(0, 2).map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  )
}
