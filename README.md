# Kaupaloki - Plataforma Contable y Cambiaria

Aplicación de gestión operativa, cambiaria y de tesorería desarrollada en **React 19 + Vite 5 + TypeScript** y optimizada para despliegue en **Cloudflare Workers Assets**. Conexión y sincronización en tiempo real con Supabase y Airtable (`appncUKgTkDojFj4B`).

---

## 📐 Reglas Estrictas de Diseño y Desarrollo (UI Guidelines)

### 🚫 Prohibición Total de Emojis
- **Está estrictamente prohibido el uso de caracteres Emoji** en cualquier componente, vista, modal, menú, botón o texto de la aplicación.
- **Toda iconografía debe ser técnica y vectorial**:
  - Utilizar exclusivamente la librería **Remix Icon** con clases estándar de formato `<i className="ri-[icon-name]-[style]" />` (ej. `ri-home-5-line`, `ri-briefcase-4-line`, `ri-team-line`, `ri-send-plane-2-line`).
  - Para selectores de países o divisas, utilizar únicamente el nombre y código formal (ej. `Colombia (COL)`, `Estados Unidos (USA)`, `COP`, `USD`), sin banderas de caracteres emoji.
- Mantener una apariencia corporativa, limpia, formal y de grado institucional financiero.

---

## Características de la Plataforma

- **SPA reactiva**: Migrada a React 19 con Vite 5, TypeScript y Tailwind CSS.
- **Control de Acceso basado en Roles (RBAC)**:
  - **Super Admin / Administrador**: Acceso total al panel de control, gastos, divisas, usuarios y métricas globales.
  - **Operador**: Acceso enfocado en *Inicio*, *Clientes* y *Negocios*, restringido a sus divisas autorizadas.
  - **Dispersor**: Acceso enfocado en *Inicio*, *Dispersiones* y *Clientes*.
- **Seguridad**:
  - Autenticación multifactor obligatoria (2FA / TOTP) compatible con Google Authenticator.
  - Códigos de respaldo descargables con nomenclatura personalizada por correo de usuario.
- **Vistas Contables**:
  - Negocios y conversión de divisas en vivo.
  - Dispersiones y pagos bancarios.
  - Movimientos de efectivo físico y gastos contables por categoría.
  - Activos líquidos e instituciones financieras.
  - Activos digitales (USDT) y wallets corporativas.
- **Sincronización en Vivo**:
  - Edge Functions en Supabase para sincronización bidireccional con Airtable.
  - Supabase Realtime para actualización instantánea.

---

## Despliegue en Cloudflare

- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Single Page Application mode**: Configurado en `wrangler.jsonc` mediante `"not_found_handling": "single-page-application"`.

---

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo Vite
npm run dev

# Compilar para producción
npm run build

