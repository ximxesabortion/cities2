import { useMemo, useState } from "react";
import { bindValue, trigger, useValue } from "cs2/api";
import styles from "./stacklight.module.scss";

export type ModContextEntry = {
  pdxId: string;
  name: string;
  version: string;
  thumbnailPath: string;
  recognized: boolean;
  integration: string;
};

type ActionSpec = {
  label: string;
  run: () => void;
};

type HotkeySpec = {
  keys: string;
  label: string;
};

type ToolSpec = {
  pdxId: string;
  category: string;
  summary: string;
  hotkeys?: HotkeySpec[];
  actions?: ActionSpec[];
  state?: StateSpec;
};

type StateSpec = {
  group: string;
  binding: string;
  activeValue: string | number | boolean;
  activeLabel: string;
  idleLabel: string;
};

type LiveState = {
  connected: boolean;
  active: boolean;
  label: string;
};

const FAVORITES_KEY = "stacklight-tool-favorites-v1";
const MANIFEST_GROUP = "stacklight-tools";
const SAFE_BINDING_NAME = /^[A-Za-z0-9_.:-]{1,80}$/;

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

const invoke = (group: string, name: string, ...args: unknown[]) => {
  trigger(group, name, ...args);
};

const TOOL_SPECS: Record<string, ToolSpec> = {
  "74539": {
    pdxId: "74539",
    category: "Reference",
    summary: "Reference image overlay",
    hotkeys: [{ keys: "Ctrl+O", label: "Toggle overlay" }]
  },
  "74604": {
    pdxId: "74604",
    category: "Placement",
    summary: "Placement-rule override",
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
  "74324": {
    pdxId: "74324",
    category: "Movement",
    summary: "Select and transform map objects",
    actions: [
      {
        label: "Toggle tool",
        run: () => invoke("MoveIt", "MIT_EnableToggle")
      }
    ]
  },
  "133736": {
    pdxId: "133736",
    category: "Networks",
    summary: "Advanced road and network geometry",
    actions: [
      {
        label: "Open panel",
        run: () =>
          invoke("NetworkTools", "TRIGGER:PANEL_OPEN", true)
      }
    ]
  },
  "84638": {
    pdxId: "84638",
    category: "Appearance",
    summary: "Native color painter and palettes",
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
  "87190": {
    pdxId: "87190",
    category: "Networks",
    summary: "Create and reuse custom road assets",
    actions: [
      {
        label: "Open tool",
        run: () =>
          invoke("editorTool", "selectTool", "RoadBuilderTool")
      }
    ]
  }
};

const readFavorites = (): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const makeInitials = (name: string) => {
  const words = name
    .replace(/\[[^\]]+\]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
};

const searchableText = (
  mod: ModContextEntry,
  spec: ToolSpec | undefined
) =>
  [
    mod.name,
    mod.integration,
    spec?.category,
    spec?.summary,
    ...(spec?.hotkeys?.flatMap((hotkey) => [
      hotkey.keys,
      hotkey.label
    ]) ?? []),
    ...(spec?.actions?.map((action) => action.label) ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const limitedText = (
  value: unknown,
  fallback: string,
  maxLength: number
) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;

const isPrimitive = (
  value: unknown
): value is string | number | boolean | null =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

const parseManifest = (
  raw: string,
  pdxId: string
): ToolSpec | undefined => {
  if (!raw || raw.length > 12_000) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== 1
    ) {
      return undefined;
    }

    const hotkeys = Array.isArray(parsed.hotkeys)
      ? parsed.hotkeys
          .slice(0, 12)
          .map((item) => {
            const value = item as Record<string, unknown>;
            const keys = limitedText(value.keys, "", 48);
            const label = limitedText(value.label, "", 100);
            return keys && label ? { keys, label } : undefined;
          })
          .filter((item): item is HotkeySpec => Boolean(item))
      : [];

    const actions = Array.isArray(parsed.actions)
      ? parsed.actions
          .slice(0, 8)
          .map((item) => {
            const value = item as Record<string, unknown>;
            const label = limitedText(value.label, "", 64);
            const group = limitedText(value.group, "", 80);
            const action = limitedText(value.trigger, "", 80);
            const args = Array.isArray(value.args)
              ? value.args.slice(0, 4).filter(isPrimitive)
              : [];
            if (
              !label ||
              !SAFE_BINDING_NAME.test(group) ||
              !SAFE_BINDING_NAME.test(action)
            ) {
              return undefined;
            }
            return {
              label,
              run: () => invoke(group, action, ...args)
            };
          })
          .filter((item): item is ActionSpec => Boolean(item))
      : [];

    let state: StateSpec | undefined;
    if (parsed.state && typeof parsed.state === "object") {
      const value = parsed.state as Record<string, unknown>;
      const group = limitedText(value.group, "", 80);
      const binding = limitedText(value.binding, "", 80);
      const activeValue = value.activeValue;
      if (
        SAFE_BINDING_NAME.test(group) &&
        SAFE_BINDING_NAME.test(binding) &&
        (typeof activeValue === "string" ||
          typeof activeValue === "number" ||
          typeof activeValue === "boolean")
      ) {
        state = {
          group,
          binding,
          activeValue,
          activeLabel: limitedText(
            value.activeLabel,
            "Active",
            48
          ),
          idleLabel: limitedText(value.idleLabel, "Ready", 48)
        };
      }
    }

    return {
      pdxId,
      category: limitedText(parsed.category, "Tool", 48),
      summary: limitedText(
        parsed.summary,
        "Tool controls supplied by the installed mod.",
        180
      ),
      hotkeys,
      actions,
      state
    };
  } catch {
    return undefined;
  }
};

export function ModToolShelf({
  mods,
  contextStatus
}: {
  mods: ModContextEntry[];
  contextStatus: string;
}) {
  const anarchyEnabled = useValue(anarchyEnabledBinding);
  const betterBulldozerIsGame = useValue(betterBulldozerModeBinding);
  const moveItEnabled = useValue(moveItEnabledBinding);
  const networkToolsPanelOpen = useValue(networkToolsPanelBinding);
  const recolorEditorVisible = useValue(recolorEditorBinding);
  const roadBuilderMode = useValue(roadBuilderModeBinding);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(readFavorites);
  const [feedback, setFeedback] = useState("");

  const liveStates: Record<string, LiveState> = {
    "74539": {
      connected: true,
      active: true,
      label: "Available"
    },
    "74604": {
      connected: anarchyEnabled !== null,
      active: anarchyEnabled === true,
      label:
        anarchyEnabled === null
          ? "Control unavailable"
          : anarchyEnabled
            ? "Enabled"
            : "Inactive"
    },
    "75250": {
      connected: betterBulldozerIsGame !== null,
      active: betterBulldozerIsGame === false,
      label:
        betterBulldozerIsGame === null
          ? "Enabled"
          : betterBulldozerIsGame
            ? "Gameplay mode"
            : "Editor ready"
    },
    "74324": {
      connected: moveItEnabled !== null,
      active: moveItEnabled === true,
      label:
        moveItEnabled === null
          ? "Control unavailable"
          : moveItEnabled
            ? "Tool active"
            : "Tool idle"
    },
    "133736": {
      connected: networkToolsPanelOpen !== null,
      active: networkToolsPanelOpen === true,
      label:
        networkToolsPanelOpen === null
          ? "Control unavailable"
          : networkToolsPanelOpen
            ? "Panel open"
            : "Panel closed"
    },
    "84638": {
      connected: recolorEditorVisible !== null,
      active: recolorEditorVisible === true,
      label:
        recolorEditorVisible === null
          ? "Control unavailable"
          : recolorEditorVisible
            ? "Painter active"
            : "Painter ready"
    },
    "87190": {
      connected: roadBuilderMode !== null,
      active: roadBuilderMode !== null && roadBuilderMode !== 0,
      label:
        roadBuilderMode === null
          ? "Control unavailable"
          : roadBuilderMode === 0
            ? "Tool idle"
            : "Tool active"
    }
  };

  const visibleMods = useMemo(() => {
    return [...mods]
      .sort((left, right) => {
        const leftFavorite = favorites.includes(left.pdxId) ? 0 : 1;
        const rightFavorite = favorites.includes(right.pdxId) ? 0 : 1;
        return (
          leftFavorite - rightFavorite ||
          left.name.localeCompare(right.name)
        );
      });
  }, [favorites, mods]);

  const toggleFavorite = (pdxId: string) => {
    setFavorites((current) => {
      const next = current.includes(pdxId)
        ? current.filter((id) => id !== pdxId)
        : [...current, pdxId];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const runAction = (
    mod: ModContextEntry,
    action: ActionSpec,
    connected: boolean
  ) => {
    if (!connected) {
      setFeedback(`${mod.name}: control binding is unavailable.`);
      return;
    }
    try {
      action.run();
      setFeedback(`${mod.name}: ${action.label} requested.`);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "binding unavailable";
      setFeedback(`${mod.name}: ${reason}`);
    }
  };

  if (mods.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptySignal} aria-hidden="true" />
        <strong>No enabled mods reported yet</strong>
        <p>{contextStatus}</p>
      </div>
    );
  }

  return (
    <div className={styles.toolShelf}>
      <div className={styles.toolShelfControls}>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tools, actions, hotkeys..."
          aria-label="Search enabled mod tools"
        />
        <div className={styles.scopeToggle} aria-label="Mod list scope">
          <button
            type="button"
            className={!showAll ? styles.scopeActive : ""}
            onClick={() => setShowAll(false)}
          >
            Tools
          </button>
          <button
            type="button"
            className={showAll ? styles.scopeActive : ""}
            onClick={() => setShowAll(true)}
          >
            All {mods.length}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={styles.toolFeedback} role="status">
          {feedback}
        </div>
      )}

      {visibleMods.length === 0 ? (
        <div className={styles.toolShelfEmpty}>
          No enabled tool or control matches "{query}".
        </div>
      ) : (
        <div className={styles.modList}>
          {visibleMods.map((mod) => {
            return (
              <ModToolCard
                key={`${mod.pdxId}:${mod.name}`}
                mod={mod}
                knownState={liveStates[mod.pdxId]}
                query={query}
                showAll={showAll}
                favorite={favorites.includes(mod.pdxId)}
                expanded={expandedId === mod.pdxId}
                onToggleFavorite={toggleFavorite}
                onToggleExpanded={(pdxId) =>
                  setExpandedId((current) =>
                    current === pdxId ? null : pdxId
                  )
                }
                onFeedback={setFeedback}
              />
            );

            const spec = TOOL_SPECS[mod.pdxId];
            const state = liveStates[mod.pdxId] ?? {
              connected: true,
              active: false,
              label: "Enabled"
            };
            const expanded = expandedId === mod.pdxId;
            const favorite = favorites.includes(mod.pdxId);
            const hasControls = Boolean(
              spec?.actions?.length || spec?.hotkeys?.length
            );

            return (
              <article
                className={`${styles.modCard} ${
                  hasControls ? styles.modCardRecognized : ""
                } ${expanded ? styles.modCardExpanded : ""}`}
                key={`${mod.pdxId}:${mod.name}`}
              >
                <div className={styles.modCardTop}>
                  <button
                    type="button"
                    className={styles.modIcon}
                    aria-expanded={expanded}
                    title={`Expand ${mod.name}`}
                    onClick={() =>
                      setExpandedId(expanded ? null : mod.pdxId)
                    }
                  >
                    <span>{makeInitials(mod.name) || "M"}</span>
                    {mod.thumbnailPath && (
                      <img
                        src={mod.thumbnailPath}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.modIdentity}
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedId(expanded ? null : mod.pdxId)
                    }
                  >
                    <span className={styles.modTitle}>
                      <strong>{mod.name}</strong>
                      <span
                        className={`${styles.liveDot} ${
                          state.active
                            ? styles.liveDotActive
                            : state.connected
                              ? styles.liveDotIdle
                              : styles.liveDotMissing
                        }`}
                        title={state.label}
                      />
                    </span>
                    <span className={styles.modStatus}>{state.label}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.favorite} ${
                      favorite ? styles.favoriteActive : ""
                    }`}
                    aria-label={
                      favorite
                        ? `Remove ${mod.name} from favorites`
                        : `Add ${mod.name} to favorites`
                    }
                    aria-pressed={favorite}
                    onClick={() => toggleFavorite(mod.pdxId)}
                  >
                    {favorite ? "PIN" : "+"}
                  </button>
                </div>

                {expanded && (
                  <div className={styles.modDetails}>
                    <p>
                      {spec?.summary ||
                        mod.integration ||
                        "Enabled playset mod; no stable quick controls are exposed."}
                    </p>
                    <div className={styles.modMeta}>
                      {spec?.category && <span>{spec.category}</span>}
                      {mod.pdxId && <span>PDX {mod.pdxId}</span>}
                      {mod.version && <span>v{mod.version}</span>}
                    </div>

                    {(spec?.hotkeys?.length ?? 0) > 0 && (
                      <div className={styles.hotkeys}>
                        <strong>Hotkeys</strong>
                        {spec?.hotkeys?.map((hotkey) => (
                          <div key={`${hotkey.keys}:${hotkey.label}`}>
                            <kbd>{hotkey.keys}</kbd>
                            <span>{hotkey.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(spec?.actions?.length ?? 0) > 0 && (
                      <div className={styles.quickActions}>
                        {spec?.actions?.map((action) => (
                          <button
                            type="button"
                            key={action.label}
                            className={
                              !state.connected ? styles.disabledAction : ""
                            }
                            disabled={!state.connected}
                            onClick={() =>
                              runAction(mod, action, state.connected)
                            }
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {!hasControls && (
                      <span className={styles.noControls}>
                        Informational only. This mod exposes no verified
                        session control.
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModToolCard({
  mod,
  knownState,
  query,
  showAll,
  favorite,
  expanded,
  onToggleFavorite,
  onToggleExpanded,
  onFeedback
}: {
  mod: ModContextEntry;
  knownState?: LiveState;
  query: string;
  showAll: boolean;
  favorite: boolean;
  expanded: boolean;
  onToggleFavorite: (pdxId: string) => void;
  onToggleExpanded: (pdxId: string) => void;
  onFeedback: (message: string) => void;
}) {
  const manifestBinding = useMemo(
    () =>
      bindValue<string>(
        MANIFEST_GROUP,
        mod.pdxId,
        ""
      ),
    [mod.pdxId]
  );
  const rawManifest = useValue(manifestBinding);
  const manifestSpec = useMemo(
    () => parseManifest(rawManifest, mod.pdxId),
    [mod.pdxId, rawManifest]
  );
  const spec = manifestSpec ?? TOOL_SPECS[mod.pdxId];
  const stateDescriptor = manifestSpec?.state;
  const customStateBinding = useMemo(
    () =>
      bindValue<string | number | boolean | null>(
        stateDescriptor?.group ?? MANIFEST_GROUP,
        stateDescriptor?.binding ?? `state-${mod.pdxId}`,
        null
      ),
    [
      mod.pdxId,
      stateDescriptor?.binding,
      stateDescriptor?.group
    ]
  );
  const customStateValue = useValue(customStateBinding);
  const state: LiveState = stateDescriptor
    ? {
        connected: customStateValue !== null,
        active: customStateValue === stateDescriptor.activeValue,
        label:
          customStateValue === null
            ? "Control unavailable"
            : customStateValue === stateDescriptor.activeValue
              ? stateDescriptor.activeLabel
              : stateDescriptor.idleLabel
      }
    : knownState ?? {
        connected: true,
        active: false,
        label: "Enabled"
      };
  const hasControls = Boolean(
    spec?.actions?.length || spec?.hotkeys?.length
  );
  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery
    ? searchableText(mod, spec).includes(normalizedQuery)
    : true;
  const visible =
    matches &&
    (showAll || normalizedQuery.length > 0 || hasControls || favorite);

  if (!visible) {
    return null;
  }

  const runAction = (action: ActionSpec) => {
    if (!state.connected) {
      onFeedback(`${mod.name}: control binding is unavailable.`);
      return;
    }
    try {
      action.run();
      onFeedback(`${mod.name}: ${action.label} requested.`);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "binding unavailable";
      onFeedback(`${mod.name}: ${reason}`);
    }
  };

  return (
    <article
      className={`${styles.modCard} ${
        hasControls ? styles.modCardRecognized : ""
      } ${expanded ? styles.modCardExpanded : ""}`}
    >
      <div className={styles.modCardTop}>
        <button
          type="button"
          className={styles.modIcon}
          aria-expanded={expanded}
          title={`Expand ${mod.name}`}
          onClick={() => onToggleExpanded(mod.pdxId)}
        >
          <span>{makeInitials(mod.name) || "M"}</span>
          {mod.thumbnailPath && (
            <img
              src={mod.thumbnailPath}
              alt=""
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
        </button>
        <button
          type="button"
          className={styles.modIdentity}
          aria-expanded={expanded}
          onClick={() => onToggleExpanded(mod.pdxId)}
        >
          <span className={styles.modTitle}>
            <strong>{mod.name}</strong>
            <span
              className={`${styles.liveDot} ${
                state.active
                  ? styles.liveDotActive
                  : state.connected
                    ? styles.liveDotIdle
                    : styles.liveDotMissing
              }`}
              title={state.label}
            />
          </span>
          <span className={styles.modStatus}>{state.label}</span>
        </button>
        <button
          type="button"
          className={`${styles.favorite} ${
            favorite ? styles.favoriteActive : ""
          }`}
          aria-label={
            favorite
              ? `Remove ${mod.name} from favorites`
              : `Add ${mod.name} to favorites`
          }
          aria-pressed={favorite}
          onClick={() => onToggleFavorite(mod.pdxId)}
        >
          {favorite ? "PIN" : "+"}
        </button>
      </div>

      {expanded && (
        <div className={styles.modDetails}>
          <p>
            {spec?.summary ||
              mod.integration ||
              "Enabled playset mod; no stable quick controls are exposed."}
          </p>
          <div className={styles.modMeta}>
            {spec?.category && <span>{spec.category}</span>}
            {manifestSpec && <span>self-described</span>}
            {mod.pdxId && <span>PDX {mod.pdxId}</span>}
            {mod.version && <span>v{mod.version}</span>}
          </div>

          {spec?.hotkeys && spec.hotkeys.length > 0 && (
            <div className={styles.hotkeys}>
              <strong>Hotkeys</strong>
              {spec.hotkeys.map((hotkey) => (
                <div key={`${hotkey.keys}:${hotkey.label}`}>
                  <kbd>{hotkey.keys}</kbd>
                  <span>{hotkey.label}</span>
                </div>
              ))}
            </div>
          )}

          {spec?.actions && spec.actions.length > 0 && (
            <div className={styles.quickActions}>
              {spec.actions.map((action) => (
                <button
                  type="button"
                  key={action.label}
                  className={
                    !state.connected ? styles.disabledAction : ""
                  }
                  disabled={!state.connected}
                  onClick={() => runAction(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {!hasControls && (
            <span className={styles.noControls}>
              Informational only. This mod exposes no verified session
              control.
            </span>
          )}
        </div>
      )}
    </article>
  );
}
