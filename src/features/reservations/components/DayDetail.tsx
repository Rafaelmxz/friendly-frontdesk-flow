import { Link } from "@tanstack/react-router";

type Reservation = {
  id: string;
  guest_name: string;
  room_id: string;
};

type Props = {
  arrivals: Reservation[];
  departures: Reservation[];
  roomLabel: (id: string) => string;
};

export function DayDetail({ arrivals, departures, roomLabel }: Props) {
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
          {arrivals.length === 0 && (
            <li className="text-sm text-muted-foreground">—</li>
          )}
          {arrivals.map((r) => (
            <li key={r.id}>
              <Link
                to="/reservas/$id/editar"
                params={{ id: r.id }}
                className="text-sm hover:underline"
              >
                {r.guest_name}{" "}
                <span className="text-muted-foreground">· {roomLabel(r.room_id)}</span>
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
          {departures.length === 0 && (
            <li className="text-sm text-muted-foreground">—</li>
          )}
          {departures.map((r) => (
            <li key={r.id}>
              <Link
                to="/reservas/$id/editar"
                params={{ id: r.id }}
                className="text-sm hover:underline"
              >
                {r.guest_name}{" "}
                <span className="text-muted-foreground">· {roomLabel(r.room_id)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
