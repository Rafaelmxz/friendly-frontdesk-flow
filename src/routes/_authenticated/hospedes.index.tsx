import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { RowActions } from "@/components/RowActions";
import { currentProfileQueryOptions } from "@/hooks/useCurrentRole";
import { listGuests, deleteGuest } from "@/lib/guests.functions";
import { handleMutationError } from "@/lib/mutation-errors";
import { formatCpf } from "@/lib/format";
import { toast } from "sonner";

const guestsQuery = (search: string) =>
  queryOptions({ queryKey: ["guests", search], queryFn: () => listGuests({ data: { search } }) });

export const Route = createFileRoute("/_authenticated/hospedes/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(guestsQuery("")),
      context.queryClient.ensureQueryData(currentProfileQueryOptions()),
    ]);
  },
  component: GuestsList,
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

function GuestsList() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data } = useSuspenseQuery(guestsQuery(search));
  const qc = useQueryClient();
  const del = useServerFn(deleteGuest);
  const mutation = useMutation<unknown, Error, string>({
    mutationFn: (id) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["guests"] }); toast.success("Hóspede excluído."); },
    onError: (err) => handleMutationError(err),
  });

  return (
    <div>
      <CrudPageHeader
        title="Hóspedes"
        description="Busque por nome, CPF ou número do quarto (reservas ativas)."
        canCreate
        createTo="/hospedes/novo"
        extra={
          <Input
            className="w-64"
            placeholder="Buscar..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum hóspede encontrado.</TableCell></TableRow>
              ) : data.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.full_name}</TableCell>
                  <TableCell>
                    {g.document_type === "CPF" && g.document_number
                      ? `CPF ${formatCpf(g.document_number)}`
                      : g.document_type
                      ? `${g.document_type} ${g.document_number ?? ""}`.trim()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.email || g.phone || "—"}
                  </TableCell>
                  <TableCell>
                    <RowActions
                      canEdit
                      editTo="/hospedes/$id/editar"
                      editParams={{ id: g.id }}
                      onDelete={() => mutation.mutate(g.id)}
                      deleting={mutation.isPending}
                      itemLabel="hóspede"
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
