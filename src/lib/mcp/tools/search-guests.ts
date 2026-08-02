import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_guests",
  title: "Search guests",
  description:
    "Search guests of the signed-in user's hotel by name, document number (CPF) or the room number of an active reservation.",
  inputSchema: {
    query: z.string().describe("Name, document number or room number to search for."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const term = query.trim();
    if (!term) {
      return { content: [{ type: "text", text: "query must not be empty" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("search_guests", { q: term });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? []).map((g) => ({
      id: g.id,
      full_name: g.full_name,
      email: g.email,
      phone: (g as unknown as { phone?: string | null }).phone ?? null,
      document_type: g.document_type,
      document_number: g.document_number,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { guests: rows },
    };
  },
});
