import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listRooms } from "@/lib/rooms.functions";
import { getReservationsCalendar } from "@/lib/dashboard.functions";

export const calendarKeys = {
  all: ["calendar"] as const,
  range: (from: string, to: string) => [...calendarKeys.all, from, to] as const,
  rooms: () => ["rooms"] as const,
};

export const roomsQueryOptions = () =>
  queryOptions({
    queryKey: calendarKeys.rooms(),
    queryFn: () => listRooms(),
    staleTime: 60_000,
  });

export const calendarQueryOptions = (from: string, to: string) =>
  queryOptions({
    queryKey: calendarKeys.range(from, to),
    queryFn: () => getReservationsCalendar({ data: { from, to } }),
    staleTime: 30_000,
  });

export function useRooms() {
  return useSuspenseQuery(roomsQueryOptions());
}

export function useCalendarReservations(from: string, to: string) {
  return useSuspenseQuery(calendarQueryOptions(from, to));
}

/** Hook combinado — fonte única de verdade via TanStack Query */
export function useCalendarData(from: string, to: string) {
  const rooms = useRooms();
  const reservations = useCalendarReservations(from, to);
  return {
    rooms: rooms.data,
    reservations: reservations.data,
  };
}
