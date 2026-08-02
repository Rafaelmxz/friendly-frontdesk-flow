import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_rooms",
  title: "List rooms",
  description:
    "List rooms of the signed-in user's hotel with their number, floor, status and room type name. Optionally filter by room status.",
  inputSchema: {
    status: z
      .enum(["disponivel", "ocupado", "manutencao", "limpeza", "bloqueado"])
      .optional()
      .describe("Filter by room status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("rooms")
      .select("id, number, floor, status, room_type_id, room_types(name)")
      .order("number");
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? []).map((r) => ({
      id: r.id,
      number: r.number,
      floor: r.floor,
      status: r.status,
      room_type: (r as unknown as { room_types: { name: string } | null }).room_types?.name ?? "",
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { rooms: rows },
    };
  },
});
