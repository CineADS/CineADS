# Banco de Dados — Supabase / PostgreSQL

## Migrações

As migrações ficam em `supabase/migrations/`. Para aplicar no banco:

```sh
npx supabase link --project-ref <project-ref>
npx supabase db push --include-all
```

## Principais Tabelas

| Tabela | Descrição |
|---|---|
| `organizations` | Tenants (empresas cadastradas) |
| `profiles` | Usuários, com FK para `organizations` |
| `user_roles` | Permissões por tenant (`admin`, `operator`, `viewer`) |
| `products` | Catálogo de produtos |
| `orders` | Pedidos sincronizados dos marketplaces |
| `order_items` | Itens de cada pedido |
| `inventory` | Saldo de estoque por produto |
| `inventory_movements` | Histórico de movimentações de estoque |
| `marketplace_integrations` | Credenciais OAuth por marketplace/tenant |
| `automation_rules` | Regras de automação configuradas |
| `automation_logs` | Histórico de execuções das regras |
| `notifications` | Notificações e alertas para o seller |
| `integration_logs` | Logs de sincronização com marketplaces |
| `invoices` | Notas fiscais vinculadas a pedidos |

## Multi-Tenancy

Toda tabela de dados tem `organization_id` (FK para `organizations`). As políticas RLS garantem isolamento entre tenants automaticamente via JWT.

## Realtime

Para ativar notificações em tempo real, execute uma vez:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

## Vault (Secrets)

Segredos como a `service_role_key` ficam no Supabase Vault, nunca como texto literal:

```sql
-- Salvar
SELECT vault.create_secret('<valor>', 'service_role_key', 'Descrição');

-- Atualizar
SELECT vault.update_secret('<uuid-do-secret>', '<novo-valor>');

-- Ler (somente dentro de funções com permissão)
SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key';
```

## pg_cron

Jobs agendados ficam em `supabase/migrations/20260402000000_pg_cron_sync_orders.sql`. O job principal roda a cada hora e dispara a sincronização de pedidos de todos os tenants conectados ao Mercado Livre.
