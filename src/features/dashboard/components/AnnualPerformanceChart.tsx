import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

type MonthData = {
  label: string;
  occupancyRate: number;
  revenue: number;
  occupiedNights: number;
};

type Props = {
  year: number;
  months: MonthData[];
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function AnnualPerformanceChart({ year, months }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Desempenho Anual — {year}</CardTitle>
        <CardDescription>Taxa de ocupação (%) e receita por mês</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={months} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => brl.format(v)}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "Ocupação") return [`${value}%`, name];
                  if (name === "Receita") return [brl.format(value), name];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar
                yAxisId="right"
                dataKey="revenue"
                name="Receita"
                fill="hsl(var(--primary))"
                opacity={0.85}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="occupancyRate"
                name="Ocupação"
                stroke="hsl(142 76% 36%)"
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
