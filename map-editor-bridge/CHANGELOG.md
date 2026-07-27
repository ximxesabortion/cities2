# Changelog

## 0.4.9

- Replaced browser-only CSS primitives with Coherent-safe flex layout, explicit
  colors, and supported border declarations.
- Removed unsupported `userSelect`, pseudo-selector, grid, sticky-position, and
  shorthand-variable patterns that were generating UI parser warnings.
- Kept draggable controls, native construction menus, placement behavior, road
  naming, and optional integrations unchanged.
- Added a public Paradox Forum support, feedback, and bug-report discussion.

## 0.4.8

- Added **Tree Controller** (PDX 75993) to the supported optional integrations.
- Documented that its vegetation, age, brush, seasonal, and wind controls flow
  through the normal Landscaping and Vegetation menus exposed by the bridge.
- Kept Tree Controller responsible for its tools, settings, validation, and
  map changes.

## 0.4.7

- Added an explicit shared-feature handoff to Stacklight.
- Suppresses the Bridge Mod List when Stacklight advertises ownership of the
  combined Logs and Mods situation view.
- Restores the Bridge list automatically when Stacklight is not installed.
- Leaves construction menus, placement, road naming, and optional integrations
  under Map Editor Bridge control.

## 0.4.6

- Protected the stock editor prefab picker from null asset-pack badge
  references found in some custom asset packs.
- Preserved every valid prefab and valid asset-pack reference; only broken
  optional badge metadata is removed.
- Added diagnostic logging that names each repaired prefab.
- Added the road-name bridge showcase as the third intentional store image.

## 0.4.5

- Made the road-name **Save** button fire its bridge action directly instead of
  depending only on embedded form submission.
- Preserved the selected road through transient editor UI focus changes.
- Added a visible saved/restored result to the road-name editor.
- Added verified optional **Recolor** integration (PDX 84638).
- Opens Recolor through its native `Recolor/ActivateColorPainter` binding and
  registered `ColorPainterTool`, while leaving all color, palette, and
  save-data behavior under Recolor's control.

## 0.4.4

- Removed private playset naming from the public listing and in-game UI.
- Reframed **Mod list** as the complete supported optional-integration list.
- Removed the user-specific disabled duplicate entry and revision labels.
- Added a compact draggable Move It launcher near the lower-left editor tools.
- Appended **[BETA]** to the public mod name.
- Refreshed the store gallery with the long-bridge and corrected menu images.

## 0.4.3

- Added a compact road-name editor for the selected road.
- Saved custom road names through the game's native naming system.
- Added **Auto** to clear a custom name and restore the generated road name.
- Added a capability-detected Road Builder integration to the **Mod list**.
- Opens Road Builder through its native editor tool and keeps Road Builder in
  control of road creation and validation.
- Verified that Road Builder-generated roads populate the bridge's normal road
  menus and remain placeable with their native thumbnails and tools.
- Kept Road Builder and its helper packages optional; Map Editor Bridge still
  has no required mod dependencies.
- Replaced the first two store screenshots with the new bridge showcase image.

## 0.4.2

- Removed the persistent construction-context watcher that could reopen the Asset Browser after selecting native Terrain or Workspace controls.
- Limited `PrefabTool` activation to explicit interaction with the bridged construction toolbar or asset panel.
- Hid stale bridged asset UI when the native editor leaves `PrefabTool`.
- Removed the visible **Move** buttons.
- Made the existing **Build menus** and **Mod list** toggles draggable without changing their normal click behavior.
- Kept saved positions and double-click position reset.

## 0.4.1

- Restored the stock prefab-details binding in editor mode so network and object thumbnails, localized names, and descriptions display.
- Made the **Build menus** dock movable with a dedicated drag handle.
- Made the **Mod list** launcher and drawer movable.
- Saved both custom UI positions between sessions.
- Added double-click position reset to the drag handles and Mod list header.

## 0.4.0

- Prepared the first public **Map Editor Bridge** package.
- Added the normal construction toolbar and asset menus to the Map Editor.
- Bridged toolbar selections into the editor's native prefab-placement context.
- Preserved road and object previews, snapping, camera zoom, and tool options.
- Added a dedicated **Build menus** show/hide control.
- Added an optional **Mod list** drawer for supported playset integrations.
- Added Paradox Mods publishing metadata, store artwork, and three gameplay screenshots.
