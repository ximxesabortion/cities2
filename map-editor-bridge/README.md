# Map Editor Bridge [BETA]

Map Editor Bridge adds the base game's normal construction toolbar and asset
menus to the Cities: Skylines II Map Editor.

Complete source:
https://github.com/msulik86/cities2/tree/main/map-editor-bridge

Version 0.4.10 prevents duplicate prefab-detail UI bindings and gives every
construction button a compact name label plus a missing-icon fallback. The
verified construction, road naming, and optional-integration behavior is
unchanged. When Stacklight is installed, it still owns the combined Logs and
Mods view so no duplicate Mod List appears.

## What it changes

- Displays the normal construction toolbar in the Map Editor.
- Shows a compact name label for each construction button and an initials
  fallback if its icon cannot load.
- Displays the normal searchable asset menu for the selected category.
- Removes editor-facing progression locks from construction-menu prefabs.
- Repairs null optional-content badge references before the stock editor
  prefab picker reads them.
- Routes selections into the editor's native road and object placement tools.
- Preserves placement previews, snapping, curve modes, elevation controls, and
  camera input.
- Adds a dedicated **Build menus** button to hide or restore the construction
  UI without cancelling the active placement tool.
- Keeps the editor's four stock bottom-center buttons accessible.
- Provides a secondary **Mod list** drawer naming every supported optional
  integration, unless Stacklight owns the combined situation view.
- Adds a compact draggable **Move It** launcher near the lower-left editor
  tools when Move It is detected.
- Shows a compact road-name editor when an existing road is selected. Names
  use the game's normal save data, **Save** confirms the result, and **Auto**
  restores the generated name.
- Detects Road Builder when it is loaded, opens Road Builder's own editor tool,
  and lets its generated roads populate the normal bridged road menus.
- Detects Recolor and opens Recolor's native editor Color Painter without
  duplicating Recolor's palette or color-changing implementation.
- Supports Tree Controller through the normal Landscaping and Vegetation
  menus while leaving its tools, settings, and map changes under Tree
  Controller's control.

The mod does not start population, economy, traffic, weather, or other gameplay
simulation systems. It does not replace the road-building implementation.

## Architecture

The UI reuses the base game's toolbar bindings and `AssetMenu`. The backend
removes progression `Locked` components only from editor-facing UI prefabs and
runs before the stock `ToolbarUISystem`.

The UI enters the stock editor `PrefabTool` only when the user interacts with
the bridged construction toolbar or asset panel. Leaving that context through
native Terrain, Asset Browser, or Workspace controls disengages the bridged
panel without a backend watcher reopening it. The game remains responsible for
mapping roads to its network tool, buildings to its object tool, and other
prefab types to their native placement systems.

The stable internal assembly and UI module ID remains `MapEditorPlus` so the
public rename does not create a second installed mod.

## Optional mod-list integrations

The normal construction-menu bridge has no required mod dependencies.

The secondary **Mod list** drawer names the complete supported integration set:

| Supported integration | PDX ID | Bridge behavior |
| --- | ---: | --- |
| Image Overlay | 74539 | Shows the `Ctrl+O` shortcut |
| Anarchy | 74604 | Toggle and options actions |
| Better Bulldozer | 75250 | Status card; controls remain in its own tool options |
| 529 Tiles | 74328 | Supported utility status |
| Move It | 74324 | Toggle action plus compact draggable launcher |
| Network Tools [Early Access] | 133736 | Open-panel action |
| Tree Controller | 75993 | Native Landscaping/Vegetation menu and tool-option support |
| Recolor | 84638 | Open native editor Color Painter |
| Road Builder [BETA] | 87190 | Capability-detected native editor-tool action |
| Unified Icon Library | 74417 | Recognized dependency status |

Those mods are optional. Road Builder and its own dependencies are not
dependencies of Map Editor Bridge. When an optional mod is absent, its
integration is unavailable and its own code remains responsible for validation
and map changes.

See [PLAYSET_SUPPORT.md](PLAYSET_SUPPORT.md) for the audited binding names and
safety boundary.

## Build

Requirements:

- Node.js 18 or later
- npm
- .NET SDK 6 or later
- Either the official Cities: Skylines II modding toolchain through
  `CSII_TOOLPATH`, or a local game-managed assembly directory through
  `CSII_MANAGEDPATH`

From `ui`:

```powershell
npm install
npm run check
npm run build
```

From the project root without the official toolchain:

```powershell
$env:CSII_MANAGEDPATH = "D:\SteamLibrary\steamapps\common\Cities Skylines II\Cities2_Data\Managed"
dotnet build code/MapEditorPlus.csproj -c Release
```

The backend output directory also receives the deployable UI module, stylesheet,
and UI `mod.json`.

For a clean share package:

```powershell
.\Build-ReleasePackage.ps1 -GameManagedPath $env:CSII_MANAGEDPATH
```

See [PUBLISHING.md](PUBLISHING.md) for the official Paradox Mods profiles.

## Installation smoke test

1. Back up the map being edited.
2. Install the four runtime files as one local mod:
   `MapEditorPlus.dll`, `MapEditorPlus.mjs`, `MapEditorPlus.css`, and
   `mod.json`.
3. Start the game from the launcher and open the Map Editor.
4. Confirm the normal construction toolbar appears above the editor's bottom
   bar.
5. Select a standard road and confirm its preview, snapping, curve mode, tool
   options, and camera zoom work.
6. Place a disposable test building and road, then remove them.
7. Confirm **Build menus** hides and restores only the added construction UI.
8. If using supported optional mods, open **Mod list** and test each integration
   separately.
9. Select an existing road, save a temporary custom name, then use **Auto** to
   restore its generated name.
10. If Road Builder is installed, open it from **Mod list**, create or select a
    custom road, and confirm that road is available in the bridged road menu.

Do not test first on the only copy of an important map. Any placement or
bulldozer tool can modify map entities.

## Public-release note

Map Editor Bridge is an unofficial community mod. It is not affiliated with
Paradox Interactive, Colossal Order, or Iceflake Studios.
