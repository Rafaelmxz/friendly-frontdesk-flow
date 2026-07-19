import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export const PAYMENT_METHODS = [
  "dinheiro",
  "cartao_credito",
  "cartao_debito",
  "pix",
  "transferencia",
  "outro",
] as const;
export const PAYMENT_STATUSES = ["pendente", "pago", "estornado", "falhou"] as const;

const methodEnum = z.enum(PAYMENT_METHODS);
const statusEnum = z.enum(PAYMENT_STATUSES);

const createInput = z.object({
  reservation_id: z.string().uuid(),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  method: methodEnum,
  status: statusEnum,
  paid_at: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const updateInput = z.object({
  id: z.string().uuid(),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  method: methodEnum,
  status: statusEnum,
  paid_at: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

function toIsoOrNull(v: string | null | undefined): string | null {
  if (!v) return null;
  // datetime-local sends 'YYYY-MM-DDTHH:mm' — treat as local time
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export const listPaymentsByReservation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ reservationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as SB)
      .from("payments")
      .select("id, reservation_id, amount, method, status, paid_at, notes, created_at")
      .eq("reservation_id", data.reservationId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      reservation_id: r.reservation_id,
      amount: Number(r.amount),
      method: r.method,
      status: r.status,
      paid_at: r.paid_at,
      notes: r.notes,
      created_at: r.created_at,
    }));
  });

export const listPaymentsByGuest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ guestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as SB)
      .from("payments")
      .select(
        "id, amount, method, status, paid_at, created_at, reservation_id, reservations!inner(guest_id, rooms(number))",
      )
      .eq("reservations.guest_id", data.guestId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => {
      const rel = r as unknown as { reservations: { rooms: { number: string } | null } | null };
      return {
        id: r.id,
        reservation_id: r.reservation_id,
        amount: Number(r.amount),
        method: r.method,
        status: r.status,
        paid_at: r.paid_at,
        created_at: r.created_at,
        room_number: rel.reservations?.rooms?.number ?? "",
      };
    });
  });

export const createPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as SB).rpc("register_payment", {
      _reservation_id: data.reservation_id,
      _amount: data.amount,
      _method: data.method,
      _status: data.status,
      _paid_at: toIsoOrNull(data.paid_at),
      _notes: data.notes ?? "",
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const updatePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as SB).rpc("update_payment", {
      _id: data.id,
      _amount: data.amount,
      _method: data.method,
      _status: data.status,
      _paid_at: toIsoOrNull(data.paid_at),
      _notes: data.notes ?? "",
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as SB).from("payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
