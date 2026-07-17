import { toast } from "sonner";

export function handleMutationError(err: unknown, fallback = "Não foi possível concluir a operação."): void {
  const anyErr = err as { code?: string; message?: string } | undefined;
  const msg = anyErr?.message ?? "";
  const code = anyErr?.code ?? "";
  if (code === "23P01" || /exclusion|conflicting key value|overlap/i.test(msg)) {
    toast.error("Este quarto já está reservado nesse período.");
    return;
  }
  if (code === "42501" || /row-level security|permission denied/i.test(msg)) {

    toast.error("Você não tem permissão para essa ação.");
    return;
  }
  if (code === "23505" || /duplicate key/i.test(msg)) {
    toast.error("Registro duplicado.");
    return;
  }
  if (code === "23503" || /foreign key/i.test(msg)) {
    toast.error("Não é possível excluir: existem registros vinculados.");
    return;
  }
  toast.error(msg || fallback);
}
