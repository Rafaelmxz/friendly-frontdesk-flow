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

    if (profileError || !profile) {
      console.error("[getCurrentUserProfile] profile lookup failed", profileError);
      throw new Error("Não foi possível carregar seu perfil.");
    }

    const [{ data: hotel, error: hotelError }, { data: roleData, error: roleError }] = await Promise.all([
      supabase.from("hotels").select("name").eq("id", profile.hotel_id).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("hotel_id", profile.hotel_id).maybeSingle(),
    ]);

    if (hotelError || !hotel || roleError || !roleData) {
      console.error("[getCurrentUserProfile] hotel or role lookup failed", hotelError, roleError);
      throw new Error("Não foi possível carregar seu perfil.");
    }

    return {
      fullName: profile.full_name,
      hotelName: hotel.name,
      role: roleData.role,
    };
  });
