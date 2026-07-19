import { createFileRoute, Navigate, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { ReservationForm } from "@/components/forms/ReservationForm";
import { PaymentsSection, paymentsByReservationQuery } from "@/components/PaymentsSection";
import { listGuests } from "@/lib/guests.functions";
import { listRooms } from "@/lib/rooms.functions";
import { getReservation } from "@/lib/reservations.functions";

const guestsQ = () =>
  queryOptions({ queryKey: ["guests", ""], queryFn: () => listGuests({ data: { search: "" } }) });
const roomsQ = () => queryOptions({ queryKey: ["rooms"], queryFn: () => listRooms() });
const resQ = (id: string) =>
  queryOptions({ queryKey: ["reservations", "detail", id], queryFn: () => getReservation({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/reservas/$id/editar")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(guestsQ()),
      context.queryClient.ensureQueryData(roomsQ()),
      context.queryClient.ensureQueryData(resQ(params.id)),
      context.queryClient.ensureQueryData(paymentsByReservationQuery(params.id)),
    ]);
  },
  component: EditReservation,
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

function EditReservation() {
  const { id } = Route.useParams();
  const guests = useSuspenseQuery(guestsQ()).data;
  const rooms = useSuspenseQuery(roomsQ()).data;
  const reservation = useSuspenseQuery(resQ(id)).data;

  if (reservation.status !== "pendente" && reservation.status !== "confirmada") {
    return <Navigate to="/reservas" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <CrudPageHeader title="Editar reserva" />
        <ReservationForm
          mode="edit"
          id={id}
          guests={guests.map((g) => ({ id: g.id, full_name: g.full_name }))}
          rooms={rooms.map((r) => ({ id: r.id, number: r.number, room_type_name: r.room_type_name }))}
          initial={{
            guest_id: reservation.guest_id,
            room_id: reservation.room_id,
            check_in: reservation.check_in,
            check_out: reservation.check_out,
            adults: reservation.adults,
            children: reservation.children,
            total_amount: reservation.total_amount,
            status: reservation.status,
            notes: reservation.notes,
          }}
        />
      </div>
      <Separator />
      <PaymentsSection
        reservationId={id}
        guestId={reservation.guest_id}
        reservationTotal={reservation.total_amount}
      />
    </div>
  );
}
