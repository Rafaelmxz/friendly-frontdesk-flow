import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { inviteIdSchema, memberIdSchema } from "@/lib/team.schemas";

export const listHotelMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("hotel_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !currentProfile) throw new Error("Não foi possível carregar a equipe.");

    const [{ data: profiles, error: membersError }, { data: roles, error: rolesError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("hotel_id", currentProfile.hotel_id)
        .order("full_name"),
      supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("hotel_id", currentProfile.hotel_id),
    ]);

    if (membersError || rolesError) {
      console.error("[listHotelMembers] lookup failed", membersError, rolesError);
      throw new Error("Não foi possível carregar a equipe.");
    }

    const roleByUser = new Map((roles ?? []).map((row) => [row.user_id, row.role]));
    return (profiles ?? []).flatMap((profile) => {
      const role = roleByUser.get(profile.id);
      if (!role) return [];
      return [{
        id: profile.id,
        fullName: profile.full_name || "Nome não informado",
        email: profile.email || "E-mail não informado",
        role,
        isCurrentUser: profile.id === userId,
      }];
    });
  });

export const listPendingHotelInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("hotel_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) throw new Error("Não foi possível carregar os convites.");

    const { data: adminRole, error: roleError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("hotel_id", profile.hotel_id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) throw new Error("Não foi possível verificar suas permissões.");
    if (!adminRole) return [];

    const { data, error } = await supabase
      .from("hotel_invites")
      .select("id, email, role, expires_at, created_at")
      .eq("hotel_id", profile.hotel_id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listPendingHotelInvites] lookup failed", error);
      throw new Error("Não foi possível carregar os convites.");
    }
    return data ?? [];
  });

export const removeHotelMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => memberIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("remove_hotel_member", { _user_id: data.userId });
    if (error) {
      console.error("[removeHotelMember] failed", error);
      throw new Error(error.message || "Não foi possível remover o membro.");
    }
    return { ok: true as const };
  });

export const cancelHotelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase
      .from("hotel_invites")
      .delete({ count: "exact" })
      .eq("id", data.inviteId)
      .is("accepted_at", null);

    if (error) {
      console.error("[cancelHotelInvite] failed", error);
      throw new Error(error.message || "Não foi possível cancelar o convite.");
    }
    if (!count) throw new Error("Convite pendente não encontrado.");
    return { ok: true as const };
  });

export const resendHotelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const { data: renewed, error } = await context.supabase
      .rpc("renew_hotel_invite", { _id: data.inviteId, _token: token });

    if (error || !renewed) {
      console.error("[resendHotelInvite] failed", error);
      throw new Error(error?.message || "Não foi possível reenviar o convite.");
    }
    return { id: renewed.id, token, expiresAt: renewed.expires_at };
  });