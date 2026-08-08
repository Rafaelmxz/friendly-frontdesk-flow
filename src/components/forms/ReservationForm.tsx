import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/forms/FormField";
import { reservationSchema, zodErrorMap } from "@/lib/validation";
import { handleMutationError } from "@/lib/mutation-errors";
import { createReservation, updateReservation } from "@/lib/reservations.functions";

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "confirmada", label: "Confirmada" },
] as const;

interface Props {
  mode: "create" | "edit";
  id?: string;
  guests: Array<{ id: string; full_name: string }>;
  rooms: Array<{ id: string; number: string; room_type_name?: string }>;
  initial?: {
    guest_id: string;
    room_id: string;
    check_in: string;
    check_out: string;
    adults: number;
    children: number;
    total_amount: number;
    status: string;
    notes: string | null;
  };
}

export function ReservationForm({ mode, id, guests, rooms, initial }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createFn = useServerFn(createReservation);
  const updateFn = useServerFn(updateReservation);

  const [guestId, setGuestId] = useState(initial?.guest_id ?? "");
  const [roomId, setRoomId] = useState(initial?.room_id ?? "");
  const [checkIn, setCheckIn] = useState(initial?.check_in ?? "");
  const [checkOut, setCheckOut] = useState(initial?.check_out ?? "");
  const [adults, setAdults] = useState(String(initial?.adults ?? 1));
  const [children, setChildren] = useState(String(initial?.children ?? 0));
  const [total, setTotal] = useState(String(initial?.total_amount ?? ""));
  const [status, setStatus] = useState<string>(
    initial?.status === "confirmada" || initial?.status === "pendente"
      ? initial.status
      : "pendente",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation<unknown, Error, unknown>({
    mutationFn: async (input: unknown) => {
      if (mode === "create") return createFn({ data: { input } });
      return updateFn({ data: { id: id!, input } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      toast.success(mode === "create" ? "Reserva criada." : "Alterações salvas.");
      navigate({ to: "/reservas" });
    },
    onError: (err) => handleMutationError(err),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = reservationSchema.safeParse({
      guest_id: guestId,
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut,
      adults,
      children,
      total_amount: total,
      status,
      notes,
    });
    if (!parsed.success) {
      setErrors(zodErrorMap(parsed.error as z.ZodError));
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <FormField id="guest_id" label="Hóspede" required error={errors.guest_id}>
        <Select value={guestId} onValueChange={setGuestId}>
          <SelectTrigger id="guest_id"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {guests.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField id="room_id" label="Quarto" required error={errors.room_id}>
        <Select value={roomId} onValueChange={setRoomId}>
          <SelectTrigger id="room_id"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.number}{r.room_type_name ? ` — ${r.room_type_name}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField id="check_in" label="Check-in" required error={errors.check_in}>
          <Input id="check_in" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </FormField>
        <FormField id="check_out" label="Check-out" required error={errors.check_out}>
          <Input id="check_out" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </FormField>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <FormField id="adults" label="Adultos" required error={errors.adults}>
          <Input id="adults" type="number" min={1} value={adults} onChange={(e) => setAdults(e.target.value)} />
        </FormField>
        <FormField id="children" label="Crianças" error={errors.children}>
          <Input id="children" type="number" min={0} value={children} onChange={(e) => setChildren(e.target.value)} />
        </FormField>
        <FormField id="total_amount" label="Total (R$)" required error={errors.total_amount}>
          <Input id="total_amount" type="number" step="0.01" min={0} value={total} onChange={(e) => setTotal(e.target.value)} />
        </FormField>
      </div>
      <FormField id="status" label="Status inicial" required error={errors.status}>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="status"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField id="notes" label="Notas" error={errors.notes}>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/reservas" })}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
