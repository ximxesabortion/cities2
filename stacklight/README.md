# Stacklight [BETA]

Stacklight is a compact, draggable warning and error logger and mod-tool shelf
for Cities: Skylines II. Its three-color beacon opens clean diagnostics and the
useful controls from your active playset.

Paradox Mods: PDX ID `152734`.

## Controls

- Click the beacon to open or close the logger.
- Drag the beacon or panel header to move it.
- Use **Expand** for a larger log view and **Compact** to return.
- Drag Stacklight's visible scrollbar or click its track to move quickly through
  long lists.
- Press `Ctrl+Shift+L` to toggle it from anywhere.
- Press `Escape` to close the panel.
- Use `Copy` on one record or `Copy report` for the visible session.

Green means no warnings or errors have been captured. Amber means low-grade
game warnings are available under **Minor notices**. Red means at least one
error is present. The launcher badge counts unique errors, not every repeated
occurrence; repetition remains visible as `xN` on the individual record.

## Privacy and scope

Copied reports replace the current Windows profile path with
`%USERPROFILE%`. Stacklight reads the shared diagnostic stream only. It does
not change simulation, save data, assets, or other mods.

The log is kept in memory for the current map and is bounded to the latest 100
unique records. It resets when the active map changes. Saved-map diagnostics
that explicitly name another `.cok` package are suppressed, while global game
and mod failures remain visible because they can affect the active map.

## Who it is for

Stacklight is built for players with large mod playsets, map and asset creators,
mod testers, mod authors checking their own creations, and support helpers. It
is useful when a tool silently fails, one error repeats until the normal console
becomes unreadable, or you need a clean diagnostic block to paste into a bug
report.

It groups repeated records, keeps warnings separable from errors, and includes
the source and stack trace when the game supplies them.

## Why can a working game still show diagnostics?

Stacklight listens to the same warning-and-higher stream used by the game.
Games and mods often log recoverable conditions, fallbacks, optional-content
checks, or repeated warnings without stopping the current map. A Stacklight
record is evidence to investigate, not proof that a save is broken.

Warning-level records appear as **Minor notices** and are hidden by default.
Errors remain visible because Stacklight cannot safely guess whether a
particular game or mod error is harmless. Mod authors can reveal Minor notices
when validating their own code and copy the complete evidence for a bug report.

## Source

Complete source:
https://github.com/ximxesabortion/cities2/tree/main/stacklight

## Mods context and compatibility

The **Mods** view is intentionally a tool shelf, not another settings screen.
By default it shows only enabled mods with a verified hotkey or safe live
action. Search finds mod names, actions, categories, and documented hotkeys;
**All** reveals passive or informational mods. Click a mod icon to expand it
inline, and star frequently used tools to pin them first. Native thumbnails are
used when the playset service provides them.

Quick actions call the owning mod's registered binding. Stacklight does not
clone its settings or guess at hotkeys. A missing binding disables the action
instead of pretending it worked. The active playset name is intentionally
withheld.

Any mod author can opt into the default tool shelf through the dependency-free
[tool manifest v1](TOOL_INTEGRATION.md). Mods without a manifest still receive
the universal inventory, search, thumbnail, and favorites behavior.

When Map Editor Bridge is installed, Stacklight owns the shared Mods view and
the Bridge suppresses its duplicate drawer. Map Editor Bridge continues to own
construction menus, placement, road naming, and optional tool integrations.
Removing Stacklight restores the Bridge list automatically.

Copied situation reports also redact the current username, email addresses,
bearer tokens, and common credential fields.
