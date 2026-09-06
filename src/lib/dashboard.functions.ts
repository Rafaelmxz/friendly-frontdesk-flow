import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export const getDashboardMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as SB).rpc("dashboard_metrics");
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return {
      rooms_ocupados: Number(row?.rooms_ocupados ?? 0),
      rooms_disponiveis: Number(row?.rooms_disponiveis ?? 0),
      checkins_hoje: Number(row?.checkins_hoje ?? 0),
      checkouts_hoje: Number(row?.checkouts_hoje ?? 0),
      receita_mes: Number(row?.receita_mes ?? 0),
      receita_recebida_mes: Number(row?.receita_recebida_mes ?? 0),
    };
  });

const calendarInput = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((v) => v.to > v.from, { message: "'to' deve ser maior que 'from'" });

export const getReservationsCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => calendarInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as SB).rpc("reservations_calendar", {
      _from: data.from,
      _to: data.to,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      room_id: string;
      guest_id: string;
      guest_name: string;
      check_in: string;
      check_out: string;
      status: "confirmada" | "checkin" | "checkout" | "cancelada" | "no_show" | "pendente";
    }>;
  });

/** Métricas mensais do ano (ocupação % + receita) */
export const getAnnualPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ year: z.number().int().min(2020).max(2100).optional() })
      .optional()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const year = data?.year ?? new Date().getFullYear();
    const supabase = context.supabase as SB;

    const { count: totalRooms, error: roomsErr } = await supabase
      .from("rooms")
      .select("id", { count: "exact", head: true });
    if (roomsErr) throw new Error(roomsErr.message);
    const roomCount = totalRooms ?? 1;

    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const { data: reservations, error: resErr } = await supabase
      .from("reservations")
      .select("check_in, check_out, total_amount, status")
      .gte("check_in", from)
      .lte("check_in", to)
      .not("status", "eq", "cancelada");
    if (resErr) throw new Error(resErr.message);

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: new Date(year, i, 1).toLocaleString("pt-BR", { month: "short" }),
      occupiedNights: 0,
      revenue: 0,
      occupancyRate: 0,
    }));

    for (const r of reservations ?? []) {
      const checkIn = new Date(r.check_in + "T12:00:00");
      const checkOut = new Date(r.check_out + "T12:00:00");
      const nights = Math.max(
        1,
        Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000),
      );
      const monthIdx = checkIn.getMonth();
      months[monthIdx].occupiedNights += nights;
      months[monthIdx].revenue += Number(r.total_amount ?? 0);
    }

    for (const m of months) {
      const daysInMonth = new Date(year, m.month, 0).getDate();
      const availableNights = roomCount * daysInMonth;
      m.occupancyRate =
        availableNights > 0
          ? Math.round((m.occupiedNights / availableNights) * 1000) / 10
          : 0;
    }

    return {
      year,
      totalRooms: roomCount,
      months: months.map(({ label, occupancyRate, revenue, occupiedNights }) => ({
        label,
        occupancyRate,
        revenue,
        occupiedNights,
      })),
    };
  });
