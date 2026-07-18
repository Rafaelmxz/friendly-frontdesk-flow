import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
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

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

const searchSchema = z.object({ start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export const Route = createFileRoute("/_authenticated/calendario")({
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => ({ start: search.start }),
  loader: async ({ context, deps }) => {
    const start = deps.start ? parseISO(deps.start) : mondayOf(new Date());
    const from = toISO(start);
    const to = toISO(addDays(start, DAYS));
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

function CalendarPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const start = search.start ? parseISO(search.start) : mondayOf(new Date());
  const from = toISO(start);
  const to = toISO(addDays(start, DAYS));

  const { data: rooms } = useSuspenseQuery(roomsQuery());
  const { data: reservations } = useSuspenseQuery(calendarQuery(from, to));

  const days: Date[] = Array.from({ length: DAYS }, (_, i) => addDays(start, i));

  const goto = (d: Date) => navigate({ search: { start: toISO(mondayOf(d)) } });

  const statusColor = (s: string) =>
    s === "checkin" ? "bg-emerald-500/80 hover:bg-emerald-500" : "bg-primary/80 hover:bg-primary";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Calendário de reservas</CardTitle>
            <CardDescription>Reservas confirmadas e em check-in.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => goto(addDays(start, -7))}>
              ◀ Semana anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => goto(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={() => goto(addDays(start, 7))}>
              Semana seguinte ▶
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {rooms.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum quarto cadastrado.</div>
          ) : (
            <div className="min-w-[900px]">
              {/* Header */}
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

              {/* Rows */}
              {rooms.map((room) => {
                const roomRes = reservations.filter((r) => r.room_id === room.id);
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
                    {/* Reservation bars */}
                    <div
                      className="absolute inset-y-2 pointer-events-none"
                      style={{ left: 140, right: 0 }}
                    >
                      <div
                        className="relative h-full grid"
                        style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}
                      >
                        {roomRes.map((r) => {
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
                              className={`pointer-events-auto rounded-md px-2 py-1 text-xs text-primary-foreground truncate self-center ${statusColor(r.status)}`}
                              style={{
                                gridColumn: `${startCol + 1} / ${endCol + 1}`,
                                marginInline: 2,
                              }}
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
    </div>
  );
}
