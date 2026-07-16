import { createFileRoute, Navigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { RoomTypeForm } from "@/components/forms/RoomTypeForm";
import { useCurrentRole, currentProfileQueryOptions } from "@/hooks/useCurrentRole";
import { getRoomType } from "@/lib/room-types.functions";

const rtQuery = (id: string) =>
  queryOptions({ queryKey: ["roomTypes", id], queryFn: () => getRoomType({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/tipos-de-quarto/$id/editar")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(rtQuery(params.id)),
      context.queryClient.ensureQueryData(currentProfileQueryOptions()),
    ]);
  },
  component: EditRoomType,
});

function EditRoomType() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(rtQuery(id));
  const { isAdmin } = useCurrentRole();
  if (!isAdmin) return <Navigate to="/tipos-de-quarto" />;
  return (
    <div>
      <CrudPageHeader title="Editar tipo de quarto" />
      <RoomTypeForm mode="edit" id={id} initial={data} />
    </div>
  );
}
