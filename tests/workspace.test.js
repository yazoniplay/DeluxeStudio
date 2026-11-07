import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeProject,
  createTemplateConfig,
  getCompatibilityWarnings,
  parseVersion,
  renderPreviewValue,
} from '../src/workspace.js'

const itemWith = (fields) => ({ items: { a: { material: 'STONE', slot: 0, ...fields } } })

test('analyzeProject flags [openguimenu] targets that are not in the project', () => {
  const config = itemWith({ left_click_commands: ['[openguimenu] shop'] })
  const result = analyzeProject(config, ['hub.yml'])
  const refs = result.filter((r) => r.title === 'Menu reference not found')
  assert.equal(refs.length, 1)
  assert.match(refs[0].detail, /"shop"/)
})

test('analyzeProject accepts targets that match a project file with .yml or .yaml', () => {
  const config = itemWith({ left_click_commands: ['[openguimenu] shop', '[openguimenu] Other'] })
  const result = analyzeProject(config, ['shop.yml', 'other.yaml'])
  assert.deepEqual(result.filter((r) => r.title === 'Menu reference not found'), [])
})

test('analyzeProject checks every click command field, including middle click', () => {
  const config = itemWith({ middle_click_commands: ['[openguimenu] ghost'], click_commands: ['[openguimenu] ghost2'] })
  const result = analyzeProject(config, ['hub.yml'])
  assert.equal(result.filter((r) => r.title === 'Menu reference not found').length, 2)
})

test('analyzeProject skips reference checks when no other menus are known', () => {
  const config = itemWith({ left_click_commands: ['[openguimenu] shop'] })
  assert.deepEqual(analyzeProject(config, []), [])
})

test('analyzeProject reports unique placeholders once', () => {
  const config = itemWith({ display_name: '%player_name% %player_name%', lore: ['%vault_eco_balance%'] })
  const info = analyzeProject(config, []).find((r) => r.title === 'Placeholders detected')
  assert.ok(info)
  assert.match(info.detail, /^2 unique/)
})

test('renderPreviewValue substitutes known placeholders and leaves unknown ones', () => {
  const out = renderPreviewValue('Hi %player_name%, %other%', { '%player_name%': 'Steve' })
  assert.equal(out, 'Hi Steve, %other%')
  assert.equal(renderPreviewValue(null, {}), '')
})

test('parseVersion handles release and snapshot labels', () => {
  assert.deepEqual(parseVersion('1.21.4'), [1, 21, 4])
  assert.deepEqual(parseVersion('1.21'), [1, 21, 0])
  assert.deepEqual(parseVersion('26.4 snapshot'), [26, 4, 0])
  assert.equal(parseVersion('latest'), null)
  assert.equal(parseVersion(undefined), null)
})

test('getCompatibilityWarnings warns for newer item fields on older versions', () => {
  const config = itemWith({ tooltip_style: 'minecraft:custom' })
  assert.equal(getCompatibilityWarnings(config, '1.20.4').length, 1)
  assert.equal(getCompatibilityWarnings(config, '1.21.1').length, 1)
})

test('getCompatibilityWarnings is quiet for 1.21.4 and newer, including snapshots', () => {
  const config = itemWith({ tooltip_style: 'minecraft:custom', item_model: 'x:y' })
  assert.deepEqual(getCompatibilityWarnings(config, '1.21.4'), [])
  assert.deepEqual(getCompatibilityWarnings(config, '1.21.11'), [])
  assert.deepEqual(getCompatibilityWarnings(config, '26.4 snapshot'), [])
})

test('getCompatibilityWarnings never throws on unknown versions', () => {
  const config = itemWith({ item_model: 'x:y' })
  assert.deepEqual(getCompatibilityWarnings(config, 'nonsense'), [])
  assert.deepEqual(getCompatibilityWarnings(config, ''), [])
})

test('createTemplateConfig returns a distinct menu per template and falls back to hub', () => {
  for (const id of ['hub', 'ranks', 'rewards', 'profile']) {
    const config = createTemplateConfig(id)
    assert.ok(Object.keys(config.items).length >= 2, id)
    for (const item of Object.values(config.items)) {
      assert.ok(Number.isInteger(item.slot) && item.slot >= 0 && item.slot < config.size, `${id}:${item.material}`)
    }
  }
  assert.equal(createTemplateConfig('nope').menu_title, createTemplateConfig('hub').menu_title)
  assert.notEqual(createTemplateConfig('ranks').menu_title, createTemplateConfig('hub').menu_title)
})
