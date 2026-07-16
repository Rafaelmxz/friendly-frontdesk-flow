import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      localStorage.clear();
    } catch {}
    await supabase.auth.signOut();
    window.location.replace("/auth");
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4 flex-wrap">
            <Link to="/app" className="font-semibold">PMS</Link>
            <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">Painel</Link>
            <Link to="/quartos" className="text-sm text-muted-foreground hover:text-foreground">Quartos</Link>
            <Link to="/tipos-de-quarto" className="text-sm text-muted-foreground hover:text-foreground">Tipos</Link>
            <Link to="/hospedes" className="text-sm text-muted-foreground hover:text-foreground">Hóspedes</Link>
            <Link to="/equipe" className="text-sm text-muted-foreground hover:text-foreground">Equipe</Link>
          </nav>
          <Button variant="ghost" size="sm" onClick={handleLogout}>Sair</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
