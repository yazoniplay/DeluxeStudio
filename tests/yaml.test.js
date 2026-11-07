import test from 'node:test'
import assert from 'node:assert/strict'
import yaml from 'js-yaml'
import {
  ACTION_TAG,
  compileToYAML,
  createDefaultConfig,
  createItem,
  parseYAML,
  parseYAMLDetailed,
  validateConfig,
} from '../src/lib/yaml.js'

const baseConfig = (overrides = {}) => ({ ...createDefaultConfig(), ...overrides })

test('ACTION_TAG accepts DeluxeMenus action lines and rejects plain text', () => {
  assert.ok(ACTION_TAG.test('[message] hi'))
  assert.ok(ACTION_TAG.test('[openguimenu] shop'))
  assert.ok(ACTION_TAG.test('[CONSOLE] say hi'))
  assert.ok(!ACTION_TAG.test('message hi'))
  assert.ok(!ACTION_TAG.test('\\[message] hi'))
})

test('validateConfig does not warn about correctly tagged open/close commands', () => {
  const { warnings } = validateConfig(baseConfig({
    open_commands: ['[message] &aWelcome'],
    close_commands: ['[sound] ENTITY_PLAYER_LEVELUP'],
  }))
  assert.deepEqual(warnings.filter((w) => w.includes('action tag')), [])
})

test('validateConfig warns about untagged open/close commands', () => {
  const { warnings } = validateConfig(baseConfig({ open_commands: ['say hi'] }))
  assert.equal(warnings.filter((w) => w.includes('open_commands line 1')).length, 1)
})

test('validateConfig warns about untagged item click commands', () => {
  const config = baseConfig({ items: { a: { material: 'STONE', slot: 0, left_click_commands: ['oops'] } } })
  const { warnings } = validateConfig(config)
  assert.ok(warnings.some((w) => w.includes('a: left_click_commands line 1')))
})

test('validateConfig rejects bad chest sizes and out-of-range slots', () => {
  const { errors } = validateConfig(baseConfig({ size: 10, items: { a: { material: 'STONE', slot: 30 } } }))
  assert.ok(errors.some((e) => e.includes('Menu size must be')))
  assert.ok(errors.some((e) => e.startsWith('a: slot values')))
})

test('validateConfig uses the native slot count for non-chest inventories', () => {
  const config = baseConfig({ inventory_type: 'HOPPER', items: { a: { material: 'STONE', slot: 5 } } })
  const { errors } = validateConfig(config)
  assert.ok(errors.some((e) => e.includes('between 0 and 4 for HOPPER')))
})

test('validateConfig accepts an item that only defines slots', () => {
  const config = baseConfig({ items: { a: { material: 'STONE', slots: [0, 1, 2] } } })
  const { errors } = validateConfig(config)
  assert.deepEqual(errors, [])
})

test('validateConfig warns when two items share a slot', () => {
  const config = baseConfig({ items: { a: { material: 'STONE', slot: 3 }, b: { material: 'DIRT', slot: 3 } } })
  const { warnings } = validateConfig(config)
  assert.ok(warnings.some((w) => w.includes('Slot 3 is shared')))
})

test('validateConfig warns when a requirement has no matching commands', () => {
  const config = baseConfig({ items: { a: { material: 'STONE', slot: 0, left_click_requirement: { requirements: {} } } } })
  const { warnings } = validateConfig(config)
  assert.ok(warnings.some((w) => w.includes('left_click_requirement needs its matching left_click_commands')))
})

test('validateConfig warns when update is on but update_interval is 0', () => {
  const config = baseConfig({ update_interval: 0, items: { a: { material: 'STONE', slot: 0, update: true } } })
  const { warnings } = validateConfig(config)
  assert.ok(warnings.some((w) => w.includes('update_interval is 0')))
})

