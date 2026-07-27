# Changelog

## 0.2.5

- Changed the launcher badge and summary totals to count unique records instead
  of every repeated occurrence.
- Moved game warning-level records into a quieter **Minor notices** tier that
  is hidden by default but remains searchable, expandable, and copyable.
- Preserved exact repetition counts on each record as `xN` for debugging.
- Added explicit guidance for players and mod authors explaining why a working
  game can still emit recoverable warnings and errors.
- Published the complete source at
  `https://github.com/ximxesabortion/cities2/tree/main/stacklight`.

## 0.2.4

- Scoped the diagnostic log to the currently loaded map and reset it when the
  active map changes.
- Suppressed saved-map records that explicitly identify a different `.cok`
  package while retaining global game and mod failures that can affect the
  active map.
- Added the active map name to the Logs view and copied situation report.
- Fixed privacy sanitization so `assetdb://...cok@Prefab` references are not
  mistaken for email addresses; real email addresses remain redacted.

## 0.2.3

- Replaced the invisible native overflow indicator with a dedicated Stacklight
  scrollbar that renders reliably in the game's Coherent UI.
- Added thumb dragging and track-click navigation to the shared Logs and Mods
  region.
- Added the compact-versus-expanded Stacklight screenshot to the store gallery.

## 0.2.2

- Added an explicit **Expand/Compact** control to the Stacklight panel.
- Added a persistent vertical scrollbar to the shared Logs and Mods region for
  fast navigation through long sessions.
- Preserved draggable positioning, grouped diagnostics, privacy-safe copying,
  and the searchable Mods shelf.

## 0.2.1

- Replaced browser-only CSS primitives with Coherent-safe flex layout and
  explicit supported styling.
- Removed unsupported `userSelect`, pseudo-selector, grid, sticky-position, and
  shorthand-variable patterns that made Stacklight report its own UI warnings.
- Preserved the draggable launcher and panel, grouped diagnostics, privacy-safe
  copying, and searchable Mods shelf.
- Added a public Paradox Forum support, feedback, and diagnostic-report
  discussion.

## 0.2.0

- Added restrained **Logs** and **Mods** views inside the same draggable popup.
- Added active-playset mod names, versions, and PDX IDs to the situation report.
- Added recognition labels for the Map Editor Bridge optional-integration set.
- Turned the Mods view into a lightweight searchable tool shelf.
- Added inline expansion from native mod thumbnails, with monogram fallbacks.
- Added favorites, verified hotkey documentation, live status indicators, and
  safe quick actions for supported tools.
- Passive and informational mods stay hidden until **All** is selected.
- Missing control bindings now disable actions instead of duplicating or
  guessing another mod's state.
- Added a dependency-free `stacklight-tools` manifest contract so any mod can
  self-describe verified hotkeys, actions, and one live-state binding.
- Added explicit ownership of the shared Mods view when Map Editor Bridge is
  installed, with a version-skew fallback for the older Bridge launcher.
- Added game-version and grouped log-source context.
- Added username, email, bearer-token, and common credential-field redaction.
- Added control-character cleanup while preserving useful line structure.
- Continued withholding the active playset name from UI and copied reports.

## 0.1.0

- Added a draggable three-color status beacon.
- Added a pop-up warning and error session log.
- Added one-click copying for entries and full reports.
- Added repeated-message grouping and occurrence counts.
- Added warning filtering and bounded record retention.
- Added automatic profile-path sanitization in copied diagnostics.
- Added gameplay and Editor UI registration.
- Added `Ctrl+Shift+L` and `Escape` shortcuts.
