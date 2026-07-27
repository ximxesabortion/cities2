import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  MutableRefObject
} from "react";

type Position = {
  x: number;
  y: number;
};

type DraggablePosition<T extends HTMLElement> = {
  beginDrag: (event: ReactMouseEvent<HTMLElement>) => void;
  consumeDragClick: () => boolean;
  isDragging: boolean;
  positionStyle: CSSProperties;
  resetPosition: () => void;
  rootRef: MutableRefObject<T | null>;
};

const ZERO_POSITION: Position = { x: 0, y: 0 };
const VIEWPORT_MARGIN = 8;
const DRAG_THRESHOLD = 4;

const readStoredPosition = (storageKey: string): Position => {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return ZERO_POSITION;
    }

    const parsed = JSON.parse(stored) as Partial<Position>;
    if (
      typeof parsed.x === "number" &&
      Number.isFinite(parsed.x) &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // Position persistence is optional.
  }

  return ZERO_POSITION;
};

const clampPosition = (
  proposed: Position,
  previous: Position,
  bounds: DOMRect
): Position => {
  const next = { ...proposed };
  const horizontalDelta = proposed.x - previous.x;
  const verticalDelta = proposed.y - previous.y;
  const nextLeft = bounds.left + horizontalDelta;
  const nextRight = bounds.right + horizontalDelta;
  const nextTop = bounds.top + verticalDelta;
  const nextBottom = bounds.bottom + verticalDelta;

  if (nextLeft < VIEWPORT_MARGIN) {
    next.x += VIEWPORT_MARGIN - nextLeft;
  } else if (nextRight > window.innerWidth - VIEWPORT_MARGIN) {
    next.x -= nextRight - (window.innerWidth - VIEWPORT_MARGIN);
  }

  if (nextTop < VIEWPORT_MARGIN) {
    next.y += VIEWPORT_MARGIN - nextTop;
  } else if (nextBottom > window.innerHeight - VIEWPORT_MARGIN) {
    next.y -= nextBottom - (window.innerHeight - VIEWPORT_MARGIN);
  }

  return next;
};

export function useDraggablePosition<T extends HTMLElement>(
  storageKey: string
): DraggablePosition<T> {
  const [position, setPosition] = useState<Position>(() =>
    readStoredPosition(storageKey)
  );
  const [isDragging, setIsDragging] = useState(false);
  const rootRef = useRef<T | null>(null);
  const positionRef = useRef(position);
  const cleanupRef = useRef<(() => void) | null>(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    positionRef.current = position;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(position));
    } catch {
      // Dragging still works when storage is unavailable.
    }
  }, [position, storageKey]);

  useEffect(
    () => () => {
      cleanupRef.current?.();
    },
    []
  );

  const beginDrag = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      cleanupRef.current?.();

      const root = rootRef.current;
      if (!root) {
        return;
      }

      const startPointer = {
        x: event.clientX,
        y: event.clientY
      };
      const startPosition = positionRef.current;
      const startBounds = root.getBoundingClientRect();
      movedRef.current = false;
      suppressClickRef.current = false;
      setIsDragging(true);

      const finishDrag = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", finishDrag);
        suppressClickRef.current = movedRef.current;
        cleanupRef.current = null;
        setIsDragging(false);
      };

      const handleMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        if (
          Math.abs(moveEvent.clientX - startPointer.x) >= DRAG_THRESHOLD ||
          Math.abs(moveEvent.clientY - startPointer.y) >= DRAG_THRESHOLD
        ) {
          movedRef.current = true;
        }

        const proposed = {
          x: startPosition.x + moveEvent.clientX - startPointer.x,
          y: startPosition.y + moveEvent.clientY - startPointer.y
        };
        const bounded = clampPosition(
          proposed,
          startPosition,
          startBounds
        );
        positionRef.current = bounded;
        setPosition(bounded);
      };

      cleanupRef.current = finishDrag;
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", finishDrag);
    },
    []
  );

  const consumeDragClick = useCallback(() => {
    const shouldSuppress = suppressClickRef.current;
    suppressClickRef.current = false;
    return shouldSuppress;
  }, []);

  const resetPosition = useCallback(() => {
    positionRef.current = ZERO_POSITION;
    setPosition(ZERO_POSITION);
  }, []);

  return {
    beginDrag,
    consumeDragClick,
    isDragging,
    positionStyle: {
      transform: `translate3d(${position.x}px, ${position.y}px, 0)`
    },
    resetPosition,
    rootRef
  };
}
