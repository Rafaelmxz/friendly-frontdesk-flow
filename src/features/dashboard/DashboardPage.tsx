import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "./hooks";
import { AnnualPerformanceChart } from "./components/AnnualPerformanceChart";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function roleLabel(role: string) {
  if (role === "admin") return "Administrador";
  if (role === "recepcionista") return "Recepcionista";
  return role;
}

type Profile = {
  fullName: string | null;
  role: "admin" | "recepcionista";
  hotelName: string;
  unlinked?: boolean;
};

type Props = {
  profile: Profile;
};

export function DashboardPage({ profile }: Props) {
  const year = new Date().getFullYear();
  const { metrics: m, annual } = useDashboardData(year);

  const cards = [
    { label: "Quartos ocupados", value: String(m.rooms_ocupados) },
    { label: "Quartos livres", value: String(m.rooms_disponiveis) },
    { label: "Check-ins hoje", value: String(m.checkins_hoje) },
    { label: "Check-outs hoje", value: String(m.checkouts_hoje) },
    { label: "Receita prevista (mês)", value: brl.format(m.receita_mes) },
    { label: "Receita recebida (mês)", value: brl.format(m.receita_recebida_mes) },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>
                Bem-vindo, {profile.fullName || "usuário"} —{" "}
                {roleLabel(profile.role)} em {profile.hotelName}
              </CardTitle>
              <CardDescription>{profile.hotelName}</CardDescription>
            </div>
            <Badge variant="secondary">{roleLabel(profile.role)}</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardDescription>{c.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AnnualPerformanceChart year={annual.year} months={annual.months} />
    </div>
  );
}
