# Stacklight tool manifest v1

Every enabled mod appears in Stacklight's **All** inventory with the identity,
version, and thumbnail supplied by the active-playset service. Search and
favorites work without integration.

A mod can also qualify for the default **Tools** shelf without a hard Stacklight
dependency. Expose one string value binding:

- Group: `stacklight-tools`
- Name: the mod's Paradox Mods ID
- Value: a version 1 JSON manifest

Example:

```json
{
  "version": 1,
  "category": "Roads",
  "summary": "Fast controls for the current road tool.",
  "hotkeys": [
    { "keys": "R", "label": "Open road tool" }
  ],
  "actions": [
    {
      "label": "Toggle snapping",
      "group": "ExampleRoadMod",
      "trigger": "ToggleSnapping"
    },
    {
      "label": "Open tool",
      "group": "editorTool",
      "trigger": "selectTool",
      "args": ["ExampleRoadTool"]
    }
  ],
  "state": {
    "group": "ExampleRoadMod",
    "binding": "ToolEnabled",
    "activeValue": true,
    "activeLabel": "Tool active",
    "idleLabel": "Tool ready"
  }
}
```

The manifest describes existing bindings; Stacklight does not own the setting.
Action arguments are limited to four string, number, boolean, or null values.
Stacklight accepts at most 8 actions and 12 hotkey entries, bounds all text, and
rejects malformed binding names.

The optional state descriptor points at one existing value binding. If that
binding is unavailable, Stacklight marks the control unavailable and disables
its actions. This avoids false success indicators.

Hotkeys are documentation only. The owning mod remains responsible for input
registration and rebinding.

Existing built-in adapters are compatibility shims for popular tools that
predate this contract. A valid self-described manifest takes precedence.
