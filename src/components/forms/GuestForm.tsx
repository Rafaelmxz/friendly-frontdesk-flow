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
import { guestSchema, zodErrorMap } from "@/lib/validation";
import { handleMutationError } from "@/lib/mutation-errors";
import { formatCpf } from "@/lib/format";
import { createGuest, updateGuest } from "@/lib/guests.functions";

const DOC_TYPES = [
  { value: "CPF", label: "CPF" },
  { value: "RG", label: "RG" },
  { value: "PASSAPORTE", label: "Passaporte" },
  { value: "OUTRO", label: "Outro" },
] as const;

interface Props {
  mode: "create" | "edit";
  id?: string;
  initial?: {
    full_name: string;
    email: string | null;
    phone: string | null;
    document_type: string | null;
    document_number: string | null;
    birth_date: string | null;
    nationality: string | null;
    notes: string | null;
  };
}

export function GuestForm({ mode, id, initial }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createFn = useServerFn(createGuest);
  const updateFn = useServerFn(updateGuest);

  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [docType, setDocType] = useState<string>(initial?.document_type ?? "CPF");
  const [docNumber, setDocNumber] = useState(
    initial?.document_type === "CPF" && initial?.document_number
      ? formatCpf(initial.document_number)
      : (initial?.document_number ?? ""),
  );
  const [birthDate, setBirthDate] = useState(initial?.birth_date ?? "");
  const [nationality, setNationality] = useState(initial?.nationality ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation<unknown, Error, unknown>({
    mutationFn: async (input: unknown) => {
      if (mode === "create") return createFn({ data: { input } });
      return updateFn({ data: { id: id!, input } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guests"] });
      toast.success(mode === "create" ? "Hóspede criado." : "Alterações salvas.");
      navigate({ to: "/hospedes" });
    },
    onError: (err) => handleMutationError(err),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = guestSchema.safeParse({
      full_name: fullName,
      email,
      phone,
      document_type: docType,
      document_number: docNumber,
      birth_date: birthDate,
      nationality,
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
      <FormField id="full_name" label="Nome completo" required error={errors.full_name}>
        <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField id="email" label="E-mail" error={errors.email}>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField id="phone" label="Telefone" error={errors.phone}>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField id="document_type" label="Tipo de documento" error={errors.document_type}>
          <Select value={docType} onValueChange={(v) => { setDocType(v); setDocNumber(""); }}>
            <SelectTrigger id="document_type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="document_number" label="Número" error={errors.document_number}>
          <Input
            id="document_number"
            value={docNumber}
            onChange={(e) =>
              setDocNumber(docType === "CPF" ? formatCpf(e.target.value) : e.target.value)
            }
            placeholder={docType === "CPF" ? "000.000.000-00" : ""}
            inputMode={docType === "CPF" ? "numeric" : undefined}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField id="birth_date" label="Data de nascimento" error={errors.birth_date}>
          <Input id="birth_date" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </FormField>
        <FormField id="nationality" label="Nacionalidade" error={errors.nationality}>
          <Input id="nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} />
        </FormField>
      </div>
      <FormField id="notes" label="Notas" error={errors.notes}>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/hospedes" })}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
