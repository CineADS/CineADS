-- Adiciona coluna para armazenar o ID da transação InfinitePay
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS payment_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_url            TEXT,
  ADD COLUMN IF NOT EXISTS pix_code               TEXT;
