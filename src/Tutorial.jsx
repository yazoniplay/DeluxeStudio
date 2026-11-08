import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { TUTORIAL_STEPS, TUTORIAL_TOTAL, computePlacement, resolveTarget } from './lib/tutorial.js'

const PAD = 6

function Pointer() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 2l15 9-6.5 1.6L9.6 19z" fill="#fff" stroke="#0c121c" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Step-by-step tour that spotlights the exact control to use and points at it.
 * App owns the state (`step`) and moves it forward when the user performs the real action.
 */
export default function Tutorial({ step, onStep, onFinish, dontShow, onDontShow }) {
  const def = TUTORIAL_STEPS[step] || TUTORIAL_STEPS[0]
  const hasTarget = Boolean(def.targets)
  const [rect, setRect] = useState(null)
  const [card, setCard] = useState({ width: 340, height: 220 })
  const [view, setView] = useState({ width: window.innerWidth, height: window.innerHeight })
  const cardRef = useRef(null)

  // Follow the target every frame so the spotlight stays glued to it through
  // scrolling, panel switches and layout changes.
  useEffect(() => {
    if (!hasTarget) {
      setRect(null)
      return undefined
    }
    let frame
    let last = ''
    const tick = () => {
      const el = resolveTarget(document, def.targets)
      if (el) {
        const b = el.getBoundingClientRect()
        const key = [b.left, b.top, b.width, b.height].map(Math.round).join(',')
        if (key !== last) {
          last = key
          setRect({ left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height })
        }
      } else if (last !== 'none') {
        last = 'none'
        setRect(null)
      }
      setView((prev) => (prev.width === window.innerWidth && prev.height === window.innerHeight ? prev : { width: window.innerWidth, height: window.innerHeight }))
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [step, hasTarget, def])

  // Bring the target into view when the step changes (panels switch a moment later).
  useEffect(() => {
    if (!hasTarget) return undefined
    const timers = [60, 320, 700].map((ms) =>
      setTimeout(() => {
        const el = resolveTarget(document, def.targets)
        if (!el) return
        const b = el.getBoundingClientRect()
        if (b.top < 70 || b.bottom > window.innerHeight - 24) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, ms),
    )
    return () => timers.forEach(clearTimeout)
  }, [step, hasTarget, def])

  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return
    const next = { width: el.offsetWidth, height: el.offsetHeight }
    setCard((prev) => (prev.width === next.width && prev.height === next.height ? prev : next))
  })

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onFinish() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFinish])

  const spotlighted = hasTarget && rect
  const place = spotlighted ? computePlacement(rect, card, view) : null
  const cardStyle = place
    ? { top: place.top, left: place.left, '--arrow': place.arrow + 'px' }
    : { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
  const isLast = step === TUTORIAL_STEPS.length - 1
  const eyebrow = step === 0 ? null : `Step ${step} of ${TUTORIAL_TOTAL}`

  return (
    <div className="tour" role="dialog" aria-label="Guided tour" aria-live="polite">
      {spotlighted ? (
        <>
          <div className="tour-spot" style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
          <div className="tour-pointer" style={{ left: rect.left + Math.min(rect.width * 0.5, 72), top: rect.top + rect.height * 0.55 }}>
            <Pointer />
          </div>
        </>
      ) : (
        <div className="tour-dim" />
      )}

      <div ref={cardRef} className={'tour-card ' + (place ? 'is-' + place.placement : 'is-center')} style={cardStyle}>
        <div className="tour-top">
          <span className="tour-eyebrow"><Sparkles size={13} /> {eyebrow || 'Interactive guide'}</span>
          <button className="tour-x" onClick={onFinish} aria-label="Close tutorial"><X size={16} /></button>
        </div>
        <div className="tour-progress" aria-hidden="true">
          {TUTORIAL_STEPS.map((s, i) => <i key={s.id} className={i <= step ? 'done' : ''} />)}
        </div>

        {step === 0 ? (
          <>
            <h2>Build your first menu in 6 steps</h2>
            <p>This tour points at the exact buttons to press. It takes about a minute, and you can skip it any time.</p>
            <label className="tour-check">
              <input type="checkbox" checked={dontShow} onChange={(e) => onDontShow(e.target.checked)} />
              <span>Don’t show this when I open the editor</span>
            </label>
            <div className="tour-actions">
              <button className="tour-link" onClick={onFinish}>Skip tour</button>
              <button className="btn btn-primary" onClick={() => onStep(1)}>Start tour <Sparkles size={14} /></button>
            </div>
          </>
        ) : (
          <>
            <span className={'tour-badge ' + def.action.toLowerCase()}>{def.action}</span>
            <h2>{def.title}</h2>
            <p>{def.body}</p>
            {hasTarget && !rect && <p className="tour-note">Can’t find that control right now. Use “Skip step” to continue.</p>}
            <div className="tour-actions">
              <button className="tour-link" onClick={onFinish}>Skip tour</button>
              <div>
                <button className="btn btn-quiet" onClick={() => onStep(step - 1)}>Back</button>
                {def.advance === 'next' ? (
                  <button className="btn btn-primary" onClick={() => onStep(step + 1)}>Next</button>
                ) : isLast ? (
                  <button className="btn btn-quiet" onClick={onFinish}>Finish</button>
                ) : (
                  <button className="btn btn-quiet" onClick={() => onStep(step + 1)}>Skip step</button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
