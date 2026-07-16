import { createFileRoute } from "@tanstack/react-router";
import { CrudPageHeader } from "@/components/CrudPageHeader";
import { GuestForm } from "@/components/forms/GuestForm";

export const Route = createFileRoute("/_authenticated/hospedes/novo")({
  component: NewGuest,
});

function NewGuest() {
  return (
    <div>
      <CrudPageHeader title="Novo hóspede" />
      <GuestForm mode="create" />
    </div>
  );
}
