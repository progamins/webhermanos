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

---

# Comparativa producción vs entorno dev — Lighthouse real (2026-09-04)

> Método: Lighthouse CLI local (Chromium Edge) contra **https://webhermanos-client.vercel.app** (deploy de `6c6e3f6`, fix de srcSet incluido y verificado vivo: aparecen peticiones `w=400&auto=format&fit=crop&q=60`). Perfil móvil simulado 4G. 2 corridas (result-prod.json / result-prod2.json). Nota: **las métricas no son directamente comparables** con dev (localhost sin throttle + caché tibio) — los **bytes por imagen sí lo son** (mismo archivo servido).

## Métricas (2 corridas)

| Métrica | Prod run 1 | Prod run 2 | Dev (local, sin throttle) |
|---|---|---|---|
| Score perf | 54 | 49 | — |
| FCP | 5.1 s | 2.9 s | 644 ms (FP=FCP) |
| **LCP** | **10.9 s** | **10.9 s** | 644 ms |
| CLS | 0.015 | **0.117** | 0.000 |
| Speed Index | 6.2 s | 4.9 s | — |
| TBT | 300 ms | 530 ms | — |
| TTI | 10.9 s | 10.9 s | — |
| Bytes totales | 1,461.8 KB | 1,508.7 KB | JS dev 5 MB (no representativo) |

- **LCP = `p#hero-desc`** («Diseños exclusivos creados por Carol Rosas», texto) — no es la foto (26 KB AVIF cargada temprano): el retraso es de *render* del contenido del hero en arranque frío bajo CPU throttled (JS 368 KB + wasm/lottie ~930 KB + fuentes). Estable en 10.9 s en ambas corridas.
- **CLS culpable (0.107 de 0.117): `section#inicio > .hero-scene-stage`** — el swap tardío de **Playfair Display** (woff2 de fonts.gstatic) reflowa el bloque del hero. En dev las fuentes estaban calientes → CLS 0; en frío varía 0.015–0.117 según cuándo llega la fuente.

## Peso total transferido por tipo (prod, run 2)

| Tipo | Bytes | Notas |
|---|---|---|
| `other` | 930.3 KB | **dotlottie-player.wasm 624.8 KB** (jsdelivr, 1,771 KB crudos) + **cake.lottie 299.5 KB** + favicon |
| script | 368.4 KB | 20 chunks (incl. vendor-recharts 105 KB gz descargado en home) |
| font | 102.3 KB | Playfair Display + Plus Jakarta Sans (Google Fonts, swap) |
| image | 26–74 KB | transferido contado por LH (resto servido por caché interna: SW/IndexedDB) |
| stylesheet | 30.3 KB | + documento 3.2 KB |

## Imágenes — peso frío único en móvil (prod, datos reales)

| Grupo | Bytes fríos | Qué es |
|---|---|---|
| `grande (>800w)` | 1,315.0 KB | w=1200 ×4 (139–263 KB) + w=1920 (467.6 KB) |
| `original (sin ancho)` | 1,039.6 KB | **config.heroImage crudo: 1,037.5 KB** (solo para meta/SEO, nunca se muestra) + favicon |
| `w800` | 664.6 KB | portadas de productos/galería horneadas a w=800 (77–136 KB) |
| `small (≤480)` | 184.4 KB | hero AVIF w=420 (21.9–26.4 KB ×3) + galería w=400&q=60 (29–32 KB ×2) — **lo que el móvil realmente muestra** |
| `upload` | 58.0 KB | webp del admin (~19 KB ×3) ✅ |
| **Total frío** | **3,261.6 KB** | vs **~242 KB realmente usados** → **~93 % sobre-descarga** |

### Causa raíz del sobre-peso

El **prewarm de imágenes (`App.tsx` → `imageMemoryCache.startLoad`)** descarga las URLs **crudas** tal como vienen de la DB (`getLocalImageUrl` solo envuelve en proxy, sin ancho): `config.heroImage` original (1,037 KB), productos con `w=1200/1920`, galería con `w=800`. Ese prewarm **no reutiliza** el `srcSet` (claves de caché distintas: URL cruda ≠ variante w=320/400) → en móvil descarga ~3 MB para mostrar ~242 KB, **incluso con el fix de srcSet activo** (las variantes pequeñas SÍ se piden y son las que renderiza el `<img>`).

## Comparación con dev — por imagen (mismo efecto del fix)

| Imagen | Dev (datos demo) | Prod (datos reales) |
|---|---|---|
| Foto hero LCP | 32.5 KB @w=420 JPEG | **26.4 KB @w=420 AVIF** (−20 %) |
| Tarjeta galería (post-fix) | 26.2 / 18.0 KB @w=320 | 31.9 / 29.4 KB @w=400 (DPR 2.6 de LH) |
| Uploads admin | — | ~19 KB webp ✅ |
| Frío total página | ~143 KB (hero + 2 galería demo) | 3,261.6 KB únicas (93 % prewarm) |

El fix de srcSet funciona **igual en ambos entornos** (por-tarjeta ~26–32 KB). La diferencia abismal del total es el **prewarm crudo** (prod tiene datos reales con anchos horneados w=800/1200/1920 + heroImage original; el stub demo usaba w=800 y tampoco se optimizaba).

## Recomendaciones nuevas (por impacto)

1. **(P0, ~3 MB fríos)** Prewarm *width-aware*: pasar las URLs por `optimizeImageUrl` (cap móvil 400 / calidad 60) antes de `preloadAll`/`preloadBatch`, o prewarmear solo uploads locales + LCP. Elimina el 93 % de sobre-descarga en móvil.
2. **(P1, CLS 0.015→0)** Fuentes: precargar los woff2 del hero y declarar fallback con `size-adjust` para que el swap de Playfair Display no reflowe el hero; o self-host con `font-display: swap` + métricas de fallback.
3. **(P1, ~925 KB)** `dotlottie-player.wasm` (jsdelivr) + `cake.lottie`: self-host y/o cargar solo al abrir el asistente (idle tras interacción), no en el arranque del home.
4. **(P2, LCP 10.9 s)** El LCP es texto del hero que renderiza tarde en frío: revisar la animación de entrada del contenido central bajo CPU throttled y priorizar fuentes/JS del primer paint (el wasm/lottie del punto 3 compite en el arranque).

*Pendiente: ejecutar el punto 1 y re-medir con Lighthouse (objetivo: imágenes frías < 400 KB móvil y CLS ≈ 0).*

