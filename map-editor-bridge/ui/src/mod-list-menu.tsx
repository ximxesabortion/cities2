import { bindValue, trigger, useValue } from "cs2/api";
import { useCallback, useState } from "react";
import styles from "./mod-list-menu.module.scss";
import { useDraggablePosition } from "./use-draggable-position";

type AdapterKey =
  | "anarchy"
  | "better-bulldozer"
  | "move-it"
  | "network-tools"
  | "recolor"
  | "road-builder";

type ActionSpec = {
  label: string;
  run: () => void;
};

type ToolSpec = {
  key: string;
  name: string;
  pdxId: number;
  state: "supported" | "dependency";
  summary: string;
  detail: string;
  adapter?: AdapterKey;
  actions?: ActionSpec[];
  shortcut?: string;
};

const invoke = (group: string, name: string, ...args: unknown[]) => {
  trigger(group, name, ...args);
};

const anarchyEnabledBinding = bindValue<boolean | null>(
  "Anarchy",
  "AnarchyEnabled",
  null
);
const betterBulldozerModeBinding = bindValue<boolean | null>(
  "BetterBulldozer",
  "IsGame",
  null
);
const moveItEnabledBinding = bindValue<boolean | null>(
  "MoveIt",
  "MIT_ToolEnabled",
  null
);
const networkToolsPanelBinding = bindValue<boolean | null>(
  "NetworkTools",
  "BINDING:PANEL_OPEN",
  null
);
const recolorEditorBinding = bindValue<boolean | null>(
  "Recolor",
  "EditorPainterToolOptions",
  null
);
const roadBuilderModeBinding = bindValue<number | null>(
  "RoadBuilder",
  "RoadBuilderToolMode",
  null
);
const stacklightOwnsModListBinding = bindValue<boolean>(
  "stacklight",
  "ownsModList",
  false
);

const TOOLS: ToolSpec[] = [
  {
    key: "image-overlay",
    name: "Image Overlay",
    pdxId: 74539,
    state: "supported",
    summary: "Reference image controls",
    detail:
      "The installed build exposes a keyboard action, not a callable UI panel.",
    shortcut: "Ctrl+O"
  },
  {
    key: "anarchy",
    name: "Anarchy",
    pdxId: 74604,
    state: "supported",
    summary: "Placement-rule override",
    detail: "Uses Anarchy's registered editor UI bindings.",
    adapter: "anarchy",
    actions: [
      {
        label: "Toggle",
        run: () => invoke("Anarchy", "AnarchyToggled")
      },
      {
        label: "Options",
        run: () => invoke("Anarchy", "ToggleAnarchyOptionsPanel")
      }
    ]
  },
  {
    key: "better-bulldozer",
    name: "Better Bulldozer",
    pdxId: 75250,
    state: "supported",
    summary: "Expanded removal filters",
    adapter: "better-bulldozer",
    detail:
      "Select the editor's bulldozer. Its filters belong to that tool's options, so destructive controls are not duplicated here."
  },
  {
    key: "tiles",
    name: "529 Tiles",
    pdxId: 74328,
    state: "supported",
    summary: "Tile and map behavior",
    detail:
      "Supported playset utility. This mod has settings rather than a standalone editor panel."
  },
  {
    key: "uil",
    name: "Unified Icon Library",
    pdxId: 74417,
    state: "dependency",
    summary: "Shared icon dependency",
    detail:
      "Available to supported mods. It is a library, so there is no tool panel to open."
  },
  {
    key: "move-it",
    name: "Move It",
    pdxId: 74324,
    state: "supported",
    summary: "Select and transform map objects",
    detail: "Uses Move It's registered editor UI binding.",
    adapter: "move-it",
    actions: [
      {
        label: "Toggle tool",
        run: () => invoke("MoveIt", "MIT_EnableToggle")
      }
    ]
  },
  {
    key: "network-tools",
    name: "Network Tools [Early Access]",
    pdxId: 133736,
    state: "supported",
    summary: "Advanced road and network geometry",
    detail: "Requests Network Tools' own panel; its mod remains in control.",
    adapter: "network-tools",
    actions: [
      {
        label: "Open panel",
        run: () =>
          invoke("NetworkTools", "TRIGGER:PANEL_OPEN", true)
      }
    ]
  },
  {
    key: "tree-controller",
    name: "Tree Controller",
    pdxId: 75993,
    state: "supported",
    summary: "Vegetation, age, brush, seasonal, and wind tools",
    detail:
      "Extends the normal Landscaping and Vegetation menus exposed by the bridge. Tree Controller remains responsible for its tools, settings, and map changes."
  },
  {
    key: "recolor",
    name: "Recolor",
    pdxId: 84638,
    state: "supported",
    summary: "Native color painter and palettes",
    detail:
      "Opens Recolor's own editor Color Painter. Recolor remains responsible for its colors, palettes, and save data.",
    adapter: "recolor",
    actions: [
      {
        label: "Open painter",
        run: () => {
          invoke("Recolor", "ActivateColorPainter");
          invoke("editorTool", "selectTool", "ColorPainterTool");
        }
      }
    ]
  },
  {
    key: "road-builder",
    name: "Road Builder [BETA]",
    pdxId: 87190,
    state: "supported",
    summary: "Create and reuse custom road assets",
    detail:
      "Opens Road Builder through its native editor tool. Generated roads flow into the bridge road menus automatically.",
    adapter: "road-builder",
    actions: [
      {
        label: "Open tool",
        run: () =>
          invoke("editorTool", "selectTool", "RoadBuilderTool")
      }
    ]
  }
];

