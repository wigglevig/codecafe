import { useState, useCallback, useEffect } from "react";
import {
  UseResizablePanelOptions,
  UseResizablePanelReturn,
} from "../types/props";

const getSizeFromStorage = (
  key: string | undefined,
  defaultValue: number
): number => {
  if (!key) return defaultValue;
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue !== null) {
      const parsed = parseFloat(storedValue);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error(
      `Error reading resizable panel size from localStorage ('${key}'):`,
      error
    );
  }
  return defaultValue;
};

const setSizeInStorage = (key: string | undefined, size: number) => {
  if (!key) return;
  try {
    localStorage.setItem(key, String(size));
  } catch (error) {
    console.error(
      `Error saving resizable panel size to localStorage ('${key}'):`,
      error
    );
  }
};

export function useResizablePanel({
  initialSize,
  minSize = 0,
  maxSize = Infinity,
  direction,
  containerRef,
  onResizeStart,
  onResizeEnd,
  onToggle,
  collapseThreshold = 25,
  storageKey,
  defaultOpenSize,
}: UseResizablePanelOptions): UseResizablePanelReturn {
  const resolveInitialSize = useCallback(() => {
    const resolvedInitial =
      typeof initialSize === "function" ? initialSize() : initialSize;
    return getSizeFromStorage(storageKey, resolvedInitial);
  }, [initialSize, storageKey]);

  const resolveDefaultOpenSize = useCallback(() => {
    const resolvedDefaultProp =
      typeof defaultOpenSize === "function"
        ? defaultOpenSize()
        : defaultOpenSize;
    if (resolvedDefaultProp && resolvedDefaultProp > collapseThreshold) {
      return resolvedDefaultProp;
    }
    const rawInitial =
      typeof initialSize === "function" ? initialSize() : initialSize;
    if (rawInitial > collapseThreshold) {
      return rawInitial;
    }
    return Math.max(minSize, collapseThreshold + 1);
  }, [defaultOpenSize, initialSize, collapseThreshold, minSize]);

  const [size, setSize] = useState<number>(resolveInitialSize);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [previousSize, setPreviousSize] = useState<number>(() => {
    const initial = resolveInitialSize();
    return initial > collapseThreshold ? initial : resolveDefaultOpenSize();
  });

  const isCollapsed = size <= collapseThreshold;

  useEffect(() => {
    if (!isCollapsed && size > collapseThreshold) {
      setPreviousSize(size);
    }
  }, [size, isCollapsed, collapseThreshold]);

  useEffect(() => {
    setSizeInStorage(storageKey, size);
  }, [size, storageKey]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      setIsResizing(true);
      onResizeStart?.();
    },
    [onResizeStart]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newSize: number;

      if (direction === "vertical") {
        newSize = containerRect.bottom - event.clientY;
      } else {
        if (direction === "horizontal-left") {
          newSize = event.clientX - containerRect.left;
        } else {
          newSize = containerRect.right - event.clientX;
        }
      }

      let clampedSize = Math.max(0, newSize);
      if (clampedSize < collapseThreshold) {
        clampedSize = 0;
      } else {
        clampedSize = Math.max(minSize, clampedSize);
        clampedSize = Math.min(maxSize, clampedSize);
      }

      setSize(clampedSize);
    },
    [isResizing, direction, containerRef, minSize, maxSize, collapseThreshold]
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      onResizeEnd?.(size);
    }
  }, [isResizing, onResizeEnd, size]);

  useEffect(() => {
    if (!isResizing) return;

    let bodyCursor = "";
    if (direction === "vertical") {
      bodyCursor = "row-resize";
    } else if (
      direction === "horizontal-left" ||
      direction === "horizontal-right"
    ) {
      bodyCursor = "col-resize";
    }

    document.body.style.cursor = bodyCursor;
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("pointerup", handleMouseUp);
    window.addEventListener("pointercancel", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("pointerup", handleMouseUp);
      window.removeEventListener("pointercancel", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp, direction]);

  const togglePanel = useCallback(() => {
    setSize((currentSize) => {
      const nextIsCollapsed = currentSize <= collapseThreshold;
      const sizeToRestore =
        previousSize > collapseThreshold
          ? previousSize
          : resolveDefaultOpenSize();
      const nextSize = nextIsCollapsed ? sizeToRestore : 0;
      onToggle?.(!nextIsCollapsed);
      return nextSize;
    });
  }, [collapseThreshold, previousSize, onToggle, resolveDefaultOpenSize]);

  return {
    size,
    setSize,
    isResizing,
    previousSize,
    isCollapsed,
    handleMouseDown,
    togglePanel,
  };
}
