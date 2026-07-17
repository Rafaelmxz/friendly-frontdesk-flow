import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reservationSchema } from "@/lib/validation";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

async function getHotelId(supabase: SB, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("hotel_id")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data?.hotel_id) throw new Error("Perfil não encontrado.");
  return data.hotel_id;
}

function mapPgError(err: unknown): Error {
  const e = err as { code?: string; message?: string };
  if (e?.code === "23P01" || /exclusion|conflicting key value|overlap/i.test(e?.message ?? "")) {
    return new Error("Este quarto já está reservado nesse período.");
  }
  return new Error(e?.message || "Erro ao processar a reserva.");
}

export const listReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as SB)
      .from("reservations")
      .select(
        "id, check_in, check_out, adults, children, total_amount, status, notes, guest_id, room_id, guests(full_name), rooms(number)",
      )
      .order("check_in", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      check_in: r.check_in,
      check_out: r.check_out,
      adults: r.adults,
      children: r.children,
      total_amount: Number(r.total_amount),
      status: r.status,
      notes: r.notes,
      guest_id: r.guest_id,
      room_id: r.room_id,
      guest_name: (r as unknown as { guests: { full_name: string } | null }).guests?.full_name ?? "",
      room_number: (r as unknown as { rooms: { number: string } | null }).rooms?.number ?? "",
    }));
  });

export const listReservationsByGuest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ guestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as SB)
      .from("reservations")
      .select(
        "id, check_in, check_out, adults, children, total_amount, status, room_id, rooms(number)",
      )
      .eq("guest_id", data.guestId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      check_in: r.check_in,
      check_out: r.check_out,
      adults: r.adults,
      children: r.children,
      total_amount: Number(r.total_amount),
      status: r.status,
      room_id: r.room_id,
      room_number: (r as unknown as { rooms: { number: string } | null }).rooms?.number ?? "",
    }));
  });

export const getReservation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as SB)
      .from("reservations")
      .select(
        "id, guest_id, room_id, check_in, check_out, adults, children, total_amount, status, notes",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Reserva não encontrada.");
    return { ...row, total_amount: Number(row.total_amount) };
  });

export const createReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ input: z.any() }).parse(d))
  .handler(async ({ data, context }) => {
    const parsed = reservationSchema.parse(data.input);
    const supabase = context.supabase as SB;
    const hotel_id = await getHotelId(supabase, context.userId);
    const { data: row, error } = await supabase
      .from("reservations")
      .insert({
        hotel_id,
        guest_id: parsed.guest_id,
        room_id: parsed.room_id,
        check_in: parsed.check_in,
        check_out: parsed.check_out,
        adults: parsed.adults,
        children: parsed.children,
        total_amount: parsed.total_amount,
        status: parsed.status,
        notes: parsed.notes ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw mapPgError(error);
    return row;
  });

export const updateReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), input: z.any() }).parse(d))
  .handler(async ({ data, context }) => {
    const parsed = reservationSchema.parse(data.input);
    const { error } = await (context.supabase as SB)
      .from("reservations")
      .update({
        guest_id: parsed.guest_id,
        room_id: parsed.room_id,
        check_in: parsed.check_in,
        check_out: parsed.check_out,
        adults: parsed.adults,
        children: parsed.children,
        total_amount: parsed.total_amount,
        status: parsed.status,
        notes: parsed.notes ?? null,
      })
      .eq("id", data.id);
    if (error) throw mapPgError(error);
    return { ok: true };
  });

export const checkInReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as SB).rpc("checkin_reservation", { _id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkOutReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as SB).rpc("checkout_reservation", { _id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as SB).rpc("cancel_reservation", { _id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
