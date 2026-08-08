import { useCallback, useRef, useState } from "react";

const THRESHOLD = 4;

interface Options {
  /** Largura em px de uma coluna de dia. */
  colWidth: () => number;
  /** Chamado ao soltar, com o número de dias a deslocar (positivo = futuro). */
  onPanDays: (days: number) => void;
}

/**
 * Arrasto horizontal (mouse/toque) para navegar por dias.
 * Ignora o gesto quando começa sobre um elemento marcado com [data-no-pan].
 */
export function useDragPan({ colWidth, onPanDays }: Options) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const active = useRef(false);
  const moved = useRef(false);

  const finish = useCallback(
    (commit: boolean) => {
      if (!active.current) return;
      const delta = dx;
      active.current = false;
      setDragging(false);
      setDx(0);
      if (commit && moved.current) {
        const w = colWidth() || 1;
        const days = -Math.round(delta / w);
        if (days !== 0) onPanDays(days);
      }
      moved.current = false;
    },
    [colWidth, dx, onPanDays],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if ((e.target as HTMLElement).closest("[data-no-pan]")) return;
    active.current = true;
    moved.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!active.current) return;
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;
    if (!moved.current) {
      if (Math.abs(deltaX) < THRESHOLD) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        active.current = false;
        return;
      }
      moved.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    setDx(deltaX);
  }, []);

  const onPointerUp = useCallback(() => finish(true), [finish]);
  const onPointerCancel = useCallback(() => finish(false), [finish]);

  return {
    dragging,
    dx,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
