import { STATUS_META } from "@/components/calendar/reservation-card";

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {(["pendente", "confirmada", "checkin", "cancelada"] as const).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <span className={`inline-block h-3 w-3 rounded ${STATUS_META[s].dot}`} />
          {STATUS_META[s].label}
        </div>
      ))}
    </div>
  );
}
