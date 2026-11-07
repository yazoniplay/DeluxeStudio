import yaml from 'js-yaml'

export const CHEST_SIZES = [9, 18, 27, 36, 45, 54]

// A DeluxeMenus action line starts with a bracketed tag, e.g. "[message] Hello".
export const ACTION_TAG = /^\[[a-z_]+\]/i

const NATIVE_SLOT_COUNTS = {
  HOPPER: 5, ANVIL: 3, BEACON: 1, BLAST_FURNACE: 3, BREWING: 5, CARTOGRAPHY: 3,
  DISPENSER: 9, DROPPER: 9, ENCHANTING: 2, ENDER_CHEST: 27, FURNACE: 3, GRINDSTONE: 3,
  LOOM: 4, PLAYER: 36, BARREL: 27, SHULKER_BOX: 27, SMOKER: 3, WORKBENCH: 10,
}

const CLICK_COMMAND_FIELDS = [
  'click_commands',
  'left_click_commands',
  'right_click_commands',
  'shift_left_click_commands',
  'shift_right_click_commands',
  'middle_click_commands',
]

export function createDefaultConfig() {
  return {
    menu_title: '&8Server Menu',
    open_command: 'menu',
    size: 27,
    inventory_type: 'CHEST',
    register_command: true,
    open_commands: [],
    close_commands: [],
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
  const output = { ...config }
  output.menu_title = config.menu_title || '&8Untitled Menu'
  if (Array.isArray(config.open_command)) output.open_command = config.open_command
  else output.open_command = config.open_command ? config.open_command : []
  if (config.inventory_type && config.inventory_type !== 'CHEST') {
    output.inventory_type = config.inventory_type
    delete output.size
  } else {
    output.inventory_type = config.inventory_type || 'CHEST'
    output.size = Number(config.size) || 27
  }
  if (config.register_command != null) output.register_command = Boolean(config.register_command)
  if (config.update_interval != null) output.update_interval = Number(config.update_interval)
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
          if (Array.isArray(clean.slots) && clean.slots.length) {
            clean.slots = [...new Set([Number(item.slot), ...clean.slots.map(Number)].filter(Number.isInteger))]
            delete clean.slot
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

/**
 * Parse a DeluxeMenus YAML file and report anything that could not be kept.
 * Returns { config, skipped } where each skipped entry is { key, reason }.
 */
export function parseYAMLDetailed(source) {
  const parsed = yaml.load(source)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The YAML file must contain a DeluxeMenus menu configuration.')
  }
  if (!parsed.items || typeof parsed.items !== 'object' || Array.isArray(parsed.items)) {
    throw new Error('No valid "items" section was found in this menu.')
  }

  const inventoryType = String(parsed.inventory_type || 'CHEST').toUpperCase()
  const isChest = inventoryType === 'CHEST'
  const declaredSize = Number(parsed.size)
  const isInt = (n) => Number.isInteger(n) && n >= 0

  // Collect every slot the file mentions so a missing/invalid size can be inferred
  // instead of silently discarding items.
  const mentioned = []
  for (const value of Object.values(parsed.items)) {
    if (!value || typeof value !== 'object') continue
    if (value.slot != null) mentioned.push(Number(value.slot))
    if (Array.isArray(value.slots)) mentioned.push(...value.slots.map(Number))
  }
  const maxSlot = Math.max(-1, ...mentioned.filter(isInt))

  let size
  if (CHEST_SIZES.includes(declaredSize)) size = declaredSize
  else size = CHEST_SIZES.find((candidate) => candidate > maxSlot) || 54
  if (maxSlot < 0 && !CHEST_SIZES.includes(declaredSize)) size = 27

  const slotLimit = isChest ? size : (NATIVE_SLOT_COUNTS[inventoryType] || 54)

  const items = {}
  const skipped = []
  for (const [key, value] of Object.entries(parsed.items)) {
    if (!value || typeof value !== 'object') {
      skipped.push({ key, reason: 'item is not a mapping' })
      continue
    }
    const listed = Array.isArray(value.slots) ? value.slots.map(Number) : []
    const validSlots = listed.filter((slot) => isInt(slot) && slot < slotLimit)
    if (listed.length && validSlots.length < listed.length) {
      skipped.push({ key, reason: `some slots are outside 0-${slotLimit - 1} and were dropped` })
    }
    const rawSlot = value.slot == null ? validSlots[0] : Number(value.slot)
    if (!isInt(rawSlot) || rawSlot >= slotLimit) {
      skipped.push({ key, reason: 'no valid slot (must be an integer inside the menu)' })
      continue
    }
    const item = {
      ...value,
      slot: rawSlot,
      ...(validSlots.length ? { slots: validSlots } : {}),
      material: value.material || 'STONE',
    }
    if (item.model_data == null && item.custom_model_data != null) item.model_data = item.custom_model_data
    delete item.custom_model_data
    items[key] = item
  }

  return {
    config: {
      ...createDefaultConfig(),
      ...parsed,
      size: CHEST_SIZES.includes(size) ? size : 27,
      items,
    },
    skipped,
  }
}

export function parseYAML(source) {
  return parseYAMLDetailed(source).config
}

export function validateConfig(config) {
  const errors = []
  const warnings = []
  if (!String(config.menu_title || '').trim()) errors.push('Menu title is required.')
  if (!String(config.open_command || '').trim()) warnings.push('No open command is set.')
  const inventoryType = String(config.inventory_type || 'CHEST').toUpperCase()
  const inventorySlotCount = inventoryType === 'CHEST' ? Number(config.size) : (NATIVE_SLOT_COUNTS[inventoryType] || 54)
  if (inventoryType === 'CHEST' && !CHEST_SIZES.includes(Number(config.size))) errors.push('Menu size must be 9, 18, 27, 36, 45 or 54.')
  for (const [field, actions] of [['open_commands', config.open_commands], ['close_commands', config.close_commands]]) {
    for (const [index, action] of (actions || []).entries()) {
      if (typeof action === 'string' && action.trim() && !ACTION_TAG.test(action.trim())) warnings.push(`${field} line ${index + 1} should start with a DeluxeMenus action tag.`)
    }
  }
  const occupied = new Map()
  for (const [key, item] of Object.entries(config.items || {})) {
    const slots = [...new Set([...(item.slot != null ? [Number(item.slot)] : []), ...(Array.isArray(item.slots) ? item.slots.map(Number) : [])])]
    if (!item.material) errors.push(`${key}: material is missing.`)
    if (!slots.length || slots.some(slot => !Number.isInteger(slot) || slot < 0 || slot >= inventorySlotCount)) {
      errors.push(`${key}: slot values must be between 0 and ${inventorySlotCount - 1} for ${inventoryType} inventories.`)
    }
    for (const slot of slots) {
      if (occupied.has(slot)) warnings.push(`Slot ${slot} is shared by "${occupied.get(slot)}" and "${key}". Check priorities if this is intentional.`)
      else occupied.set(slot, key)
    }
    if (item.slot == null && !(item.slots || []).length) errors.push(`${key}: slot or slots is required.`)
    for (const actionField of CLICK_COMMAND_FIELDS) {
      for (const [index, action] of (item[actionField] || []).entries()) {
        if (typeof action === 'string' && action.trim() && !ACTION_TAG.test(action.trim())) {
          warnings.push(`${key}: ${actionField} line ${index + 1} should start with a DeluxeMenus action tag, e.g. [message].`)
        }
      }
    }
    for (const commands of CLICK_COMMAND_FIELDS) {
      const requirement = commands.replace('_commands', '_requirement')
      if (item[requirement] && !(item[commands] || []).length) {
        warnings.push(`${key}: ${requirement} needs its matching ${commands} to execute.`)
      }
    }
    if (item.update === true && !Number(config.update_interval)) {
      warnings.push(`${key}: update is enabled but the menu update_interval is 0.`)
    }
  }
  return { errors, warnings }
}
