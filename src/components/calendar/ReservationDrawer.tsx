import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { paymentsByReservationQuery } from "@/components/PaymentsSection";
import {
  reservationCardQuery,
  useReservationActions,
  STATUS_META,
  brl,
  fmtDate,
  nights,
} from "@/components/calendar/reservation-card";

interface Props {
  id: string | null;
  onClose: () => void;
}

export function ReservationDrawer({ id, onClose }: Props) {
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {id ? <DrawerBody id={id} onClose={onClose} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useQuery(reservationCardQuery(id));
  const payments = useQuery(paymentsByReservationQuery(id));
  const { ci, co, cn } = useReservationActions(id);

  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const meta = STATUS_META[data.status] ?? STATUS_META["pendente"];
  const paid = (payments.data ?? [])
    .filter((p: { status: string }) => p.status === "pago")
    .reduce((s: number, p: { amount: number | string }) => s + Number(p.amount), 0);
  const balance = data.total_amount - paid;

  return (
    <>
      <SheetHeader className="px-0">
        <SheetTitle>{data.guest_name}</SheetTitle>
        <SheetDescription>
          Quarto {data.room_number} {data.room_type_name}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-4 space-y-4">
        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${meta.bar}`}>
          {meta.label}
        </span>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Telefone</dt>
          <dd className="text-right">{data.guest_phone ?? "—"}</dd>
          <dt className="text-muted-foreground">E-mail</dt>
          <dd className="truncate text-right">{data.guest_email ?? "—"}</dd>
          <dt className="text-muted-foreground">Período</dt>
          <dd className="text-right">
            {fmtDate(data.check_in)} – {fmtDate(data.check_out)}
          </dd>
          <dt className="text-muted-foreground">Noites</dt>
          <dd className="text-right">{nights(data.check_in, data.check_out)}</dd>
          <dt className="text-muted-foreground">Hóspedes</dt>
          <dd className="text-right">
            {data.adults + data.children} ({data.adults}A / {data.children}C)
          </dd>
        </dl>

        <Separator />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Valor total</dt>
          <dd className="text-right">{brl.format(data.total_amount)}</dd>
          <dt className="text-muted-foreground">Pago</dt>
          <dd className="text-right">{brl.format(paid)}</dd>
          <dt className="text-muted-foreground font-medium">Saldo</dt>
          <dd className="text-right font-medium">{brl.format(balance)}</dd>
        </dl>

        {data.notes && (
          <>
            <Separator />
            <div>
              <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                Observações
              </div>
              <p className="text-sm whitespace-pre-wrap">{data.notes}</p>
            </div>
          </>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2">
          {data.status === "confirmada" && (
            <Button size="sm" onClick={() => ci.mutate()} disabled={ci.isPending}>
              Check-in
            </Button>
          )}
          {data.status === "checkin" && (
            <Button size="sm" onClick={() => co.mutate()} disabled={co.isPending}>
              Check-out
            </Button>
          )}
          {(data.status === "pendente" || data.status === "confirmada") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => cn.mutate()}
              disabled={cn.isPending}
            >
              Cancelar reserva
            </Button>
          )}
        </div>

        {(data.status === "pendente" || data.status === "confirmada") && (
          <Button asChild variant="link" className="px-0">
            <Link to="/reservas/$id/editar" params={{ id }} onClick={onClose}>
              Editar detalhes completos
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}
