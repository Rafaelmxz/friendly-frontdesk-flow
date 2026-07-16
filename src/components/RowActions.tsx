import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
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
import { Pencil, Trash2 } from "lucide-react";

interface Props {
  canEdit?: boolean;
  editTo?: string;
  editParams?: Record<string, string>;
  onDelete?: () => void;
  deleting?: boolean;
  itemLabel?: string;
}

export function RowActions({ canEdit, editTo, editParams, onDelete, deleting, itemLabel = "este registro" }: Props) {
  if (!canEdit) return null;
  return (
    <div className="flex justify-end gap-1">
      {editTo ? (
        <Button asChild variant="ghost" size="icon" aria-label="Editar">
          <Link to={editTo} params={editParams}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
      {onDelete ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Excluir">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {itemLabel}?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} disabled={deleting}>
                {deleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
