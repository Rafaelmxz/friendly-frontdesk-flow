# Timeline: travadas na rolagem + hover card escondido

## O que a medição mostrou (feita antes deste plano)

Perfilei a Timeline no navegador rolando de 30 em 30px por 20 passos, com observador de long tasks e captura de rede:

- **Long tasks durante a rolagem: nenhuma.** Nenhuma requisição de dados durante ou logo após a rolagem.
- O grid tem ~260 elementos e 5 barras de reserva no ambiente atual — ou seja, **não é custo de repintura nem trabalho pesado no debounce**, pelo menos com este volume de dados.
- O que sobra, e bate com o sintoma: a combinação de `scroll-snap-type: x mandatory` (o navegador força o encaixe em cada coluna, brigando com o gesto) com o **re-âncora durante o uso** — ao parar de rolar perto das bordas, o código troca a janela de 21 dias (`setAnchorISO`) e reposiciona o `scrollLeft` por código, o que produz um solavanco visível.
- Efeito colateral já observado: nesse mesmo teste a URL **não** foi atualizada ao parar de rolar, sinal de que a lógica de settle/re-âncora está se atropelando.

Ressalva honesta: com poucos quartos/reservas não dá para descartar custo de repintura em hotéis grandes. Por isso o plano inclui uma medida barata de contenção de pintura, mas o foco da correção é o snap + re-âncora.

## Correções

### 1. Rolagem sem travar

- Trocar `scroll-snap-type: x mandatory` por `x proximity` — o encaixe deixa de forçar a posição a cada pixel e o gesto flui.
- Remover o re-âncora automático ao parar de rolar. A janela de 21 dias só muda quando o usuário usa Anterior/Hoje/Seguinte ou quando chega mesmo ao fim do range; nunca no meio de uma rolagem livre.
- Ao parar de rolar, o settle faz **uma coisa só**: gravar o primeiro dia visível em `?start=` (com `replace`), sem reposicionar o scroll e sem trocar a janela.
- Marcar o corpo do grid com `content-visibility: auto` / `contain: paint` nas linhas de quarto, para que hotéis com muitos quartos não paguem repintura de linhas fora da tela.

### 2. Hover card por cima das barras

Confirmado no código: o `HoverCardContent` do projeto **não** usa `HoverCardPrimitive.Portal` — ele renderiza dentro do container com `overflow-x: auto`, que o recorta e o coloca no mesmo contexto de empilhamento das barras.

- Envolver o conteúdo em `HoverCardPrimitive.Portal` no componente de UI (comportamento padrão do Radix, hoje ausente), mantendo a ancoragem visual na barra.
- Subir o `z-index` do conteúdo acima das camadas do grid (a lateral sticky usa `z-20` e as barras `z-10`).

## Verificação

- Rolar a Timeline no navegador e confirmar: sem solavanco ao cruzar dias, zero requisições durante a rolagem, e `?start=` atualizado uma única vez ao parar.
- Abrir o hover card sobre uma barra que tenha outra barra à direita e confirmar, por captura de tela, que ele aparece inteiro e por cima.

## Arquivos afetados

- `src/components/calendar/TimelineGrid.tsx` (snap, contenção de pintura, settle)
- `src/routes/_authenticated/calendario.tsx` (settle sem re-âncora)
- `src/components/ui/hover-card.tsx` (Portal + z-index)
