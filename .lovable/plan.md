# Timeline do Calendário estilo mapa de hospedagem

Redesenho apenas do modo **Timeline** (Mensal e Semana ficam como estão, exceto por passarem a enxergar também reservas pendentes).

## 1. Lateral de quartos compacta

- Cada linha do quarto com altura fixa de ~32px, uma linha só de texto: `101 · Deluxe` (tipo abreviado, truncado com reticências se não couber).
- Ícone discreto ao lado quando o quarto está em limpeza, manutenção ou bloqueado (usando `rooms.status`), com rótulo acessível (`title`/`sr-only`) — não só o ícone.

## 2. Cores por status

- Confirmada: azul suave · Check-in: verde suave · Pendente: amarelo suave · Cancelada: cinza.
- Cada barra traz, além da cor, uma inicial/ícone de status antes do nome do hóspede, para não depender só da cor.
- Dias sem reserva ficam vazios (nenhum texto "Disponível").
- Legenda abaixo da grade atualizada com os quatro status.

## 3. Destaque de data

- Coluna do dia atual com fundo levemente destacado e cabeçalho em negrito.
- Sábado e domingo com fundo sutilmente diferente dos dias úteis.

## 4. Hover card

- Ao passar o mouse sobre uma barra, abre um card (HoverCard) com: hóspede, telefone (se cadastrado), quarto, check-in, check-out, número de hóspedes (adultos + crianças), valor e status.
- Botões rápidos: **Check-in** ou **Check-out** (conforme o status permitir) e **Abrir reserva** (abre o Drawer).
- Os dados extras (telefone, valor, ocupação) são buscados sob demanda quando o card abre e ficam em cache; enquanto carrega, mostra um esqueleto curto.

## 5. Drawer lateral

- Clicar na barra abre um painel deslizante à direita (Sheet), sem sair do calendário.
- Conteúdo enxuto: hóspede (com telefone/e-mail), quarto e tipo, período e número de noites, hóspedes, valor total, status, observações, e o resumo de pagamentos (total pago / saldo) reaproveitando a query de pagamentos já existente.
- Ações: **Check-in**, **Check-out** e **Cancelar** (as mesmas mutações já usadas na lista de reservas, com as mesmas regras de quando aparecem) e link **Editar detalhes completos** que leva para `/reservas/$id/editar`.
- Após qualquer ação, o calendário e o painel se atualizam sozinhos.

## Detalhes técnicos

- **Migration**: `reservations_calendar` passa a incluir `'pendente'` no filtro de status (canceladas continuam fora). Nenhuma mudança de tabela.
- **Server function nova** em `src/lib/reservations.functions.ts`: `getReservationCard(id)` retornando reserva + `guests.full_name/phone/email` + `rooms.number/room_types.name`, usada tanto pelo hover card quanto pelo Drawer (uma única query, um único `queryKey: ["reservations","card",id]`).
- **Sem duplicar lógica**: as três visões continuam usando `calendarQuery(from, to)`; check-in/check-out/cancelar reaproveitam `checkinReservation` / `checkoutReservation` / `cancelReservation` e o mapeamento de erro de `mutation-errors.ts`; o resumo de pagamentos usa `paymentsByReservationQuery` de `PaymentsSection`.
- **Componentes novos** em `src/components/calendar/`: `TimelineGrid.tsx` (grade + linhas + barras), `ReservationHoverCard.tsx` e `ReservationDrawer.tsx`. `calendario.tsx` só orquestra estado (`selectedReservationId`) e passa os dados já carregados.
- **Cores**: tokens novos em `src/styles.css` (`--status-confirmada`, `--status-checkin`, `--status-pendente`, `--status-cancelada` e respectivos `-foreground`) com contraste adequado em tema claro e escuro; nada de cor fixa nos componentes.
- Fora do escopo: arrastar/redimensionar barras, criar reserva por arrasto, virtualização, zoom, filtros e busca.
