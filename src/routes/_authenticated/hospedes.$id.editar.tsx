import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { GuestForm } from "@/components/forms/GuestForm";
import { getGuest } from "@/lib/guests.functions";

const guestQuery = (id: string) =>
  queryOptions({ queryKey: ["guests", "detail", id], queryFn: () => getGuest({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/hospedes/$id/editar")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(guestQuery(params.id)),
  component: EditGuest,
});

function EditGuest() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(guestQuery(id));
  return (
    <div>
      <CrudPageHeader title="Editar hóspede" />
      <GuestForm mode="edit" id={id} initial={data} />
    </div>
  );
}
