import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { bindValue, trigger, useValue } from "cs2/api";
import { useDraggablePosition } from "./use-draggable-position";
import { ModToolShelf } from "./mod-tool-shelf";
import styles from "./stacklight.module.scss";

type LogEntry = {
  id: string;
  timestamp: string;
  level: string;
  severity: number;
  source: string;
  message: string;
  detail: string;
  occurrences: number;
};

type ModContextEntry = {
  pdxId: string;
  name: string;
  version: string;
  thumbnailPath: string;
  recognized: boolean;
  integration: string;
};

type PanelView = "logs" | "mods";

type ScrollThumbState = {
  top: number;
  height: number;
  scrollable: boolean;
};

const GROUP = "stacklight";
const ERROR_SEVERITY = 6000;
const MIN_SCROLL_THUMB_PX = 28;
const entriesBinding = bindValue<LogEntry[]>(GROUP, "entries", []);
const errorCountBinding = bindValue<number>(GROUP, "errorCount", 0);
const warningCountBinding = bindValue<number>(GROUP, "warningCount", 0);
const prunedCountBinding = bindValue<number>(GROUP, "prunedCount", 0);
const statusBinding = bindValue<string>(GROUP, "status", "");
const sessionStartedBinding = bindValue<string>(
  GROUP,
  "sessionStarted",
  ""
);
const mapScopeBinding = bindValue<string>(
  GROUP,
  "mapScope",
  "No map loaded"
);
const modsBinding = bindValue<ModContextEntry[]>(GROUP, "mods", []);
const modCountBinding = bindValue<number>(GROUP, "modCount", 0);
const contextStatusBinding = bindValue<string>(
  GROUP,
  "contextStatus",
  "Waiting for active playset"
);
const gameVersionBinding = bindValue<string>(GROUP, "gameVersion", "");

const badgeText = (count: number) => (count > 99 ? "99+" : `${count}`);

const stopHeaderAction = (
  event: React.MouseEvent<HTMLElement>
) => {
  event.stopPropagation();
};

