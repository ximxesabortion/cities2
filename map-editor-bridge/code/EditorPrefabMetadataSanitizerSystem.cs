using Game;
using Game.Prefabs;
using Game.SceneFlow;
using System;
using System.Collections.Generic;
using Unity.Collections;
using Unity.Entities;

namespace MapEditorPlus
{
    /// <summary>
    /// Repairs null optional-content references before the stock editor prefab
    /// picker builds its DLC badges. Some custom asset packs contain null
    /// entries in AssetPackItem.m_Packs; the game's TryGetDLCBadge method
    /// dereferences those entries without a null check and aborts the entire
    /// editor panel update.
    ///
    /// Valid prefabs and valid pack references are left untouched. Removing a
    /// null badge reference does not alter the placeable prefab or its save
    /// data; it only prevents the broken metadata from crashing the picker.
    /// </summary>
    public sealed partial class EditorPrefabMetadataSanitizerSystem :
        GameSystemBase
    {
        private const int RescanInterval = 60;

        private readonly HashSet<PrefabBase> _validatedPrefabs =
            new HashSet<PrefabBase>();

        private PrefabSystem _prefabSystem = null!;
        private EntityQuery _prefabQuery;
        private int _rescanCountdown;

        protected override void OnCreate()
        {
            base.OnCreate();
            _prefabSystem = World.GetOrCreateSystemManaged<PrefabSystem>();
            _prefabQuery = GetEntityQuery(new EntityQueryDesc
            {
                All = new[]
                {
                    ComponentType.ReadOnly<PrefabData>()
                },
                Options = EntityQueryOptions.IncludePrefab
            });
        }

        protected override void OnUpdate()
        {
            if (!GameManager.instance.gameMode.IsEditor())
            {
                _rescanCountdown = 0;
                return;
            }

            if (_rescanCountdown > 0)
            {
                _rescanCountdown--;
                return;
            }

            _rescanCountdown = RescanInterval;

            int repairedPackReferences = 0;
            int removedPrerequisites = 0;

            using NativeArray<Entity> prefabEntities =
                _prefabQuery.ToEntityArray(Allocator.Temp);

            for (int index = 0; index < prefabEntities.Length; index++)
            {
                if (!_prefabSystem.TryGetPrefab(
                        prefabEntities[index],
                        out PrefabBase prefab
                    ) ||
                    prefab == null ||
                    !_validatedPrefabs.Add(prefab))
                {
                    continue;
                }

                repairedPackReferences += RepairAssetPackReferences(prefab);
                removedPrerequisites += RemoveNullContentPrerequisite(prefab);
            }

            if (repairedPackReferences > 0 || removedPrerequisites > 0)
            {
                Mod.Log.Warn(
                    "Protected the editor prefab picker from " +
                    $"{repairedPackReferences} null asset-pack reference(s) " +
                    $"and {removedPrerequisites} null content " +
                    "prerequisite(s)."
                );
            }
        }

        private static int RepairAssetPackReferences(PrefabBase prefab)
        {
            if (!prefab.TryGet(out AssetPackItem assetPackItem) ||
                assetPackItem.m_Packs == null)
            {
                return 0;
            }

            AssetPackPrefab[] packs = assetPackItem.m_Packs;
            int validCount = 0;

            for (int index = 0; index < packs.Length; index++)
            {
                if (packs[index] != null)
                {
                    validCount++;
                }
            }

            int removedCount = packs.Length - validCount;
            if (removedCount == 0)
            {
                return 0;
            }

            AssetPackPrefab[] repairedPacks =
                validCount == 0
                    ? Array.Empty<AssetPackPrefab>()
                    : new AssetPackPrefab[validCount];

            int destinationIndex = 0;
            for (int sourceIndex = 0;
                sourceIndex < packs.Length;
                sourceIndex++)
            {
                AssetPackPrefab pack = packs[sourceIndex];
                if (pack != null)
                {
                    repairedPacks[destinationIndex++] = pack;
                }
            }

            assetPackItem.m_Packs = repairedPacks;
            Mod.Log.Warn(
                $"Ignored {removedCount} null asset-pack badge " +
                $"reference(s) on prefab '{prefab.name}'."
            );
            return removedCount;
        }

        private static int RemoveNullContentPrerequisite(PrefabBase prefab)
        {
            if (!prefab.TryGet(
                    out ContentPrerequisite contentPrerequisite
                ) ||
                contentPrerequisite.m_ContentPrerequisite != null)
            {
                return 0;
            }

            prefab.components.Remove(contentPrerequisite);
            Mod.Log.Warn(
                "Ignored a null content-prerequisite badge reference on " +
                $"prefab '{prefab.name}'."
            );
            return 1;
        }
    }
}
