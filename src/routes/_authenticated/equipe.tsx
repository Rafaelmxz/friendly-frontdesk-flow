import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Copy, RefreshCw, Trash2, UserMinus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import { createInvite } from "@/lib/auth.functions";
import { currentProfileQueryOptions, useCurrentRole } from "@/hooks/useCurrentRole";
import {
  cancelHotelInvite,
  listHotelMembers,
  listPendingHotelInvites,
  removeHotelMember,
  resendHotelInvite,
} from "@/lib/team.functions";
import { handleMutationError } from "@/lib/mutation-errors";

const membersQueryOptions = () => queryOptions({
  queryKey: ["hotel-members"],
  queryFn: () => listHotelMembers(),
});

const pendingInvitesQueryOptions = () => queryOptions({
  queryKey: ["pending-hotel-invites"],
  queryFn: () => listPendingHotelInvites(),
});

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe | PMS Hoteleiro" },
      { name: "description", content: "Gerencie membros e convites da equipe do hotel." },
      { property: "og:title", content: "Equipe | PMS Hoteleiro" },
      { property: "og:description", content: "Gerencie membros e convites da equipe do hotel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(currentProfileQueryOptions()),
      context.queryClient.ensureQueryData(membersQueryOptions()),
      context.queryClient.ensureQueryData(pendingInvitesQueryOptions()),
    ]);
  },
  component: EquipePage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <p role="alert" className="text-destructive">{error.message}</p>
          <Button variant="outline" onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</Button>
        </CardContent>
      </Card>
    );
  },
  notFoundComponent: () => <div>Equipe não encontrada.</div>,
});

function ConfirmationAction({
  label,
  title,
  description,
  onConfirm,
  disabled,
  icon,
  destructive = false,
}: {
  label: string;
  title: string;
  description: string;
  onConfirm: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={disabled}>
          {icon}{label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={onConfirm}
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EquipePage() {
  const invite = useServerFn(createInvite);
  const removeMember = useServerFn(removeHotelMember);
  const cancelInvite = useServerFn(cancelHotelInvite);
  const resendInvite = useServerFn(resendHotelInvite);
  const queryClient = useQueryClient();
  const { isAdmin } = useCurrentRole();
  const { data: members } = useSuspenseQuery(membersQueryOptions());
  const { data: pendingInvites } = useSuspenseQuery(pendingInvitesQueryOptions());
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember({ data: { userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-members"] });
      toast.success("Membro removido do hotel.");
    },
    onError: (error) => handleMutationError(error, "Não foi possível remover o membro."),
  });

  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) => cancelInvite({ data: { inviteId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-hotel-invites"] });
      toast.success("Convite cancelado.");
    },
    onError: (error) => handleMutationError(error, "Não foi possível cancelar o convite."),
  });

  const resendMutation = useMutation({
    mutationFn: (inviteId: string) => resendInvite({ data: { inviteId } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pending-hotel-invites"] });
      setInviteUrl(`${window.location.origin}/invite/${result.token}`);
      toast.success("Novo convite gerado.");
    },
    onError: (error) => handleMutationError(error, "Não foi possível reenviar o convite."),
  });

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
      queryClient.invalidateQueries({ queryKey: ["pending-hotel-invites"] });
      toast.success("Convite gerado. Envie o link para o recepcionista.");
    } catch (error) {
      handleMutationError(error, "Não foi possível criar o convite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Equipe</h1>
        <p className="mt-1 text-sm text-muted-foreground">Membros com acesso e convites pendentes do hotel.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Membros atuais</CardTitle>
              <CardDescription>Pessoas que possuem acesso a este hotel.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                {isAdmin ? <TableHead className="text-right">Ações</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="py-8 text-center text-muted-foreground">Nenhum membro encontrado.</TableCell></TableRow>
              ) : members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.fullName}{member.isCurrentUser ? <span className="ml-2 text-xs text-muted-foreground">Você</span> : null}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell><Badge variant={member.role === "admin" ? "default" : "secondary"}>{member.role === "admin" ? "Admin" : "Recepcionista"}</Badge></TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      {!member.isCurrentUser ? (
                        <ConfirmationAction
                          label="Remover"
                          title={`Remover ${member.fullName}?`}
                          description="O acesso ao hotel será removido, mas a conta da pessoa será preservada."
                          disabled={removeMutation.isPending}
                          destructive
                          icon={<UserMinus className="mr-2 h-4 w-4" />}
                          onConfirm={() => removeMutation.mutate(member.id)}
                        />
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isAdmin ? <Card>
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
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl);
                  toast.success("Link copiado.");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />Copiar link
              </Button>
            </div>
          )}
        </CardContent>
      </Card> : null}

      {isAdmin ? <Card>
        <CardHeader>
          <CardTitle>Convites pendentes</CardTitle>
          <CardDescription>Links ainda não utilizados para entrar na equipe.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvites.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Nenhum convite pendente.</TableCell></TableRow>
              ) : pendingInvites.map((pending) => (
                <TableRow key={pending.id}>
                  <TableCell className="font-medium">{pending.email}</TableCell>
                  <TableCell>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(pending.expires_at))}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <ConfirmationAction
                        label="Reenviar"
                        title="Gerar um novo link?"
                        description="O link anterior deixará de funcionar e o prazo será renovado por 7 dias."
                        disabled={resendMutation.isPending || cancelMutation.isPending}
                        icon={<RefreshCw className="mr-2 h-4 w-4" />}
                        onConfirm={() => resendMutation.mutate(pending.id)}
                      />
                      <ConfirmationAction
                        label="Cancelar"
                        title="Cancelar este convite?"
                        description="O link deixará de funcionar imediatamente."
                        disabled={resendMutation.isPending || cancelMutation.isPending}
                        destructive
                        icon={<Trash2 className="mr-2 h-4 w-4" />}
                        onConfirm={() => cancelMutation.mutate(pending.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card> : null}
    </div>
  );
}
