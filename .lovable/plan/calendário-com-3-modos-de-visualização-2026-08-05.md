# Calendário com 3 modos de visualização

Evoluir a tela de Calendário para ter Mensal (padrão), Timeline (visão atual) e Semana, com o modo salvo na URL.

## Barra superior

- Três botões/abas: **Mensal | Timeline | Semana**. O modo ativo fica em `?view=mensal|timeline|semana` (padrão `mensal`).
- Navegação de período à direita: **◀ Anterior / Hoje / Seguinte ▶**, com granularidade por modo:
  - Mensal: mês anterior / mês seguinte, título "Agosto de 2026".
  - Timeline e Semana: semana anterior / seguinte, título "04/08 – 10/08".
- Trocar de modo mantém o período em foco (a data de referência atual é convertida para o mês ou para a segunda-feira daquela semana).

## Modo Mensal (novo padrão)

- Grid do mês (segunda a domingo), incluindo dias de preenchimento do mês anterior/seguinte em tom apagado.
- Cada célula mostra o número do dia e, quando houver, dois contadores: entradas (check-ins previstos naquele dia) e saídas (check-outs previstos). Dias sem movimento ficam limpos.
- O dia de hoje é destacado.
- Clicar num dia abre um painel abaixo do grid (ou diálogo em telas pequenas) listando as reservas daquele dia separadas em "Chegadas" e "Partidas", com hóspede, quarto e link para a reserva.

## Modo Timeline (visão atual, renomeada)

- Mesma grade quartos × 7 dias que existe hoje, com as barras de reserva e a legenda de status. Sem mudança de comportamento.

## Modo Semana (novo)

- Lista vertical dos 7 dias da semana, um bloco por dia (dia de hoje destacado).
- Em cada dia, duas colunas/seções: **Chegadas** e **Partidas**, cada item com nome do hóspede, quarto e link para a reserva.
- Dias sem movimento mostram "Sem movimentação".
- Foco em operação diária — não mostra ocupação por quarto.

## Detalhes técnicos

- `validateSearch` passa a aceitar `view` (`mensal` | `timeline` | `semana`, com `fallback`) e `start` (data de referência ISO). Leitura via `Route.useSearch()`, escrita via `navigate({ search: prev => ... })`.
- Uma única função deriva o intervalo `[from, to)` a partir de `view` + `start`: mês inteiro (incluindo dias de preenchimento do grid) no mensal, semana de segunda a domingo nos outros dois.
- Os três modos usam a mesma `calendarQuery(from, to)` já existente (`getReservationsCalendar`); nenhuma nova query nem server function. `loaderDeps` passa a incluir `view` para o loader pré-carregar o intervalo certo. `listRooms` continua sendo carregado (usado pelo Timeline e para exibir o número do quarto nos outros modos).
- Derivação de chegadas/partidas por dia feita no cliente, a partir do mesmo array de reservas: chegada quando `check_in === dia`, partida quando `check_out === dia`.
- Os três modos são componentes separados no mesmo arquivo de rota (ou extraídos para `src/components/calendar/`) para manter o arquivo legível; helpers de data já existentes (`toISO`, `parseISO`, `mondayOf`, `addDays`) são reaproveitados.
- Nenhuma mudança de banco de dados.
