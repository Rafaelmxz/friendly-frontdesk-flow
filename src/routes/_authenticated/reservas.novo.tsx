import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { ReservationForm } from "@/components/forms/ReservationForm";
import { listGuests } from "@/lib/guests.functions";
import { listRooms } from "@/lib/rooms.functions";

const guestsQ = () =>
  queryOptions({ queryKey: ["guests", ""], queryFn: () => listGuests({ data: { search: "" } }) });
const roomsQ = () => queryOptions({ queryKey: ["rooms"], queryFn: () => listRooms() });

export const Route = createFileRoute("/_authenticated/reservas/novo")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(guestsQ()),
      context.queryClient.ensureQueryData(roomsQ()),
    ]);
  },
  component: NewReservation,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <Card><CardContent className="p-6 space-y-2">
        <p className="text-destructive">{error.message}</p>
        <button className="text-sm underline" onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</button>
      </CardContent></Card>
    );
  },
  notFoundComponent: () => <div>Não encontrado.</div>,
});

function NewReservation() {
  const guests = useSuspenseQuery(guestsQ()).data;
  const rooms = useSuspenseQuery(roomsQ()).data;
  return (
    <div>
      <CrudPageHeader title="Nova reserva" />
      <ReservationForm
        mode="create"
        guests={guests.map((g) => ({ id: g.id, full_name: g.full_name }))}
        rooms={rooms.map((r) => ({ id: r.id, number: r.number, room_type_name: r.room_type_name }))}
      />
    </div>
  );
}
