import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_reservations",
  title: "List reservations",
  description:
    "List reservations of the signed-in user's hotel, with guest name and room number. Optionally filter by status and by a check-in date range (YYYY-MM-DD).",
  inputSchema: {
    status: z
      .enum(["pendente", "confirmada", "checkin", "checkout", "cancelada", "no_show"])
      .optional()
      .describe("Filter by reservation status."),
    from: z.string().optional().describe("Only reservations with check-in on or after this date (YYYY-MM-DD)."),
    to: z.string().optional().describe("Only reservations with check-in on or before this date (YYYY-MM-DD)."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 50, max 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("reservations")
      .select(
        "id, check_in, check_out, adults, children, total_amount, status, guest_id, room_id, guests(full_name), rooms(number)",
      )
      .order("check_in", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));

    if (status) query = query.eq("status", status);
    if (from) query = query.gte("check_in", from);
    if (to) query = query.lte("check_in", to);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? []).map((r) => ({
      id: r.id,
      check_in: r.check_in,
      check_out: r.check_out,
      adults: r.adults,
      children: r.children,
      total_amount: Number(r.total_amount),
      status: r.status,
      guest_name: (r as unknown as { guests: { full_name: string } | null }).guests?.full_name ?? "",
      room_number: (r as unknown as { rooms: { number: string } | null }).rooms?.number ?? "",
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { reservations: rows },
    };
  },
});
