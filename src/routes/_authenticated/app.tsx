import { createFileRoute } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppHome,
});

function AppHome() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bem-vindo</CardTitle>
        <CardDescription>Seu painel do hotel. Módulos serão adicionados aqui.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Use o menu para gerenciar sua equipe. Reservas, quartos e pagamentos virão em seguida.
      </CardContent>
    </Card>
  );
}
