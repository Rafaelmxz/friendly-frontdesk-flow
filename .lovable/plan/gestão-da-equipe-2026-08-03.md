## Gestão da equipe

### 1. Operações seguras no banco

- Criar uma operação transacional para **desvincular um membro**: remover o papel e o perfil ligados ao hotel, preservando a conta de autenticação.
- Bloquear a remoção do próprio administrador e impedir que o hotel fique sem administrador.
- Criar uma operação transacional para **reenviar convite**: validar que o convite pertence ao hotel atual e está pendente, apagar o registro antigo e criar outro com novo token e mais 7 dias de validade.
- Manter todas as verificações por `hotel_id` e papel de administrador no banco; recepcionistas não poderão executar as ações mesmo manipulando a interface.

### 2. Funções da aplicação

- Adicionar funções autenticadas para:
  - listar membros do hotel, combinando `profiles` e `user_roles` para retornar nome, e-mail e papel;
  - listar somente convites pendentes (`accepted_at IS NULL`), com e-mail e expiração;
  - remover um membro;
  - cancelar um convite pendente;
  - reenviar um convite e retornar o novo link.
- Separar os novos wrappers em um módulo próprio e mantê-los finos, com validação Zod e mensagens de erro em português.
- A listagem de membros ficará disponível para toda a equipe; convites e ações administrativas continuarão restritos a administradores.

### 3. Tela “Equipe”

- Manter o formulário atual de convite para administradores.
- Adicionar a seção **Membros atuais** com nome, e-mail e papel, adaptada para tabela no desktop e leitura confortável no celular.
- Exibir “Remover” somente para administradores e nunca no próprio usuário; pedir confirmação antes de desvincular.
- Adicionar a seção **Convites pendentes** com e-mail e data/hora de expiração.
- Exibir “Cancelar” e “Reenviar” somente para administradores, ambos com confirmação e estado de carregamento.
- Ao reenviar, substituir imediatamente a linha antiga e mostrar o novo link para cópia, sem envio automático de e-mail.
- Usar TanStack Query para carregamento e invalidação das listas após criar, cancelar, reenviar ou remover, com estados vazios e tratamento de erro.
- Adicionar os metadados próprios da rota “Equipe”.

### 4. Validação

- Confirmar que recepcionista consegue visualizar membros, mas não convites nem ações administrativas.
- Confirmar que administrador lista, cancela e renova convites e que o token anterior deixa de funcionar.
- Confirmar que remover um recepcionista preserva sua conta, elimina o acesso ao hotel e não afeta reservas/pagamentos históricos associados à conta.
- Confirmar bloqueios de auto-remoção, último administrador e tentativas com IDs de outro hotel.
- Verificar a tela em desktop e no viewport móvel atual.

### Detalhes técnicos

- A remoção apagará `user_roles` e `profiles`, mas não o usuário de autenticação. Manter apenas o perfil seria inseguro porque várias políticas derivam o tenant por `profiles.hotel_id`.
- As mutações compostas serão executadas em transação no banco para evitar estados parciais.
- O token continuará sendo gerado no servidor e nunca será aceito do cliente; o cliente envia apenas o ID do convite a renovar.