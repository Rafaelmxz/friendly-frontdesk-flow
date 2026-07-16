import { createFileRoute, Navigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { RoomForm } from "@/components/forms/RoomForm";
import { useCurrentRole, currentProfileQueryOptions } from "@/hooks/useCurrentRole";
import { listRoomTypes } from "@/lib/room-types.functions";
import { getRoom } from "@/lib/rooms.functions";

const rtQuery = () => queryOptions({ queryKey: ["roomTypes"], queryFn: () => listRoomTypes() });
const roomQuery = (id: string) => queryOptions({ queryKey: ["rooms", id], queryFn: () => getRoom({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/quartos/$id/editar")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(rtQuery()),
      context.queryClient.ensureQueryData(roomQuery(params.id)),
      context.queryClient.ensureQueryData(currentProfileQueryOptions()),
    ]);
  },
  component: EditRoom,
});

function EditRoom() {
  const { id } = Route.useParams();
  const roomTypes = useSuspenseQuery(rtQuery()).data;
  const room = useSuspenseQuery(roomQuery(id)).data;
  const { isAdmin } = useCurrentRole();
  if (!isAdmin) return <Navigate to="/quartos" />;
  return (
    <div>
      <CrudPageHeader title="Editar quarto" />
      <RoomForm mode="edit" id={id} roomTypes={roomTypes} initial={room} />
    </div>
  );
}
