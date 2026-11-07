import { createDefaultConfig } from './lib/yaml'

const makeItem = (material, slot, name, lore, commands = []) => ({
  material, slot, display_name: name, lore,
  ...(commands.length ? { left_click_commands: commands } : {}),
})

export function createTemplateConfig(template) {
  const config = createDefaultConfig()
  const templates = {
    hub: {
      menu_title: '&8Server Navigator',
      items: {
        survival: makeItem('GRASS_BLOCK', 10, '&a&lSurvival', ['&7Explore the survival world.', '', '&eClick to connect.'], ['[message] &aOpening Survival...']),
        shop: makeItem('EMERALD', 13, '&a&lServer Shop', ['&7Browse available items.'], ['[openguimenu] shop']),
        info: makeItem('BOOK', 16, '&b&lServer Information', ['&7Rules, links and useful info.'], ['[message] &bWelcome!']),
      },
    },
    ranks: {
      menu_title: '&8Rank Store',
      items: {
        vip: makeItem('GOLD_INGOT', 11, '&6&lVIP Rank', ['&7Perks and benefits', '&eClick to view details.'], ['[message] &6VIP rank selected']),
        premium: makeItem('DIAMOND', 13, '&b&lPremium Rank', ['&7Extra server perks', '&eClick to view details.'], ['[message] &bPremium rank selected']),
        support: makeItem('NETHER_STAR', 15, '&d&lSupport the Server', ['&7Help keep the server running.'], ['[message] &dThank you for supporting us!']),
      },
    },
    rewards: {
      menu_title: '&8Daily Rewards',
      items: {
        daily: makeItem('CHEST', 13, '&6&lDaily Reward', ['&7Your daily reward is ready.', '&eCome back tomorrow!'], ['[message] &aReward claimed!']),
        weekly: makeItem('ENDER_CHEST', 15, '&5&lWeekly Reward', ['&7A bigger reward, once a week.'], ['[message] &dWeekly reward selected']),
      },
    },
    profile: {
      menu_title: '&8Player Profile',
      items: {
        profile: makeItem('PLAYER_HEAD', 13, '&b&l%player_name%', ['&7Level: &f%player_level%', '&7Balance: &a%vault_eco_balance%'], []),
        stats: makeItem('PAPER', 11, '&e&lStatistics', ['&7View your server statistics.'], ['[message] &eOpening statistics']),
        settings: makeItem('COMPARATOR', 15, '&a&lSettings', ['&7Customize your experience.'], ['[openguimenu] settings']),
      },
    },
  }
  const selected = templates[template] || templates.hub
  return { ...config, menu_title: selected.menu_title, items: selected.items }
}

export function analyzeProject(config, knownMenus = []) {
  const base = []
  const refs = new Set(knownMenus.map(name => String(name).replace(/\\.ya?ml$/i, '').toLowerCase()))
  for (const [key, item] of Object.entries(config.items || {})) {
    for (const field of ['click_commands','left_click_commands','right_click_commands','shift_left_click_commands','shift_right_click_commands']) {
      for (const command of item[field] || []) {
        const match = String(command).match(/^\\[openguimenu\\]\\s+([\\w.-]+)/i)
        if (match && refs.size && !refs.has(match[1].toLowerCase())) {
          base.push({ severity: 'warning', title: 'Menu reference not found', detail: `${key} opens "${match[1]}", but that menu is not in this project.` })
        }
      }
    }
  }
  const values = JSON.stringify(config)
  const placeholders = [...new Set(values.match(/%[a-zA-Z0-9_:.]+%/g) || [])]
  if (placeholders.length) base.push({ severity: 'info', title: 'Placeholders detected', detail: `${placeholders.length} unique placeholder(s) found. Confirm that the required PlaceholderAPI expansions are installed.` })
  return base
}

export function renderPreviewValue(value, variables) {
  return String(value ?? '').replace(/%([a-zA-Z0-9_:.]+)%/g, (token, key) => variables[token] ?? token)
}

export function getCompatibilityWarnings(config, version) {
  const warnings = []
  const fields = Object.entries(config.items || {})
  const modern = fields.filter(([, item]) => item.item_model || item.model_data_component || item.tooltip_style || item.hide_tooltip)
  if (modern.length && version && version !== '1.21.4+' && version.startsWith('1.')) {
    const [major, minor, patch] = version.split('.').map(Number)
    if (major < 1 || minor < 21 || (minor === 21 && patch < 4)) warnings.push(`${modern.length} item(s) use newer item metadata fields. Verify support for Minecraft ${version} and your DeluxeMenus build.`)
  }
  if (fields.some(([, item]) => item.item_model) && version && ['1.20.4','1.20.6','1.21.1'].includes(version)) {
    warnings.push('The item_model field targets newer Minecraft versions. Check the plugin documentation before deployment.')
  }
  return warnings
}
