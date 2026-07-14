import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

import { createInvite } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/equipe")({
  component: EquipePage,
});

function EquipePage() {
  const invite = useServerFn(createInvite);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setInviteUrl(null);
    try {
      const res = await invite({ data: { email } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const url = `${window.location.origin}/invite/${res.token}`;
      setInviteUrl(url);
      setEmail("");
      toast.success("Convite gerado. Envie o link para o recepcionista.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Convidar recepcionista</CardTitle>
          <CardDescription>
            Gere um link de convite. O convidado usará o link para completar o cadastro no seu hotel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail do recepcionista</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Gerando..." : "Gerar convite"}
            </Button>
          </form>

          {inviteUrl && (
            <div className="mt-6 space-y-2 rounded-md border p-4">
              <div className="text-sm font-medium">Link de convite:</div>
              <div className="break-all rounded bg-muted p-2 font-mono text-xs">{inviteUrl}</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  toast.success("Link copiado.");
                }}
              >
                Copiar link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
