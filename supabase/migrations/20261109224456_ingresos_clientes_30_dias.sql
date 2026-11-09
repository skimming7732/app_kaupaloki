CREATE FUNCTION public.ingresos_clientes_30_dias()
RETURNS TABLE (fecha date, monto_cop numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $chart$
  WITH periodo AS (
    SELECT timezone('America/Bogota', now())::date AS hoy
    WHERE (SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin')
  ), ingresos AS (
    SELECT n.fecha, n.ingreso_cop AS monto
    FROM public.negocios n CROSS JOIN periodo p
    WHERE n.fecha BETWEEN p.hoy - 29 AND p.hoy
      AND EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = n.cliente_id)
    UNION ALL
    SELECT e.fecha, e.monto
    FROM public.efectivo e CROSS JOIN periodo p
    WHERE e.fecha BETWEEN p.hoy - 29 AND p.hoy
      AND upper(btrim(e.tipo)) = 'INGRESO'
      AND EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = e.cliente_id OR (e.cliente_id IS NULL AND c.codigo = e.cliente_codigo)
      )
  )
  SELECT p.hoy - d.n, coalesce(sum(i.monto), 0)
  FROM periodo p CROSS JOIN generate_series(0, 29) AS d(n)
  LEFT JOIN ingresos i ON i.fecha = p.hoy - d.n
  GROUP BY p.hoy - d.n
  ORDER BY p.hoy - d.n;
$chart$;

REVOKE ALL ON FUNCTION public.ingresos_clientes_30_dias() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ingresos_clientes_30_dias() TO authenticated;
