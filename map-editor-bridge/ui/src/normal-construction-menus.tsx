import { bindValue, trigger, useValue } from "cs2/api";
import { getModule } from "cs2/modding";
import type { ModuleRegistry } from "cs2/modding";
import { useEffect, useState } from "react";
import type { ComponentType, SyntheticEvent } from "react";
import styles from "./mod-list-menu.module.scss";
import { useDraggablePosition } from "./use-draggable-position";

type Entity = {
  index: number;
  version: number;
};

type ToolbarItem = {
  entity: Entity;
  type: number;
  icon: string;
  name?: string;
  locked?: boolean;
};

type ToolbarGroup = {
  entity: Entity;
  children: ToolbarItem[];
};

type AssetMenuProps = {
  focusKey?: unknown;
  className?: string;
  onClose: () => void;
};

type AssetItem = {
  entity: Entity;
  locked?: boolean;
  placed?: boolean;
  [key: string]: unknown;
};

type ItemGridProps = {
  items: AssetItem[];
  [key: string]: unknown;
};

type GameScreenClasses = {
  toolLayout?: string;
  toolMainColumn?: string;
  toolPanel?: string;
};

export type ConstructionRuntime = {
  AssetMenu: ComponentType<AssetMenuProps>;
  gameScreenClasses: GameScreenClasses;
};

const ASSET_MENU_PATH =
  "game-ui/game/components/asset-menu/asset-menu.tsx";
const ITEM_GRID_PATH =
  "game-ui/game/components/item-grid/item-grid.tsx";
const GAME_SCREEN_STYLES_PATH =
  "game-ui/game/components/game-main-screen.module.scss";

const EMPTY_ENTITY: Entity = {
  index: 0,
  version: 0
};
const toolbarGroupsBinding = bindValue<ToolbarGroup[]>(
  "toolbar",
  "toolbarGroups",
  []
);
const selectedAssetCategoryBinding = bindValue<Entity>(
  "toolbar",
  "selectedAssetCategory",
  EMPTY_ENTITY
);
const selectedAssetMenuBinding = bindValue<Entity>(
  "toolbar",
  "selectedAssetMenu",
  EMPTY_ENTITY
);
const selectedAssetBinding = bindValue<Entity>(
  "toolbar",
  "selectedAsset",
  EMPTY_ENTITY
);
const isEditorBinding = bindValue<boolean>("tool", "isEditor", false);
const editorActiveToolBinding = bindValue<string | null>(
  "editorTool",
  "activeTool",
  null
);
const roadNameAvailableBinding = bindValue<boolean>(
  "mapEditorBridgeRoadName",
  "available",
  false
);
const roadNameBinding = bindValue<string>(
  "mapEditorBridgeRoadName",
  "name",
  ""
);
const roadNameCustomBinding = bindValue<boolean>(
  "mapEditorBridgeRoadName",
  "custom",
  false
);
const roadNameStatusBinding = bindValue<string>(
  "mapEditorBridgeRoadName",
  "status",
  ""
);

const readModule = <T,>(
  modulePath: string,
  exportName: string
): T | null => {
  try {
    return (getModule(modulePath, exportName) as T | undefined) ?? null;
  } catch {
    return null;
  }
};

export function resolveConstructionRuntime(): ConstructionRuntime | null {
  const AssetMenu = readModule<ComponentType<AssetMenuProps>>(
    ASSET_MENU_PATH,
    "AssetMenu"
  );
  const gameScreenClasses =
    readModule<GameScreenClasses>(
      GAME_SCREEN_STYLES_PATH,
      "classes"
    ) ?? {};

  if (!AssetMenu) {
    return null;
  }

  return {
    AssetMenu,
    gameScreenClasses
  };
}

export function installEditorAssetUnlock(
  moduleRegistry: ModuleRegistry
): boolean {
  const BaseItemGrid = readModule<ComponentType<ItemGridProps>>(
    ITEM_GRID_PATH,
    "ItemGrid"
  );

  if (!BaseItemGrid) {
    return false;
  }

  const EditorUnlockedItemGrid = (props: ItemGridProps) => {
    const isEditor = useValue(isEditorBinding);
    const items = isEditor
      ? props.items.map((item) =>
          item.locked ? { ...item, locked: false } : item
        )
      : props.items;

    return <BaseItemGrid {...props} items={items} />;
  };

  moduleRegistry.override(
    ITEM_GRID_PATH,
    "ItemGrid",
    EditorUnlockedItemGrid
  );
  return true;
}

const isValidEntity = (entity: Entity | null | undefined) =>
  Boolean(entity && (entity.index !== 0 || entity.version !== 0));

const isSameEntity = (
  first: Entity | null | undefined,
  second: Entity | null | undefined
) =>
  Boolean(
    first &&
      second &&
      first.index === second.index &&
      first.version === second.version
  );

const stopPointer = (event: SyntheticEvent) => {
  event.stopPropagation();
};

