-- ─────────────────────────────────────────────────────────────────────────────
-- Sync inicial: importa os últimos 60 dias de pedidos do Mercado Livre
--
-- Execute APÓS configurar o pg_cron (migration anterior).
-- Substitua SERVICE_ROLE_KEY pelo valor real.
-- Rode uma única vez no SQL Editor do Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT net.http_post(
  url     := 'https://rggzhpggjdcypoaxhggx.supabase.co/functions/v1/ml-sync-orders',
  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer SERVICE_ROLE_KEY'
  ),
  body    := jsonb_build_object(
    'tenantId', '9508a4a9-d0b1-492e-86ea-ccd31a647f87',
    'daysBack', 60
  )
) AS request_id;

-- Após ~30 segundos, verifique os pedidos importados:
-- SELECT COUNT(*), status FROM orders GROUP BY status;
-- SELECT order_number, marketplace, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20;
