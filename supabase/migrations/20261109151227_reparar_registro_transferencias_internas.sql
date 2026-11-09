-- Update each affected account first. Recalculate the totals once the
-- statement has applied every transfer row, using a real trigger context.
CREATE OR REPLACE FUNCTION public.fn_aplicar_transferencia_interna()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_debito_old numeric := 0;
  v_debito_new numeric := 0;
  v_divisa text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_debito_old := OLD.monto + COALESCE(OLD.costo, 0);
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

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_divisa := CASE WHEN NEW.tipo_origen = 'ACTIVO_DIGITAL' THEN 'USDT' ELSE 'COP' END;
    IF NEW.origen_id = NEW.destino_id OR NEW.tipo_origen <> NEW.tipo_destino
       OR NEW.monto <> NEW.monto_destino OR NEW.divisa_origen <> v_divisa
       OR NEW.divisa_destino <> v_divisa OR NEW.divisa_costo <> v_divisa THEN
      RAISE EXCEPTION 'Selecciona dos cuentas distintas del mismo tipo y divisa.';
    END IF;
    v_debito_new := NEW.monto + COALESCE(NEW.costo, 0);

    IF NEW.tipo_origen = 'ACTIVO_LIQUIDO' THEN
      UPDATE public.activos_liquidos
      SET saldo_cop = COALESCE(saldo_cop, 0) - v_debito_new,
          egresos_cop = COALESCE(egresos_cop, 0) + v_debito_new
      WHERE id = NEW.origen_id AND coalesce(divisa, 'COP') = 'COP'
        AND coalesce(saldo_cop, 0) >= v_debito_new;
    ELSIF NEW.tipo_origen = 'ACTIVO_DIGITAL' THEN
      UPDATE public.activos_digitales
      SET saldo_usdt = COALESCE(saldo_usdt, 0) - v_debito_new,
          egresos_usdt = COALESCE(egresos_usdt, 0) + v_debito_new
      WHERE id = NEW.origen_id AND coalesce(saldo_usdt, 0) >= v_debito_new;
    END IF;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'El origen no está disponible o el saldo no cubre el monto y el costo.';
    END IF;

    IF NEW.tipo_destino = 'ACTIVO_LIQUIDO' THEN
      UPDATE public.activos_liquidos
      SET saldo_cop = COALESCE(saldo_cop, 0) + NEW.monto_destino,
          ingresos_cop = COALESCE(ingresos_cop, 0) + NEW.monto_destino
      WHERE id = NEW.destino_id AND coalesce(divisa, 'COP') = 'COP';
    ELSIF NEW.tipo_destino = 'ACTIVO_DIGITAL' THEN
      UPDATE public.activos_digitales
      SET saldo_usdt = COALESCE(saldo_usdt, 0) + NEW.monto_destino,
          ingresos_usdt = COALESCE(ingresos_usdt, 0) + NEW.monto_destino
      WHERE id = NEW.destino_id;
    END IF;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La cuenta de destino no está disponible.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_aplicar_transferencia_interna() FROM public, anon, authenticated;

CREATE TRIGGER trg_transferencias_recalculate_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.transferencias_internas
  FOR EACH STATEMENT EXECUTE FUNCTION public.fn_recalculate_financial_aggregates();

-- Match the roles that can enter the transfer view.
ALTER POLICY transferencias_staff_select ON public.transferencias_internas
  USING ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin'));
ALTER POLICY transferencias_staff_insert ON public.transferencias_internas
  WITH CHECK ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin'));
ALTER POLICY transferencias_staff_update ON public.transferencias_internas
  USING ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin')) WITH CHECK ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin'));
ALTER POLICY transferencias_staff_delete ON public.transferencias_internas
  USING ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin'));
