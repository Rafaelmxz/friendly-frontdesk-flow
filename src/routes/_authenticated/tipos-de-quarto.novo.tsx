import { createFileRoute, Navigate } from "@tanstack/react-router";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { RoomTypeForm } from "@/components/forms/RoomTypeForm";
import { useCurrentRole, currentProfileQueryOptions } from "@/hooks/useCurrentRole";

export const Route = createFileRoute("/_authenticated/tipos-de-quarto/novo")({
  loader: ({ context }) => context.queryClient.ensureQueryData(currentProfileQueryOptions()),
  component: NewRoomType,
});

function NewRoomType() {
  const { isAdmin } = useCurrentRole();
  if (!isAdmin) return <Navigate to="/tipos-de-quarto" />;
  return (
    <div>
      <CrudPageHeader title="Novo tipo de quarto" />
      <RoomTypeForm mode="create" />
    </div>
  );
}
