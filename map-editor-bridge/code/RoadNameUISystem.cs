using Colossal.UI.Binding;
using Game;
using Game.Net;
using Game.Tools;
using Game.UI;
using Unity.Entities;

namespace MapEditorPlus
{
    /// <summary>
    /// Exposes the selected road aggregate's native custom name to the bridge UI.
    /// Names are written through the stock NameSystem so they use the game's
    /// normal save serialization, map-label refresh, and generated-name fallback.
    /// </summary>
    public sealed partial class RoadNameUISystem : UISystemBase
    {
        private const string BindingGroup = "mapEditorBridgeRoadName";

        private ToolSystem _toolSystem = null!;
        private NameSystem _nameSystem = null!;
        private ValueBinding<bool> _availableBinding = null!;
        private ValueBinding<string> _nameBinding = null!;
        private ValueBinding<bool> _customBinding = null!;
        private ValueBinding<string> _statusBinding = null!;
        private Entity _lastSelectedRoad = Entity.Null;

        public override GameMode gameMode => GameMode.Editor;

        protected override void OnCreate()
        {
            base.OnCreate();

            _toolSystem = World.GetOrCreateSystemManaged<ToolSystem>();
            _nameSystem = World.GetOrCreateSystemManaged<NameSystem>();

            _availableBinding = new ValueBinding<bool>(
                BindingGroup,
                "available",
                false
            );
            _nameBinding = new ValueBinding<string>(
                BindingGroup,
                "name",
                string.Empty
            );
            _customBinding = new ValueBinding<bool>(
                BindingGroup,
                "custom",
                false
            );
            _statusBinding = new ValueBinding<string>(
                BindingGroup,
                "status",
                string.Empty
            );

            AddBinding(_availableBinding);
            AddBinding(_nameBinding);
            AddBinding(_customBinding);
            AddBinding(_statusBinding);
            AddBinding(
                new TriggerBinding<string>(
                    BindingGroup,
                    "rename",
                    RenameRoad
                )
            );
        }

        protected override void OnUpdate()
        {
            Entity road = ResolveRoadAggregate(_toolSystem.selected);
            bool available = road != Entity.Null;
            bool custom = false;
            string name = string.Empty;

            if (available)
            {
                if (road != _lastSelectedRoad)
                {
                    _lastSelectedRoad = road;
                    _statusBinding.Update(string.Empty);
                }

                custom = _nameSystem.TryGetCustomName(
                    road,
                    out string customName
                );
                name = custom
                    ? customName
                    : _nameSystem.GetRenderedLabelName(road);
            }

            _availableBinding.Update(available);
            _nameBinding.Update(name);
            _customBinding.Update(custom);

            base.OnUpdate();
        }

        private Entity ResolveRoadAggregate(Entity selected)
        {
            if (selected == Entity.Null || !EntityManager.Exists(selected))
            {
                return Entity.Null;
            }

            if (EntityManager.HasComponent<Aggregate>(selected))
            {
                return selected;
            }

            if (!EntityManager.HasComponent<Aggregated>(selected))
            {
                return Entity.Null;
            }

            Entity aggregate =
                EntityManager.GetComponentData<Aggregated>(selected).m_Aggregate;

            return aggregate != Entity.Null &&
                EntityManager.Exists(aggregate) &&
                EntityManager.HasComponent<Aggregate>(aggregate)
                    ? aggregate
                    : Entity.Null;
        }

        private void RenameRoad(string name)
        {
            Entity road = ResolveRoadAggregate(_toolSystem.selected);
            if (
                road == Entity.Null &&
                IsValidRoadAggregate(_lastSelectedRoad)
            )
            {
                road = _lastSelectedRoad;
            }

            if (road == Entity.Null)
            {
                _statusBinding.Update("Select a road before saving.");
                return;
            }

            string normalized = (name ?? string.Empty).Trim();
            _nameSystem.SetCustomName(road, normalized);
            _lastSelectedRoad = road;

            bool custom = _nameSystem.TryGetCustomName(
                road,
                out string customName
            );
            _availableBinding.Update(true);
            _customBinding.Update(custom);
            _nameBinding.Update(
                custom
                    ? customName
                    : _nameSystem.GetRenderedLabelName(road)
            );
            _statusBinding.Update(
                custom
                    ? "Saved"
                    : "Automatic name restored"
            );
        }

        private bool IsValidRoadAggregate(Entity entity)
        {
            return entity != Entity.Null &&
                EntityManager.Exists(entity) &&
                EntityManager.HasComponent<Aggregate>(entity);
        }
    }
}
