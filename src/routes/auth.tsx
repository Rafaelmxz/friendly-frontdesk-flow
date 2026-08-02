import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { signupHotelOwner } from "@/lib/auth.functions";

const searchSchema = z.object({
  tab: z.enum(["login", "signup"]).optional().default("login"),
  next: z.string().optional(),
});

/** Only same-origin relative paths are safe redirect targets. */
function safeNext(next: string | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Entrar — PMS Hoteleiro" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const signup = useServerFn(signupHotelOwner);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [suFullName, setSuFullName] = useState("");
  const [suHotel, setSuHotel] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suLoading, setSuLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoginLoading(false);
    if (error) {
      toast.error("Credenciais inválidas.");
      return;
    }
    navigate({ to: "/app" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSuLoading(true);
    try {
      const res = await signup({
        data: {
          email: suEmail,
          password: suPassword,
          fullName: suFullName,
          hotelName: suHotel,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: suEmail,
        password: suPassword,
      });
      if (error) {
        toast.success("Conta criada. Faça login.");
        navigate({ to: "/auth", search: { tab: "login" } });
        return;
      }
      navigate({ to: "/app" });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível concluir o cadastro.");
    } finally {
      setSuLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>PMS Hoteleiro</CardTitle>
          <CardDescription>Acesse sua conta ou crie um novo hotel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={tab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta (novo hotel)</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input id="login-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loginLoading} className="w-full">
                  {loginLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="su-hotel">Nome do hotel</Label>
                  <Input id="su-hotel" required value={suHotel} onChange={(e) => setSuHotel(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-name">Seu nome</Label>
                  <Input id="su-name" required value={suFullName} onChange={(e) => setSuFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">E-mail</Label>
                  <Input id="su-email" type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">Senha (mínimo 8 caracteres)</Label>
                  <Input id="su-password" type="password" minLength={8} required value={suPassword} onChange={(e) => setSuPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={suLoading} className="w-full">
                  {suLoading ? "Criando..." : "Criar hotel e conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
