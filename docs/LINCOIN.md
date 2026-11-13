# Saldos reales de Lincoin

Los activos líquidos COP de la institución Lincoin se vinculan mediante `api_id`.
El saldo real es `total_cop` de la empresa, sin sumar `total_clientes_cop`.
No se modifican `saldo_cop`, `saldo_real` ni los movimientos de los activos:
la comparación usa una caché privada de consulta y conserva la fecha de Lincoin.

La credencial completa (ID, generación, secreto, vencimiento y última rotación)
se cifra en Supabase Vault, nombre `lincoin_api_credential`. El navegador solo
llama `lincoin_balances`, disponible para los mismos roles que consultan activos
líquidos: administrador, super_admin, supervisor y auditor, con perfil activo.
No hay credenciales ni funciones privilegiadas en el esquema público.

`kaupaloki_lincoin_sync` consulta cada minuto, incluso sin navegadores abiertos.
Un bloqueo transaccional centraliza la consulta y rotación; las peticiones se
limitan a una cada 30 segundos. La rotación se realiza cada hora. La nueva
generación y su secreto se guardan juntos antes de consultar con ellos.
Si `/rotar` no responde, se recupera la rotación antes de volver a consultar.
Los HTTP 401/403 detienen los intentos automáticos hasta revisión administrativa.
Los demás fallos conservan el último saldo y muestran un aviso en la interfaz.

## Configuración inicial

Aplicar la migración y guardar la credencial desde un entorno administrativo:

```powershell
$env:DATABASE_URL = '<conexión administrativa de Supabase>'
$env:LINCOIN_CREDENTIAL_FILE = '<archivo LLAVE_ID=..., GENERACION=..., SECRETO=...>'
node scripts/configure-lincoin.cjs
```

El script no sobrescribe una credencial ya registrada y verifica la primera
rotación y consulta. Desde entonces, Vault es la fuente de verdad: el archivo
inicial queda desactualizado y no debe usarse para consultas, restauraciones
ni otros procesos de rotación. Nunca copiar una generación anterior a Vault.

## Diagnóstico

Desde SQL administrativo, consultar `last_error`, `consulted_at`, `blocked`
y `rotation_pending` de `kaupaloki_private.lincoin_state`, sin leer secretos.
Tras un 401/403, verificar con Lincoin el motivo y la hora. Solo después de
resolverlo o instalar una credencial nueva, restablecer `blocked = false`.
No reactivar una credencial revocada ni reintentar en bucle.

El backend usa las extensiones oficiales `http`, `pgcrypto`, `supabase_vault`
y `pg_cron`; ninguna Edge Function recibe o devuelve el secreto.
