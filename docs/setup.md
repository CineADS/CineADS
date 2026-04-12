# Setup — Rodando o CineADS Localmente

## Pré-requisitos

- Node.js 18+ ou Bun
- Conta no [Supabase](https://supabase.com)
- Supabase CLI: `npm install -g supabase`

## Passo a passo

### 1. Instalar dependências

```sh
npm install
```

### 2. Configurar variáveis de ambiente

```sh
cp .env.example .env
```

Preencha o `.env` com os dados do seu projeto Supabase:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

### 3. Aplicar migrações no banco

```sh
npx supabase link --project-ref <project-ref>
npx supabase db push --include-all
```

### 4. Configurar Realtime

No SQL Editor do Supabase, execute:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### 5. Configurar Vault (secrets)

No SQL Editor do Supabase:

```sql
-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Salvar a service_role_key no Vault
SELECT vault.create_secret(
  '<sua-service-role-key>',
  'service_role_key',
  'Chave usada pelo pg_cron para chamar Edge Functions'
);
```

### 6. Rodar localmente

```sh
npm run dev
# Acesse: http://localhost:8080
```
