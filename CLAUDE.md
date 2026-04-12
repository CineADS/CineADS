# CineADS — Guia para Desenvolvedores

## Stack

React 18 + TypeScript + Vite | Supabase (PostgreSQL + Auth + Realtime) | shadcn/ui + Tailwind CSS | TanStack Query v5 | React Hook Form + Zod

## Comandos

```sh
npm run dev        # servidor local na porta 8080
npm run build      # build de produção → pasta dist/
npm test           # rodar testes
npx tsc --noEmit   # checar TypeScript sem gerar arquivos
```

## Estrutura

```
src/
├── pages/          # Uma página por rota. Sem lógica de negócio aqui.
├── components/     # Componentes React. Organizados por feature.
│   ├── ui/         # shadcn/ui — NÃO editar manualmente
│   └── layout/     # AppShell, Sidebar, Topbar, NotificationsBell
├── services/       # Acesso ao banco (Supabase). Funções puras, sem estado React.
├── hooks/          # Custom hooks React (useState, useEffect, useQuery)
├── events/         # Event Bus pub/sub interno entre módulos
├── alerts/         # Alert Engine: converte eventos em notificações
├── automation/     # Rule Engine: avalia regras de automação
├── repricing/      # Motor de reprecificação de produtos
├── jobs/           # Agendadores e workers em background
├── lib/            # Utilitários: logger, auth, theme, utils
├── config/         # Constantes da aplicação e variáveis de ambiente
├── types/          # Tipos TypeScript compartilhados (DTOs)
└── integrations/   # Clientes externos: Supabase, marketplaces
```

## Regras de Nomenclatura

| Tipo de arquivo | Padrão | Exemplo |
|---|---|---|
| Componente React | PascalCase | `NotificationsBell.tsx` |
| Página | PascalCase + `Page` | `OrdersPage.tsx` |
| Serviço | kebab-case + `.service` | `orders.service.ts` |
| Hook | camelCase com `use` | `usePermissions.ts` |
| Tipos/Eventos | kebab-case + tipo | `event-types.ts` |
| Engine | kebab-case + `-engine` | `rule-engine.ts` |

## Multi-Tenancy

**Toda query ao banco precisa de `.eq("tenant_id", tenantId)`** — o isolamento é por software, não só por RLS. Nunca omita o filtro de tenant.

O `tenant_id` vem de `profile.tenant_id` via `useAuth()`:

```ts
const { profile } = useAuth();
// profile.tenant_id é o ID do tenant atual
```

## Padrão de Queries (TanStack Query)

```ts
const { data, isLoading } = useQuery({
  queryKey: ["nome-da-query", tenantId, ...filtros],
  queryFn: async () => {
    if (!tenantId) return [];
    const { data, error } = await supabase
      .from("tabela")
      .select("*")
      .eq("tenant_id", tenantId);
    if (error) throw error;
    return data;
  },
  enabled: !!tenantId,
});
```

## Padrão de Formulários

Use sempre React Hook Form + Zod:

```ts
const schema = z.object({ nome: z.string().min(1) });
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
});
```

## Notificações

- Toast de UI: `import { toast } from "sonner"`
- Alerta persistente (banco): `alertEngine.emit(tenantId, "LOW_STOCK", mensagem)`
- Realtime ativo automaticamente via `useNotificationsRealtime` no `NotificationsBell`

## Banco de Dados

- Migrações em `supabase/migrations/` — nunca edite o banco manualmente
- Para criar migração: `npx supabase migration new nome-da-migration`
- Para aplicar: `npx supabase db push`
- Documentação completa: `docs/banco.md`

## Deploy

Veja `docs/deploy.md`. Build vai para `public_html/` no HostGator. Precisa do `.htaccess` para o React Router funcionar.

## Variáveis de Ambiente

Veja `.env.example`. Nunca commite o `.env` com valores reais.
