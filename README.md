# CineADS — Hub de Gestão para Marketplaces

Plataforma SaaS multi-tenant para gestão de produtos, pedidos, estoque e integrações com marketplaces (Mercado Livre, Shopee, Amazon e mais).

## Stack

- **Frontend:** React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- **Formulários:** React Hook Form + Zod
- **Estado/Cache:** TanStack Query v5
- **Roteamento:** React Router v6

## Documentação

| Arquivo | Descrição |
|---|---|
| [docs/setup.md](docs/setup.md) | Como rodar o projeto localmente |
| [docs/arquitetura.md](docs/arquitetura.md) | Estrutura de pastas e decisões técnicas |
| [docs/banco.md](docs/banco.md) | Schema do banco, migrações e Supabase |
| [docs/deploy.md](docs/deploy.md) | Como fazer deploy (HostGator + Supabase) |

## Início rápido

```sh
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com os dados do seu projeto Supabase

# 3. Aplicar migrações no banco
npx supabase link --project-ref <project-ref>
npx supabase db push --include-all

# 4. Rodar localmente
npm run dev
```

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 8080) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm test` | Rodar testes |
