import { useEffect, useRef, useState } from "react";

const THRESHOLD = 6;

interface Options {
  /** Largura em px de uma coluna de dia. */
  colWidth: () => number;
  /** Chamado UMA vez ao soltar, com o número de dias a deslocar (positivo = futuro). */
  onPanDays: (days: number) => void;
}

/**
 * Arrasto horizontal (mouse/toque) para navegar por dias.
 *
 * Durante o gesto nada re-renderiza: o deslocamento é escrito direto no DOM
 * (`style.transform`). A navegação real acontece só no fim do gesto.
 * Ignora gestos que começam sobre um elemento marcado com [data-no-pan].
 */
export function useDragPan({ colWidth, onPanDays }: Options) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const colWidthRef = useRef(colWidth);
  const onPanDaysRef = useRef(onPanDays);
  colWidthRef.current = colWidth;
  onPanDaysRef.current = onPanDays;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let active = false;
    let horizontal = false;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let frame = 0;

    const paint = () => {
      frame = 0;
      if (el) el.style.transform = `translateX(${dx}px)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const clearTransform = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      el.style.transform = "";
    };

    const begin = (x: number, y: number, target: EventTarget | null) => {
      if ((target as HTMLElement | null)?.closest("[data-no-pan]")) return false;
      active = true;
      horizontal = false;
      startX = x;
      startY = y;
      dx = 0;
      return true;
    };

    /** Retorna true quando o gesto está sendo tratado como pan horizontal. */
    const move = (x: number, y: number) => {
      if (!active) return false;
      const deltaX = x - startX;
      const deltaY = y - startY;
      if (!horizontal) {
        if (Math.abs(deltaX) < THRESHOLD && Math.abs(deltaY) < THRESHOLD) return false;
        if (Math.abs(deltaY) >= Math.abs(deltaX)) {
          // gesto vertical: devolve o controle para a rolagem da página
          active = false;
          return false;
        }
        horizontal = true;
        setDragging(true);
      }
      dx = deltaX;
      schedule();
      return true;
    };

    const end = (commit: boolean) => {
      if (!active) return;
      const delta = dx;
      const wasHorizontal = horizontal;
      active = false;
      horizontal = false;
      dx = 0;
      clearTransform();
      setDragging(false);
      if (commit && wasHorizontal) {
        const w = colWidthRef.current() || 1;
        const days = -Math.round(delta / w);
        if (days !== 0) onPanDaysRef.current(days);
      }
    };

    // --- mouse / caneta -----------------------------------------------------
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // toque tem o caminho dedicado abaixo
      if (e.button !== 0) return;
      if (!begin(e.clientX, e.clientY, e.target)) return;
      el.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      move(e.clientX, e.clientY);
    };
    const onPointerUp = () => end(true);
    const onPointerCancel = () => end(false);

    // --- toque (não passivo, para poder bloquear a rolagem horizontal) ------
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0]!;
      begin(t.clientX, t.clientY, e.target);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!active || e.touches.length !== 1) return;
      const t = e.touches[0]!;
      if (move(t.clientX, t.clientY) && e.cancelable) e.preventDefault();
    };
    const onTouchEnd = () => end(true);
    const onTouchCancel = () => end(false);

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchCancel);

    return () => {
      clearTransform();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, []);

  return { dragging, ref };
}
