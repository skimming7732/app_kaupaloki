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

Los conteos de compras y ventas USDT usan resúmenes diarios calculados sobre todos los registros cargados, desde cualquier pestaña. Incluyen cantidad, unidades USDT, importes separados por divisa y estados. La función interpreta hoy/ayer en `America/Bogota`; las muestras recientes no permiten concluir que no hubo operaciones. Si falta sincronización o el resumen, debe indicar la limitación.

Para activar el cambio hay que configurar el secreto, desplegar `supabase/functions/ai-assistant/index.ts` y publicar el frontend. Validación local del adaptador sin usar credenciales: `node scripts/test-ai-assistant.cjs`.

## Comprobantes

Los formularios de gastos y dispersiones y sus acciones de adjuntar, reemplazar y agregar otro comprobante usan el mismo selector. Permite elegir archivos, arrastrarlos o pegar una imagen con el teclado o el botón Pegar imagen. Muestra una vista previa y valida JPG, PNG, WEBP o PDF de hasta 10 MB antes de subir. El pegado de texto en otros campos conserva su comportamiento normal. Los comprobantes adicionales conservan los anteriores y el guardado comprueba si otro usuario cambió el registro.
