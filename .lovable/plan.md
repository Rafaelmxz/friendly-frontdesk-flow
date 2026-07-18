## Painel + Calendário de Reservas

Receita do mês = soma de `total_amount` das reservas cujo `check_in` cai no mês corrente (status ∈ confirmada, checkin, checkout), no timezone do hotel.

### 1. Migration — RPCs de agregação

Duas funções `SECURITY INVOKER`, `SET search_path = public` (RLS existente de `rooms`/`reservations` continua aplicada), `GRANT EXECUTE ... TO authenticated`:

- **`dashboard_metrics()`** → retorna uma linha:
  - `rooms_ocupados` — `count(*) from rooms where status='ocupado'`
  - `rooms_disponiveis` — `count(*) from rooms where status='disponivel'`
  - `checkins_hoje` — `count(*) from reservations where status='confirmada' and check_in = hoje_tz`
  - `checkouts_hoje` — `count(*) from reservations where status='checkin' and check_out = hoje_tz`
  - `receita_mes` — `coalesce(sum(total_amount),0) from reservations where status in ('confirmada','checkin','checkout') and check_in >= primeiro_dia_mes_tz and check_in < primeiro_dia_prox_mes_tz`
  
  `hoje_tz` derivado de `(now() at time zone (select timezone from hotels where id = (select hotel_id from profiles where id = auth.uid())))::date`. Como RLS já filtra por hotel, `count`/`sum` só enxergam dados do hotel do usuário — sem necessidade de `where hotel_id = ...` explícito.

- **`reservations_calendar(_from date, _to date)`** → retorna reservas ativas (`status in ('confirmada','checkin')`) que se sobrepõem ao intervalo `[_from, _to)`: `check_in < _to and check_out > _from`. Colunas: `id, room_id, guest_id, guest_name, check_in, check_out, status`.

### 2. Server functions — `src/lib/dashboard.functions.ts`

Ambas `.middleware([requireSupabaseAuth])`:
- `getDashboardMetrics()` → chama RPC `dashboard_metrics`.
- `getReservationsCalendar({ from, to })` → RPC `reservations_calendar`; Zod valida datas ISO e `to > from`.

### 3. Painel — `src/routes/_authenticated/app.tsx`

Mantém o card atual (nome do hotel + papel do usuário) no topo. Abaixo, grid de 5 cards de métrica (KPIs): Ocupados, Livres, Check-ins hoje, Check-outs hoje, Receita do mês (formatada em BRL via `Intl.NumberFormat`). Loader faz `ensureQueryData` dos dois queries (profile + metrics) em paralelo; componente lê com `useSuspenseQuery`. `errorComponent`/`notFoundComponent` já existentes preservados.

### 4. Calendário — nova rota `src/routes/_authenticated/calendario.tsx`

- Loader chama `listRooms` + `getReservationsCalendar` para a semana visível.
- Estado da semana visível na URL via `validateSearch` (`?start=YYYY-MM-DD`, default = segunda-feira da semana atual no TZ do hotel — como o loader é isomórfico, o default é resolvido no servidor via server fn `getHotelToday` reutilizando timezone; alternativa mais simples: default `undefined` no validateSearch e o componente client-side calcula usando `Date` local — vou usar essa por simplicidade, já que a granularidade é semanal).
- Grid: linhas = quartos (ordenadas por `number`), colunas = 7 dias. Cabeçalho com dias formatados em pt-BR. Botões "◀ Semana anterior", "Hoje", "Semana seguinte ▶" atualizam `search`.
- Reservas renderizadas como barras absolute-positioned na linha do `room_id`, cobrindo colunas `[check_in, check_out)`. Cor por status: `confirmada` = `bg-primary/70`, `checkin` = `bg-emerald-500/70` (via tokens semânticos existentes). Clique na barra → navega para `/reservas/$id/editar`.
- Empty state quando não há quartos cadastrados.

### 5. Navegação

Adiciona link "Calendário" no header de `src/routes/_authenticated/route.tsx`, entre "Painel" e "Quartos".

### Ordem de execução

1. Migration com as 2 RPCs + grants.
2. `dashboard.functions.ts`.
3. Atualiza `app.tsx` com cards de KPI.
4. Cria `calendario.tsx`.
5. Adiciona link no header.

### Notas técnicas

- Todas as agregações rodam no banco; frontend recebe apenas números (dashboard) ou lista já filtrada por janela (calendário).
- RLS + `SECURITY INVOKER` garantem isolamento multi-tenant sem lógica adicional nas RPCs.
- Timezone do hotel usado consistentemente para "hoje" e "mês corrente", igual ao `checkin_reservation` existente.
