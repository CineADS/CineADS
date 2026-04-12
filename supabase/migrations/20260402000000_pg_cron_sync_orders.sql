-- ─────────────────────────────────────────────────────────────────────────────
-- pg_cron: Sincronização automática de pedidos e processamento de jobs
--
-- A SERVICE_ROLE_KEY é lida em runtime via current_setting() — nunca literal.
-- O Supabase injeta o valor como GUC 'app.settings.service_role_key'.
-- Para configurar: Dashboard → Settings → API → copie a service_role key, depois:
--   ALTER DATABASE postgres SET app.settings.service_role_key = '<valor>';
-- ─────────────────────────────────────────────────────────────────────────────

-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── Função auxiliar: dispara o sync para todos os tenants com ML ativo ──────
CREATE OR REPLACE FUNCTION public.trigger_ml_sync_all_tenants()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id  uuid;
  v_key        text := current_setting('app.settings.service_role_key', true);
  v_url        text := current_setting('app.settings.supabase_url', true)
                       || '/functions/v1/ml-sync-orders';
BEGIN
  IF v_key IS NULL OR v_key = '' THEN
    RAISE WARNING '[cron] app.settings.service_role_key não configurado — sync abortado';
    RETURN;
  END IF;

  FOR v_tenant_id IN
    SELECT DISTINCT tenant_id
    FROM   marketplace_integrations
    WHERE  marketplace = 'Mercado Livre'
    AND    status      = 'connected'
  LOOP
    PERFORM net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body    := jsonb_build_object(
        'tenantId', v_tenant_id::text,
        'daysBack', 1
      )
    );
  END LOOP;
END;
$$;

-- ─── 1. Polling a cada 30 min: busca pedidos novos do ML ────────────────────
-- Itera todos os tenants com integração ML ativa — sem UUID hardcoded.
SELECT cron.schedule(
  'ml-sync-orders-polling',
  '*/30 * * * *',
  $$ SELECT public.trigger_ml_sync_all_tenants(); $$
);

-- ─── 2. A cada 2 min: processa a fila de jobs do webhook ───────────────────
SELECT cron.schedule(
  'ml-process-jobs',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url', true)
               || '/functions/v1/ml-process-jobs',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ─── Verificar jobs criados ──────────────────────────────────────────────────
-- SELECT * FROM cron.job;
