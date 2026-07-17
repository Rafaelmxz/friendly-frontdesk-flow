## Módulo de Reservas (revisado)

### Ajuste sobre fuso horário

Boa observação. `current_date` no Postgres usa o timezone da sessão/servidor (UTC no Supabase por padrão), então às 23h no horário do hotel poderia recusar um check-in válido. A comparação vai usar `hotels.timezone`:

```sql
-- dentro de checkin_reservation(_id uuid)
select r.check_in, r.status, r.room_id, h.timezone
  into v_check_in, v_status, v_room_id, v_tz
from reservations r
join hotels h on h.id = r.hotel_id
where r.id = _id;

if v_check_in > (now() at time zone v_tz)::date then
  raise exception 'Check-in só a partir de %', to_char(v_check_in, 'DD/MM/YYYY');
end if;
```

Mesma lógica onde mais precisar comparar "hoje" (nenhum outro ponto por enquanto).

### Server functions (`src/lib/reservations.functions.ts`)

Todas `.middleware([requireSupabaseAuth])`, `hotel_id` derivado do perfil:

- `listReservations()` — hotel inteiro, `check_in` desc, com joins de guest e room.
- `listReservationsByGuest({ guestId })` — `created_at` desc.
- `createReservation({ guest_id, room_id, check_in, check_out, adults, children, total_amount, status, notes })` — status ∈ {`pendente`, `confirmada`}. Captura `code === '23P01'` e lança `Error("Este quarto já está reservado nesse período.")`. Zod valida `check_out > check_in`.
- `updateReservation({ id, ...campos })` — só se status ∈ {pendente, confirmada}. Mesmo tratamento de 23P01.
- `checkInReservation({ id })` → RPC `checkin_reservation`.
- `checkOutReservation({ id })` → RPC `checkout_reservation`.
- `cancelReservation({ id })` → RPC `cancel_reservation`.

### Migration (nova)

Três funções SQL em `public`, `LANGUAGE plpgsql`, `SECURITY INVOKER`, `SET search_path = public`, `GRANT EXECUTE ... TO authenticated`:

- `checkin_reservation(_id uuid)` — valida `status='confirmada'`, valida `check_in <= (now() at time zone hotels.timezone)::date`, `UPDATE reservations SET status='checkin'`, `UPDATE rooms SET status='ocupado'`. Tudo na mesma transação (a própria função já é uma).
- `checkout_reservation(_id uuid)` — valida `status='checkin'`, `UPDATE reservations SET status='checkout'`, `UPDATE rooms SET status='disponivel'`.
- `cancel_reservation(_id uuid)` — rejeita se status = `checkin` (precisa checkout), senão `UPDATE reservations SET status='cancelada'` (quarto não é alterado — reservas pendente/confirmada não ocupam o quarto).

`SECURITY INVOKER` faz as policies RLS existentes de `reservations` e `rooms` continuarem aplicadas; mensagens em português via `RAISE EXCEPTION` chegam ao frontend por `err.message`.

### UI (novas rotas sob `_authenticated/`)

- `reservas.index.tsx` — lista: hóspede, quarto, período, status (badge), total. Ações por status:
  - `pendente` → Confirmar (editar), Cancelar
  - `confirmada` → Check-in (se data permitir), Cancelar, Editar
  - `checkin` → Check-out
  - `checkout` / `cancelada` / `no_show` → só visualizar
- `reservas.novo.tsx` e `reservas.$id.editar.tsx` — usam `ReservationForm` compartilhado.
- Histórico do hóspede: seção nova em `hospedes.$id.editar.tsx` abaixo do formulário (lista simples, mais recentes primeiro).
- Link "Reservas" no header.

### Compartilhados

- `ReservationForm` em `src/components/forms/ReservationForm.tsx`.
- `reservationSchema` em `src/lib/validation.ts` (datas, ocupantes, total, status).
- `handleMutationError`: adicionar mapping `23P01` → "Este quarto já está reservado nesse período." como defesa em profundidade.

### Ordem

1. Migration com as 3 funções SQL + grants.
2. `reservations.functions.ts` + Zod schema.
3. `ReservationForm` + rotas.
4. Histórico em `hospedes.$id.editar.tsx`.
5. Link no header.
