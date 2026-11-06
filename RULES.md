# Kaupaloki Development & Design Rules

## 1. Iconografía e Interfaz (UI Strict Rule)
- **CERO EMOJIS**: Está terminantemente prohibido usar emojis (banderas, caritas, símbolos Unicode de chat, etc.) en cualquier parte del código fuente, interfaces, modales, alertas, menús o selectores.
- **Iconos Oficiales**: Toda iconografía debe utilizar la suite **Remix Icon** (`ri-*`).
  - Ejemplo: `<i className="ri-shield-user-line" />`, `<i className="ri-home-5-line" />`.
- **Países y Divisas**: Se representarán siempre mediante su denominación estándar y código ISO internacional, sin banderas emoji.
  - Ejemplo correcto: `Colombia (COL)`, `Estados Unidos (USA)`, `USD`, `COP`.
  - Ejemplo incorrecto: `🇨🇴 Colombia`, `🇺🇸 Estados Unidos`.

## 2. Permisos y Roles (RBAC)
- **Super Admin / Admin**: Acceso total al ecosistema.
- **Operador**: Únicamente puede visualizar y acceder a **Inicio**, **Clientes** y **Negocios** (este último restringido a sus divisas autorizadas).
- **Dispersor**: Únicamente puede visualizar y acceder a **Inicio**, **Dispersiones** y **Clientes**.
- **Route Guards**: Cualquier intento de acceso directo por URL a vistas no autorizadas debe ser interceptado y redirigido a `/inicio`.

## 3. Seguridad y 2FA
- Autenticación multifactor obligatoria.
- La descarga de códigos de respaldo debe seguir la nomenclatura: `kaupaloki-backup-codes-<correo>.txt`.
- Nunca re-solicitar escaneo de QR a usuarios que ya cuenten con `two_factor_secret` configurado; únicamente solicitar el código de 6 dígitos.
