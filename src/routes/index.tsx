import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PMS — Gestão hoteleira multi-tenant" },
      { name: "description", content: "Sistema de gestão hoteleira para múltiplas propriedades: quartos, reservas, hóspedes e pagamentos." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          PMS Hoteleiro
        </h1>
        <p className="mt-4 text-muted-foreground">
          Gestão de reservas, quartos, hóspedes e pagamentos — para várias propriedades, com dados isolados por hotel.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth" search={{ tab: "signup" }}>Criar conta</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
