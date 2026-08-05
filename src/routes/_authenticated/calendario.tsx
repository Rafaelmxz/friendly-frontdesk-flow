import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listRooms } from "@/lib/rooms.functions";
import { getReservationsCalendar } from "@/lib/dashboard.functions";

const roomsQuery = () => queryOptions({ queryKey: ["rooms"], queryFn: () => listRooms() });
const calendarQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: ["calendar", from, to],
    queryFn: () => getReservationsCalendar({ data: { from, to } }),
  });

const DAYS = 7;

type ViewMode = "mensal" | "timeline" | "semana";

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function mondayOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay(); // 0 = sun
  const diff = (dow + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/** Intervalo [from, to) e grade de dias exibidos para o modo escolhido. */
function rangeFor(view: ViewMode, ref: Date): { start: Date; days: Date[]; from: string; to: string } {
  if (view === "mensal") {
    const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const gridStart = mondayOf(first);
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    return { start: gridStart, days, from: toISO(gridStart), to: toISO(addDays(gridStart, 42)) };
  }
  const start = mondayOf(ref);
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  return { start, days, from: toISO(start), to: toISO(addDays(start, DAYS)) };
}

const searchSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  view: z.string().optional(),
});

function normalizeView(v: string | undefined): ViewMode {
  return v === "timeline" || v === "semana" ? v : "mensal";
}

export const Route = createFileRoute("/_authenticated/calendario")({
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => ({ start: search.start, view: search.view }),
  loader: async ({ context, deps }) => {
    const ref = deps.start ? parseISO(deps.start) : new Date();
    const { from, to } = rangeFor(normalizeView(deps.view), ref);
    await Promise.all([
      context.queryClient.ensureQueryData(roomsQuery()),
      context.queryClient.ensureQueryData(calendarQuery(from, to)),
    ]);
  },
  component: CalendarPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <Card>
        <CardContent className="p-6 space-y-2">
          <p className="text-destructive">{error.message}</p>
          <button
            className="text-sm underline"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Tentar novamente
          </button>
        </CardContent>
      </Card>
    );
  },
  notFoundComponent: () => <div>Não encontrado.</div>,
});

const dayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
const longDayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });

const WEEKDAYS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

type Reservation = {
  id: string;
  room_id: string;
  guest_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
};

function CalendarPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const view = normalizeView(search.view);
  const ref = search.start ? parseISO(search.start) : new Date();
  const { start, days, from, to } = rangeFor(view, ref);

  const { data: rooms } = useSuspenseQuery(roomsQuery());
  const { data: reservations } = useSuspenseQuery(calendarQuery(from, to));

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const roomLabel = (id: string) => {
    const r = rooms.find((x) => x.id === id);
    return r ? `Quarto ${r.number}` : "Quarto";
  };

  const arrivalsOn = (iso: string) => reservations.filter((r: Reservation) => r.check_in === iso);
  const departuresOn = (iso: string) => reservations.filter((r: Reservation) => r.check_out === iso);

  const setView = (v: ViewMode) => {
    setSelectedDay(null);
    navigate({ search: { view: v, start: toISO(ref) } });
  };
  const gotoDate = (d: Date) => {
    setSelectedDay(null);
    navigate({ search: { view, start: toISO(d) } });
  };


  const monthRef = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const periodLabel =
    view === "mensal"
      ? monthFmt.format(monthRef)
      : `${shortFmt.format(start)} – ${shortFmt.format(addDays(start, 6))}`;

  const prev = () => gotoDate(view === "mensal" ? addMonths(monthRef, -1) : addDays(start, -7));
  const next = () => gotoDate(view === "mensal" ? addMonths(monthRef, 1) : addDays(start, 7));

  const todayISO = toISO(new Date());

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Calendário de reservas</CardTitle>
              <CardDescription>Reservas confirmadas e em check-in.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={prev}>
                ◀ {view === "mensal" ? "Mês anterior" : "Semana anterior"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => gotoDate(new Date())}>
                Hoje
              </Button>
              <Button variant="outline" size="sm" onClick={next}>
                {view === "mensal" ? "Mês seguinte" : "Semana seguinte"} ▶
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-md border p-1">
              {(["mensal", "timeline", "semana"] as ViewMode[]).map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant={view === v ? "default" : "ghost"}
                  onClick={() => setView(v)}
                  className="capitalize"
                >
                  {v === "mensal" ? "Mensal" : v === "timeline" ? "Timeline" : "Semana"}
                </Button>
              ))}
            </div>
            <div className="text-sm font-medium capitalize">{periodLabel}</div>
          </div>
        </CardHeader>
      </Card>

      {view === "mensal" && (
        <>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium">
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="p-2 text-center border-r last:border-r-0 capitalize">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {days.map((d) => {
                    const iso = toISO(d);
                    const inMonth = d.getMonth() === monthRef.getMonth();
                    const ins = arrivalsOn(iso).length;
                    const outs = departuresOn(iso).length;
                    const isToday = iso === todayISO;
                    const isSelected = iso === selectedDay;
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => setSelectedDay(isSelected ? null : iso)}
                        className={`min-h-20 border-b border-r p-2 text-left transition-colors hover:bg-accent ${
                          inMonth ? "" : "bg-muted/30 text-muted-foreground"
                        } ${isSelected ? "ring-2 ring-inset ring-primary" : ""}`}
                      >
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                            isToday ? "bg-primary text-primary-foreground font-semibold" : ""
                          }`}
                        >
                          {d.getDate()}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {ins > 0 && (
                            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              ↓ {ins}
                            </span>
                          )}
                          {outs > 0 && (
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                              ↑ {outs}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedDay && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base capitalize">
                  {longDayFmt.format(parseISO(selectedDay))}
                </CardTitle>
                <CardDescription>Chegadas e partidas previstas para o dia.</CardDescription>
              </CardHeader>
              <CardContent>
                <DayDetail
                  arrivals={arrivalsOn(selectedDay)}
                  departures={departuresOn(selectedDay)}
                  roomLabel={roomLabel}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {view === "semana" && (
        <div className="grid gap-4 md:grid-cols-2">
          {days.map((d) => {
            const iso = toISO(d);
            const isToday = iso === todayISO;
            return (
              <Card key={iso} className={isToday ? "border-primary" : undefined}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base capitalize">{longDayFmt.format(d)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DayDetail
                    arrivals={arrivalsOn(iso)}
                    departures={departuresOn(iso)}
                    roomLabel={roomLabel}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {view === "timeline" && (
        <>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {rooms.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhum quarto cadastrado.</div>
              ) : (
                <div className="min-w-[900px]">
                  <div
                    className="grid border-b bg-muted/40 text-xs font-medium"
                    style={{ gridTemplateColumns: `140px repeat(${DAYS}, minmax(0, 1fr))` }}
                  >
                    <div className="p-2 border-r">Quarto</div>
                    {days.map((d) => (
                      <div key={d.toISOString()} className="p-2 text-center border-r last:border-r-0">
                        {dayFmt.format(d)}
                      </div>
                    ))}
                  </div>

                  {rooms.map((room) => {
                    const roomRes = reservations.filter((r: Reservation) => r.room_id === room.id);
                    return (
                      <div
                        key={room.id}
                        className="grid border-b last:border-b-0 relative"
                        style={{ gridTemplateColumns: `140px repeat(${DAYS}, minmax(0, 1fr))`, minHeight: 56 }}
                      >
                        <div className="p-2 border-r text-sm flex flex-col justify-center">
                          <div className="font-medium">Quarto {room.number}</div>
                          <div className="text-xs text-muted-foreground">{room.room_type_name}</div>
                        </div>
                        {days.map((d) => (
                          <div key={d.toISOString()} className="border-r last:border-r-0" />
                        ))}
                        <div className="absolute inset-y-2 pointer-events-none" style={{ left: 140, right: 0 }}>
                          <div
                            className="relative h-full grid"
                            style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}
                          >
                            {roomRes.map((r: Reservation) => {
                              const ci = parseISO(r.check_in);
                              const co = parseISO(r.check_out);
                              const startCol = Math.max(0, diffDays(ci, start));
                              const endCol = Math.min(DAYS, diffDays(co, start));
                              if (endCol <= startCol) return null;
                              return (
                                <Link
                                  key={r.id}
                                  to="/reservas/$id/editar"
                                  params={{ id: r.id }}
                                  className={`pointer-events-auto rounded-md px-2 py-1 text-xs text-primary-foreground truncate self-center ${
                                    r.status === "checkin"
                                      ? "bg-emerald-500/80 hover:bg-emerald-500"
                                      : "bg-primary/80 hover:bg-primary"
                                  }`}
                                  style={{ gridColumn: `${startCol + 1} / ${endCol + 1}`, marginInline: 2 }}
                                  title={`${r.guest_name} — ${r.check_in} a ${r.check_out}`}
                                >
                                  {r.guest_name}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-primary/80" /> Confirmada
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-emerald-500/80" /> Em check-in
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DayDetail({
  arrivals,
  departures,
  roomLabel,
}: {
  arrivals: Reservation[];
  departures: Reservation[];
  roomLabel: (id: string) => string;
}) {
  if (arrivals.length === 0 && departures.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem movimentação.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
          Chegadas ({arrivals.length})
        </div>
        <ul className="space-y-1">
          {arrivals.length === 0 && <li className="text-sm text-muted-foreground">—</li>}
          {arrivals.map((r) => (
            <li key={r.id}>
              <Link
                to="/reservas/$id/editar"
                params={{ id: r.id }}
                className="text-sm hover:underline"
              >
                {r.guest_name} <span className="text-muted-foreground">· {roomLabel(r.room_id)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
          Partidas ({departures.length})
        </div>
        <ul className="space-y-1">
          {departures.length === 0 && <li className="text-sm text-muted-foreground">—</li>}
          {departures.map((r) => (
            <li key={r.id}>
              <Link
                to="/reservas/$id/editar"
                params={{ id: r.id }}
                className="text-sm hover:underline"
              >
                {r.guest_name} <span className="text-muted-foreground">· {roomLabel(r.room_id)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
