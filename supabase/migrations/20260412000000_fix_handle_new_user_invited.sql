-- ─────────────────────────────────────────────────────────────────────────────
-- BUG-004: handle_new_user() criava tenant duplicado para usuários convidados
--
-- Problema: o trigger rodava em todo INSERT em auth.users, inclusive convites.
-- A Edge Function invite-user passa { tenant_id, role } em raw_user_meta_data.
-- O trigger ignorava esses dados e sempre criava um novo tenant (errado).
--
-- Solução: se raw_user_meta_data contém 'tenant_id', é um convite — linkamos
-- ao tenant existente e pulamos a criação de tenant e user_role (a Edge
-- Function já faz o upsert/insert correto em seguida).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id    UUID;
  _company_name TEXT;
  _invited_tid  TEXT;
BEGIN
  -- Detecta usuário convidado: invite-user function coloca tenant_id no metadata
  _invited_tid := NEW.raw_user_meta_data->>'tenant_id';

  IF _invited_tid IS NOT NULL THEN
    -- ── Caminho do convite ───────────────────────────────────────────────────
    -- Não cria tenant novo. Cria profile com status 'invited' apontando para
    -- o tenant correto. ON CONFLICT DO NOTHING porque invite-user faz upsert
    -- logo depois com os dados completos.
    INSERT INTO public.profiles (id, tenant_id, email, full_name, status)
    VALUES (
      NEW.id,
      _invited_tid::UUID,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      'invited'
    )
    ON CONFLICT (id) DO NOTHING;

    -- user_roles é criado pela Edge Function invite-user — não duplicar aqui.
    RETURN NEW;
  END IF;

  -- ── Caminho do signup normal ─────────────────────────────────────────────
  _company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa');

  INSERT INTO public.tenants (name, cnpj)
  VALUES (_company_name, NEW.raw_user_meta_data->>'cnpj')
  RETURNING id INTO _tenant_id;

  INSERT INTO public.profiles (id, tenant_id, email, full_name)
  VALUES (
    NEW.id,
    _tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, _tenant_id, 'admin');

  RETURN NEW;
END;
$$;
