# Auditoría de peso real en móvil — Maison Rosas

> Fecha: 2026-09-04 · Perfil medido: **425 px CSS, DPR 1** (perfil móvil real del preview).
> Método: recarga fría del storefront contra el stub local (`/api/image-proxy` real reenviando a Unsplash) + sondas `fetch(…, { cache: 'reload' })` sobre las URLs efectivas para medir **bytes fríos por imagen** (sin interferencia de caché del navegador). LCP/CLS capturados con `PerformanceObserver` en la página en vivo.

## Resultado en una línea

El catálogo/galería no desbordan peso por culpa de `srcSet`… pero **la galería descarga 4–5× más bytes de los necesarios**: el `srcSet` generado por `CachedImage` es **inerte** para URLs proxied/locales (los 3 candidatos son la misma URL), así que cada tarjeta de ~183 px baja el archivo de `w=800` completo.

## Peso frío por imagen (móvil)

| Imagen | Variante pedida | Bytes fríos | Decodificada | Render (CSS) | Nota |
|---|---|---|---|---|---|
| Hero foto 1 (LCP, `eager` + `fetchpriority=high`) | `w=420&q=70` | **32.5 KB** (442 ms) | 420×309 | tile ~64 px (zoom 3D) | ✅ razonable |
| Hero foto 2 (`lazy`) | `w=420&q=70` | **26.5 KB** | 420×383 | tile ~61 px | ✅ razonable |
| Hero foto 3 (`lazy`) | `w=420&q=70` | **40.0 KB** | 420×525 | tile ~59 px | ✅ razonable |
| Galería «Keke de Chocolate» | `w=800&q=70` (horneada) | **118.5 KB** (121 358 B) | 800×1200 | **183 px** (48vw) | ❌ 4.5× de más |
| Galería «Keke de Cumpleaños» | `w=800&q=70` (horneada) | **90.7 KB** | 800×588 | **183 px** (48vw) | ❌ 5× de más |

**Totales fríos (página completa con scroll):** ~308 KB en imágenes (hero 99 KB + galería 209 KB). Sobre el pliegue móvil solo cuentan las 3 fotos del hero = **~99 KB**; la galería es `lazy` y solo se pide al hacer scroll. El catálogo demo no aporta bytes (productos sin foto → placeholder de marca).

## LCP y CLS

| Métrica | Valor | Detalle |
|---|---|---|
| **LCP** | **644 ms** | Elemento: `<img>` del hero (foto LCP, 32.5 KB fría, `fetchpriority=high`). Dev server (JS sin bundle); en producción con `manualChunks` el tiempo baja. La foto ya no es el cuello de botella: pesa poco y está priorizada. |
| **FP / FCP** | 644 ms / 644 ms | Mismo tick: el primer pintado ya trae el hero completo. |
| **CLS** | **0.000** (0 shifts) | Recorrido completo de scroll con cargas `lazy` (5 imágenes, doc de 8620 px): **cero desplazamientos**. Reserva estructural: tarjetas `aspect-square`, tiles con dimensiones fijas, placeholder de `CachedImage` con `aspect-ratio` antes del decode. |

> Caveat de entorno: JS/CSS se sirven sin bundle en dev (5 MB de módulos) y no son representativos de producción — el pipeline de **imágenes** sí es idéntico al de producción (misma lógica `srcSet`/`optimizeImageUrl`/proxy), por eso la tabla de bytes es válida.

## Hallazgo: `srcSet` inerte en la ruta proxy/local (P1)

`CachedImage` genera 3 resoluciones vía `optimizeImageUrl(url, w)`, pero esa función devuelve **sin cambios** cualquier URL que empiece por `/` (guard de `images.ts`). Consecuencia:

- La URL efectiva es el proxy `/api/image-proxy?url=https%3A…%3Fw%3D800…` → los 3 candidatos quedan **idénticos**, etiquetados como `320w / 480w / 960w` aunque el archivo real sea de 800 px.
- Verificado en el DOM: `srcset` con 3 candidatos → `uniqueCands = 1`.
- El navegador «elige» el candidato 320w (correcto para el slot) pero **descarga el archivo 800w completo** porque es la única URL.
- Afecta a todo uso de `CachedImage` con `sizes` (galería `width=480`, catálogo `width=600`, y el resto que pase `sizes`). Sin `sizes` no hay `srcSet` y se descarga la única URL optimizada (caso del hero → sin problema).

### Cuánto se pierde (medido con la variante correcta)

| Imagen | Hoy (800w) | Con `w=320&q=60` | Ahorro |
|---|---|---|---|
| Galería «Keke de Chocolate» | 118.5 KB | 26.2 KB | −78 % |
| Galería «Keke de Cumpleaños» | 90.7 KB | 18.0 KB | −80 % |
| **Galería completa** | **209.2 KB** | **44.2 KB** | **−79 % (~165 KB)** |

> Las respuestas llegaron como `image/jpeg` (no AVIF/WebP): artefacto del stub/UA de la sonda; los bytes son reales. La nota `q=60` es la calidad que el propio pipeline aplica en móvil (`optimizeImageUrl`), el dato demo horneó `q=70`.

## Recomendaciones (por impacto)

1. **Arreglar `srcSet` en `CachedImage` para la ruta proxy** (alto impacto): cuando la URL efectiva es `/api/image-proxy?url=…`, reescribir el ancho **dentro** del parámetro `url=` (append `&w=` o reemplazar `w=`) para generar variantes reales (320 / 480 / 2×). Es el único cambio que recupera los ~165 KB/galería.
2. **Subir fotos reales** al catálogo (demo sin fotos → el catálogo no ejerce el `srcSet` y se ve el placeholder).
3. Mantener: `lazy` + `decoding=async` en todo lo no-LCP, `eager`+`fetchpriority=high` solo en la foto del hero, modal de galería pidiendo una sola imagen (`w=1100`) bajo demanda.
4. Después del fix, re-medir con Lighthouse en el deploy de producción (LCP objetivo < 2.5 s en 4G; CLS actual ya es 0).

## Qué NO se tocó

Ningún cambio de código en esta auditoría: es medición + documentación. El fix del punto 1 (y el push) quedan pendientes de confirmación.
