import { useState, type FormEvent } from "react";
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
import { roomSchema, zodErrorMap } from "@/lib/validation";
import { handleMutationError } from "@/lib/mutation-errors";
import { createRoom, updateRoom } from "@/lib/rooms.functions";

const STATUS_OPTIONS = [
  { value: "disponivel", label: "Disponível" },
  { value: "ocupado", label: "Ocupado" },
  { value: "manutencao", label: "Manutenção" },
  { value: "limpeza", label: "Limpeza" },
  { value: "bloqueado", label: "Bloqueado" },
] as const;

interface Props {
  mode: "create" | "edit";
  id?: string;
  roomTypes: Array<{ id: string; name: string }>;
  initial?: {
    number: string;
    floor: number | null;
    room_type_id: string;
    status: string;
    notes: string | null;
  };
}

export function RoomForm({ mode, id, roomTypes, initial }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createFn = useServerFn(createRoom);
  const updateFn = useServerFn(updateRoom);

  const [number, setNumber] = useState(initial?.number ?? "");
  const [floor, setFloor] = useState(initial?.floor != null ? String(initial.floor) : "");
  const [roomTypeId, setRoomTypeId] = useState(initial?.room_type_id ?? "");
  const [status, setStatus] = useState<string>(initial?.status ?? "disponivel");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async (input: unknown) => {
      if (mode === "create") return createFn({ data: { input } });
      return updateFn({ data: { id: id!, input } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      toast.success(mode === "create" ? "Quarto criado." : "Alterações salvas.");
      navigate({ to: "/quartos" });
    },
    onError: handleMutationError,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = roomSchema.safeParse({
      number,
      floor: floor === "" ? null : floor,
      room_type_id: roomTypeId,
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
      <div className="grid grid-cols-2 gap-4">
        <FormField id="number" label="Número" required error={errors.number}>
          <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} />
        </FormField>
        <FormField id="floor" label="Andar" error={errors.floor}>
          <Input id="floor" type="number" value={floor} onChange={(e) => setFloor(e.target.value)} />
        </FormField>
      </div>
      <FormField id="room_type_id" label="Tipo de quarto" required error={errors.room_type_id}>
        <Select value={roomTypeId} onValueChange={setRoomTypeId}>
          <SelectTrigger id="room_type_id">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {roomTypes.map((rt) => (
              <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField id="status" label="Status" required error={errors.status}>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
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
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/quartos" })}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
