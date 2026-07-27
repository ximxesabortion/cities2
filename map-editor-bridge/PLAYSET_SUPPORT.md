# Map Editor Bridge supported optional integrations

This file records the binding contract used by the optional **Mod list**
drawer. It is intentionally small and version-specific so a future game or mod
update can be audited before changing behavior.

## Direct UI adapters

| Mod | Detection | Trigger | Arguments | Expected result |
| --- | --- | --- | --- | --- |
| Anarchy | `Anarchy` | `AnarchyToggled` | none | Toggle Anarchy |
| Anarchy | `Anarchy` | `ToggleAnarchyOptionsPanel` | none | Show or hide its options |
| Move It | `MoveIt` | `MIT_EnableToggle` | none | Toggle the Move It tool |
| Network Tools | `NetworkTools` | `TRIGGER:PANEL_OPEN` | `true` | Open its panel |
| Recolor | `Recolor/EditorPainterToolOptions` | `Recolor/ActivateColorPainter`, then `editorTool/selectTool` | `ColorPainterTool` | Open Recolor's native editor Color Painter |
| Road Builder | `RoadBuilder/RoadBuilderToolMode` | `editorTool/selectTool` | `RoadBuilderTool` | Open Road Builder's native editor tool |

Every call is wrapped by the host's guarded action handler. A UI trigger only
requests the action; the owning mod remains responsible for validation and
entity changes.

Road Builder remains named in the supported-integration list when absent, but
its action is disabled until its mode binding is available. When detected, the
bridge selects Road Builder's registered editor tool. It does not copy Road
Builder's UI or call its entity-mutation actions. Roads registered by Road
Builder flow through the stock toolbar data already consumed by the
construction bridge.

When Move It is detected, the bridge also shows a compact draggable launcher
near the lower-left editor tools. It uses the same `MIT_EnableToggle` binding
as the Mod list action and does not duplicate Move It's editing implementation.

When Recolor is detected, the bridge requests its registered
`ActivateColorPainter` action and selects Recolor's registered
`ColorPainterTool`. Recolor renders the editor tool, owns all palette and color
mutations, and remains solely responsible for its save data.

## Dependency policy

- Map Editor Bridge has no required mod dependencies.
- Optional integrations are capability-detected and fail closed when absent.
- Road Builder and its helper packages must be installed only by players who
  want Road Builder features. Paradox Mods should resolve that mod's current
  dependency chain.
- Content packs that register standard roads, trees, decals, buildings, or
  other prefabs can flow into their normal bridge categories without a custom
  adapter.
- Tool mods require a stable editor tool or UI binding before an adapter can be
  verified. Arbitrary future third-party updates are not treated as guaranteed.

## Visible, non-callable entries

- **Image Overlay**: the installed build registers the `Ctrl+O` input action,
  but no UI trigger that a UI-only host can call.
- **Better Bulldozer**: the installed build augments tool options after the
  bulldozer is selected. Its destructive actions are not duplicated here.
- **529 Tiles**: loads map/tile behavior and settings without a standalone UI
  panel.
- **Tree Controller (PDX 75993)**: extends the standard Landscaping and
  Vegetation menus with its own age, type, brush, seasonal, and wind controls.
  The bridge exposes those standard categories but does not copy or invoke
  Tree Controller's entity-changing actions.
- **Unified Icon Library**: is a shared icon provider, not an interactive tool.

## Safety rules

- Do not invoke bulldoze, delete, or confirmation-bypass triggers from the host.
- Do not start population, economy, traffic, or weather simulation systems.
- Do not copy third-party UI bundles or assets into this project.
- Re-audit trigger names when an active mod revision changes.
