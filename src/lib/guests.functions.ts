import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { guestSchema } from "@/lib/validation";
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

export const listGuests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ search: z.string().optional().default("") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const q = data.search.trim();
    const { data: rows, error } = await (context.supabase as SB).rpc("search_guests", { q });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getGuest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as SB)
      .from("guests")
      .select("id, full_name, email, phone, document_type, document_number, birth_date, nationality, notes")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Hóspede não encontrado.");
    return row;
  });

export const createGuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ input: z.any() }).parse(d))
  .handler(async ({ data, context }) => {
    const parsed = guestSchema.parse(data.input);
    const supabase = context.supabase as SB;
    const hotel_id = await getHotelId(supabase, context.userId);
    const { data: row, error } = await supabase
      .from("guests")
      .insert({
        hotel_id,
        full_name: parsed.full_name,
        email: parsed.email ?? null,
        phone: parsed.phone ?? null,
        document_type: parsed.document_type ?? null,
        document_number: parsed.document_number ?? null,
        birth_date: parsed.birth_date ?? null,
        nationality: parsed.nationality ?? null,
        notes: parsed.notes ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const updateGuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), input: z.any() }).parse(d))
  .handler(async ({ data, context }) => {
    const parsed = guestSchema.parse(data.input);
    const { error } = await (context.supabase as SB)
      .from("guests")
      .update({
        full_name: parsed.full_name,
        email: parsed.email ?? null,
        phone: parsed.phone ?? null,
        document_type: parsed.document_type ?? null,
        document_number: parsed.document_number ?? null,
        birth_date: parsed.birth_date ?? null,
        nationality: parsed.nationality ?? null,
        notes: parsed.notes ?? null,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteGuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as SB).from("guests").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
