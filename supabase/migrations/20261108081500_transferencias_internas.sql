-- Migration: Transferencias Internas y RLS para activos líquidos y digitales
CREATE TABLE IF NOT EXISTS public.transferencias_internas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE DEFAULT ('TRF-' || to_char(CURRENT_DATE, 'YYYYMMDD-') || upper(substr(gen_random_uuid()::text, 1, 6))),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  tipo_origen text NOT NULL CHECK (tipo_origen IN ('ACTIVO_LIQUIDO', 'ACTIVO_DIGITAL')),
  origen_id uuid NOT NULL,
  origen_nombre text,
  tipo_destino text NOT NULL CHECK (tipo_destino IN ('ACTIVO_LIQUIDO', 'ACTIVO_DIGITAL')),
  destino_id uuid NOT NULL,
  destino_nombre text,
  CONSTRAINT chk_mismo_tipo CHECK (tipo_origen = tipo_destino),
  monto numeric(18, 4) NOT NULL CHECK (monto > 0),
  divisa_origen text NOT NULL DEFAULT 'COP',
  monto_destino numeric(18, 4) NOT NULL CHECK (monto_destino > 0),
  divisa_destino text NOT NULL DEFAULT 'COP',
  tasa numeric(18, 6) DEFAULT 1,
  costo numeric(18, 4) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  divisa_costo text NOT NULL DEFAULT 'COP',
  concepto text NOT NULL DEFAULT '',
  notas text,
  comprobante_url text,
  created_at timestamptz DEFAULT NOW(),
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  created_at_audit timestamptz
);

-- Trigger for author and audit
DROP TRIGGER IF EXISTS registrar_autor_creacion ON public.transferencias_internas;
CREATE TRIGGER registrar_autor_creacion
  BEFORE INSERT OR UPDATE ON public.transferencias_internas
  FOR EACH ROW EXECUTE FUNCTION public.registrar_autor_creacion();

-- Trigger function for applying balance deltas
CREATE OR REPLACE FUNCTION public.fn_aplicar_transferencia_interna()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_debito_old numeric(18,4) := 0;
  v_debito_new numeric(18,4) := 0;
BEGIN
  -- REVERSE OLD IF UPDATE OR DELETE
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_debito_old := OLD.monto + COALESCE(OLD.costo, 0);
    
    -- Revert source
    IF OLD.tipo_origen = 'ACTIVO_LIQUIDO' THEN
      UPDATE public.activos_liquidos
      SET saldo_cop = COALESCE(saldo_cop, 0) + v_debito_old,
          egresos_cop = GREATEST(0, COALESCE(egresos_cop, 0) - v_debito_old)
      WHERE id = OLD.origen_id;
    ELSIF OLD.tipo_origen = 'ACTIVO_DIGITAL' THEN
      UPDATE public.activos_digitales
      SET saldo_usdt = COALESCE(saldo_usdt, 0) + v_debito_old,
          egresos_usdt = GREATEST(0, COALESCE(egresos_usdt, 0) - v_debito_old)
      WHERE id = OLD.origen_id;
    END IF;

    -- Revert destination
    IF OLD.tipo_destino = 'ACTIVO_LIQUIDO' THEN
      UPDATE public.activos_liquidos
      SET saldo_cop = COALESCE(saldo_cop, 0) - OLD.monto_destino,
          ingresos_cop = GREATEST(0, COALESCE(ingresos_cop, 0) - OLD.monto_destino)
      WHERE id = OLD.destino_id;
    ELSIF OLD.tipo_destino = 'ACTIVO_DIGITAL' THEN
      UPDATE public.activos_digitales
      SET saldo_usdt = COALESCE(saldo_usdt, 0) - OLD.monto_destino,
          ingresos_usdt = GREATEST(0, COALESCE(ingresos_usdt, 0) - OLD.monto_destino)
      WHERE id = OLD.destino_id;
    END IF;
  END IF;

  -- APPLY NEW IF INSERT OR UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_debito_new := NEW.monto + COALESCE(NEW.costo, 0);

    -- Apply source
    IF NEW.tipo_origen = 'ACTIVO_LIQUIDO' THEN
      UPDATE public.activos_liquidos
      SET saldo_cop = COALESCE(saldo_cop, 0) - v_debito_new,
          egresos_cop = COALESCE(egresos_cop, 0) + v_debito_new
      WHERE id = NEW.origen_id;
    ELSIF NEW.tipo_origen = 'ACTIVO_DIGITAL' THEN
      UPDATE public.activos_digitales
      SET saldo_usdt = COALESCE(saldo_usdt, 0) - v_debito_new,
          egresos_usdt = COALESCE(egresos_usdt, 0) + v_debito_new
      WHERE id = NEW.origen_id;
    END IF;

    -- Apply destination
    IF NEW.tipo_destino = 'ACTIVO_LIQUIDO' THEN
      UPDATE public.activos_liquidos
      SET saldo_cop = COALESCE(saldo_cop, 0) + NEW.monto_destino,
          ingresos_cop = COALESCE(ingresos_cop, 0) + NEW.monto_destino
      WHERE id = NEW.destino_id;
    ELSIF NEW.tipo_destino = 'ACTIVO_DIGITAL' THEN
      UPDATE public.activos_digitales
      SET saldo_usdt = COALESCE(saldo_usdt, 0) + NEW.monto_destino,
          ingresos_usdt = COALESCE(ingresos_usdt, 0) + NEW.monto_destino
      WHERE id = NEW.destino_id;
    END IF;
  END IF;

  -- Recalculate aggregates
  PERFORM public.fn_recalculate_financial_aggregates();

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_aplicar_transferencia_interna ON public.transferencias_internas;
CREATE TRIGGER trg_aplicar_transferencia_interna
  AFTER INSERT OR UPDATE OR DELETE ON public.transferencias_internas
  FOR EACH ROW EXECUTE FUNCTION public.fn_aplicar_transferencia_interna();

-- RLS & Permissions
ALTER TABLE public.transferencias_internas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transferencias_internas TO authenticated;

DROP POLICY IF EXISTS "transferencias_staff_select" ON public.transferencias_internas;
CREATE POLICY "transferencias_staff_select" ON public.transferencias_internas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "transferencias_staff_insert" ON public.transferencias_internas;
CREATE POLICY "transferencias_staff_insert" ON public.transferencias_internas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "transferencias_staff_update" ON public.transferencias_internas;
CREATE POLICY "transferencias_staff_update" ON public.transferencias_internas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "transferencias_staff_delete" ON public.transferencias_internas;
CREATE POLICY "transferencias_staff_delete" ON public.transferencias_internas
  FOR DELETE TO authenticated USING (true);

-- Ensure activos_liquidos and activos_digitales have UPDATE and DELETE policies for authenticated
DROP POLICY IF EXISTS "activos_liquidos_staff_update" ON public.activos_liquidos;
CREATE POLICY "activos_liquidos_staff_update" ON public.activos_liquidos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "activos_liquidos_staff_delete" ON public.activos_liquidos;
CREATE POLICY "activos_liquidos_staff_delete" ON public.activos_liquidos
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "activos_digitales_staff_update" ON public.activos_digitales;
CREATE POLICY "activos_digitales_staff_update" ON public.activos_digitales
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "activos_digitales_staff_delete" ON public.activos_digitales;
CREATE POLICY "activos_digitales_staff_delete" ON public.activos_digitales
  FOR DELETE TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
