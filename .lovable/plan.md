## Módulo de Pagamentos

### 1. Migration

- **RPC `register_payment(_reservation_id, _amount, _method, _status, _paid_at, _notes)`** — `SECURITY INVOKER`, `search_path=public`. Deriva `hotel_id` de `reservations` (garante `reservation` pertence ao hotel do usuário via RLS). Valida `_amount > 0`. Se `_status='pago'` e `_paid_at IS NULL`, preenche com `now() AT TIME ZONE hotels.timezone`. Insere em `payments` retornando a linha. `GRANT EXECUTE ... TO authenticated`.
- **RPC `update_payment(_id, _amount, _method, _status, _paid_at, _notes)`** — mesma lógica de auto-preenchimento de `paid_at` quando muda para `pago`. RLS de `payments` já filtra por hotel.
- **RPC `dashboard_metrics()`** — atualizar para retornar coluna extra `receita_recebida_mes`: `sum(payments.amount) where status='pago' and paid_at >= inicio_mes_tz and paid_at < inicio_prox_mes_tz`. Mantém `receita_mes` (prevista, por check-in) inalterada.
- Trigger `validate_payment_tenant` já existe — cobre inserts diretos; RPCs também deixam consistente.

### 2. Server functions — `src/lib/payments.functions.ts`

Todas com `.middleware([requireSupabaseAuth])`:
- `listPaymentsByReservation({ reservationId })` — SELECT direto (RLS), ordenado por `created_at desc`.
- `listPaymentsByGuest({ guestId })` — JOIN `payments`→`reservations` para trazer `room_number` e datas da reserva, ordenado desc.
- `createPayment({ reservation_id, amount, method, status, paid_at?, notes? })` — chama RPC `register_payment`.
- `updatePayment({ id, ... })` — chama RPC `update_payment`.
- `deletePayment({ id })` — DELETE direto (RLS/admin controla).

Zod valida `amount > 0`, enums de method/status, `paid_at` ISO opcional.

### 3. Validação — `src/lib/validation.ts`

`paymentSchema` com enums:
- `payment_method`: `dinheiro | cartao_credito | cartao_debito | pix | transferencia | outro`
- `payment_status`: `pendente | pago | estornado | falhou`
- `amount` positivo, `paid_at` opcional (datetime-local), `notes` até 500.

### 4. UI — Formulário

`src/components/forms/PaymentForm.tsx`: campos amount, method (select), status (select), paid_at (datetime-local, opcional — dica: "deixe vazio se marcar como pago para preencher automaticamente"), notes. Modo `create` (recebe `reservationId`) e `edit`. Usa `useMutation` + `handleMutationError` + invalida queries `["payments", "by-reservation", rid]` e `["payments", "by-guest", gid]` e `["dashboardMetrics"]`.

### 5. UI — Integração na edição da reserva

`src/routes/_authenticated/reservas.$id.editar.tsx`:
- Adiciona seção "Pagamentos" abaixo do form da reserva.
- Loader faz `ensureQueryData` de `listPaymentsByReservation`.
- Mostra card com **saldo** (`reservation.total_amount - sum(payments where status='pago').amount`) formatado em BRL, com cor semântica (`text-emerald-600` quando 0, `text-destructive` quando saldo > 0).
- Tabela: data (paid_at ou created_at), método (label pt-BR), valor, status (Badge), ações (editar/excluir — só admin, via `useCurrentRole`).
- Botão "Registrar pagamento" abre `<Dialog>` com `PaymentForm` (modo create).
- Editar abre o mesmo Dialog em modo edit.

### 6. UI — Histórico de pagamentos do hóspede

`src/routes/_authenticated/hospedes.$id.editar.tsx`:
- Adiciona query `listPaymentsByGuest` no loader, junto do histórico de reservas.
- Nova seção "Histórico de pagamentos" após a tabela de reservas: colunas Quarto, Data, Método, Valor, Status.

### 7. Painel — dois cards de receita

`src/routes/_authenticated/app.tsx`:
- Substitui o card único "Receita do mês" por dois cards:
  - **Receita prevista** — `receita_mes` (atual, por check-in).
  - **Receita recebida** — nova `receita_recebida_mes` (pagamentos `pago` por `paid_at` no mês).
- Grid passa de 5 para 6 cards (`lg:grid-cols-6` ou mantém `lg:grid-cols-3` em duas linhas — usarei `md:grid-cols-3 lg:grid-cols-6`).

`src/lib/dashboard.functions.ts`: adicionar `receita_recebida_mes` no retorno de `getDashboardMetrics`.

### Ordem de execução

1. Migration (RPCs `register_payment`, `update_payment`, atualização de `dashboard_metrics`).
2. `payments.functions.ts` + schema Zod.
3. `PaymentForm.tsx`.
4. Integrar na tela de edição de reserva (com saldo).
5. Adicionar histórico na tela do hóspede.
6. Atualizar Painel com os dois cards de receita.

### Notas técnicas

- `hotel_id` nunca vem do cliente: RPC deriva de `reservations.hotel_id`; trigger `validate_payment_tenant` protege contra inconsistência.
- Autopreenchimento de `paid_at` acontece no banco (RPC), no timezone do hotel — igual à convenção de "hoje" já usada.
- Saldo calculado no cliente a partir da lista já filtrada por reserva (dataset pequeno); métricas globais continuam agregadas no banco.
- Delete de pagamento é restrito a admin no UI; RLS de `payments` decide no banco.
