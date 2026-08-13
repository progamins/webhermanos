# 📸 Capturas y video de presentación

Esta carpeta contiene los **assets de presentación** del proyecto: capturas reales
de la web desplegada y, próximamente, el video demo.

## Capturas

| Archivo | Qué muestra |
|---|---|
| `home.png` | Vista principal (hero) en escritorio |
| `catalog.png` | Sección de catálogo con filtros |
| `tracking.png` | Página de seguimiento de pedidos |
| `mobile-home.png` | Vista principal en móvil |

### Regenerar las capturas

Las capturas se generan con un navegador real (Edge/Chrome del sistema) contra
la web desplegada, usando `playwright-core` (no descarga navegadores):

```bash
# 1. Instalar playwright-core (solo para desarrollo, no se guarda en package.json)
npm i --no-save --package-lock=false playwright-core

# 2. Capturar desde la web desplegada
node scripts/capture-screenshots.mjs

#    o desde un servidor local (cliente + API corriendo)
SCREENSHOT_BASE=http://localhost:3000 node scripts/capture-screenshots.mjs
```

## 🎬 Video demo

Para añadir un video de presentación de la web en acción, tienes dos opciones:

**Opción A — Enlace externo (recomendado):** sube la grabación a YouTube o Loom
y pega el enlace en la sección "Demo en video" del `README.md` raíz:

```markdown
[▶️ Ver video demo](https://www.youtube.com/watch?v=TU_ID)
```

**Opción B — Archivo en el repositorio:** guarda el video como `media/demo.mp4`
y embeblelo en el README (GitHub lo reproduce):

```html
<video src="media/demo.mp4" controls poster="../screenshots/home.png" width="100%"></video>
```

> ⚠️ Mantén el video ligero (≤ 10 MB) si lo subes al repositorio.
> Para grabaciones largas, usa la Opción A.
