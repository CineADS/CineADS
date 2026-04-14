-- Função para abater estoque de forma atômica após venda na loja
-- Chamada pelo checkout da vitrine via supabase.rpc("decrement_stock")
CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_product_id UUID,
  p_tenant_id  UUID,
  p_qty        INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.inventory
  SET    quantity   = GREATEST(quantity - p_qty, 0),
         updated_at = now()
  WHERE  product_id = p_product_id
  AND    tenant_id  = p_tenant_id;
END;
$$;
