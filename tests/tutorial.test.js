import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STARTUP_OPT_OUT_KEY,
  TUTORIAL_STEPS,
  TUTORIAL_TOTAL,
  computePlacement,
  shouldShowTutorial,
} from '../src/lib/tutorial.js'

const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height })
const view = { width: 1366, height: 640 }
const card = { width: 340, height: 220 }

test('tour shows on every load unless the visitor opted out', () => {
  assert.equal(shouldShowTutorial(() => null), true)
  assert.equal(shouldShowTutorial(() => ''), true)
  assert.equal(shouldShowTutorial((key) => (key === STARTUP_OPT_OUT_KEY ? '1' : null)), false)
  assert.equal(shouldShowTutorial(() => { throw new Error('storage blocked') }), true)
})

test('every step after the welcome has a target, a title, an action and an advance mode', () => {
  assert.equal(TUTORIAL_TOTAL, TUTORIAL_STEPS.length - 1)
  for (const step of TUTORIAL_STEPS.slice(1)) {
    assert.ok(step.targets.length >= 1, step.id)
    assert.ok(step.title && step.body, step.id)
    assert.ok(['Click', 'Type'].includes(step.action), step.id)
    assert.ok(['action', 'next'].includes(step.advance), step.id)
  }
  assert.equal(new Set(TUTORIAL_STEPS.map((s) => s.id)).size, TUTORIAL_STEPS.length)
})

test('card goes below the target when there is room', () => {
  const out = computePlacement(box(500, 100, 120, 40), card, view)
  assert.equal(out.placement, 'bottom')
  assert.equal(out.top, 140 + 16)
})

test('card flips above when the target is near the bottom', () => {
  const out = computePlacement(box(500, 560, 120, 40), card, view)
  assert.equal(out.placement, 'top')
  assert.ok(out.top + card.height <= 560)
})

test('card goes beside a tall target that leaves no room above or below', () => {
  const out = computePlacement(box(40, 20, 300, 600), card, view)
  assert.equal(out.placement, 'right')
  assert.ok(out.left >= 340)
})

test('card never leaves the viewport, even for targets at the edges', () => {
  const targets = [box(0, 0, 40, 40), box(1326, 0, 40, 40), box(0, 600, 40, 40), box(1326, 600, 40, 40), box(600, 300, 1200, 900)]
  for (const target of targets) {
    const out = computePlacement(target, card, view)
    assert.ok(out.left >= 12 && out.left + card.width <= view.width - 12, JSON.stringify(target))
    assert.ok(out.top >= 12 && out.top + card.height <= view.height - 12, JSON.stringify(target))
  }
})

test('arrow offset stays inside the card edge and points at the target centre', () => {
  const out = computePlacement(box(500, 100, 120, 40), card, view)
  assert.ok(out.arrow >= 20 && out.arrow <= card.width - 20)
  assert.equal(Math.round(out.left + out.arrow), 560)
  const edge = computePlacement(box(1326, 100, 40, 40), card, view)
  assert.ok(edge.arrow >= 20 && edge.arrow <= card.width - 20)
})

test('placement works on a phone-sized viewport', () => {
  const phone = { width: 390, height: 800 }
  const small = { width: 366, height: 230 }
  const out = computePlacement(box(20, 700, 350, 44), small, phone)
  assert.equal(out.placement, 'top')
  assert.ok(out.left >= 12 && out.left + small.width <= phone.width - 12)
})
