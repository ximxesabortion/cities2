# Stacklight [BETA]

Paradox Mods ID: `152734`

**Short description:** A compact draggable error logger and searchable live
mod-tool shelf.

Stacklight turns the game's diagnostic stream into a useful three-color status
beacon. Click it for grouped warnings, errors, stack traces, counts, filters,
copy-ready reports, a compact/expanded view with a visible custom scrollbar,
and a lightweight tool shelf for the active playset.

**Source code:**

https://github.com/ximxesabortion/cities2/tree/main/stacklight

The launcher counts unique errors rather than every repeated occurrence.
Warning-level records are available as quieter **Minor notices**, hidden by
default but still searchable, expandable, and copyable. Repetition stays on the
record as `xN`, where it helps diagnosis without inflating the overview.

The Mods view hides passive libraries by default. Search enabled tools, click a
mod icon for verified hotkeys and safe quick actions, or star favorites to keep
them first. **All** still exposes the complete enabled-mod inventory. Stacklight
uses the owning mod's live bindings and disables unavailable controls.
Any mod can opt into the default shelf through Stacklight's dependency-free
tool-manifest contract; no Stacklight DLL reference is required.

It works in gameplay and the Editor, scopes diagnostics to the active map,
keeps only the latest 100 unique records, and sanitizes the current Windows
profile path when text is copied. Records that explicitly name a different
saved-map package are hidden; global game and mod failures remain visible
because they can affect the map in play.

Built for players with large mod playsets, map and asset creators, mod testers,
mod authors checking their own creations, and support helpers. Use it when a
tool silently fails, the built-in console becomes hard to read, a single
failure repeats, or a bug report needs a clean copyable stack trace.

Stacklight does not alter simulation or saves. The source named in a record may
be the game or another installed mod.

**Support and discussion:**

https://forum.paradoxplaza.com/forum/threads/beta-stacklight-support-feedback-and-diagnostic-reports.1936365/

When Map Editor Bridge is installed, Stacklight owns the shared Mods view so
the two mods never show duplicate mod-list drawers. The Bridge keeps ownership
of all editor construction and placement features.
