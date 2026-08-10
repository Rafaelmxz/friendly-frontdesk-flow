# Corrigir o arrasto da Timeline (travamento no desktop e swipe no celular)

## Problemas

1. Desktop: durante o arrasto o grid re-renderiza a cada pixel movido, porque o deslocamento é guardado em estado React. Com muitos quartos/dias isso trava o gesto e dá a sensação de recarregar a cada dia cruzado.
2. Celular: o gesto horizontal não é capturado. Os handlers atuais são Pointer Events do React (passivos) e o `touch-action: pan-y` deixa o navegador tratar o toque como rolagem antes de o gesto ser reconhecido como horizontal.

## Correções

### Arrasto fluido, navegação só ao soltar
- O deslocamento em px passa a viver num `ref` e é aplicado direto no DOM (`element.style.transform`), sem `setState` a cada movimento. O único estado React é `dragging` (muda uma vez no início e uma vez no fim), só para trocar o cursor.
- A navegação real (`gotoDate`, mudar `?start=`, recarregar dados) acontece **uma única vez** no `pointerup`/fim do gesto, com a soma total de dias arrastados (`-round(dx / larguraDaColuna)`).
- O `transform` é aplicado apenas na área dos dias, não na lateral de quartos, para a coluna de quartos ficar fixa durante o arrasto.
- Ao soltar, o transform é zerado no mesmo frame em que a nova data é aplicada, evitando "pulo" visual.

### Swipe no celular
- Handlers de toque registrados nativamente com `{ passive: false }` (via `useEffect` no container), em vez dos handlers React passivos.
- Primeiros ~6px de movimento decidem a direção: se for predominantemente horizontal, o gesto vira pan da Timeline e chama `preventDefault()` (bloqueando a rolagem); se for vertical, o gesto é abandonado e a página rola normalmente.
- `touch-action` do container passa a `pan-y` combinado com o `preventDefault` acima — vertical continua rolando, horizontal fica com a Timeline.
- Mouse e caneta continuam pelos Pointer Events com `setPointerCapture`.

### Reservas continuam clicáveis
- Gestos iniciados sobre uma barra de reserva (`[data-no-pan]`) seguem ignorados; um clique só abre o Drawer se o ponteiro não passou do limiar.

## Verificação
- Teste com Playwright em viewport de toque (`has_touch=True`, iPhone-like), emitindo um swipe horizontal real via `page.touchscreen`/CDP e conferindo que o `?start=` mudou uma única vez e que um swipe vertical rola a página sem mudar a data.
- Teste no desktop com arrasto de mouse: conferir uma única mudança de `?start=` ao soltar e nenhuma requisição de dados durante o arrasto.

## Arquivos
- `src/hooks/useDragPan.ts` — reescrito: deslocamento em ref, listeners nativos de toque não passivos, decisão de direção, commit único.
- `src/components/calendar/TimelineGrid.tsx` — aplica o transform apenas na faixa de dias e usa o novo formato do hook.
- `src/routes/_authenticated/calendario.tsx` — sem mudança de lógica (segue chamando `gotoDate(addDays(start, n))`).
