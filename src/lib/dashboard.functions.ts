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