const enterConstructionContext = () => {
  trigger("editorTool", "selectTool", "PrefabTool");
};

const getToolbarItemLabel = (item: ToolbarItem) => {
  const name = item.name?.trim();
  if (name) {
    return name;
  }

  return item.type === 1 ? "Construction menu" : "Construction tool";
};

const getToolbarItemInitials = (label: string) => {
  const words = label
    .split(/[\s_-]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

function UnlockedToolbarItemButton({
  item,
  selected,
  onSelect
}: {
  item: ToolbarItem;
  selected: boolean;
  onSelect: (item: ToolbarItem) => void;
}) {
  const hasIcon = Boolean(item.icon?.trim());
  const [iconFailed, setIconFailed] = useState(!hasIcon);
  const label = getToolbarItemLabel(item);

  useEffect(() => {
    setIconFailed(!item.icon?.trim());
  }, [item.icon]);

  return (
    <button
      className={`${styles.unlockedToolbarButton} ${
        selected ? styles.unlockedToolbarButtonSelected : ""
      }`}
      type="button"
      title={label}
      aria-label={label}
      data-originally-locked={item.locked ? "true" : "false"}
      onClick={() => onSelect(item)}
    >
      {iconFailed ? (
        <span
          className={styles.unlockedToolbarFallbackIcon}
          aria-hidden="true"
        >
          {getToolbarItemInitials(label)}
        </span>
      ) : (
        <img
          src={item.icon}
          alt=""
          aria-hidden="true"
          onError={() => setIconFailed(true)}
        />
      )}
      <span className={styles.unlockedToolbarLabel} aria-hidden="true">
        {label}
      </span>
    </button>
  );
}

function UnlockedToolbar({
  groups,
  onEnterConstruction,
  selectedMenu,
  selectedAsset
}: {
  groups: ToolbarGroup[];
  onEnterConstruction: () => void;
  selectedMenu: Entity;
  selectedAsset: Entity;
}) {
  const selectItem = (item: ToolbarItem) => {
    onEnterConstruction();
    trigger("toolbar", "clearAssetSelection");

    if (item.type === 1) {
      trigger("toolbar", "selectAssetMenu", item.entity);
    } else {
      trigger("toolbar", "selectAsset", item.entity, true);
    }
  };

  return (
    <div className={styles.unlockedToolbar}>
      {groups.map((group, groupIndex) => (
        <div
          className={styles.unlockedToolbarGroup}
          key={`${group.entity.index}:${group.entity.version}`}
        >
          {group.children.map((item) => {
            const selected =
              isSameEntity(item.entity, selectedMenu) ||
              isSameEntity(item.entity, selectedAsset);

            return (
              <UnlockedToolbarItemButton
                item={item}
                selected={selected}
                key={`${item.entity.index}:${item.entity.version}`}
                onSelect={selectItem}
              />
            );
          })}
          {groupIndex < groups.length - 1 && (
            <span className={styles.unlockedToolbarDivider} />
          )}
        </div>
      ))}
    </div>
  );
}

export function NormalConstructionMenus({
  runtime
}: {
  runtime: ConstructionRuntime;
}) {
  const toolbarGroups = useValue(toolbarGroupsBinding);
  const selectedCategory = useValue(selectedAssetCategoryBinding);
  const selectedMenu = useValue(selectedAssetMenuBinding);
  const selectedAsset = useValue(selectedAssetBinding);
  const editorActiveTool = useValue(editorActiveToolBinding);
  const roadNameAvailable = useValue(roadNameAvailableBinding);
  const roadName = useValue(roadNameBinding);
  const roadNameCustom = useValue(roadNameCustomBinding);
  const roadNameStatus = useValue(roadNameStatusBinding);
  const menuOpen = isValidEntity(selectedCategory);
  const [constructionVisible, setConstructionVisible] = useState(true);
  const [bridgeMenuEngaged, setBridgeMenuEngaged] = useState(false);
  const [roadNameDraft, setRoadNameDraft] = useState(roadName);
  const { AssetMenu, gameScreenClasses } = runtime;
  const {
    beginDrag,
    consumeDragClick,
    isDragging,
    positionStyle,
    resetPosition,
    rootRef
  } = useDraggablePosition<HTMLDivElement>(
    "map-editor-bridge.construction-dock-position"
  );
  const activateBridgeContext = () => {
    setBridgeMenuEngaged(true);
    enterConstructionContext();
  };
  const clearAssetSelection = () => {
    setBridgeMenuEngaged(false);
    trigger("toolbar", "clearAssetSelection");
  };
  const toggleConstructionMenus = (event: SyntheticEvent) => {
    stopPointer(event);
    if (consumeDragClick()) {
      return;
    }
    setConstructionVisible((visible) => !visible);
  };

  useEffect(() => {
    if (editorActiveTool !== "PrefabTool") {
      setBridgeMenuEngaged(false);
    }
  }, [editorActiveTool]);

  useEffect(() => {
    setRoadNameDraft(roadName);
  }, [roadName]);

  const saveRoadName = (event: SyntheticEvent) => {
    event.preventDefault();
    stopPointer(event);
    trigger("mapEditorBridgeRoadName", "rename", roadNameDraft);
  };

  return (
    <div className={styles.normalMenus} aria-label="Normal construction menus">
      <div className={styles.constructionDockAnchor}>
        <div
          ref={rootRef}
          className={`${styles.constructionDockMotion} ${
            isDragging ? styles.dragging : ""
          }`}
          style={positionStyle}
        >
          {constructionVisible && (
            <>
              {toolbarGroups.length > 0 ? (
                <div
                  className={styles.constructionToolbar}
                  onMouseDown={stopPointer}
                  onClick={stopPointer}
                >
                  <UnlockedToolbar
                    groups={toolbarGroups}
                    onEnterConstruction={activateBridgeContext}
                    selectedMenu={selectedMenu}
                    selectedAsset={selectedAsset}
                  />
                </div>
              ) : (
                <ConstructionMenuUnavailable message="Normal toolbar data is empty in editor mode." />
              )}
            </>
          )}

          {roadNameAvailable && (
            <form
              className={styles.roadNameEditor}
              aria-label="Rename selected road"
              onSubmit={saveRoadName}
              onMouseDown={stopPointer}
              onClick={stopPointer}
            >
              <label
                className={styles.roadNameLabel}
                htmlFor="map-editor-bridge-road-name"
              >
                Road name
              </label>
              <input
                id="map-editor-bridge-road-name"
                className={styles.roadNameInput}
                type="text"
                maxLength={96}
                value={roadNameDraft}
                onChange={(event) => setRoadNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Escape") {
                    setRoadNameDraft(roadName);
                    event.currentTarget.blur();
                  }
                }}
                onKeyUp={stopPointer}
                title="Rename the selected road"
              />
              <button
                className={`${styles.roadNameAction} ${
                  roadNameDraft.trim() === roadName
                    ? styles.disabledAction
                    : ""
                }`}
                type="button"
                disabled={roadNameDraft.trim() === roadName}
                onClick={saveRoadName}
              >
                Save
              </button>
              <button
                className={`${styles.roadNameReset} ${
                  !roadNameCustom ? styles.disabledAction : ""
                }`}
                type="button"
                disabled={!roadNameCustom}
                title="Clear the custom name and restore the automatic road name"
                onClick={() =>
                  trigger("mapEditorBridgeRoadName", "rename", "")
                }
              >
                Auto
              </button>
              <span
                className={styles.roadNameStatus}
                role="status"
                aria-live="polite"
              >
                {roadNameStatus}
              </span>
            </form>
          )}

          <div className={styles.constructionDockControls}>
            <button
              className={`${styles.constructionToggle} ${
                constructionVisible ? styles.constructionToggleOpen : ""
              }`}
              type="button"
              aria-label={
                constructionVisible
                  ? "Hide normal construction menus"
                  : "Show normal construction menus"
              }
              aria-expanded={constructionVisible}
              onMouseDown={beginDrag}
              onClick={toggleConstructionMenus}
              onDoubleClick={(event) => {
                stopPointer(event);
                resetPosition();
              }}
              title={`${
                constructionVisible
                  ? "Hide normal construction menus"
                  : "Show normal construction menus"
              }. Drag to move; double-click to reset position.`}
            >
              <span className={styles.constructionToggleIcon}>
                {constructionVisible ? "-" : "+"}
              </span>
              <span>Build menus</span>
            </button>
          </div>
        </div>
      </div>

      {constructionVisible &&
        bridgeMenuEngaged &&
        editorActiveTool === "PrefabTool" &&
        menuOpen && (
        <div
          className={`${gameScreenClasses.toolLayout ?? ""} ${
            styles.assetMenuLayout
          }`}
          onMouseDownCapture={activateBridgeContext}
          onMouseDown={stopPointer}
          onClick={stopPointer}
        >
          <div className={styles.assetMenuSpacer} />
          <div
            className={`${gameScreenClasses.toolMainColumn ?? ""} ${
              styles.assetMenuMainColumn
            }`}
          >
            <AssetMenu
              focusKey="MapEditorPlusAssetMenu"
              className={`${gameScreenClasses.toolPanel ?? ""} ${
                styles.assetMenuPanel
              }`}
              onClose={clearAssetSelection}
            />
          </div>
          <div className={styles.assetMenuSpacer} />
        </div>
      )}
    </div>
  );
}

export function ConstructionMenuUnavailable({
  message
}: {
  message: string;
}) {
  return (
    <div className={styles.constructionUnavailable} role="status">
      <strong>Construction menus unavailable</strong>
      <span>{message}</span>
    </div>
  );
}
