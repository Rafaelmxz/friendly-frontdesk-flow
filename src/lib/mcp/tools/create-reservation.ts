import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_reservation",
  title: "Create reservation",
  description:
    "Create a reservation for an existing guest and room in the signed-in user's hotel. Dates use YYYY-MM-DD and check-out must be after check-in.",
  inputSchema: {
    guest_id: z.string().uuid().describe("ID of an existing guest."),
    room_id: z.string().uuid().describe("ID of an existing room."),
    check_in: z.string().describe("Check-in date (YYYY-MM-DD)."),
    check_out: z.string().describe("Check-out date (YYYY-MM-DD)."),
    total_amount: z.number().describe("Total amount of the reservation, in BRL."),
    adults: z.number().int().optional().describe("Number of adults (default 1)."),
    children: z.number().int().optional().describe("Number of children (default 0)."),
    notes: z.string().optional().describe("Optional internal notes."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (new Date(input.check_out) <= new Date(input.check_in)) {
      return {
        content: [{ type: "text", text: "check_out must be after check_in" }],
        isError: true,
      };
    }

    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("hotel_id")
      .eq("id", userId ?? "")
      .maybeSingle();

    if (profileError || !profile?.hotel_id) {
      return {
        content: [{ type: "text", text: "Could not resolve the hotel for this user." }],
        isError: true,
      };
    }

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        hotel_id: profile.hotel_id,
        guest_id: input.guest_id,
        room_id: input.room_id,
        check_in: input.check_in,
        check_out: input.check_out,
        total_amount: input.total_amount,
        adults: input.adults ?? 1,
        children: input.children ?? 0,
        notes: input.notes ?? null,
      })
      .select("id, check_in, check_out, status, total_amount")
      .single();

    if (error) {
      const overlapping = error.code === "23P01" || /exclusion|overlap/i.test(error.message);
      return {
        content: [
          {
            type: "text",
            text: overlapping ? "This room is already booked for that period." : error.message,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { reservation: data },
    };
  },
});
