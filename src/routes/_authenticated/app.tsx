import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/lib/user.functions";
import { getDashboardMetrics } from "@/lib/dashboard.functions";

const profileQueryOptions = () =>
  queryOptions({
    queryKey: ["currentUserProfile"],
    queryFn: () => getCurrentUserProfile(),
  });

const metricsQueryOptions = () =>
  queryOptions({
    queryKey: ["dashboardMetrics"],
    queryFn: () => getDashboardMetrics(),
  });

export const Route = createFileRoute("/_authenticated/app")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(profileQueryOptions()),
      context.queryClient.ensureQueryData(metricsQueryOptions()),
    ]);
  },
  component: AppHome,
  errorComponent: AppError,
  notFoundComponent: AppNotFound,
});

function roleLabel(role: "admin" | "recepcionista"): string {
  if (role === "admin") return "Administrador";
  if (role === "recepcionista") return "Recepcionista";
  return role;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function AppHome() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions());
  const { data: m } = useSuspenseQuery(metricsQueryOptions());

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
                Bem-vindo, {profile.fullName || "hóspede"} — {roleLabel(profile.role)} em {profile.hotelName}
              </CardTitle>
              <CardDescription>{profile.hotelName}</CardDescription>
            </div>
            <Badge variant="secondary">{roleLabel(profile.role)}</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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
    </div>
  );
}

function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Erro ao carregar painel</CardTitle>
        <CardDescription>{error.message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}

function AppNotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Não encontrado</CardTitle>
        <CardDescription>O recurso solicitado não existe.</CardDescription>
      </CardHeader>
    </Card>
  );
}
