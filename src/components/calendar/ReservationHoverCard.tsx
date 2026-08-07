import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  reservationCardQuery,
  useReservationActions,
  STATUS_META,
  brl,
  fmtDate,
} from "@/components/calendar/reservation-card";

interface Props {
  id: string;
  status: string;
  onOpen: () => void;
  children: React.ReactNode;
}

export function ReservationHoverCard({ id, status, onOpen, children }: Props) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ ...reservationCardQuery(id), enabled: open });
  const { ci, co } = useReservationActions(id);
  const meta = STATUS_META[status] ?? STATUS_META["pendente"];

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-72 space-y-3" align="start">
        {isLoading || !data ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <>
            <div>
              <div className="font-medium leading-tight">{data.guest_name}</div>
              <div className="text-xs text-muted-foreground">
                {data.guest_phone ?? "Sem telefone cadastrado"}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Quarto</dt>
              <dd className="text-right">
                {data.room_number} {data.room_type_name}
              </dd>
              <dt className="text-muted-foreground">Check-in</dt>
              <dd className="text-right">{fmtDate(data.check_in)}</dd>
              <dt className="text-muted-foreground">Check-out</dt>
              <dd className="text-right">{fmtDate(data.check_out)}</dd>
              <dt className="text-muted-foreground">Hóspedes</dt>
              <dd className="text-right">
                {data.adults + data.children} ({data.adults}A / {data.children}C)
              </dd>
              <dt className="text-muted-foreground">Valor</dt>
              <dd className="text-right">{brl.format(data.total_amount)}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="text-right">
                <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${meta.bar}`}>
                  {meta.label}
                </span>
              </dd>
            </dl>
            <div className="flex flex-wrap gap-2 pt-1">
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
              <Button size="sm" variant="outline" onClick={onOpen}>
                Abrir reserva
              </Button>
            </div>
          </>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
