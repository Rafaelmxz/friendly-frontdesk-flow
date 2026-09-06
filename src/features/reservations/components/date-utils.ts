export type ViewMode = "mensal" | "timeline" | "semana";

export const DAYS = 7;
export const TIMELINE_DAYS = 21;

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function mondayOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay();
  const diff = (dow + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function timelineAnchor(d: Date): Date {
  return addDays(d, -7);
}

export function rangeFor(
  view: ViewMode,
  ref: Date,
): { start: Date; days: Date[]; from: string; to: string } {
  if (view === "mensal") {
    const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const gridStart = mondayOf(first);
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    return {
      start: gridStart,
      days,
      from: toISO(gridStart),
      to: toISO(addDays(gridStart, 42)),
    };
  }

  if (view === "timeline") {
    const start = timelineAnchor(ref);
    const days = Array.from({ length: TIMELINE_DAYS }, (_, i) => addDays(start, i));
    return {
      start,
      days,
      from: toISO(start),
      to: toISO(addDays(start, TIMELINE_DAYS)),
    };
  }

  const start = mondayOf(ref);
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  return {
    start,
    days,
    from: toISO(start),
    to: toISO(addDays(start, DAYS)),
  };
}

export const WEEKDAYS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export const monthFmt = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});
export const shortFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});
export const dayFmt = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
});
