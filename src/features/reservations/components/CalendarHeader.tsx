import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ViewMode } from "./date-utils";

type Props = {
  view: ViewMode;
  periodLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (v: ViewMode) => void;
};

export function CalendarHeader({
  view,
  periodLabel,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: Props) {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Calendário de reservas</CardTitle>
            <CardDescription>Reservas confirmadas e em check-in.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onPrev}>
              ◀ {view === "mensal" ? "Mês anterior" : "Semana anterior"}
            </Button>
            <Button variant="outline" size="sm" onClick={onToday}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={onNext}>
              {view === "mensal" ? "Mês seguinte" : "Semana seguinte"} ▶
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-md border p-1">
            {(["mensal", "timeline", "semana"] as ViewMode[]).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={view === v ? "default" : "ghost"}
                onClick={() => onViewChange(v)}
                className="capitalize"
              >
                {v === "mensal" ? "Mensal" : v === "timeline" ? "Timeline" : "Semana"}
              </Button>
            ))}
          </div>
          <div className="text-sm font-medium capitalize">{periodLabel}</div>
        </div>
      </CardHeader>
    </Card>
  );
}
