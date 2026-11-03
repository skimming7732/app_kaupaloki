# Kaupaloki - Plataforma Contable y Cambiaria

Aplicación contable desarrollada en **Astro** y optimizada para despliegue estático ultra-rápido en **Cloudflare Pages**. Muestra y consolida las tablas y registros financieros de la base de datos de Airtable (`appncUKgTkDojFj4B`).

---

## Características Contables

- **Diseño financiero estricto**: Interfaz oscura, limpia, sin emojis, con iconografía técnica en formato SVG.
- **Métricas consolidadas**:
  - Total Ingresos (COP)
  - Total Pagos Recibidos (COP)
  - Saldo Pendiente Neto por cobrar (COP)
  - Total USDT Comprado y tasa promedio
- **Vistas tabulares completas**:
  - `CLIENTES`: Códigos contables, ingresos totales, pagos acreditados y saldo pendiente por cliente.
  - `NEGOCIOS`: Operaciones cambiarias, tasas, ingresos en COP y equivalentes en USDT.
  - `PAGOS`: Detalle de caja, estados (`COMPLETADO` / `RECHAZADO`) y acceso a comprobantes.
  - `DIVISAS`: Control de inventario de monedas recibidas, compradas y saldos en custodia.
  - `COMPRA-USDT`: Libro de compras de USDT, tasas ejecutadas y costo unitario.
  - `ADMINS`: Administradores por territorio.
- **Herramientas interactivas**:
  - Búsqueda y filtrado instantáneo en vivo sin recargas.
  - Exportación de cualquier tabla a archivo CSV con un clic.
  - Sumatorias de totales en pie de tabla (`TFOOT`).

---

## Despliegue en Cloudflare Pages

1. Conecta tu repositorio de GitHub `skimming7732/app_kaupaloki` en el panel de **Cloudflare Pages**.
2. Parámetros de compilación:
   * **Framework preset**: `Astro`
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
   * **Node version**: `20` o superior (en variables de entorno: `NODE_VERSION=22.15.0`)
3. ¡Listo! Cloudflare compilará y servirá el panel con latencia global mínima.

---

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Previsualizar build de producción
npm run preview
```
