import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getReservationCard,
  checkInReservation,
  checkOutReservation,
  cancelReservation,
} from "@/lib/reservations.functions";
import { handleMutationError } from "@/lib/mutation-errors";

export const reservationCardQuery = (id: string) =>
  queryOptions({
    queryKey: ["reservations", "card", id],
    queryFn: () => getReservationCard({ data: { id } }),
  });

export type StatusKey = "pendente" | "confirmada" | "checkin" | "checkout" | "cancelada" | "no_show";

export const STATUS_META: Record<
  string,
  { label: string; short: string; bar: string; dot: string }
> = {
  pendente: {
    label: "Pendente",
    short: "P",
    bar: "bg-status-pendente text-status-pendente-foreground border-status-pendente-foreground/25",
    dot: "bg-status-pendente border border-status-pendente-foreground/30",
  },
  confirmada: {
    label: "Confirmada",
    short: "C",
    bar: "bg-status-confirmada text-status-confirmada-foreground border-status-confirmada-foreground/25",
    dot: "bg-status-confirmada border border-status-confirmada-foreground/30",
  },
  checkin: {
    label: "Em check-in",
    short: "H",
    bar: "bg-status-checkin text-status-checkin-foreground border-status-checkin-foreground/25",
    dot: "bg-status-checkin border border-status-checkin-foreground/30",
  },
  checkout: {
    label: "Check-out",
    short: "S",
    bar: "bg-status-cancelada text-status-cancelada-foreground border-status-cancelada-foreground/25",
    dot: "bg-status-cancelada border border-status-cancelada-foreground/30",
  },
  cancelada: {
    label: "Cancelada",
    short: "X",
    bar: "bg-status-cancelada text-status-cancelada-foreground border-status-cancelada-foreground/25",
    dot: "bg-status-cancelada border border-status-cancelada-foreground/30",
  },
  no_show: {
    label: "No-show",
    short: "N",
    bar: "bg-status-cancelada text-status-cancelada-foreground border-status-cancelada-foreground/25",
    dot: "bg-status-cancelada border border-status-cancelada-foreground/30",
  },
};

export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function nights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

/** Mutações de check-in / check-out / cancelamento compartilhadas pelo calendário. */
export function useReservationActions(id: string) {
  const qc = useQueryClient();
  const checkIn = useServerFn(checkInReservation);
  const checkOut = useServerFn(checkOutReservation);
  const cancel = useServerFn(cancelReservation);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["reservations"] });
    qc.invalidateQueries({ queryKey: ["calendar"] });
    qc.invalidateQueries({ queryKey: ["rooms"] });
  };

  const ci = useMutation({
    mutationFn: () => checkIn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Check-in realizado.");
    },
    onError: (e) => handleMutationError(e),
  });
  const co = useMutation({
    mutationFn: () => checkOut({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Check-out realizado.");
    },
    onError: (e) => handleMutationError(e),
  });
  const cn = useMutation({
    mutationFn: () => cancel({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Reserva cancelada.");
    },
    onError: (e) => handleMutationError(e),
  });

  return { ci, co, cn };
}
