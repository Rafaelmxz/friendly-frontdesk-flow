import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/forms/FormField";
import { handleMutationError } from "@/lib/mutation-errors";
import {
  createPayment,
  updatePayment,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/lib/payments.functions";

const METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  pix: "Pix",
  transferencia: "Transferência",
  outro: "Outro",
};

const STATUS_LABELS: Record<(typeof PAYMENT_STATUSES)[number], string> = {
  pendente: "Pendente",
  pago: "Pago",
  estornado: "Estornado",
  falhou: "Falhou",
};

type Method = (typeof PAYMENT_METHODS)[number];
type Status = (typeof PAYMENT_STATUSES)[number];

interface Props {
  mode: "create" | "edit";
  reservationId: string;
  guestId?: string;
  paymentId?: string;
  initial?: {
    amount: number;
    method: Method;
    status: Status;
    paid_at: string | null;
    notes: string | null;
  };
  onDone?: () => void;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PaymentForm({ mode, reservationId, guestId, paymentId, initial, onDone }: Props) {
  const qc = useQueryClient();
  const createFn = useServerFn(createPayment);
  const updateFn = useServerFn(updatePayment);

  const [amount, setAmount] = useState(String(initial?.amount ?? ""));
  const [method, setMethod] = useState<Method>(initial?.method ?? "dinheiro");
  const [status, setStatus] = useState<Status>(initial?.status ?? "pago");
  const [paidAt, setPaidAt] = useState(toLocalInput(initial?.paid_at ?? null));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      const num = Number(amount);
      if (!isFinite(num) || num <= 0) {
        throw new Error("Valor deve ser maior que zero");
      }
      const payload = {
        amount: num,
        method,
        status,
        paid_at: paidAt || null,
        notes: notes || null,
      };
      if (mode === "create") {
        return createFn({ data: { reservation_id: reservationId, ...payload } });
      }
      return updateFn({ data: { id: paymentId!, ...payload } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", "by-reservation", reservationId] });
      if (guestId) qc.invalidateQueries({ queryKey: ["payments", "by-guest", guestId] });
      qc.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      toast.success(mode === "create" ? "Pagamento registrado." : "Pagamento atualizado.");
      onDone?.();
    },
    onError: (err) => handleMutationError(err),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const num = Number(amount);
    if (!isFinite(num) || num <= 0) errs.amount = "Valor deve ser maior que zero";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField id="amount" label="Valor (R$)" required error={errors.amount}>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </FormField>
        <FormField id="method" label="Método" required>
          <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
            <SelectTrigger id="method"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField id="status" label="Status" required>
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger id="status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          id="paid_at"
          label="Data do pagamento"
          hint={status === "pago" && !paidAt ? "Deixe vazio para preencher com o momento atual." : undefined}
        >
          <Input
            id="paid_at"
            type="datetime-local"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </FormField>
      </div>
      <FormField id="notes" label="Observações">
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onDone?.()}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : mode === "create" ? "Registrar" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
