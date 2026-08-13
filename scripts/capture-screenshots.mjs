/**
 * ═══════════════════════════════════════════════════════════════════
 * MAISON ROSAS — Captura de screenshots oficiales
 * ═══════════════════════════════════════════════════════════════════
 * Genera las capturas de la carpeta /screenshots desde la web
 * desplegada (o local), usando el navegador Edge/Chrome del sistema
 * (no descarga navegadores).
 *
 * Requisitos:
 *   1. Tener Edge o Chrome instalado en el sistema.
 *   2. Instalar playwright-core (solo para desarrollo, no se guarda):
 *        npm i --no-save --package-lock=false playwright-core
 *
 * Uso:
 *   # Web desplegada en Vercel (por defecto)
 *   node scripts/capture-screenshots.mjs
 *
 *   # Servidor local (cliente + API corriendo)
 *   SCREENSHOT_BASE=http://localhost:3000 node scripts/capture-screenshots.mjs
 *
 * Salida: /screenshots/*.png (assets de presentación, se versionan en git)
 * ═══════════════════════════════════════════════════════════════════
 */

import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../screenshots');
const BASE = (process.env.SCREENSHOT_BASE || 'https://webhermanos-client.vercel.app').replace(/\/+$/, '');

// Edge y Chrome se detectan automáticamente por ruta estándar (Windows/macOS/Linux).
const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/microsoft-edge',
  '/usr/bin/microsoft-edge-stable',
];
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
];

function findBrowser() {
  for (const p of [...EDGE_CANDIDATES, ...CHROME_CANDIDATES]) {
    if (fs.existsSync(p)) return p;
  }
  console.error('❌ No se encontró Edge ni Chrome. Instala uno de ellos o pasa la ruta vía BROWSER_PATH.');
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH || findBrowser(),
  headless: true,
});

async function shot(name, url, viewport, { fullPage = false, scale = 1 } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000); // fuentes + config desde la API
    try { await page.waitForSelector('#catalogo', { timeout: 15000 }); } catch { /* tolerante */ }
    await page.waitForTimeout(2500); // animaciones de entrada
    await page.screenshot({ path: path.join(OUT_DIR, name), fullPage });
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
  } finally {
    await context.close();
  }
}

async function elementShot(name, url, selector, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000);
    await page.waitForSelector(selector, { timeout: 20000 });
    await page.waitForTimeout(2500);
    const el = await page.$(selector);
    await el.screenshot({ path: path.join(OUT_DIR, name) });
    console.log(`✅ ${name} (elemento ${selector})`);
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
  } finally {
    await context.close();
  }
}

console.log(`📸 Capturando desde: ${BASE}\n`);

// home y mobile: vista de pantalla (viewport) para mostrar en el README.
await shot('home.png', `${BASE}/`, { width: 1280, height: 800 });
await elementShot('catalog.png', `${BASE}/`, '#catalogo', { width: 1280, height: 800 });
await shot('tracking.png', `${BASE}/tracking`, { width: 1280, height: 800 });
await shot('mobile-home.png', `${BASE}/`, { width: 390, height: 844 });

await browser.close();
console.log('\n✅ Capturas guardadas en /screenshots');
