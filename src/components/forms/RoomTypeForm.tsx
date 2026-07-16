import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/FormField";
import { roomTypeSchema, zodErrorMap } from "@/lib/validation";
import { handleMutationError } from "@/lib/mutation-errors";
import { createRoomType, updateRoomType } from "@/lib/room-types.functions";

interface Props {
  mode: "create" | "edit";
  id?: string;
  initial?: {
    name: string;
    description: string | null;
    base_price: number;
    max_occupancy: number;
  };
}

export function RoomTypeForm({ mode, id, initial }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createFn = useServerFn(createRoomType);
  const updateFn = useServerFn(updateRoomType);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState(String(initial?.base_price ?? ""));
  const [maxOccupancy, setMaxOccupancy] = useState(String(initial?.max_occupancy ?? "2"));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation<unknown, Error, unknown>({
    mutationFn: async (input: unknown) => {
      if (mode === "create") return createFn({ data: { input } });
      return updateFn({ data: { id: id!, input } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roomTypes"] });
      toast.success(mode === "create" ? "Tipo criado." : "Alterações salvas.");
      navigate({ to: "/tipos-de-quarto" });
    },
    onError: (err) => handleMutationError(err),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = roomTypeSchema.safeParse({
      name,
      description,
      base_price: basePrice,
      max_occupancy: maxOccupancy,
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
      <FormField id="name" label="Nome" required error={errors.name}>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField id="description" label="Descrição" error={errors.description}>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField id="base_price" label="Preço base (R$)" required error={errors.base_price}>
          <Input id="base_price" type="number" step="0.01" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
        </FormField>
        <FormField id="max_occupancy" label="Ocupação máx." required error={errors.max_occupancy}>
          <Input id="max_occupancy" type="number" min="1" max="20" value={maxOccupancy} onChange={(e) => setMaxOccupancy(e.target.value)} />
        </FormField>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/tipos-de-quarto" })}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
