# DeluxeStudio

A browser-based visual editor for [DeluxeMenus](https://www.spigotmc.org/resources/deluxemenus.11734/) configurations.

## Features

- Chest-style inventory canvas with 9–54 slots, item selection, drag-to-move, and multi-slot items.
- Searchable, categorized Minecraft 1.21.4 material catalogue with 1,370 non-combat entries, category filtering, and incremental loading.
- Real Minecraft 1.21.4 item/block texture mappings for 835 catalogue entries; unavailable textures use a fallback glyph.
- Custom in-game item names with Minecraft color-code support and a one-click reset to the vanilla display name.
- Item editor for material, slot(s), display name, lore, amounts, damage, model data, item models, enchantments, item flags, and update settings.
- Click actions for any, left, right, shift-left, shift-right, and legacy middle-click interactions.
- YAML editors for item requirements, menu open requirements, and complete raw item/menu configuration.
- Menu settings for title, command aliases, inventory type, command registration, open/close actions, and update interval.
- Live YAML output, basic validation, YAML import/export, clipboard copy, and browser local-storage autosave.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Important notes

- The inventory canvas is a browser preview, not a live Minecraft client or server inventory.
- Non-chest inventory types are exported correctly, but the visual canvas remains a chest-style slot grid.
- The structured editor covers common DeluxeMenus options. Use the raw YAML editors for options not represented by dedicated controls.
- Minecraft texture images are loaded from the PrismarineJS Minecraft asset mirror. Special head identifiers and unavailable textures use the fallback glyph.
- Always review the generated YAML and test it on a staging server before using it on a live server.