export function Stacklight() {
  const entries = useValue(entriesBinding);
  const errorCount = useValue(errorCountBinding);
  const warningCount = useValue(warningCountBinding);
  const prunedCount = useValue(prunedCountBinding);
  const status = useValue(statusBinding);
  const sessionStarted = useValue(sessionStartedBinding);
  const mapScope = useValue(mapScopeBinding);
  const mods = useValue(modsBinding);
  const modCount = useValue(modCountBinding);
  const contextStatus = useValue(contextStatusBinding);
  const gameVersion = useValue(gameVersionBinding);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [view, setView] = useState<PanelView>("logs");
  const entriesRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const thumbDragCleanupRef = useRef<(() => void) | null>(null);
  const [scrollThumb, setScrollThumb] = useState<ScrollThumbState>({
    top: 0,
    height: MIN_SCROLL_THUMB_PX,
    scrollable: false
  });
  const drag = useDraggablePosition<HTMLDivElement>(
    "stacklight-position-v1"
  );

  const visibleEntries = useMemo(
    () =>
      showWarnings
        ? entries
        : entries.filter((entry) => entry.severity >= ERROR_SEVERITY),
    [entries, showWarnings]
  );

  const launcherCount = errorCount;
  const signalClass =
    errorCount > 0
      ? styles.signalError
      : warningCount > 0
        ? styles.signalWarning
        : styles.signalClear;

  const updateScrollbar = useCallback(() => {
    const entriesElement = entriesRef.current;
    const trackElement = scrollTrackRef.current;
    if (!entriesElement || !trackElement) {
      return;
    }

    const trackHeight = trackElement.clientHeight;
    const viewportHeight = entriesElement.clientHeight;
    const contentHeight = entriesElement.scrollHeight;
    const maxScroll = Math.max(0, contentHeight - viewportHeight);
    const scrollable = maxScroll > 0 && trackHeight > 0;
    const height = scrollable
      ? Math.max(
          MIN_SCROLL_THUMB_PX,
          trackHeight * (viewportHeight / contentHeight)
        )
      : trackHeight;
    const maxThumbTop = Math.max(0, trackHeight - height);
    const top = scrollable
      ? maxThumbTop * (entriesElement.scrollTop / maxScroll)
      : 0;

    setScrollThumb((current) => {
      if (
        Math.abs(current.top - top) < 0.5 &&
        Math.abs(current.height - height) < 0.5 &&
        current.scrollable === scrollable
      ) {
        return current;
      }

      return { top, height, scrollable };
    });
  }, []);

  const scheduleScrollbarUpdate = useCallback(() => {
    window.setTimeout(updateScrollbar, 0);
  }, [updateScrollbar]);

  const handleTrackMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const entriesElement = entriesRef.current;
      const trackElement = scrollTrackRef.current;
      if (!entriesElement || !trackElement || !scrollThumb.scrollable) {
        return;
      }

      const bounds = trackElement.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (event.clientY - bounds.top) / bounds.height)
      );
      entriesElement.scrollTop =
        ratio * (entriesElement.scrollHeight - entriesElement.clientHeight);
      updateScrollbar();
    },
    [scrollThumb.scrollable, updateScrollbar]
  );

  const handleThumbMouseDown = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const entriesElement = entriesRef.current;
      const trackElement = scrollTrackRef.current;
      if (!entriesElement || !trackElement || !scrollThumb.scrollable) {
        return;
      }

      thumbDragCleanupRef.current?.();
      const startY = event.clientY;
      const startScrollTop = entriesElement.scrollTop;
      const maxScroll =
        entriesElement.scrollHeight - entriesElement.clientHeight;
      const maxThumbTravel = trackElement.clientHeight - scrollThumb.height;
      if (maxScroll <= 0 || maxThumbTravel <= 0) {
        return;
      }

      const handleMouseMove = (moveEvent: MouseEvent) => {
        entriesElement.scrollTop =
          startScrollTop +
          (moveEvent.clientY - startY) * (maxScroll / maxThumbTravel);
        updateScrollbar();
      };
      const cleanup = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", cleanup);
        thumbDragCleanupRef.current = null;
      };

      thumbDragCleanupRef.current = cleanup;
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", cleanup);
    },
    [scrollThumb.height, scrollThumb.scrollable, updateScrollbar]
  );

  const toggle = useCallback(() => {
    if (drag.consumeDragClick()) {
      return;
    }

    setOpen((value) => !value);
  }, [drag]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "l"
      ) {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(updateScrollbar, 0);
    window.addEventListener("resize", updateScrollbar);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("resize", updateScrollbar);
    };
  }, [
    entries,
    expanded,
    mods,
    open,
    showWarnings,
    updateScrollbar,
    view
  ]);

  useEffect(
    () => () => {
      thumbDragCleanupRef.current?.();
    },
    []
  );

  useEffect(() => {
    const suppressed = new Map<HTMLElement, string>();
    const suppressLegacyBridgeList = () => {
      document
        .querySelectorAll<HTMLButtonElement>(
          'button[aria-controls="map-editor-plus-panel"]'
        )
        .forEach((button) => {
          const owner = button.closest<HTMLElement>(
            'aside[aria-label="Mod list"]'
          );
          if (!owner || suppressed.has(owner)) {
            return;
          }

          suppressed.set(owner, owner.style.display);
          owner.dataset.stacklightSuppressed = "true";
          owner.style.display = "none";
        });
    };

    suppressLegacyBridgeList();
    const observer = new MutationObserver(suppressLegacyBridgeList);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      suppressed.forEach((display, owner) => {
        owner.style.display = display;
        delete owner.dataset.stacklightSuppressed;
      });
    };
  }, []);

  return (
    <div
      ref={drag.rootRef}
      className={`${styles.host} ${drag.isDragging ? styles.dragging : ""}`}
      style={drag.positionStyle}
    >
      {open && (
        <section
          className={`${styles.panel} ${
            expanded ? styles.panelExpanded : ""
          }`}
          aria-label="Stacklight log panel"
        >
          <header className={styles.header} onMouseDown={drag.beginDrag}>
            <div className={styles.titleBlock}>
              <span className={styles.eyebrow}>SITUATION HELPER</span>
              <h2>Stacklight</h2>
              <p>Diagnostics and active tools, one click away.</p>
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.resize}
                aria-label={
                  expanded
                    ? "Return Stacklight to compact size"
                    : "Expand Stacklight"
                }
                title={expanded ? "Compact panel" : "Expand panel"}
                onMouseDown={stopHeaderAction}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? "Compact" : "Expand"}
              </button>
              <button
                type="button"
                className={styles.close}
                aria-label="Close Stacklight"
                onMouseDown={stopHeaderAction}
                onClick={() => setOpen(false)}
              >
                x
              </button>
            </div>
          </header>

          <nav className={styles.tabBar} aria-label="Stacklight views">
            <button
              type="button"
              className={view === "logs" ? styles.tabActive : ""}
              onClick={() => setView("logs")}
            >
              Logs <span>{entries.length}</span>
            </button>
            <button
              type="button"
              className={view === "mods" ? styles.tabActive : ""}
              onClick={() => setView("mods")}
            >
              Mods <span>{modCount}</span>
            </button>
            <span className={styles.gameVersion}>
              {gameVersion || "Cities: Skylines II"}
            </span>
          </nav>

          <div className={styles.summaryBar}>
            {view === "logs" ? (
              <>
                <span className={`${styles.summaryChip} ${styles.errorChip}`}>
                  {errorCount} errors
                </span>
                <button
                  type="button"
                  className={`${styles.summaryChip} ${styles.warningChip} ${
                    showWarnings ? styles.warningChipActive : ""
                  }`}
                  onClick={() => setShowWarnings((value) => !value)}
                  title="Show or hide low-grade game warnings"
                >
                  {warningCount} minor notices
                </button>
                <span className={styles.session}>
                  Map: {mapScope || "No map loaded"} · Since{" "}
                  {sessionStarted || "this session"}
                </span>
              </>
            ) : (
              <>
                <span className={`${styles.summaryChip} ${styles.modChip}`}>
                  {modCount} enabled
                </span>
                <span className={styles.contextStatus}>{contextStatus}</span>
              </>
            )}
          </div>

          <div className={styles.toolbar}>
            <button
              type="button"
              onClick={() => trigger(GROUP, "copyAll", showWarnings)}
            >
              Copy situation
            </button>
            {view === "logs" ? (
              <button type="button" onClick={() => trigger(GROUP, "clear")}>
                Clear
              </button>
            ) : (
              <button
                type="button"
                onClick={() => trigger(GROUP, "refreshContext")}
              >
                Refresh mods
              </button>
            )}
            <button type="button" onClick={drag.resetPosition}>
              Reset position
            </button>
            {status && <span className={styles.status}>{status}</span>}
          </div>

          <div className={styles.entriesFrame}>
            <div
              id="stacklight-scroll-region"
              ref={entriesRef}
              className={styles.entries}
              onScroll={updateScrollbar}
              onClick={scheduleScrollbarUpdate}
            >
              {view === "mods" ? (
                <ModToolShelf mods={mods} contextStatus={contextStatus} />
              ) : visibleEntries.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptySignal} aria-hidden="true" />
                  <strong>No matching records</strong>
                  <p>
                    Stacklight is listening. It stays out of the way until the
                    game or a mod reports a warning or error.
                  </p>
                </div>
              ) : (
                visibleEntries.map((entry) => (
                  <LogCard
                    key={entry.id}
                    entry={entry}
                    onToggle={scheduleScrollbarUpdate}
                  />
                ))
              )}
            </div>
            <div
              ref={scrollTrackRef}
              className={`${styles.scrollTrack} ${
                scrollThumb.scrollable ? "" : styles.scrollTrackIdle
              }`}
              onMouseDown={handleTrackMouseDown}
              aria-hidden={!scrollThumb.scrollable}
            >
              <button
                type="button"
                className={styles.scrollThumb}
                style={{
                  top: scrollThumb.top,
                  height: scrollThumb.height
                }}
                aria-controls="stacklight-scroll-region"
                aria-label="Scroll Stacklight records"
                title={
                  scrollThumb.scrollable
                    ? "Drag to scroll"
                    : "All records are visible"
                }
                onMouseDown={handleThumbMouseDown}
              />
            </div>
          </div>

          <footer className={styles.footer}>
            <span>Ctrl+Shift+L</span>
            <span>|</span>
            <span>
              {view === "logs"
                ? "Latest 100 unique records"
                : "Active playset name withheld"}
            </span>
            {view === "logs" && prunedCount > 0 && (
              <>
                <span className={styles.footerDetail}>|</span>
                <span className={styles.footerDetail}>
                  {prunedCount} older records pruned
                </span>
              </>
            )}
            <span className={styles.footerDetail}>|</span>
            <span className={styles.footerDetail}>
              Profile paths sanitized on copy
            </span>
          </footer>
        </section>
      )}

      <button
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherOpen : ""}`}
        onMouseDown={drag.beginDrag}
        onClick={toggle}
        title={`Drag to move. Click to open Stacklight. ${errorCount} unique errors; ${warningCount} minor notices.`}
      >
        <span className={`${styles.signal} ${signalClass}`}>
          <i className={styles.signalRed} />
          <i className={styles.signalAmber} />
          <i className={styles.signalCyan} />
        </span>
        <span>Stacklight</span>
        {launcherCount > 0 && (
          <span className={styles.count}>{badgeText(launcherCount)}</span>
        )}
      </button>
    </div>
  );
}

function LogCard({
  entry,
  onToggle
}: {
  entry: LogEntry;
  onToggle: () => void;
}) {
  const isError = entry.severity >= ERROR_SEVERITY;
  const displayLevel = isError ? entry.level : "MINOR (WARN)";
  return (
    <details
      className={`${styles.entry} ${
        isError ? styles.entryError : styles.entryWarning
      }`}
      onToggle={onToggle}
    >
      <summary>
        <span
          className={`${styles.levelDot} ${
            isError ? styles.levelDotError : styles.levelDotWarning
          }`}
        />
        <span className={styles.entryHeadline}>
          <span className={styles.entryMeta}>
            {entry.timestamp} | {displayLevel} | {entry.source}
            {entry.occurrences > 1 && ` | x${entry.occurrences}`}
          </span>
          <strong>{entry.message}</strong>
        </span>
        <button
          type="button"
          className={styles.copy}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            trigger(GROUP, "copyEntry", entry.id);
          }}
        >
          Copy
        </button>
      </summary>
      <pre>{entry.detail || "No additional stack trace was supplied."}</pre>
    </details>
  );
}
