import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { acceptInvite } from "@/lib/auth.functions";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Aceitar convite — PMS Hoteleiro" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const accept = useServerFn(acceptInvite);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await accept({ data: { token, fullName, password } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: res.email,
        password,
      });
      if (error) {
        toast.success("Convite aceito. Faça login.");
        navigate({ to: "/auth" });
        return;
      }
      navigate({ to: "/app" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Aceitar convite</CardTitle>
          <CardDescription>Complete seu cadastro para acessar o hotel.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha (mínimo 8 caracteres)</Label>
              <Input id="password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Aceitando..." : "Aceitar convite"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
