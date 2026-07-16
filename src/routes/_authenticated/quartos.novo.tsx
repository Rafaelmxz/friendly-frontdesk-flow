import { createFileRoute, Navigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { RoomForm } from "@/components/forms/RoomForm";
import { useCurrentRole, currentProfileQueryOptions } from "@/hooks/useCurrentRole";
import { listRoomTypes } from "@/lib/room-types.functions";

const rtQuery = () => queryOptions({ queryKey: ["roomTypes"], queryFn: () => listRoomTypes() });

export const Route = createFileRoute("/_authenticated/quartos/novo")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(rtQuery()),
      context.queryClient.ensureQueryData(currentProfileQueryOptions()),
    ]);
  },
  component: NewRoom,
});

function NewRoom() {
  const roomTypes = useSuspenseQuery(rtQuery()).data;
  const { isAdmin } = useCurrentRole();
  if (!isAdmin) return <Navigate to="/quartos" />;
  return (
    <div>
      <CrudPageHeader title="Novo quarto" />
      <RoomForm mode="create" roomTypes={roomTypes} />
    </div>
  );
}