# Previsualizar build local
npm run preview
```

## Formato de números

En el dashboard, el portal del cliente y los formularios, usa coma para agrupar miles y punto decimal: `1,234.56`. Las tasas se muestran con exactamente cuatro decimales: `3,950.0000`. Los valores se guardan en Supabase como números, sin separadores de miles.

## Publicación de cambios en GitHub

Al terminar cada tarea que cambie el proyecto, ejecuta las verificaciones correspondientes, crea un commit con los cambios de la tarea y ejecuta `git push origin <rama>`. Usa `main` por defecto cuando la tarea no indique otra rama. Antes de dar la tarea por terminada, confirma que GitHub recibió el commit e incluye su enlace en la entrega. Si falla el push, informa qué quedó pendiente.

## Reinicio operativo

La función privada de Supabase se ejecuta desde SQL con el rol propietario de la base de datos.

```sql
SELECT kaupaloki_private.reiniciar_operacion('REINICIAR OPERACION KAUPALOKI');
```

Vacía los registros de clientes, operaciones, capital, activos e historial financiero. Conserva los usuarios, las instituciones, las divisas y la cuenta `EFECTIVO-CAJA`. Deja la caja y los totales de las divisas en cero. Los archivos del bucket `comprobantes` se gestionan por separado con la API de Storage.


## Roles y divisas

- Comercial registra negocios en sus divisas autorizadas.
- Dispersor gestiona dispersiones en COP.
- Operador registra negocios y gestiona dispersiones. Necesita COP o Todas para dispersar.
- Supervisor consulta todas las vistas excepto Panel de control, Capital y Socios & Inversionistas. No puede modificar registros.
- Administrador y Super Admin conservan la gestión administrativa. Solo Super Admin puede modificar otra cuenta Super Admin o conceder ese rol.
- Todos los roles internos consultan Clientes. Administrador, Super Admin y Supervisor tienen todas las divisas automáticamente. Una lista de divisas vacía significa Todas.

Los permisos se comprueban en rutas, formularios, operaciones compartidas, RLS y RPC de Supabase. El directorio de usuarios excluye secretos de 2FA; la tabla de perfiles solo permite consultar y mantener el perfil propio desde el navegador. Las invitaciones existentes se activan al iniciar sesión mediante `activar_perfil_invitado`, que no reactiva cuentas inactivas.

El registro de Auth no concede roles desde `user_metadata`. Las invitaciones asignan el rol mediante el servicio administrativo y generan el código interno correspondiente.

## Asistente de preguntas (Gemini)

El chat usa la Edge Function `ai-assistant`. Configurar `GEMINI_API_KEY` como secreto en Supabase, nunca como variable `VITE_*` ni dentro del código. `GEMINI_MODEL` es opcional; por defecto usa `gemini-3.5-flash-lite`, con nivel gratuito sujeto a las cuotas del proyecto de Google AI Studio. La clave por sí sola no determina si la cuenta tiene facturación activada.

El frontend envía el Bearer de sesión. El servidor valida la sesión con Auth y el rol/estado actual en `profiles` antes de usar Gemini. Las herramientas `consultar_datos`, `resumir_datos` y `calcular_activos` usan exclusivamente lecturas con ese JWT y sus políticas RLS, nunca `service_role` ni SQL generado por el modelo. `usuarios` usa el directorio seguro `listar_perfiles_dashboard`; los autores de operaciones se identifican por `created_by`, sin confundirlos con clientes. `calcular_activos` hace la conversión y suma en el servidor para evitar errores de aritmética del modelo.

Las consultas paginadas devuelven cobertura y total exacto; los resúmenes procesan hasta 20,000 filas y señalan explícitamente si faltan datos. El modelo debe acotar fechas cuando se alcanza ese límite. Una consulta admite hasta 12 llamadas a herramientas y 45 lecturas; las lecturas paginadas no representan una transacción única. No se ofrecen herramientas de escritura ni ejecución arbitraria de funciones, SQL o APIs externas.

`catalog.ts` contiene una instantánea técnica del esquema, relaciones, firmas y fórmulas SQL, sin filas ni credenciales. `referencia_tecnica` la consulta por tema y nombre. Debe actualizarse al cambiar tablas o fórmulas. Los campos de autenticación, PIN y tokens de acceso no son consultables; los resultados también se redactan antes de enviarse a Gemini.

Los conteos de compras y ventas USDT usan resúmenes diarios calculados sobre todos los registros cargados, desde cualquier pestaña. Incluyen cantidad, unidades USDT, importes separados por divisa y estados. La función interpreta hoy/ayer en `America/Bogota`; las muestras recientes no permiten concluir que no hubo operaciones. Si falta sincronización o el resumen, debe indicar la limitación.

El contexto también incluye capital vigente por socio/inversionista (aportes menos retiros, sin dividendos ni intereses), calculado con el libro de capital cargado bajo RLS. La suma de activos se calcula como líquidos COP + digitales USDT × tasa COP/USDT y se distingue de ganancia y patrimonio neto. Si falta el desglose de personas o la tasa, el asistente debe reconocer la falta de datos.

Para activar el cambio hay que configurar el secreto, desplegar `supabase/functions/ai-assistant/index.ts` junto con `reader.ts` y `catalog.ts`, y publicar el frontend. Validaciones locales sin credenciales: `node scripts/test-ai-assistant.cjs` y `node scripts/test-ai-reader.cjs`. La prueba opcional `scripts/test-ai-live.cjs` usa Gemini real y un transporte de base/auth simulado; requiere `GEMINI_API_KEY`, `AI_LIVE_FIXTURES` (JSON de tablas/filas) y `AI_LIVE_PROMPTS` (JSON con prompt y expected). Sus fixtures y credenciales se proporcionan por entorno y no se guardan en el repositorio. Esta prueba no valida RLS en producción.

## Rol Contador

`contador` accede a Inicio, Gastos, Activos líquidos, Activos digitales y su perfil personal. Puede registrar gastos COP desde una cuenta líquida o USDT desde una billetera, con comprobante opcional. Los saldos se descuentan por los mismos triggers de contabilidad existentes. No puede editar/eliminar gastos, modificar activos, registrar operaciones ni administrar usuarios. No requiere selección de divisas al invitarlo; su código usa el prefijo `UCT`. Los permisos se aplican tanto en navegación/formularios como en RLS y Storage. Las instituciones y divisas se consultan como catálogos de apoyo.

Compras y ventas USDT muestran la institución y su logo de la cuenta o billetera vinculada, con el titular como dato secundario. Si un activo histórico ya no existe, se conserva su etiqueta registrada; no se usa una cuenta distinta como reemplazo.

## Adjuntos de gastos y dispersiones

El portal con PIN devuelve los tipos de efectivo normalizados como `Pago` e `Ingreso`, igual que DataContext. No devolver directamente `PAGO`/`INGRESO` de la base: la vista filtra por esos nombres y omitiría movimientos aunque sus permisos sean correctos. Los pagos incluyen dispersiones no rechazadas y pagos de efectivo del cliente. Los comprobantes de dispersiones sí se muestran: la Edge Function `portal-cliente` valida el enlace y PIN mediante `abrir_portal_cliente` y firma únicamente los archivos asociados a esas dispersiones por una hora. El bucket permanece privado y la respuesta no se almacena en caché. Desplegar la función con `verify_jwt=false`: su autenticación es el enlace y PIN, con los bloqueos y vencimiento del RPC existente. Al vencer los enlaces de archivo, se puede recargar el portal e ingresar el PIN nuevamente.

Supervisor carga `listar_movimientos_tesoreria` para completar los extractos de activos y Efectivo con aportes, retiros y liquidaciones vinculados a cuentas. Esta proyección conserva código, monto, contraparte y auditoría, pero no devuelve condiciones de contratos ni da acceso a Capital/Socios. No sustituirla por consultas directas a `capital_movimientos`, cuyo RLS mantiene esas vistas restringidas.

Supervisor puede subir y vincular comprobantes de gastos y dispersiones, incluyendo agregar otro o reemplazar el actual. Storage y `guardar_comprobante_dashboard` deben mantener los mismos permisos: administrador, Super Admin y supervisor para ambas vistas; operador y dispersor para dispersiones con acceso COP. Auditor conserva solo lectura. Las subidas usan la carpeta del usuario autenticado y el bucket sigue siendo privado.

Los formularios de gastos y dispersiones y sus acciones de adjuntar, reemplazar y agregar otro comprobante usan el mismo selector. Permite elegir archivos, arrastrarlos o pegar una imagen con el teclado o el botón Pegar imagen. Muestra una vista previa y valida JPG, PNG, WEBP o PDF de hasta 10 MB antes de subir. El pegado de texto en otros campos conserva su comportamiento normal. Los comprobantes adicionales conservan los anteriores y el guardado comprueba si otro usuario cambió el registro.

## Corrección de entregas de tokens

Solo Super Admin puede devolver un token entregado a pendiente desde Ver vale. La corrección requiere un motivo, conserva el mismo código y el pago vinculado, y renueva su vigencia por 48 horas. No modifica caja ni la deuda del cliente. El historial guarda autor, fecha, motivo y los datos de la entrega anterior; no puede editarse desde el cliente.

Las confirmaciones de entrega se realizan con `entregar_token_efectivo`; comprueban el estado, la vigencia en el servidor y la versión del registro. Escanear un QR únicamente consulta el token. Una vez confirmada su entrega, el escáner muestra Token Ya Entregado y bloquea otra confirmación. Después de una corrección autorizada, el mismo código puede validarse y entregarse nuevamente.
