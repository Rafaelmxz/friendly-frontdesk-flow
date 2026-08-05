import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/lib/user.functions";
import { currentProfileQueryOptions } from "@/hooks/useCurrentRole";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Bloqueia usuários cuja sessão continua válida mas que perderam o vínculo com o hotel.
    const profile = await context.queryClient.ensureQueryData({
      ...currentProfileQueryOptions(),
      queryFn: () => getCurrentUserProfile(),
    });

    if (profile.unlinked) {
      context.queryClient.clear();
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { reason: "unlinked" } });
    }

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
            <Link to="/calendario" className="text-sm text-muted-foreground hover:text-foreground">Calendário</Link>
            <Link to="/quartos" className="text-sm text-muted-foreground hover:text-foreground">Quartos</Link>
            <Link to="/tipos-de-quarto" className="text-sm text-muted-foreground hover:text-foreground">Tipos</Link>
            <Link to="/hospedes" className="text-sm text-muted-foreground hover:text-foreground">Hóspedes</Link>
            <Link to="/reservas" className="text-sm text-muted-foreground hover:text-foreground">Reservas</Link>
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
