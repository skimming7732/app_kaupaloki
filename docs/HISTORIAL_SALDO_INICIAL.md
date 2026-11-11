# Historial y Documentación Técnica: Saldo Inicial de Clientes

**Fecha de Retiro / Limpieza:** 11 de Noviembre de 2026  
**Checkpoint Git / Respaldo:** Branch `backup/saldo-inicial-feature` · Tag `checkpoint-before-saldo-inicial-revert`  
**Estado:** Retirado y revertido de forma limpia (Base de Datos + Frontend).  

---

## 1. Contexto y Objetivo Original
Se planteó la necesidad de permitir que a ciertos clientes se les pudiera asignar un "Saldo Inicial" manual (por ejemplo, que la empresa les deba un monto de apertura o que ellos le deban dinero a la empresa) antes de que realizaran operaciones comerciales formales en el sistema.

Se implementó:
1. Columnas en PostgreSQL: `saldo_inicial_cop` y `concepto_saldo_inicial` en la tabla `public.clientes`.
2. Formularios de captura de saldo inicial en el modal de Nuevo Cliente (`AddClienteModal.tsx`) y Edición de Cliente (`EditClienteModal.tsx`).
3. Modal dedicado de Saldo Inicial (`SaldoInicialModal.tsx`) y visualización en la vista interna del cliente (`ClienteDetalleView.tsx`) y en el portal del cliente (`ClientPublicView.tsx`).

---

## 2. Razones del Retiro (Hallazgos Financieros y Contables)

### A. El sistema ya lo maneja de forma nativa mediante Dispersiones
Durante las pruebas operativas se constató que **el flujo nativo de Kaupaloki ya cubre este caso a la perfección y con total rigor contable**:
* Si un cliente nos debe dinero (por ejemplo, un anticipo o préstamo de $100.000.000 COP sin negocio previo):
  1. Se registra una **Dispersión** con origen de fondos (ej. `EFECTIVO-CAJA`).
  2. Se descuenta físicamente el activo líquido real.
  3. El cliente pasa automáticamente a estado **`DEBE`** con `$100.000.000` en **"Por cobrar"**.
  4. En el **Panel de Control**, la tarjeta **"Saldo neto con clientes"** se reduce en $100.000.000 (cuenta por cobrar a favor de Kaupaloki).
  5. La fórmula de **Utilidad Operativa Neta** no sufre distorsión porque el dinero que salió de caja ahora existe como activo por cobrar.

### B. Inconsistencia de saldos manuales sin contrapartida
Un campo de "saldo inicial a mano" no tiene contrapartida contable (no indica de qué banco o caja salió la plata). Si se registra que un cliente nos debe $100M pero la caja de efectivo sigue igual, se genera una ganancia contable ficticia en el balance general.

### C. Conflicto de Triggers (Error 21000)
El cálculo de saldos en triggers de `public.clientes` entraba en recursión con la función de agregados globales `fn_recalculate_financial_aggregates`, provocando el error `21000` ("more than one row returned by a subquery used as an expression") al intentar insertar clientes nuevos.

---

## 3. Acciones de Reversión Ejecutadas

1. **Base de Datos (PostgreSQL en Supabase):**
   * Se eliminaron los triggers `trg_clientes_balance` y `trg_clientes_after_balance` sobre `public.clientes`.
   * Se eliminaron las funciones auxiliares `fn_clientes_recalculate_balance` y `fn_clientes_after_balance_update`.
   * Se eliminaron las columnas `saldo_inicial_cop` y `concepto_saldo_inicial` de `public.clientes`.
   * Se restauró la función `fn_recalculate_financial_aggregates()` a su fórmula probada original:
     $$\text{saldo\_cop} = \text{ingresos\_cop} - \text{pagado\_cop}$$
     $$\text{pendiente\_cop} = \max(0, \text{saldo\_cop})$$
   * Se restauró la función `abrir_portal_cliente(uuid, text)`.

2. **Frontend:**
   * Se eliminó el archivo `src/components/modals/SaldoInicialModal.tsx`.
   * Se restauraron `AddClienteModal.tsx`, `EditClienteModal.tsx`, `ClienteDetalleView.tsx`, `ClientPublicView.tsx`, `DataContext.tsx` y `appData.ts` a su estado limpio.
   * Compilación verificada con `npm run build` (0 errores).

3. **Verificación de Seguridad (Creación y Eliminación de Clientes):**
   * Se ejecutó prueba completa de inserción (`INSERT`) y eliminación (`DELETE`) de clientes en Supabase: resultado 100% exitoso.

---

## 4. Código Histórico de Referencia (Por si se requiere a futuro)

Si en el futuro se desea consultar la implementación completa con componentes React y triggers, se puede clonar o revisar el checkpoint:
```bash
git checkout backup/saldo-inicial-feature
# o mediante el tag
git checkout checkpoint-before-saldo-inicial-revert
```

### SQL original de la migración que se aplicó:
```sql
-- Agregar columnas:
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS saldo_inicial_cop NUMERIC DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS concepto_saldo_inicial TEXT;

-- Triggers y recálculo:
-- Disponibles en commit 0819b3d y rama backup/saldo-inicial-feature
```
