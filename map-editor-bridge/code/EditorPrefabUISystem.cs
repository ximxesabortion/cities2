using Game;
using Game.UI.InGame;

namespace MapEditorPlus
{
    /// <summary>
    /// The stock PrefabUISystem only runs in gameplay mode. The construction
    /// asset menu is reusable in the Map Editor, but without this editor-mode
    /// instance its prefabDetails map remains uninitialized and the detail
    /// panel falls back to an empty title, description, and placeholder image.
    ///
    /// Reusing the stock system keeps thumbnails, localization, construction
    /// properties, and descriptions sourced from the game's prefab database.
    /// </summary>
    public sealed partial class EditorPrefabUISystem : PrefabUISystem
    {
        public override GameMode gameMode => GameMode.Editor;
    }
}
