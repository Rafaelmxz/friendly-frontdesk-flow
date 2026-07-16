import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { RowActions } from "@/components/RowActions";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import { currentProfileQueryOptions } from "@/hooks/useCurrentRole";
import { listRoomTypes, deleteRoomType } from "@/lib/room-types.functions";
import { handleMutationError } from "@/lib/mutation-errors";
import { toast } from "sonner";

const roomTypesQueryOptions = () =>
  queryOptions({ queryKey: ["roomTypes"], queryFn: () => listRoomTypes() });

export const Route = createFileRoute("/_authenticated/tipos-de-quarto/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(roomTypesQueryOptions()),
      context.queryClient.ensureQueryData(currentProfileQueryOptions()),
    ]);
  },
  component: RoomTypesList,
  errorComponent: ({ error, reset }) => <ErrorBox message={error.message} reset={reset} />,
  notFoundComponent: () => <div>Não encontrado.</div>,
});

function ErrorBox({ message, reset }: { message: string; reset: () => void }) {
  const router = useRouter();
  return (
    <Card><CardContent className="p-6 space-y-2">
      <p className="text-destructive">{message}</p>
      <button className="text-sm underline" onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</button>
    </CardContent></Card>
  );
}

function RoomTypesList() {
  const { data } = useSuspenseQuery(roomTypesQueryOptions());
  const { isAdmin } = useCurrentRole();
  const qc = useQueryClient();
  const del = useServerFn(deleteRoomType);
  const mutation = useMutation<unknown, Error, string>({
    mutationFn: (id) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roomTypes"] }); toast.success("Tipo excluído."); },
    onError: (err) => handleMutationError(err),
  });

  return (
    <div>
      <CrudPageHeader
        title="Tipos de quarto"
        description="Categorias com preço base e ocupação máxima."
        canCreate={isAdmin}
        createTo="/tipos-de-quarto/novo"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Preço base</TableHead>
                <TableHead>Ocupação</TableHead>
                <TableHead className="text-right w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum tipo cadastrado.</TableCell></TableRow>
              ) : data.map((rt) => (
                <TableRow key={rt.id}>
                  <TableCell className="font-medium">{rt.name}</TableCell>
                  <TableCell>R$ {Number(rt.base_price).toFixed(2)}</TableCell>
                  <TableCell>{rt.max_occupancy}</TableCell>
                  <TableCell>
                    <RowActions
                      canEdit={isAdmin}
                      editTo="/tipos-de-quarto/$id/editar"
                      editParams={{ id: rt.id }}
                      onDelete={() => mutation.mutate(rt.id)}
                      deleting={mutation.isPending}
                      itemLabel="tipo de quarto"
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
