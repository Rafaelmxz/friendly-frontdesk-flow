import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GENERIC_SIGNUP_ERROR = "Não foi possível concluir o cadastro. Verifique os dados e tente novamente.";
const GENERIC_INVITE_ERROR = "Convite inválido ou expirado.";
const GENERIC_CREATE_INVITE_ERROR = "Não foi possível criar o convite.";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(120),
  hotelName: z.string().min(1).max(120),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "hotel";
}

export const signupHotelOwner = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signupSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const baseSlug = slugify(data.hotelName);
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

    const { data: hotel, error: hotelError } = await supabaseAdmin
      .from("hotels")
      .insert({ name: data.hotelName, slug })
      .select("id")
      .single();

    if (hotelError || !hotel) {
      console.error("[signupHotelOwner] hotel insert failed", hotelError);
      return { ok: false as const, error: GENERIC_SIGNUP_ERROR };
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (userError || !userData?.user) {
      console.error("[signupHotelOwner] createUser failed", userError);
      await supabaseAdmin.from("hotels").delete().eq("id", hotel.id);
      return { ok: false as const, error: GENERIC_SIGNUP_ERROR };
    }

    const userId = userData.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      hotel_id: hotel.id,
      email: data.email,
      full_name: data.fullName,
    });

    if (profileError) {
      console.error("[signupHotelOwner] profile insert failed", profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("hotels").delete().eq("id", hotel.id);
      return { ok: false as const, error: GENERIC_SIGNUP_ERROR };
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      hotel_id: hotel.id,
      role: "admin",
    });

    if (roleError) {
      console.error("[signupHotelOwner] role insert failed", roleError);
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("hotels").delete().eq("id", hotel.id);
      return { ok: false as const, error: GENERIC_SIGNUP_ERROR };
    }

    return { ok: true as const };
  });

const createInviteSchema = z.object({
  email: z.string().email(),
});

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createInviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("hotel_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile?.hotel_id) {
      console.error("[createInvite] profile lookup failed", profileError);
      return { ok: false as const, error: GENERIC_CREATE_INVITE_ERROR };
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _hotel_id: profile.hotel_id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("[createInvite] not admin", roleError);
      return { ok: false as const, error: "Apenas administradores podem convidar." };
    }

    const token = generateToken();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertError } = await supabaseAdmin.from("hotel_invites").insert({
      hotel_id: profile.hotel_id,
      email: data.email,
      role: "recepcionista",
      token,
      invited_by: userId,
    });

    if (insertError) {
      console.error("[createInvite] insert failed", insertError);
      return { ok: false as const, error: GENERIC_CREATE_INVITE_ERROR };
    }

    return { ok: true as const, token };
  });

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(1).max(120),
  password: z.string().min(8),
});

export const acceptInvite = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => acceptInviteSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("hotel_invites")
      .select("id, hotel_id, email, role, expires_at, accepted_at")
      .eq("token", data.token)
      .maybeSingle();

    if (inviteError || !invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
      console.error("[acceptInvite] invalid invite", inviteError);
      return { ok: false as const, error: GENERIC_INVITE_ERROR };
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (userError || !userData?.user) {
      console.error("[acceptInvite] createUser failed", userError);
      return { ok: false as const, error: GENERIC_INVITE_ERROR };
    }

    const userId = userData.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      hotel_id: invite.hotel_id,
      email: invite.email,
      full_name: data.fullName,
    });

    if (profileError) {
      console.error("[acceptInvite] profile insert failed", profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { ok: false as const, error: GENERIC_INVITE_ERROR };
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      hotel_id: invite.hotel_id,
      role: invite.role,
    });

    if (roleError) {
      console.error("[acceptInvite] role insert failed", roleError);
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { ok: false as const, error: GENERIC_INVITE_ERROR };
    }

    await supabaseAdmin
      .from("hotel_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return { ok: true as const, email: invite.email };
  });
