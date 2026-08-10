# Corrigir navegação diária e travamento no arrasto da Timeline

## Diagnóstico confirmado

- No DOM atual, cada coluna de dia mede aproximadamente **136,86 px**; o cálculo `(largura total - 160 px da lateral) / 7` também resulta nessa largura diária.
- O salto semanal vem de `rangeFor()`: nos modos Timeline e Semana, a data recebida é sempre normalizada por `mondayOf(ref)`. Assim, deslocamentos de 1 a 6 dias continuam mostrando a mesma semana e, ao cruzar a segunda-feira, toda a janela muda 7 dias de uma vez e dispara uma nova consulta.
- O hook atual chama `onPanDays` apenas em `end()`, mas a validação final precisa provar no navegador que URL e rede permanecem estáveis em todos os movimentos anteriores ao `pointerup`.

## Correção

1. **Timeline com início diário**
   - Separar o cálculo de intervalo por modo: a Timeline usará exatamente a data de `?start=` como primeiro dia, sem arredondar para segunda-feira.
   - Manter a visualização Semana alinhada à segunda-feira e o modo Mensal inalterado.
   - Os botões Anterior/Seguinte da Timeline continuarão navegando por 7 dias; o arrasto poderá avançar ou retroceder qualquer quantidade inteira de dias.

2. **Medir uma célula real de dia**
   - Adicionar uma referência explícita a uma célula diária do cabeçalho e usar seu `getBoundingClientRect().width` no cálculo do gesto.
   - Remover a estimativa baseada na largura total do grid, evitando erro por lateral, scrollbar, bordas ou arredondamento do CSS Grid.

3. **Commit único no fim do gesto**
   - Manter o delta em pixels fora do estado React e aplicar somente `transform` durante `pointermove`/`touchmove`.
   - Garantir que o callback de navegação exista exclusivamente no caminho de finalização (`pointerup`/`touchend`), nunca ao cruzar uma coluna.
   - Aplicar o feedback visual apenas à faixa de dias, mantendo a lateral de quartos fixa.

## Verificação no navegador

- Instrumentar o navegador para registrar mudanças de URL, chamadas de histórico e requisições do calendário durante um arrasto contínuo que atravesse várias colunas.
- Antes do `pointerup`: confirmar `transform` progressivo, URL imutável e **zero** novas requisições de dados.
- Depois do `pointerup`: confirmar uma única mudança de `?start=`, pelo número exato de colunas diárias percorridas, e no máximo uma nova consulta do novo intervalo.
- Repetir com arrastos de aproximadamente 1, 2 e 7 larguras de coluna, nos dois sentidos, além de um swipe horizontal em viewport de toque.

## Arquivos previstos

- `src/routes/_authenticated/calendario.tsx`
- `src/components/calendar/TimelineGrid.tsx`
- `src/hooks/useDragPan.ts`