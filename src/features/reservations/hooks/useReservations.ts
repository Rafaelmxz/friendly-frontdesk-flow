import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listReservations,
  getReservation,
  createReservation,
  updateReservation,
  checkInReservation,
  checkOutReservation,
  cancelReservation,
  getReservationCard,
  listReservationsByGuest,
} from "@/lib/reservations.functions";

/** Query key factory for reservations */
export const reservationKeys = {
  all: ["reservations"] as const,
  lists: () => [...reservationKeys.all, "list"] as const,
  list: () => [...reservationKeys.lists()] as const,
  details: () => [...reservationKeys.all, "detail"] as const,
  detail: (id: string) => [...reservationKeys.details(), id] as const,
  card: (id: string) => [...reservationKeys.all, "card", id] as const,
  byGuest: (guestId: string) => [...reservationKeys.all, "byGuest", guestId] as const,
};

export const reservationsQueryOptions = () =>
  queryOptions({
    queryKey: reservationKeys.list(),
    queryFn: () => listReservations(),
  });

export const reservationQueryOptions = (id: string) =>
  queryOptions({
    queryKey: reservationKeys.detail(id),
    queryFn: () => getReservation({ data: { id } }),
  });

export const reservationCardQueryOptions = (id: string) =>
  queryOptions({
    queryKey: reservationKeys.card(id),
    queryFn: () => getReservationCard({ data: { id } }),
  });

export const reservationsByGuestQueryOptions = (guestId: string) =>
  queryOptions({
    queryKey: reservationKeys.byGuest(guestId),
    queryFn: () => listReservationsByGuest({ data: { guestId } }),
  });

export function useReservations() {
  return useSuspenseQuery(reservationsQueryOptions());
}

export function useReservation(id: string) {
  return useSuspenseQuery(reservationQueryOptions(id));
}

export function useReservationCard(id: string) {
  return useSuspenseQuery(reservationCardQueryOptions(id));
}

export function useReservationsByGuest(guestId: string) {
  return useSuspenseQuery(reservationsByGuestQueryOptions(guestId));
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createReservation>[0]["data"]) =>
      createReservation({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.all });
    },
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateReservation>[0]["data"]) =>
      updateReservation({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.all });
    },
  });
}

export function useCheckInReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => checkInReservation({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.all });
    },
  });
}

export function useCheckOutReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => checkOutReservation({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.all });
    },
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelReservation({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.all });
    },
  });
}
