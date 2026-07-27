using Game;
using Game.SceneFlow;
using Game.UI.InGame;

namespace MapEditorPlus
{
    /// <summary>
    /// Keeps the game's one stock PrefabUISystem active in the Map Editor.
    ///
    /// A second PrefabUISystem instance would register duplicate prefabs.*
    /// bindings. Those bindings remain attached even while their owning system
    /// is disabled for the current game mode, so duplicate instances can race
    /// to answer the same icon, name, and detail requests. Activating the stock
    /// instance preserves the editor detail panel without duplicating any UI
    /// binding paths or affecting gameplay's normal instance.
    /// </summary>
    public sealed partial class EditorPrefabUIActivationSystem : GameSystemBase
    {
        private PrefabUISystem _prefabUISystem = null!;
        private bool _reportedActivation;

        protected override void OnCreate()
        {
            base.OnCreate();
            _prefabUISystem =
                World.GetOrCreateSystemManaged<PrefabUISystem>();
        }

        protected override void OnUpdate()
        {
            if (!GameManager.instance.gameMode.IsEditor())
            {
                _reportedActivation = false;
                return;
            }

            _prefabUISystem.Enabled = true;

            if (!_reportedActivation)
            {
                _reportedActivation = true;
                Mod.Log.Info(
                    "Using the stock prefab UI binding service in editor mode."
                );
            }
        }
    }
}
