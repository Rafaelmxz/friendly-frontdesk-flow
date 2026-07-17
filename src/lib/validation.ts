import { z } from "zod";
import { isValidCpf, onlyDigits } from "./format";

export const documentTypeSchema = z.enum(["CPF", "RG", "PASSAPORTE", "OUTRO"]);

export const guestSchema = z
  .object({
    full_name: z.string().trim().min(1, "Nome obrigatório").max(120),
    email: z.string().trim().email("E-mail inválido").max(255).optional().or(z.literal("")),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    document_type: documentTypeSchema.optional(),
    document_number: z.string().trim().max(50).optional().or(z.literal("")),
    birth_date: z.string().optional().or(z.literal("")),
    nationality: z.string().trim().max(60).optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.document_type === "CPF" && data.document_number) {
      if (!isValidCpf(data.document_number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["document_number"],
          message: "CPF inválido",
        });
      }
    }
  })
  .transform((data) => ({
    full_name: data.full_name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    document_type: data.document_type,
    document_number:
      data.document_type === "CPF" && data.document_number
        ? onlyDigits(data.document_number)
        : data.document_number || undefined,
    birth_date: data.birth_date || undefined,
    nationality: data.nationality || undefined,
    notes: data.notes || undefined,
  }));

export type GuestInput = z.infer<typeof guestSchema>;

export const roomTypeSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  base_price: z.coerce.number().nonnegative("Preço deve ser ≥ 0"),
  max_occupancy: z.coerce.number().int().min(1, "Mínimo 1").max(20),
});
export type RoomTypeInput = z.infer<typeof roomTypeSchema>;

export const roomStatusSchema = z.enum([
  "disponivel",
  "ocupado",
  "manutencao",
  "limpeza",
  "bloqueado",
]);

export const roomSchema = z.object({
  number: z.string().trim().min(1, "Número obrigatório").max(20),
  floor: z
    .union([z.coerce.number().int(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined || v === null ? null : (v as number))),
  room_type_id: z.string().uuid("Selecione um tipo"),
  status: roomStatusSchema,
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type RoomInput = z.infer<typeof roomSchema>;

export const reservationStatusInitialSchema = z.enum(["pendente", "confirmada"]);
export const reservationStatusEditSchema = z.enum(["pendente", "confirmada"]);

export const reservationSchema = z
  .object({
    guest_id: z.string().uuid("Selecione um hóspede"),
    room_id: z.string().uuid("Selecione um quarto"),
    check_in: z.string().min(1, "Data de check-in obrigatória"),
    check_out: z.string().min(1, "Data de check-out obrigatória"),
    adults: z.coerce.number().int().min(1, "Mínimo 1 adulto").max(20),
    children: z.coerce.number().int().min(0).max(20),
    total_amount: z.coerce.number().nonnegative("Total deve ser ≥ 0"),
    status: reservationStatusInitialSchema,
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.check_out <= data.check_in) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["check_out"],
        message: "Check-out deve ser após o check-in",
      });
    }
  })
  .transform((d) => ({
    guest_id: d.guest_id,
    room_id: d.room_id,
    check_in: d.check_in,
    check_out: d.check_out,
    adults: d.adults,
    children: d.children,
    total_amount: d.total_amount,
    status: d.status,
    notes: d.notes || undefined,
  }));
export type ReservationInput = z.infer<typeof reservationSchema>;

export function zodErrorMap(err: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_root";
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}

