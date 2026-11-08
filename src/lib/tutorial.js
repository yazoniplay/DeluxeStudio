// Pure logic for the guided tour: step data, target lookup and card placement.
// Kept free of React so it can be unit-tested with node:test.

export const STARTUP_OPT_OUT_KEY = 'deluxestudio-tutorial-off'

// The tour is shown on every page load unless the visitor opted out.
export function shouldShowTutorial(readStorage) {
  try {
    return readStorage(STARTUP_OPT_OUT_KEY) !== '1'
  } catch {
    return true
  }
}

// `targets` are tried in order; the first visible match gets the spotlight.
// `advance: 'action'` steps move on when the user does the real thing in the editor;
// `advance: 'next'` steps wait for the Next button.
export const TUTORIAL_STEPS = [
  { id: 'welcome' },
  {
    id: 'add',
    action: 'Click',
    advance: 'action',
    targets: ['[data-tutorial-target="add-item"]'],
    title: 'Click “Add item”',
    body: 'This opens the palette of blocks and items you can put in your menu.',
  },
  {
    id: 'pick',
    action: 'Click',
    advance: 'action',
    targets: ['[data-tutorial-target="material-list"] button', '[data-tutorial-target="palette"]'],
    title: 'Pick a block',
    body: 'Click any block to drop it into the next empty slot. You can also drag a block straight onto a slot.',
  },
  {
    id: 'select',
    action: 'Click',
    advance: 'action',
    targets: ['.inventory-slot.is-selected', '.inventory-slot.has-item'],
    title: 'Select your item',
    body: 'Click the highlighted slot to edit that item. Drag items between slots to move them.',
  },
  {
    id: 'name',
    action: 'Type',
    advance: 'next',
    targets: ['[data-tutorial-target="name-field"]', '[data-tutorial-target="properties"]'],
    title: 'Give it a name',
    body: 'Type a name here. Use & codes for style: &b makes it aqua and &l makes it bold, e.g. &b&lShop.',
  },
  {
    id: 'action',
    action: 'Type',
    advance: 'next',
    targets: ['[data-tutorial-target="actions-field"]', '[data-tutorial-target="properties"]'],
    title: 'Choose what a click does',
    body: 'One action per line, e.g. [message] &aHello! to send a message or [close] to close the menu.',
  },
  {
    id: 'export',
    action: 'Click',
    advance: 'action',
    targets: ['[data-tutorial-target="export"]'],
    title: 'Export your menu',
    body: 'Click Export YAML to download the file, put it in your DeluxeMenus folder, then run /dm reload.',
  },
]

// Number of steps after the welcome card.
export const TUTORIAL_TOTAL = TUTORIAL_STEPS.length - 1

function isVisible(el) {
  const box = el.getBoundingClientRect()
  return box.width > 0 && box.height > 0
}

export function resolveTarget(doc, selectors = []) {
  for (const selector of selectors) {
    const match = Array.from(doc.querySelectorAll(selector)).find(isVisible)
    if (match) return match
  }
  return null
}

const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)))

/**
 * Decide where the explanation card goes relative to the spotlighted rectangle.
 * Tries below, above, right, then left; falls back to the side with the most room.
 * Returns { placement, top, left, arrow } where `arrow` is the offset of the pointer
 * along the card edge facing the target.
 */
export function computePlacement(rect, card, view, gap = 16, margin = 12) {
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const space = {
    bottom: view.height - rect.bottom - margin,
    top: rect.top - margin,
    right: view.width - rect.right - margin,
    left: rect.left - margin,
  }
  const need = {
    bottom: card.height + gap,
    top: card.height + gap,
    right: card.width + gap,
    left: card.width + gap,
  }
  const order = ['bottom', 'top', 'right', 'left']
  let placement = order.find((side) => space[side] >= need[side])
  if (!placement) placement = order.reduce((best, side) => (space[side] - need[side] > space[best] - need[best] ? side : best), 'bottom')

  let top
  let left
  if (placement === 'bottom' || placement === 'top') {
    left = clamp(centerX - card.width / 2, margin, view.width - card.width - margin)
    top = placement === 'bottom' ? rect.bottom + gap : rect.top - gap - card.height
    top = clamp(top, margin, view.height - card.height - margin)
  } else {
    top = clamp(centerY - card.height / 2, margin, view.height - card.height - margin)
    left = placement === 'right' ? rect.right + gap : rect.left - gap - card.width
    left = clamp(left, margin, view.width - card.width - margin)
  }

  const arrow =
    placement === 'bottom' || placement === 'top'
      ? clamp(centerX - left, 20, card.width - 20)
      : clamp(centerY - top, 20, card.height - 20)
  return { placement, top, left, arrow }
}
