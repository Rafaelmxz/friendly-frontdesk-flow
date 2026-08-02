import { auth, defineMcp } from "@lovable.dev/mcp-js";
import hotelDashboardTool from "./tools/hotel-dashboard";
import listReservationsTool from "./tools/list-reservations";
import listRoomsTool from "./tools/list-rooms";
import searchGuestsTool from "./tools/search-guests";
import createReservationTool from "./tools/create-reservation";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "hotel-harmony-hub",
  title: "Hotel Harmony Hub",
  version: "0.1.0",
  instructions:
    "Tools for the Hotel Harmony Hub property management system. All tools act as the signed-in hotel user and only see that hotel's data. Use `hotel_dashboard` for today's occupancy and revenue, `list_rooms` and `list_reservations` to inspect inventory and bookings, `search_guests` to find a guest by name, document or room, and `create_reservation` to book an existing guest into an existing room.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    hotelDashboardTool,
    listRoomsTool,
    listReservationsTool,
    searchGuestsTool,
    createReservationTool,
  ],
});
