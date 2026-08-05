import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCurrentUserProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, hotel_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[getCurrentUserProfile] profile lookup failed", profileError);
      throw new Error("Não foi possível carregar seu perfil.");
    }

    // Sem perfil = usuário desvinculado do hotel (ou nunca vinculado).
    if (!profile) {
      return { unlinked: true as const };
    }

    const [{ data: hotel, error: hotelError }, { data: roleData, error: roleError }] = await Promise.all([
      supabase.from("hotels").select("name").eq("id", profile.hotel_id).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("hotel_id", profile.hotel_id).maybeSingle(),
    ]);

    if (hotelError || roleError) {
      console.error("[getCurrentUserProfile] hotel or role lookup failed", hotelError, roleError);
      throw new Error("Não foi possível carregar seu perfil.");
    }

    // Hotel ou papel ausente = vínculo quebrado; trata como desvinculado.
    if (!hotel || !roleData) {
      return { unlinked: true as const };
    }

    return {
      unlinked: false as const,
      fullName: profile.full_name,
      hotelName: hotel.name,
      role: roleData.role,
    };
  });
