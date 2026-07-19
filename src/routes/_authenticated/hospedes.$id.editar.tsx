import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { GuestForm } from "@/components/forms/GuestForm";
import { getGuest } from "@/lib/guests.functions";
import { listReservationsByGuest } from "@/lib/reservations.functions";
import { listPaymentsByGuest } from "@/lib/payments.functions";

const guestQuery = (id: string) =>
  queryOptions({ queryKey: ["guests", "detail", id], queryFn: () => getGuest({ data: { id } }) });
const historyQuery = (id: string) =>
  queryOptions({
    queryKey: ["reservations", "by-guest", id],
    queryFn: () => listReservationsByGuest({ data: { guestId: id } }),
  });
const paymentsQuery = (id: string) =>
  queryOptions({
    queryKey: ["payments", "by-guest", id],
    queryFn: () => listPaymentsByGuest({ data: { guestId: id } }),
  });

export const Route = createFileRoute("/_authenticated/hospedes/$id/editar")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(guestQuery(params.id)),
      context.queryClient.ensureQueryData(historyQuery(params.id)),
      context.queryClient.ensureQueryData(paymentsQuery(params.id)),
    ]);
  },
  component: EditGuest,
});

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  checkin: "Check-in",
  checkout: "Check-out",
  cancelada: "Cancelada",
  no_show: "No-show",
};

const METHOD_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão crédito",
  cartao_debito: "Cartão débito",
  pix: "Pix",
  transferencia: "Transferência",
  outro: "Outro",
};

const PAY_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  estornado: "Estornado",
  falhou: "Falhou",
};

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function fmtMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function EditGuest() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(guestQuery(id));
  const { data: history } = useSuspenseQuery(historyQuery(id));
  const { data: payments } = useSuspenseQuery(paymentsQuery(id));
  return (
    <div className="space-y-8">
      <div>
        <CrudPageHeader title="Editar hóspede" />
        <GuestForm mode="edit" id={id} initial={data} />
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3">Histórico de reservas</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarto</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma reserva.</TableCell></TableRow>
                ) : history.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.room_number}</TableCell>
                    <TableCell>{fmtDate(r.check_in)}</TableCell>
                    <TableCell>{fmtDate(r.check_out)}</TableCell>
                    <TableCell>{fmtMoney(r.total_amount)}</TableCell>
                    <TableCell><Badge variant="secondary">{STATUS_LABEL[r.status] ?? r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3">Histórico de pagamentos</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarto</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum pagamento.</TableCell></TableRow>
                ) : payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.room_number}</TableCell>
                    <TableCell>{fmtDateTime(p.paid_at ?? p.created_at)}</TableCell>
                    <TableCell>{METHOD_LABELS[p.method] ?? p.method}</TableCell>
                    <TableCell>{fmtMoney(p.amount)}</TableCell>
                    <TableCell><Badge variant="secondary">{PAY_STATUS_LABEL[p.status] ?? p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
