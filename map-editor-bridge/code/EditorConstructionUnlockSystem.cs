using Game;
using Game.Prefabs;
using Game.SceneFlow;
using Unity.Collections;
using Unity.Entities;

namespace MapEditorPlus
{
    /// <summary>
    /// Disables progression locks only on editor-facing UI prefabs while the
    /// current world is the map editor. The stock ToolbarUISystem can then call
    /// ToolSystem.ActivatePrefabTool normally, preserving the game's own mapping
    /// from roads to Net Tool, buildings to Object Tool, and so on.
    /// </summary>
    public sealed partial class EditorConstructionUnlockSystem : GameSystemBase
    {
        private EntityQuery _lockedUiObjects;
        private bool _reportedUnlocks;

        protected override void OnCreate()
        {
            base.OnCreate();
            _lockedUiObjects = GetEntityQuery(
                ComponentType.ReadOnly<UIObjectData>(),
                ComponentType.ReadOnly<Locked>()
            );
        }

        protected override void OnUpdate()
        {
            if (!GameManager.instance.gameMode.IsEditor() ||
                _lockedUiObjects.IsEmptyIgnoreFilter)
            {
                return;
            }

            using NativeArray<Entity> entities =
                _lockedUiObjects.ToEntityArray(Allocator.Temp);

            for (int index = 0; index < entities.Length; index++)
            {
                EntityManager.SetComponentEnabled<Locked>(
                    entities[index],
                    false
                );
            }

            if (!_reportedUnlocks && entities.Length > 0)
            {
                _reportedUnlocks = true;
                Mod.Log.Info(
                    $"Enabled {entities.Length} construction UI prefabs in editor mode."
                );
            }
        }
    }
}
