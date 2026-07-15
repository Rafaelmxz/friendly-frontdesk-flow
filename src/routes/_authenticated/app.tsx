import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/lib/user.functions";

const profileQueryOptions = () =>
  queryOptions({
    queryKey: ["currentUserProfile"],
    queryFn: () => getCurrentUserProfile(),
  });

export const Route = createFileRoute("/_authenticated/app")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(profileQueryOptions());
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

function AppHome() {
  const { data } = useSuspenseQuery(profileQueryOptions());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>
              Bem-vindo, {data.fullName || "hóspede"} — {roleLabel(data.role)} em {data.hotelName}
            </CardTitle>
            <CardDescription>
              {data.hotelName}
            </CardDescription>
          </div>
          <Badge variant="secondary">{roleLabel(data.role)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Use o menu para gerenciar sua equipe. Reservas, quartos e pagamentos virão em seguida.
      </CardContent>
    </Card>
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
