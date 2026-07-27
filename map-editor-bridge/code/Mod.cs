using Colossal.Logging;
using Game;
using Game.Modding;
using Game.UI.Editor;
using Game.UI.InGame;

namespace MapEditorPlus
{
    public sealed class Mod : IMod
    {
        internal static readonly ILog Log =
            LogManager.GetLogger("MapEditorPlus").SetShowsErrorsInUI(false);

        public void OnLoad(UpdateSystem updateSystem)
        {
            Log.Info("Loading Map Editor Bridge backend 0.4.9.");
            updateSystem.UpdateBefore<
                EditorPrefabMetadataSanitizerSystem,
                EditorPanelUISystem
            >(SystemUpdatePhase.UIUpdate);
            updateSystem.UpdateBefore<
                EditorPrefabUISystem,
                ToolbarUISystem
            >(SystemUpdatePhase.UIUpdate);
            updateSystem.UpdateBefore<
                EditorConstructionUnlockSystem,
                ToolbarUISystem
            >(SystemUpdatePhase.UIUpdate);
            updateSystem.UpdateAt<RoadNameUISystem>(
                SystemUpdatePhase.UIUpdate
            );
        }

        public void OnDispose()
        {
            Log.Info("Disposing editor construction backend.");
        }
    }
}
