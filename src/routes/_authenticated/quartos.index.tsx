import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { RowActions } from "@/components/RowActions";
import { useCurrentRole, currentProfileQueryOptions } from "@/hooks/useCurrentRole";
import { listRooms, deleteRoom } from "@/lib/rooms.functions";
import { handleMutationError } from "@/lib/mutation-errors";
import { toast } from "sonner";

const roomsQuery = () => queryOptions({ queryKey: ["rooms"], queryFn: () => listRooms() });

export const Route = createFileRoute("/_authenticated/quartos/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(roomsQuery()),
      context.queryClient.ensureQueryData(currentProfileQueryOptions()),
    ]);
  },
  component: RoomsList,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <Card><CardContent className="p-6 space-y-2">
        <p className="text-destructive">{error.message}</p>
        <button className="text-sm underline" onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</button>
      </CardContent></Card>
    );
  },
  notFoundComponent: () => <div>Não encontrado.</div>,
});

const STATUS_LABEL: Record<string, string> = {
  disponivel: "Disponível",
  ocupado: "Ocupado",
  manutencao: "Manutenção",
  limpeza: "Limpeza",
  bloqueado: "Bloqueado",
};

function RoomsList() {
  const { data } = useSuspenseQuery(roomsQuery());
  const { isAdmin } = useCurrentRole();
  const qc = useQueryClient();
  const del = useServerFn(deleteRoom);
  const mutation = useMutation<unknown, Error, string>({
    mutationFn: (id) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rooms"] }); toast.success("Quarto excluído."); },
    onError: (err) => handleMutationError(err),
  });

  return (
    <div>
      <CrudPageHeader
        title="Quartos"
        description="Unidades disponíveis para reserva."
        canCreate={isAdmin}
        createTo="/quartos/novo"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Andar</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum quarto cadastrado.</TableCell></TableRow>
              ) : data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.number}</TableCell>
                  <TableCell>{r.floor ?? "—"}</TableCell>
                  <TableCell>{r.room_type_name}</TableCell>
                  <TableCell><Badge variant="secondary">{STATUS_LABEL[r.status] ?? r.status}</Badge></TableCell>
                  <TableCell>
                    <RowActions
                      canEdit={isAdmin}
                      editTo="/quartos/$id/editar"
                      editParams={{ id: r.id }}
                      onDelete={() => mutation.mutate(r.id)}
                      deleting={mutation.isPending}
                      itemLabel="quarto"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
