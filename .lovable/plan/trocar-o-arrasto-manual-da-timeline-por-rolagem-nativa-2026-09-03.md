# Trocar o arrasto manual da Timeline por rolagem nativa

Abandonar de vez o cálculo de pixels/dias com Pointer Events e deixar a rolagem horizontal por conta do navegador.

## Comportamento

- A Timeline passa a carregar **21 dias** por vez, em vez de 7, dentro de uma área com rolagem horizontal própria.
- A rolagem é 100% nativa: trackpad, roda do mouse com shift, barra de rolagem e swipe no celular funcionam sem nenhum código de gesto.
- Cada coluna de dia tem ponto de encaixe (`scroll-snap`), então a rolagem sempre para alinhada ao início de um dia, nunca no meio de uma coluna.
- A coluna de quartos fica fixa (sticky) à esquerda enquanto os dias rolam por baixo.
- Nada é recarregado durante a rolagem. Quando ela para, o primeiro dia visível é gravado em `?start=` para a visualização continuar compartilhável.
- Anterior / Hoje / Seguinte deixam de trocar o período carregado: passam a rolar suavemente até a data certa dentro dos 21 dias já em tela.

## Quando os dados são buscados de novo

- O período de 21 dias é ancorado em torno da data da URL: 7 dias antes e 13 depois, para haver folga dos dois lados.
- A busca só acontece quando a rolagem (ou um botão) chega perto da borda do período carregado e sobra menos de uma semana de folga. Nesse caso o período é reancorado e a posição de rolagem é reposicionada no mesmo dia, sem salto visual.
- Enquanto o usuário navega dentro da folga, só a URL muda — nenhuma consulta nova.

## Detalhes técnicos

- Remover `src/hooks/useDragPan.ts` por completo, além do import, das props `onPanDays` e das classes de cursor `grab/grabbing` em `TimelineGrid.tsx`.
- Remover a variável `--timeline-pan-x` e os `transform` manuais aplicados no cabeçalho e nas linhas.
- `TimelineGrid.tsx` passa a ter um único container rolável com `overflow-x: auto` e `scroll-snap-type: x mandatory`; as colunas de dia usam `scroll-snap-align: start` e largura fixa por dia, para 21 colunas caberem com rolagem.
- Cabeçalho de datas e linhas de quartos compartilham o mesmo container rolável, garantindo alinhamento; a célula de quarto usa `position: sticky; left: 0` com fundo opaco e `z-index` acima das barras.
- Detecção de fim de rolagem: usar `scrollend` quando o navegador suportar, com fallback de debounce de ~300ms no `onScroll`. O dia é calculado por `scrollLeft / larguraDaColuna`, e a URL só é atualizada via `replace` quando o dia realmente muda.
- Navegação por botões: `scrollTo({ left, behavior: 'smooth' })` na área rolável; "Hoje" rola até a coluna de hoje quando ela está no período, senão reancora o período primeiro.
- `calendario.tsx`: `rangeFor` passa a devolver 21 dias no modo Timeline (Mensal e Semana ficam como estão), e o callback de arrasto é removido.
- As barras de reserva mantêm clique, hover card e Drawer inalterados; sem gesto customizado, não há mais risco de clique perdido.

## Verificação

- Conferir no navegador que rolar a Timeline não dispara nenhuma requisição de dados e que a URL muda uma única vez, depois que a rolagem para.
- Conferir o encaixe por coluna, a lateral de quartos fixa e os três botões rolando até a posição correta.
- Conferir em viewport de toque que o swipe horizontal rola a Timeline e o vertical continua rolando a página.
