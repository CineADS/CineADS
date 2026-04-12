# Arquitetura do CineADS

## Estrutura de Pastas

```
src/
├── alerts/          # Motor de alertas (Alert Engine)
│   ├── alert-engine.ts
│   └── alert-types.ts
├── assets/          # Logos e imagens estáticas
├── automation/      # Motor de automação (Rule Engine)
│   ├── rule-engine.ts
│   └── rule-types.ts
├── cache/           # Serviço de cache em memória
├── catalog-sync/    # Sincronização de catálogo com marketplaces
├── components/      # Componentes React reutilizáveis
│   ├── auth/        # Login, registro, proteção de rotas
│   ├── automation/  # Dialogs de criação de regras
│   ├── dashboard/   # Widgets do dashboard
│   ├── layout/      # AppShell, Sidebar, Topbar, NotificationsBell
│   ├── onboarding/  # Modal de boas-vindas
│   ├── price-rules/ # Componentes de precificação
│   ├── products/    # Formulários e tabelas de produtos
│   ├── reports/     # Gráficos e tabelas de relatórios
│   └── ui/          # shadcn/ui (não editar manualmente)
├── config/          # Constantes e configurações da aplicação
│   ├── app.ts       # APP_CONFIG (nome, tempos de cache, etc.)
│   ├── env.ts       # Validação de variáveis de ambiente (Zod)
│   └── mlConfig.ts  # OAuth config do Mercado Livre
├── constants/       # Constantes de domínio (marketplaces, etc.)
├── events/          # Event Bus (pub/sub interno)
│   ├── event-bus.ts
│   └── event-types.ts
├── hooks/           # Custom hooks React
├── integrations/    # Clientes de serviços externos
│   └── supabase/    # Client, tipos TypeScript gerados
├── inventory/       # Lógica de estoque
├── jobs/            # Agendadores e workers em background
├── lib/             # Utilitários transversais (auth, logger, theme)
├── listings/        # Gestão de anúncios
├── modules/         # Módulos de domínio (analytics, operations)
├── pages/           # Uma página por rota
├── repricing/       # Motor de reprecificação
├── services/        # Camada de serviços (acesso ao banco)
├── test/            # Helpers e setup de testes
└── types/           # Tipos TypeScript compartilhados (dto.ts)
```

## Multi-Tenancy

Cada usuário pertence a uma `organization` (tenant). Toda tabela de dados tem `organization_id` como FK. As políticas RLS do Supabase garantem que cada tenant só enxerga seus próprios dados.

## Fluxo de Eventos

```
Evento de domínio (ex: STOCK_LOW)
    └── Event Bus (pub/sub em memória)
            ├── Alert Engine → INSERT em notifications
            └── Rule Engine  → avalia automation_rules ativas
```

## Autenticação

- Supabase Auth (JWT)
- `AuthProvider` em `src/lib/auth.tsx` expõe `profile`, `tenant`, `permissions`
- Rotas protegidas via `ProtectedRoute` em `src/components/auth/`

## Realtime

Notificações em tempo real via `useNotificationsRealtime`:
- Escuta INSERT/UPDATE na tabela `notifications`
- Filtra por `organization_id`
- INSERT → toast + invalida queries
- UPDATE → invalida queries (silencioso)
