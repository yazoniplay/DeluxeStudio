# DeluxeStudio

A browser-based visual editor for [DeluxeMenus](https://www.spigotmc.org/resources/deluxemenus.11734/) configurations.

## Features

- Chest-style inventory canvas with 9–54 slots, item selection, drag-to-move, and multi-slot items.
- Searchable, categorized material catalogue with 1,392 entries: the existing 1.21.4 base catalogue plus 22 verified Minecraft Java 26.4 Snapshot 5–7 additions.
- Blocks and non-block items are separated using the catalogue's `isBlock` classification, with category filtering and incremental loading.
- Existing Minecraft textures are used where available; newly introduced snapshot entries use the editor's fallback icon until matching snapshot textures are available.
- Custom in-game item names with Minecraft color-code support and a one-click reset to the vanilla display name.
- Item editor for material, slot(s), display name, lore, amounts, damage, model data, item models, enchantments, item flags, and update settings.
- Click actions for any, left, right, shift-left, shift-right, and legacy middle-click interactions.
- YAML editors for item requirements, menu open requirements, and complete raw item/menu configuration.
- Menu settings for title, command aliases, inventory type, command registration, open/close actions, and update interval.
- Live YAML output, static configuration diagnostics, YAML import/export, clipboard copy, and browser local-storage autosave.
- Multi-menu project workspace with per-menu switching, browser persistence, and JSON project bundle import/export.
- Starter templates for server hubs, rank stores, daily rewards, and player profiles.
- Interaction preview for item click commands with editable sample placeholder values.
- Advisory Minecraft target-version checks for selected newer item metadata fields.
- Focused two-column editor layout with the material palette opened only when needed.

## Catalogue version note

The catalogue includes verified additions from Minecraft Java 26.4 Snapshots 5, 6, and 7: packed-ice brick variants, snow-brick variants, calcite block variants, and the Flurry music disc. It is **not yet a complete 26.4 registry**: the base catalogue remains the existing 1.21.4 dataset because a complete 26.4 item registry is not yet available from the data source used by this project. Combat-weapon entries remain excluded.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

Run the test suite (Node 20+, no extra dependencies) with:

```bash
npm test
```

## Important notes

- The inventory canvas is a browser preview, not a live Minecraft client or server inventory.
- Non-chest inventory types use simplified slot layouts; they are not guaranteed to reproduce every native Minecraft screen exactly.
- The structured editor covers common DeluxeMenus options. Use the raw YAML editors for options not represented by dedicated controls.
- The debugger performs static checks only; it does not run the DeluxeMenus plugin or evaluate arbitrary requirements.
- The interaction simulator previews command text and placeholder substitution only. It does not execute commands or emulate a live Minecraft server.
- Version checks are advisory and cannot guarantee compatibility with a specific DeluxeMenus build or server setup.
- Minecraft texture images are loaded from the PrismarineJS Minecraft asset mirror. Special head identifiers and unavailable textures use the fallback glyph.
- Always review the generated YAML and test it on a staging server before using it on a live server.
