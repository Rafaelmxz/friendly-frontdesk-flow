import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { roomSchema } from "@/lib/validation";
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

export const listRooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as SB)
      .from("rooms")
      .select("id, number, floor, status, notes, room_type_id, room_types(name)")
      .order("number");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      number: r.number,
      floor: r.floor,
      status: r.status,
      notes: r.notes,
      room_type_id: r.room_type_id,
      room_type_name: (r as unknown as { room_types: { name: string } | null }).room_types?.name ?? "",
    }));
  });

export const getRoom = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as SB)
      .from("rooms")
      .select("id, number, floor, status, notes, room_type_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Quarto não encontrado.");
    return row;
  });

export const createRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ input: z.any() }).parse(d))
  .handler(async ({ data, context }) => {
    const parsed = roomSchema.parse(data.input);
    const supabase = context.supabase as SB;
    const hotel_id = await getHotelId(supabase, context.userId);
    const { data: row, error } = await supabase
      .from("rooms")
      .insert({
        hotel_id,
        number: parsed.number,
        floor: parsed.floor ?? null,
        room_type_id: parsed.room_type_id,
        status: parsed.status,
        notes: parsed.notes || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const updateRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), input: z.any() }).parse(d))
  .handler(async ({ data, context }) => {
    const parsed = roomSchema.parse(data.input);
    const { error } = await (context.supabase as SB)
      .from("rooms")
      .update({
        number: parsed.number,
        floor: parsed.floor ?? null,
        room_type_id: parsed.room_type_id,
        status: parsed.status,
        notes: parsed.notes || null,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as SB).from("rooms").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
