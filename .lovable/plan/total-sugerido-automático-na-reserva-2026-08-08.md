# Total sugerido automático na reserva

Calcular o valor total sugerido a partir do preço do tipo de quarto e do número de noites, sem nunca apagar um valor ajustado à mão.

## Comportamento

- Ao escolher quarto + check-in + check-out, o total é calculado como `preço base do tipo × noites` (noites = diferença de dias entre check-out e check-in).
- Se o campo Total ainda estiver vazio ou contiver apenas um valor previamente sugerido pelo sistema, ele é preenchido automaticamente.
- Se o usuário digitou/alterou o valor manualmente (ex.: desconto), nada é sobrescrito. Em vez disso aparece, abaixo do campo, uma linha discreta: "Sugerido: R$ X (N noites × R$ Y)" com um botão "Recalcular" que aplica o valor sugerido só quando clicado.
- Na edição de uma reserva existente, o valor salvo é sempre tratado como manual — nunca sobrescrito automaticamente; só via "Recalcular".
- Sem quarto, sem datas válidas ou com check-out ≤ check-in, nenhuma sugestão é mostrada.

## Detalhes técnicos

- `src/lib/rooms.functions.ts`: incluir `base_price` no select de `listRooms` (`room_types(name, base_price)`) e no objeto retornado.
- `src/routes/_authenticated/reservas.novo.tsx` e `reservas.$id.editar.tsx`: repassar `base_price` na prop `rooms` do formulário.
- `src/components/forms/ReservationForm.tsx`:
  - prop `rooms` ganha `base_price?: number`;
  - estado `totalTouched` (true no modo edit e quando o usuário digita no campo);
  - `suggestedTotal` derivado de quarto + datas;
  - `useEffect` preenche o campo apenas quando `!totalTouched`;
  - quando `totalTouched` e a sugestão difere do valor atual, renderizar o texto de sugestão + botão "Recalcular" (aplica e mantém como manual).
- Sem alteração de banco de dados.
