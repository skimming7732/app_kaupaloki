-- One receipt or the unchanged previous list plus one new uploaded object.
-- Keep ownership, role authorization and row locking for concurrent edits.
CREATE OR REPLACE FUNCTION public.guardar_comprobante_dashboard(
  p_table text, p_id uuid, p_receipt text, p_previous text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $receipt$
DECLARE
  actor text := coalesce(kaupaloki_private.staff_role(), '');
  current_receipt text;
  receipt_parts text[];
  new_receipt text;
  object_path text;
BEGIN
  IF p_table IS NULL OR p_table NOT IN ('gastos', 'dispersiones') THEN RAISE invalid_parameter_value; END IF;
  IF auth.uid() IS NULL OR (
    actor NOT IN ('administrador', 'super_admin') AND NOT (
      p_table='dispersiones' AND actor IN ('dispersor', 'operador')
      AND kaupaloki_private.puede_operar_divisa('COP')
    )
  ) THEN RAISE insufficient_privilege; END IF;

  IF p_table='dispersiones' THEN
    SELECT comprobante_url INTO current_receipt FROM public.dispersiones WHERE id=p_id FOR UPDATE;
  ELSE
    SELECT comprobante_url INTO current_receipt FROM public.gastos WHERE id=p_id FOR UPDATE;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registro no encontrado' USING ERRCODE='P0002'; END IF;
  IF current_receipt=p_receipt THEN RETURN; END IF;
  IF nullif(btrim(current_receipt), '') IS DISTINCT FROM nullif(btrim(p_previous), '') THEN
    RAISE EXCEPTION 'El comprobante cambió' USING ERRCODE='40001';
  END IF;

  receipt_parts := string_to_array(p_receipt, ',');
  IF coalesce(cardinality(receipt_parts), 0)=0 THEN RAISE invalid_parameter_value; END IF;
  IF cardinality(receipt_parts)>1 AND (
    array_to_string(receipt_parts[1:cardinality(receipt_parts)-1], ',')
      IS DISTINCT FROM current_receipt
  ) THEN RAISE EXCEPTION 'La lista de comprobantes cambió' USING ERRCODE='22023'; END IF;
  new_receipt := btrim(receipt_parts[cardinality(receipt_parts)]);
  object_path := substr(new_receipt, 9);
  IF new_receipt IS NULL OR split_part(new_receipt, '/', 1)<>'storage:' || p_table
    OR split_part(new_receipt, '/', 2)<>auth.uid()::text
    OR NOT EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id='comprobantes' AND name=object_path AND owner_id::text=auth.uid()::text
    )
  THEN RAISE EXCEPTION 'Archivo no disponible' USING ERRCODE='22023'; END IF;

  IF p_table='dispersiones' THEN
    UPDATE public.dispersiones SET comprobante_url=p_receipt, tiene_comprobante=true WHERE id=p_id;
  ELSE
    UPDATE public.gastos SET comprobante_url=p_receipt WHERE id=p_id;
  END IF;
END;
$receipt$;
REVOKE ALL ON FUNCTION public.guardar_comprobante_dashboard(text,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_comprobante_dashboard(text,uuid,text,text) TO authenticated;
