# Kaupaloki Development & Design Rules

## 1. Iconografía e Interfaz (UI Strict Rule)
- **CERO EMOJIS**: Está terminantemente prohibido usar emojis (banderas, caritas, símbolos Unicode de chat, etc.) en cualquier parte del código fuente, interfaces, modales, alertas, menús o selectores.
- **Iconos Oficiales**: Toda iconografía debe utilizar la suite **Remix Icon** (`ri-*`).
  - Ejemplo: `<i className="ri-shield-user-line" />`, `<i className="ri-home-5-line" />`.
- **Países y Divisas**: Se representarán siempre mediante su denominación estándar y código ISO internacional, sin banderas emoji.
  - Ejemplo correcto: `Colombia (COL)`, `Estados Unidos (USA)`, `USD`, `COP`.
  - Ejemplo incorrecto: `🇨🇴 Colombia`, `🇺🇸 Estados Unidos`.

## 2. Permisos y Roles (RBAC)
- **Super Admin / Administrador**: Acceso administrativo existente; solo Super Admin concede ese rol.
- **Comercial**: Inicio, Clientes y Negocios. Registra negocios con sus divisas autorizadas.
- **Dispersor**: Inicio, Clientes y Dispersiones. Registra dispersiones con sus divisas autorizadas.
- **Operador**: Inicio, Clientes, Negocios y Dispersiones. Combina Comercial y Dispersor.
- **Supervisor**: Consulta todas las vistas excepto Panel de control, Capital y Socios & Inversionistas, incluidos sus extractos. Sin crear, editar, eliminar, entregar tokens ni adjuntar comprobantes. Puede mantener sus propios datos de perfil y seguridad.
- **Dispersiones**: Únicamente COP. Dispersor tiene COP fijo; Operador requiere COP autorizado o Todas para registrar o modificar dispersiones.
- **Divisas**: Solo Comercial, Dispersor y Operador requieren selección de divisas, con posibilidad de Todas. Administrador, Super Admin y Supervisor tienen todas automáticamente. La lista vacía representa Todas.
- **Route Guards**: El acceso directo a rutas no autorizadas redirige a `/inicio`.
- Los permisos deben aplicarse en interfaz, operaciones compartidas y Supabase (RLS y RPC), usando el rol de `profiles`.

## 3. Seguridad y 2FA
- Autenticación multifactor obligatoria.
- La descarga de códigos de respaldo debe seguir la nomenclatura: `kaupaloki-backup-codes-<correo>.txt`.
- Nunca re-solicitar escaneo de QR a usuarios que ya cuenten con `two_factor_secret` configurado; únicamente solicitar el código de 6 dígitos.
