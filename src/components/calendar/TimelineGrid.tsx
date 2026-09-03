import { useEffect, useRef } from "react";
import { Sparkles, Wrench, Ban } from "lucide-react";
import { ReservationHoverCard } from "@/components/calendar/ReservationHoverCard";
import { STATUS_META } from "@/components/calendar/reservation-card";

export type TimelineRoom = {
  id: string;
  number: string;
  status: string;
  room_type_name: string;
};

export type TimelineReservation = {
  id: string;
  room_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
};

const ROOM_STATUS_ICON: Record<string, { icon: typeof Wrench; label: string }> = {
  limpeza: { icon: Sparkles, label: "Em limpeza" },
  manutencao: { icon: Wrench, label: "Em manutenção" },
  bloqueado: { icon: Ban, label: "Bloqueado" },
};

const ROW_H = 32;
export const SIDEBAR = 160;
export const DAY_W = 104;

interface Props {
  rooms: TimelineRoom[];
  reservations: TimelineReservation[];
  days: Date[];
  start: Date;
  todayISO: string;
  toISO: (d: Date) => string;
  parseISO: (s: string) => Date;
  diffDays: (a: Date, b: Date) => number;
  dayFmt: Intl.DateTimeFormat;
  onSelect: (id: string) => void;
  /** Container rolável, para o pai comandar scrollTo nos botões. */
  scrollerRef?: React.RefObject<HTMLDivElement | null>;
  /** Disparado quando a rolagem para, com o índice do primeiro dia visível. */
  onSettle?: (dayIndex: number) => void;
}

export function TimelineGrid({
  rooms,
  reservations,
  days,
  start,
  todayISO,
  toISO,
  parseISO,
  diffDays,
  dayFmt,
  onSelect,
  scrollerRef,
  onSettle,
}: Props) {
  const cols = days.length;
  const localRef = useRef<HTMLDivElement>(null);
  const el = scrollerRef ?? localRef;

  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;

  useEffect(() => {
    const node = el.current;
    if (!node) return;

    const settle = () => {
      const index = Math.round(node.scrollLeft / DAY_W);
      onSettleRef.current?.(Math.max(0, index));
    };

    if ("onscrollend" in window) {
      node.addEventListener("scrollend", settle);
      return () => node.removeEventListener("scrollend", settle);
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(settle, 300);
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      node.removeEventListener("scroll", onScroll);
    };
  }, [el]);

  const dayBg = (d: Date) => {
    const iso = toISO(d);
    if (iso === todayISO) return "bg-today-column";
    const dow = d.getDay();
    return dow === 0 || dow === 6 ? "bg-weekend" : "";
  };

  if (rooms.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Nenhum quarto cadastrado.</div>;
  }

  const gridCols = `${SIDEBAR}px repeat(${cols}, ${DAY_W}px)`;

  return (
    <div
      ref={el}
      className="overflow-x-auto overscroll-x-contain"
      style={{ scrollSnapType: "x mandatory", scrollPaddingLeft: SIDEBAR }}
    >
      <div style={{ width: SIDEBAR + cols * DAY_W }}>
        <div className="grid border-b bg-muted/40 text-xs font-medium" style={{ gridTemplateColumns: gridCols }}>
          <div className="sticky left-0 z-20 border-r bg-muted p-2">Quarto</div>
          {days.map((d) => {
            const iso = toISO(d);
            return (
              <div
                key={iso}
                style={{ scrollSnapAlign: "start" }}
                className={`border-r p-2 text-center capitalize last:border-r-0 ${dayBg(d)} ${
                  iso === todayISO ? "font-semibold" : ""
                }`}
              >
                {dayFmt.format(d)}
              </div>
            );
          })}
        </div>

        {rooms.map((room) => {
          const roomRes = reservations.filter((r) => r.room_id === room.id);
          const flag = ROOM_STATUS_ICON[room.status];
          const Icon = flag?.icon;
          return (
            <div
              key={room.id}
              className="relative grid border-b last:border-b-0"
              style={{ gridTemplateColumns: gridCols, height: ROW_H }}
            >
              <div className="sticky left-0 z-20 flex items-center gap-1.5 overflow-hidden border-r bg-card px-2 text-xs">
                <span className="font-medium">{room.number}</span>
                <span className="truncate text-muted-foreground">{room.room_type_name}</span>
                {Icon && (
                  <span title={flag.label} className="ml-auto shrink-0 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">{flag.label}</span>
                  </span>
                )}
              </div>

              {days.map((d) => (
                <div key={toISO(d)} className={`border-r last:border-r-0 ${dayBg(d)}`} />
              ))}

              <div
                className="pointer-events-none absolute inset-y-1 z-10"
                style={{ left: SIDEBAR, width: cols * DAY_W }}
              >
                <div className="relative grid h-full" style={{ gridTemplateColumns: `repeat(${cols}, ${DAY_W}px)` }}>
                  {roomRes.map((r) => {
                    const startCol = Math.max(0, diffDays(parseISO(r.check_in), start));
                    const endCol = Math.min(cols, diffDays(parseISO(r.check_out), start));
                    if (endCol <= startCol) return null;
                    const meta = STATUS_META[r.status] ?? STATUS_META["pendente"];
                    return (
                      <ReservationHoverCard key={r.id} id={r.id} status={r.status} onOpen={() => onSelect(r.id)}>
                        <button
                          type="button"
                          onClick={() => onSelect(r.id)}
                          className={`pointer-events-auto flex h-full items-center gap-1 self-center overflow-hidden rounded border px-1.5 text-[11px] leading-none transition-opacity hover:opacity-85 ${meta.bar}`}
                          style={{ gridColumn: `${startCol + 1} / ${endCol + 1}`, marginInline: 2 }}
                        >
                          <span className="shrink-0 font-semibold" aria-hidden="true">
                            {meta.short}
                          </span>
                          <span className="truncate">{r.guest_name}</span>
                          <span className="sr-only">— {meta.label}</span>
                        </button>
                      </ReservationHoverCard>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