test('compileToYAML output parses back to the same menu', () => {
  const config = baseConfig({
    menu_title: '&8Round Trip',
    size: 36,
    items: { diamond: createItem('DIAMOND', 13), book: createItem('BOOK', 4) },
  })
  const out = parseYAML(compileToYAML(config))
  assert.equal(out.menu_title, '&8Round Trip')
  assert.equal(out.size, 36)
  assert.deepEqual(Object.keys(out.items).sort(), ['book', 'diamond'])
  assert.equal(out.items.diamond.slot, 13)
  assert.equal(out.items.book.material, 'BOOK')
})

test('compileToYAML sorts items by slot and drops empty fields', () => {
  const config = baseConfig({
    items: {
      late: { material: 'STONE', slot: 20, lore: [], display_name: '' },
      early: { material: 'DIRT', slot: 2 },
    },
  })
  const raw = yaml.load(compileToYAML(config))
  assert.deepEqual(Object.keys(raw.items), ['early', 'late'])
  assert.deepEqual(Object.keys(raw.items.late).sort(), ['material', 'slot'])
})

test('compileToYAML omits size for non-chest inventories', () => {
  const raw = yaml.load(compileToYAML(baseConfig({ inventory_type: 'HOPPER' })))
  assert.equal(raw.inventory_type, 'HOPPER')
  assert.ok(!('size' in raw))
})

test('compileToYAML writes multi-slot items with slots and no slot', () => {
  const config = baseConfig({ items: { fill: { material: 'GLASS_PANE', slot: 0, slots: [1, 2] } } })
  const raw = yaml.load(compileToYAML(config))
  assert.deepEqual(raw.items.fill.slots, [0, 1, 2])
  assert.ok(!('slot' in raw.items.fill))
})

test('parseYAML rejects files without an items section', () => {
  assert.throws(() => parseYAML('menu_title: hi\nsize: 9\n'), /items/)
  assert.throws(() => parseYAML('- just\n- a list\n'), /menu configuration/)
  assert.throws(() => parseYAML(''), /menu configuration/)
})

test('parseYAMLDetailed infers a chest size instead of dropping items when size is missing', () => {
  const source = 'menu_title: x\nitems:\n  a:\n    material: STONE\n    slot: 40\n'
  const { config, skipped } = parseYAMLDetailed(source)
  assert.equal(config.size, 45)
  assert.ok(config.items.a)
  assert.deepEqual(skipped, [])
})

test('parseYAMLDetailed reports items it cannot keep', () => {
  const source = [
    'size: 9',
    'items:',
    '  ok:',
    '    material: STONE',
    '    slot: 1',
    '  tooHigh:',
    '    material: DIRT',
    '    slot: 99',
    '  noSlot:',
    '    material: DIRT',
    '  notAMap: 5',
    '',
  ].join('\n')
  const { config, skipped } = parseYAMLDetailed(source)
  assert.deepEqual(Object.keys(config.items), ['ok'])
  assert.deepEqual(skipped.map((s) => s.key).sort(), ['noSlot', 'notAMap', 'tooHigh'])
})

test('parseYAMLDetailed reports dropped out-of-range slots but keeps the item', () => {
  const source = 'size: 9\nitems:\n  a:\n    material: STONE\n    slots: [0, 1, 50]\n'
  const { config, skipped } = parseYAMLDetailed(source)
  assert.deepEqual(config.items.a.slots, [0, 1])
  assert.equal(config.items.a.slot, 0)
  assert.equal(skipped.length, 1)
  assert.equal(skipped[0].key, 'a')
})

test('parseYAML maps custom_model_data to model_data and defaults material', () => {
  const source = 'size: 9\nitems:\n  a:\n    slot: 0\n    custom_model_data: 7\n'
  const { items } = parseYAML(source)
  assert.equal(items.a.model_data, 7)
  assert.ok(!('custom_model_data' in items.a))
  assert.equal(items.a.material, 'STONE')
})

test('parseYAML validates slots against native non-chest inventories', () => {
  const source = 'inventory_type: HOPPER\nitems:\n  a:\n    material: STONE\n    slot: 4\n  b:\n    material: STONE\n    slot: 9\n'
  const { config, skipped } = parseYAMLDetailed(source)
  assert.ok(config.items.a)
  assert.ok(!config.items.b)
  assert.equal(skipped[0].key, 'b')
})
