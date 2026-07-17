import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { RowActions } from "@/components/RowActions";
import { currentProfileQueryOptions } from "@/hooks/useCurrentRole";
import {
  listReservations,
  checkInReservation,
  checkOutReservation,
  cancelReservation,
} from "@/lib/reservations.functions";
import { handleMutationError } from "@/lib/mutation-errors";
import { toast } from "sonner";

const reservationsQuery = () =>
  queryOptions({ queryKey: ["reservations"], queryFn: () => listReservations() });

export const Route = createFileRoute("/_authenticated/reservas/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(reservationsQuery()),
      context.queryClient.ensureQueryData(currentProfileQueryOptions()),
    ]);
  },
  component: ReservationsList,
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

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  checkin: "Check-in",
  checkout: "Check-out",
  cancelada: "Cancelada",
  no_show: "No-show",
};

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ReservationsList() {
  const { data } = useSuspenseQuery(reservationsQuery());
  const qc = useQueryClient();

  const checkIn = useServerFn(checkInReservation);
  const checkOut = useServerFn(checkOutReservation);
  const cancel = useServerFn(cancelReservation);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["reservations"] });
    qc.invalidateQueries({ queryKey: ["rooms"] });
  };

  const ciMutation = useMutation<unknown, Error, string>({
    mutationFn: (id) => checkIn({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Check-in realizado."); },
    onError: (err) => handleMutationError(err),
  });
  const coMutation = useMutation<unknown, Error, string>({
    mutationFn: (id) => checkOut({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Check-out realizado."); },
    onError: (err) => handleMutationError(err),
  });
  const canMutation = useMutation<unknown, Error, string>({
    mutationFn: (id) => cancel({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Reserva cancelada."); },
    onError: (err) => handleMutationError(err),
  });

  const busy = ciMutation.isPending || coMutation.isPending || canMutation.isPending;

  return (
    <div>
      <CrudPageHeader
        title="Reservas"
        description="Gerencie reservas, check-in e check-out."
        canCreate
        createTo="/reservas/novo"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hóspede</TableHead>
                <TableHead>Quarto</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma reserva cadastrada.</TableCell></TableRow>
              ) : data.map((r) => {
                const canCheckin = r.status === "confirmada";
                const canCheckout = r.status === "checkin";
                const canCancel = r.status === "pendente" || r.status === "confirmada";
                const canEdit = r.status === "pendente" || r.status === "confirmada";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.guest_name}</TableCell>
                    <TableCell>{r.room_number}</TableCell>
                    <TableCell>{fmtDate(r.check_in)}</TableCell>
                    <TableCell>{fmtDate(r.check_out)}</TableCell>
                    <TableCell>{fmtMoney(r.total_amount)}</TableCell>
                    <TableCell><Badge variant="secondary">{STATUS_LABEL[r.status] ?? r.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {canCheckin ? (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => ciMutation.mutate(r.id)}>Check-in</Button>
                        ) : null}
                        {canCheckout ? (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => coMutation.mutate(r.id)}>Check-out</Button>
                        ) : null}
                        {canCancel ? (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => canMutation.mutate(r.id)}>Cancelar</Button>
                        ) : null}
                        <RowActions
                          canEdit={canEdit}
                          editTo="/reservas/$id/editar"
                          editParams={{ id: r.id }}
                          itemLabel="reserva"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