const stopPointer = (event: React.SyntheticEvent) => {
  event.stopPropagation();
};

export function ModListMenu() {
  const stacklightOwnsModList = useValue(stacklightOwnsModListBinding);
  return stacklightOwnsModList ? null : <BridgeModListMenu />;
}

function BridgeModListMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState(
    "Supported integrations for this editor build."
  );
  const {
    beginDrag,
    consumeDragClick,
    isDragging,
    positionStyle,
    resetPosition,
    rootRef
  } = useDraggablePosition<HTMLElement>(
    "map-editor-bridge.mod-list-position"
  );
  const toggleMenu = (event: React.SyntheticEvent) => {
    stopPointer(event);
    if (consumeDragClick()) {
      return;
    }
    setIsOpen((current) => !current);
  };
  const anarchyEnabled = useValue(anarchyEnabledBinding);
  const betterBulldozerIsGame = useValue(betterBulldozerModeBinding);
  const moveItEnabled = useValue(moveItEnabledBinding);
  const networkToolsPanelOpen = useValue(networkToolsPanelBinding);
  const recolorEditorVisible = useValue(recolorEditorBinding);
  const roadBuilderMode = useValue(roadBuilderModeBinding);

  const adapters: Record<
    AdapterKey,
    { ready: boolean; label: string }
  > = {
    anarchy: {
      ready: anarchyEnabled !== null,
      label:
        anarchyEnabled === null
          ? "Backend binding unavailable"
          : `Backend connected · ${anarchyEnabled ? "on" : "off"}`
    },
    "better-bulldozer": {
      ready: betterBulldozerIsGame !== null,
      label:
        betterBulldozerIsGame === null
          ? "Tool-options binding unavailable"
          : `Backend connected · ${
              betterBulldozerIsGame ? "gameplay" : "editor"
            } mode`
    },
    "move-it": {
      ready: moveItEnabled !== null,
      label:
        moveItEnabled === null
          ? "Backend binding unavailable"
          : `Backend connected · ${moveItEnabled ? "tool active" : "tool idle"}`
    },
    "network-tools": {
      ready: networkToolsPanelOpen !== null,
      label:
        networkToolsPanelOpen === null
          ? "Backend binding unavailable"
          : `Backend connected · ${
              networkToolsPanelOpen ? "panel open" : "panel closed"
            }`
    },
    recolor: {
      ready: recolorEditorVisible !== null,
      label:
        recolorEditorVisible === null
          ? "Backend binding unavailable"
          : `Backend connected Â· ${
              recolorEditorVisible ? "painter active" : "painter idle"
            }`
    },
    "road-builder": {
      ready: roadBuilderMode !== null,
      label:
        roadBuilderMode === null
          ? "Backend binding unavailable"
          : `Backend connected · ${
              roadBuilderMode === 0 ? "tool idle" : "tool active"
            }`
    }
  };
  const runAction = useCallback((tool: ToolSpec, action: ActionSpec) => {
    try {
      action.run();
      setFeedback(`${action.label} requested from ${tool.name}.`);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "binding unavailable";
      setFeedback(`${tool.name}: ${reason}`);
    }
  }, []);

  return (
    <aside
      ref={rootRef}
      className={`${styles.host} ${isDragging ? styles.dragging : ""}`}
      style={positionStyle}
      aria-label="Mod list"
      onMouseDown={stopPointer}
      onClick={stopPointer}
    >
      <div className={styles.launcherRow}>
        <button
          className={`${styles.launcher} ${
            isOpen ? styles.launcherOpen : ""
          }`}
          type="button"
          aria-expanded={isOpen}
          aria-controls="map-editor-plus-panel"
          title="Click to toggle. Drag to move; double-click to reset position."
          onMouseDown={beginDrag}
          onClick={toggleMenu}
          onDoubleClick={(event) => {
            stopPointer(event);
            resetPosition();
          }}
        >
          <span className={styles.launcherIcon} aria-hidden="true">
            +
          </span>
          <span>Mod list</span>
          <span className={styles.count}>{TOOLS.length}</span>
        </button>
      </div>

      {isOpen && (
        <section
          id="map-editor-plus-panel"
          className={styles.panel}
          aria-label="Supported mod integration list"
        >
          <header
            className={styles.header}
            title="Drag to move. Double-click to reset."
            onMouseDown={beginDrag}
            onDoubleClick={(event) => {
              stopPointer(event);
              resetPosition();
            }}
          >
            <div>
              <div className={styles.eyebrow}>SUPPORTED INTEGRATIONS</div>
              <h2>Mod List</h2>
              <p>Optional mods supported by this editor build.</p>
            </div>
            <button
              className={styles.close}
              type="button"
              aria-label="Close mod list"
              onMouseDown={stopPointer}
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </header>

          <div className={styles.feedback} role="status">
            <span className={styles.feedbackDot} aria-hidden="true" />
            {feedback}
          </div>

          <div className={styles.toolList}>
            {TOOLS.map((tool) => (
              <article
                className={styles.toolCard}
                key={tool.key}
              >
                <div className={styles.toolTopline}>
                  <div>
                    <h3>{tool.name}</h3>
                    <span className={styles.meta}>
                      PDX {tool.pdxId}
                    </span>
                  </div>
                  <span
                    className={`${styles.badge} ${
                      tool.state === "dependency"
                          ? styles.badgeDependency
                          : styles.badgeEnabled
                    }`}
                  >
                    {tool.state}
                  </span>
                </div>

                <div className={styles.summary}>{tool.summary}</div>
                <p>{tool.detail}</p>

                {tool.adapter && (
                  <div
                    className={`${styles.adapterState} ${
                      adapters[tool.adapter].ready
                        ? styles.adapterReady
                        : styles.adapterMissing
                    }`}
                  >
                    {adapters[tool.adapter].label}
                  </div>
                )}

                {(tool.shortcut || tool.actions) && (
                  <div className={styles.actions}>
                    {tool.shortcut && (
                      <span
                        className={styles.shortcut}
                        title={`${tool.name} shortcut`}
                      >
                        {tool.shortcut}
                      </span>
                    )}
                    {tool.actions?.map((action) => (
                      <button
                        className={`${styles.action} ${
                          tool.adapter && !adapters[tool.adapter].ready
                            ? styles.disabledAction
                            : ""
                        }`}
                        type="button"
                        key={action.label}
                        disabled={
                          tool.adapter
                            ? !adapters[tool.adapter].ready
                            : false
                        }
                        onClick={() => runAction(tool, action)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>

          <footer className={styles.footer}>
            UI host only · simulation remains off
          </footer>
        </section>
      )}
    </aside>
  );
}

export function MoveItMiniPanel() {
  const moveItEnabled = useValue(moveItEnabledBinding);
  const {
    beginDrag,
    consumeDragClick,
    isDragging,
    positionStyle,
    resetPosition,
    rootRef
  } = useDraggablePosition<HTMLDivElement>(
    "map-editor-bridge.move-it-mini-position"
  );

  if (moveItEnabled === null) {
    return null;
  }

  const toggleMoveIt = (event: React.SyntheticEvent) => {
    stopPointer(event);
    if (consumeDragClick()) {
      return;
    }
    invoke("MoveIt", "MIT_EnableToggle");
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.moveItMiniHost} ${
        isDragging ? styles.dragging : ""
      }`}
      style={positionStyle}
      onMouseDown={stopPointer}
      onClick={stopPointer}
    >
      <button
        className={`${styles.moveItMiniButton} ${
          moveItEnabled ? styles.moveItMiniActive : ""
        }`}
        type="button"
        aria-label="Toggle Move It"
        aria-pressed={moveItEnabled}
        title="Click to toggle Move It. Drag to move; double-click to reset position."
        onMouseDown={beginDrag}
        onClick={toggleMoveIt}
        onDoubleClick={(event) => {
          stopPointer(event);
          resetPosition();
        }}
      >
        <span className={styles.moveItMiniDot} aria-hidden="true" />
        <span>Move It</span>
      </button>
    </div>
  );
}
