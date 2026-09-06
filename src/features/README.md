# Features (Domain-Driven Structure)

This folder organizes the application by business domains.

## Structure

```
src/features/
├── dashboard/     # Dashboard, charts, KPIs
├── reservations/  # Reservations, calendar, anti-overbooking
│   ├── components/
│   └── hooks/     # React Query hooks wrapping server functions
├── rooms/         # Rooms and room types
├── guests/        # Guests management
└── team/          # Team members, invites, permissions
```

## Conventions

- Server-side logic stays in `src/lib/*.functions.ts` (TanStack Start server functions)
- Client-side data fetching/mutations go in `src/features/<domain>/hooks/`
- UI components specific to a domain go in `src/features/<domain>/components/`
- Shared UI stays in `src/components/ui/`
