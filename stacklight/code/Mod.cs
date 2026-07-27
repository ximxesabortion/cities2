using Colossal.Logging;
using Game;
using Game.Modding;

namespace Stacklight
{
    public sealed class Mod : IMod
    {
        internal static readonly ILog Log =
            LogManager.GetLogger("Stacklight").SetShowsErrorsInUI(false);

        public void OnLoad(UpdateSystem updateSystem)
        {
            Log.Info("Loading Stacklight 0.2.5.");
            updateSystem.UpdateAt<StacklightUISystem>(
                SystemUpdatePhase.UIUpdate
            );
        }

        public void OnDispose()
        {
            Log.Info("Disposing Stacklight.");
        }
    }
}
