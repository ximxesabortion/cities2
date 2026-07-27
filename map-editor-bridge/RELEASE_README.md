# Map Editor Bridge [BETA] 0.4.10

This share package contains:

- `Mod/MapEditorPlus`: the runtime files for local installation
- `StoreListing`: the Paradox Mods description, avatar, thumbnail, and three
  authentic in-game screenshots
- `Source`: the portable code and UI project, official publishing metadata,
  and publishing profiles
- `SHA256SUMS.txt`: hashes for the runtime payload

The package does not publish automatically or contain Paradox account
credentials.

For local testing, copy the `MapEditorPlus` folder under `Mod` into the Cities:
Skylines II local `Mods` directory, select it in a playset, and launch the game
from the launcher. The folder and runtime module keep their tested internal ID;
the player-facing name is **Map Editor Bridge [BETA]**.

For a Paradox Mods publication, follow `Source/PUBLISHING.md`.

Back up important maps before using placement or bulldozer tools.
