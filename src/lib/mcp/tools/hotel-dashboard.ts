import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "hotel_dashboard",
  title: "Hotel dashboard",
  description:
    "Get today's key metrics for the signed-in user's hotel: occupied and free rooms, check-ins and check-outs today, and this month's expected and received revenue.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("dashboard_metrics");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const metrics = data?.[0] ?? null;
    return {
      content: [{ type: "text", text: JSON.stringify(metrics) }],
      structuredContent: { metrics },
    };
  },
});
