# Hotel Harmony Hub

Você vai me ajudar a construir um SaaS de gestão hoteleira (PMS) multi-tenant,

ou seja, o sistema vai atender vários hotéis diferentes, cada um com seus

próprios dados isolados uns dos outros.

REGRAS DE ARQUITETURA:

- Toda tabela que armazena dado operacional (quartos, hóspedes, reservas,

  pagamentos, usuários) deve ter uma coluna `hotel_id` desde o início, mesmo

  que hoje só exista um hotel de teste. Nunca assuma "hotel único".

- Crie uma Row Level Security (RLS) policy em CADA tabela operacional

  garantindo que um usuário só acesse linhas do seu próprio hotel_id.

  Não deixe nenhuma tabela sem RLS habilitado.

- Estrutura modular: cada domínio (quartos, reservas, hóspedes, pagamentos,

  usuários) com seus próprios componentes, tipos e funções de acesso ao

  banco, sem duplicar lógica entre eles.

- Toda validação de dado repetida no frontend E confirmada por constraint

  ou policy no banco (não confiar só na validação do formulário React).

- Não gere código de funcionalidades que eu não pedi ainda. Se algo futuro

  precisar de um campo extra numa tabela agora, me avise e eu decido.

TAREFA DESTE PROMPT:

Modele o schema do banco de dados no Supabase com as seguintes entidades

mínimas: Hotel (tenant), Usuario (vinculado a auth.users, com campo role:

admin/recepcionista), Quarto, TipoDeQuarto, Hospede, Reserva, Pagamento.

Use o Plan Mode para me mostrar o plano de tabelas, relacionamentos e

policies de RLS ANTES de gerar qualquer tela. Eu preciso revisar e aprovar

o schema e as policies antes de você avançar para a UI.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://friendly-frontdesk-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/be431421-f6ad-4d7b-a2c4-0f16dbbce115).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
