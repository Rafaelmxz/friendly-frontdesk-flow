import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { PaymentForm } from "@/components/forms/PaymentForm";
import { RowActions } from "@/components/RowActions";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import { handleMutationError } from "@/lib/mutation-errors";
import { listPaymentsByReservation, deletePayment } from "@/lib/payments.functions";

const METHOD_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão crédito",
  cartao_debito: "Cartão débito",
  pix: "Pix",
  transferencia: "Transferência",
  outro: "Outro",
};
const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  estornado: "Estornado",
  falhou: "Falhou",
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export const paymentsByReservationQuery = (reservationId: string) =>
  queryOptions({
    queryKey: ["payments", "by-reservation", reservationId],
    queryFn: () => listPaymentsByReservation({ data: { reservationId } }),
  });

interface Props {
  reservationId: string;
  guestId: string;
  reservationTotal: number;
}

type EditingPayment = {
  id: string;
  amount: number;
  method: "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "transferencia" | "outro";
  status: "pendente" | "pago" | "estornado" | "falhou";
  paid_at: string | null;
  notes: string | null;
} | null;

export function PaymentsSection({ reservationId, guestId, reservationTotal }: Props) {
  const { isAdmin } = useCurrentRole();
  const { data: payments } = useSuspenseQuery(paymentsByReservationQuery(reservationId));
  const qc = useQueryClient();
  const deleteFn = useServerFn(deletePayment);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EditingPayment>(null);

  const totalPago = payments
    .filter((p) => p.status === "pago")
    .reduce((sum, p) => sum + p.amount, 0);
  const saldo = reservationTotal - totalPago;

  const del = useMutation<unknown, Error, string>({
    mutationFn: (id) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", "by-reservation", reservationId] });
      qc.invalidateQueries({ queryKey: ["payments", "by-guest", guestId] });
      qc.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      toast.success("Pagamento excluído.");
    },
    onError: (e) => handleMutationError(e),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pagamentos</h2>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> Registrar pagamento
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total da reserva</CardDescription></CardHeader>
          <CardContent><div className="text-xl font-semibold tabular-nums">{brl.format(reservationTotal)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Recebido (pago)</CardDescription></CardHeader>
          <CardContent><div className="text-xl font-semibold tabular-nums">{brl.format(totalPago)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Saldo em aberto</CardDescription></CardHeader>
          <CardContent>
            <div className={`text-xl font-semibold tabular-nums ${saldo <= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {brl.format(Math.max(saldo, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum pagamento registrado.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{fmtDateTime(p.paid_at ?? p.created_at)}</TableCell>
                    <TableCell>{METHOD_LABELS[p.method] ?? p.method}</TableCell>
                    <TableCell className="tabular-nums">{brl.format(p.amount)}</TableCell>
                    <TableCell><Badge variant="secondary">{STATUS_LABELS[p.status] ?? p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        canEdit={isAdmin}
                        onDelete={isAdmin ? () => del.mutate(p.id) : undefined}
                        deleting={del.isPending}
                        itemLabel="este pagamento"
                      />
                      {isAdmin ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1"
                          onClick={() =>
                            setEditing({
                              id: p.id,
                              amount: p.amount,
                              method: p.method,
                              status: p.status,
                              paid_at: p.paid_at,
                              notes: p.notes,
                            })
                          }
                        >
                          Editar
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
          <PaymentForm
            mode="create"
            reservationId={reservationId}
            guestId={guestId}
            onDone={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar pagamento</DialogTitle></DialogHeader>
          {editing ? (
            <PaymentForm
              mode="edit"
              reservationId={reservationId}
              guestId={guestId}
              paymentId={editing.id}
              initial={{
                amount: editing.amount,
                method: editing.method,
                status: editing.status,
                paid_at: editing.paid_at,
                notes: editing.notes,
              }}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
