# Bloquear acesso de usuário desvinculado do hotel

## Problema

Quando um usuário é desvinculado (perfil e papel removidos), a sessão de login continua válida. Ele consegue entrar e abrir telas autenticadas, que aparecem vazias em vez de negar o acesso.

## Solução

Transformar a verificação de vínculo em um portão único do layout autenticado, aplicado antes de qualquer tela protegida renderizar:

1. Ao entrar em qualquer rota autenticada, além de checar a sessão, o app carrega o perfil do usuário.
2. Se não existir perfil/vínculo com hotel, o app faz logout automático, limpa os dados em cache e envia o usuário para a tela de login.
3. Na tela de login aparece a mensagem: "Você não tem mais acesso a este hotel. Fale com um administrador."

Como o portão fica no layout que envolve todas as rotas autenticadas (Painel, Calendário, Quartos, Tipos, Hóspedes, Reservas, Equipe), o bloqueio vale para todas elas — inclusive ao acessar um link direto.

## Detalhes técnicos

- `src/lib/user.functions.ts`: `getCurrentUserProfile` passa a distinguir "sem vínculo" de erro real. Quando `profiles` não retorna linha (ou não há papel/hotel correspondente), retorna `{ unlinked: true }` em vez de lançar erro genérico; o caminho normal continua retornando `fullName`, `hotelName`, `role`.
- `src/routes/_authenticated/route.tsx`: no `beforeLoad` (rota já é `ssr: false`), depois de validar `supabase.auth.getUser()`, chamar `getCurrentUserProfile`. Se vier `unlinked` (ou a chamada falhar por falta de vínculo), executar `supabase.auth.signOut()` e `throw redirect({ to: "/auth", search: { reason: "unlinked" } })`. Falhas de rede/erros inesperados não deslogam — apenas o caso de vínculo ausente.
- `src/hooks/useCurrentRole.ts` e `src/routes/_authenticated/app.tsx`: ajustar os tipos para o novo retorno (o portão garante que, ao renderizar, o perfil sempre existe — usar narrowing/`throw` defensivo).
- `src/routes/auth.tsx`: adicionar `reason: z.enum(["unlinked"]).optional()` ao `validateSearch` e, quando presente, exibir a mensagem "Você não tem mais acesso a este hotel. Fale com um administrador." (toast + aviso no card de login).
- Sem mudanças de banco de dados: as políticas de RLS já impedem leitura de dados de outro hotel; esta correção fecha a lacuna de navegação na interface.
