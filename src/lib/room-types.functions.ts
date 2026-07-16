import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { roomTypeSchema } from "@/lib/validation";
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

export const listRoomTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as SB)
      .from("room_types")
      .select("id, name, description, base_price, max_occupancy")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getRoomType = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as SB)
      .from("room_types")
      .select("id, name, description, base_price, max_occupancy")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Tipo de quarto não encontrado.");
    return row;
  });

export const createRoomType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ input: z.any() }).parse(d))
  .handler(async ({ data, context }) => {
    const parsed = roomTypeSchema.parse(data.input);
    const supabase = context.supabase as SB;
    const hotel_id = await getHotelId(supabase, context.userId);
    const { data: row, error } = await supabase
      .from("room_types")
      .insert({
        hotel_id,
        name: parsed.name,
        description: parsed.description || null,
        base_price: parsed.base_price,
        max_occupancy: parsed.max_occupancy,
      })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const updateRoomType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), input: z.any() }).parse(d))
  .handler(async ({ data, context }) => {
    const parsed = roomTypeSchema.parse(data.input);
    const { error } = await (context.supabase as SB)
      .from("room_types")
      .update({
        name: parsed.name,
        description: parsed.description || null,
        base_price: parsed.base_price,
        max_occupancy: parsed.max_occupancy,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteRoomType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as SB).from("room_types").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
