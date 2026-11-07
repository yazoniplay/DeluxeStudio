import yaml from 'js-yaml'

const quote = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "''")

export function createDefaultConfig() {
  return {
    menu_title: '&8Server Menu',
    open_command: 'menu',
    size: 27,
    update_interval: 0,
    items: {},
  }
}

export function createItem(material = 'DIAMOND', slot = 13) {
  return {
    material,
    slot,
    display_name: '&b&lNew Item',
    lore: ['&7Click to configure this item'],
    left_click_commands: ['[message] &aYou clicked an item!'],
  }
}

export function compileToYAML(config) {
  const output = {
    menu_title: config.menu_title || '&8Untitled Menu',
    open_command: config.open_command || 'menu',
    size: Number(config.size) || 27,
  }
  if (config.update_interval) output.update_interval = Number(config.update_interval)
  if (config.open_requirement) output.open_requirement = config.open_requirement
  if (config.items && Object.keys(config.items).length) {
    output.items = Object.fromEntries(
      Object.entries(config.items)
        .sort((a, b) => Number(a[1]?.slot ?? a[0]) - Number(b[1]?.slot ?? b[0]))
        .map(([key, item]) => {
          const clean = {}
          for (const [field, value] of Object.entries(item || {})) {
            if (value === '' || value == null) continue
            if (Array.isArray(value) && value.length === 0) continue
            clean[field] = value
          }
          return [key, clean]
        }),
    )
  } else {
    output.items = {}
  }
  return yaml.dump(output, {
    noRefs: true,
    lineWidth: -1,
    sortKeys: false,
    quotingType: "'",
    forceQuotes: false,
  })
}

export function parseYAML(source) {
  const parsed = yaml.load(source)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The YAML file must contain a DeluxeMenus menu configuration.')
  }
  if (!parsed.items || typeof parsed.items !== 'object' || Array.isArray(parsed.items)) {
    throw new Error('No valid "items" section was found in this menu.')
  }
  const items = {}
  for (const [key, value] of Object.entries(parsed.items)) {
    if (!value || typeof value !== 'object') continue
    const slot = Number(value.slot)
    if (!Number.isInteger(slot) || slot < 0 || slot >= Number(parsed.size || 54)) continue
    items[key] = { ...value, slot, material: value.material || 'STONE' }
  }
  return {
    ...createDefaultConfig(),
    ...parsed,
    size: [9, 18, 27, 36, 45, 54].includes(Number(parsed.size)) ? Number(parsed.size) : 27,
    items,
  }
}

export function validateConfig(config) {
  const errors = []
  const warnings = []
  if (!String(config.menu_title || '').trim()) errors.push('Menu title is required.')
  if (!String(config.open_command || '').trim()) warnings.push('No open command is set.')
  if (![9, 18, 27, 36, 45, 54].includes(Number(config.size))) errors.push('Menu size must be 9, 18, 27, 36, 45 or 54.')
  const occupied = new Map()
  for (const [key, item] of Object.entries(config.items || {})) {
    const slot = Number(item.slot)
    if (!item.material) errors.push(`${key}: material is missing.`)
    if (!Number.isInteger(slot) || slot < 0 || slot >= Number(config.size)) {
      errors.push(`${key}: slot must be between 0 and ${Number(config.size) - 1}.`)
    }
    if (occupied.has(slot)) warnings.push(`Slots ${slot} is shared by "${occupied.get(slot)}" and "${key}". Check priorities if this is intentional.`)
    else occupied.set(slot, key)
    if (item.slot == null) errors.push(`${key}: slot is required.`)
  }
  return { errors, warnings }
}

export { quote }
