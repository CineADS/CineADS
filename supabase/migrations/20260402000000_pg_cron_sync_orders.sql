-- ─────────────────────────────────────────────────────────────────────────────
-- pg_cron: Sincronização automática de pedidos e processamento de jobs
--
-- ATENÇÃO: Antes de rodar esta migration, substitua SERVICE_ROLE_KEY pelo
-- valor real em: Supabase Dashboard → Settings → API → service_role (secret)
-- ─────────────────────────────────────────────────────────────────────────────

-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── 1. Polling a cada 30 min: busca pedidos novos do ML ────────────────────
-- Garante que mesmo sem webhook, os pedidos chegam a cada 30 minutos.
SELECT cron.schedule(
  'ml-sync-orders-polling',
  '*/30 * * * *',  -- a cada 30 minutos
  $$
  SELECT net.http_post(
    url     := 'https://rggzhpggjdcypoaxhggx.supabase.co/functions/v1/ml-sync-orders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer SERVICE_ROLE_KEY'
    ),
    body    := jsonb_build_object(
      'tenantId', '9508a4a9-d0b1-492e-86ea-ccd31a647f87',
      'daysBack', 1
    )
  );
  $$
);

-- ─── 2. A cada 2 min: processa a fila de jobs do webhook ───────────────────
-- Cada job representa um evento do ML webhook (novo pedido, atualização, etc.)
SELECT cron.schedule(
  'ml-process-jobs',
  '*/2 * * * *',  -- a cada 2 minutos
  $$
  SELECT net.http_post(
    url     := 'https://rggzhpggjdcypoaxhggx.supabase.co/functions/v1/ml-process-jobs',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ─── Verificar jobs criados ──────────────────────────────────────────────────
-- SELECT * FROM cron.job;
