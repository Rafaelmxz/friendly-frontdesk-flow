# Arrastar para navegar na Timeline

Adicionar navegação por arrasto (mouse) e swipe (toque) no modo Timeline do Calendário, mantendo os botões Anterior / Hoje / Seguinte funcionando normalmente.

## Comportamento

- Clicar e segurar em qualquer área vazia do grid (fundo, células de dia, cabeçalho de datas) e arrastar para os lados desloca a janela de datas.
- A cada largura equivalente a uma coluna de dia arrastada, a visualização avança ou retrocede 1 dia; o resultado final é gravado na URL (`?start=`) ao soltar, para continuar compartilhável.
- Durante o arrasto o deslocamento é mostrado imediatamente (feedback visual), sem esperar a navegação.
- Swipe horizontal em telas de toque faz o mesmo. Swipe predominantemente vertical continua rolando a página normalmente.
- Cursor: `grab` no fundo do grid, `grabbing` enquanto arrasta.

## Não conflita com as reservas

- As barras de reserva mantêm clique (abre o Drawer) e hover card intactos.
- O arrasto só inicia no fundo do grid; se o gesto começar sobre uma barra de reserva, ele é ignorado.
- Se o ponteiro se mover além de um pequeno limiar durante um clique, o clique é cancelado para não abrir o Drawer sem querer.

## Detalhes técnicos

- Novo hook `src/hooks/useDragPan.ts`: escuta Pointer Events (`pointerdown`/`move`/`up`/`cancel`) com `setPointerCapture`, aplica limiar de ~4px, converte o delta em dias usando a largura medida de uma coluna, e expõe `{ dragging, offsetDays, handlers }`.
- `src/components/calendar/TimelineGrid.tsx`: aplica os handlers e as classes de cursor no container do grid; usa `touch-action: pan-y` para permitir scroll vertical; ignora o gesto quando `event.target` está dentro de um botão de reserva (`closest("[data-reservation]")`); adiciona `data-reservation` nas barras.
- `src/routes/_authenticated/calendario.tsx`: passa um callback `onPanDays(n)` que chama `gotoDate(addDays(start, n))`, reaproveitando a mesma navegação dos botões. O intervalo carregado continua vindo de `rangeFor`, então nenhuma query nova é criada.
- Fora do escopo: mover reserva entre quartos/datas, redimensionar barras, zoom de período.
