/**
 * ════════════════════════════════════════════════════════════════
 * MAISON ROSAS — Upload local images to Vercel
 * ════════════════════════════════════════════════════════════════
 * 
 * Este script sube todas las imágenes de server/uploads/ a Vercel
 * a través de la API de upload. Debe ejecutarse LOCALMENTE.
 * 
 * Uso: node scripts/upload-local-images.mjs
 * 
 * Requisitos:
 *   1. El servidor de Vercel debe estar funcionando
 *   2. Variables de entorno ADMIN_SECRET_PATH y ADMIN_DEFAULT_PASSWORD
 *      deben estar configuradas en .env
 * ════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../server/uploads');
const API_BASE = process.env.API_URL || 'https://webhermanos-client.vercel.app/api';
// 🔒 Sin valores por defecto: las credenciales se exigen en el entorno.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ADMIN_DEFAULT_PASSWORD || '';
const ADMIN_SECRET_PATH = process.env.ADMIN_SECRET_PATH || '';
if (!ADMIN_PASSWORD || !ADMIN_SECRET_PATH) {
  console.error('❌ Falta ADMIN_PASSWORD (o ADMIN_DEFAULT_PASSWORD) y ADMIN_SECRET_PATH en el entorno.');
  console.error('   Configúralos en tu .env antes de ejecutar el script.');
  process.exit(1);
}

async function login() {
  console.log(`🔐 Iniciando sesión como admin...`);
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD, role: 'admin' }),
  });
  const data = await res.json();
  if (!data.success || !data.token) {
    throw new Error(`Error al iniciar sesión: ${data.error || 'No token'}`);
  }
  console.log(`  ✅ Sesión iniciada: token ${data.token.slice(0, 12)}...`);
  return data.token;
}

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

async function uploadFile(filePath, token) {
  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_MAP[ext] || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append('image', blob, filename);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'x-admin-token': token },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Error HTTP ${res.status}: ${data.error || res.statusText}`);
  }
  return data;
}

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  MAISON ROSAS — Upload de imágenes locales');
  console.log('══════════════════════════════════════════════\n');

  // 1. Verificar que existe el directorio
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error(`❌ Directorio no encontrado: ${UPLOADS_DIR}`);
    process.exit(1);
  }

  // 2. Listar archivos
  const files = fs.readdirSync(UPLOADS_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'].includes(ext);
  });

  if (files.length === 0) {
    console.log('  No hay imágenes para subir.');
    process.exit(0);
  }

  console.log(`  📸 ${files.length} imágenes encontradas en ${UPLOADS_DIR}\n`);

  // 3. Login
  let token;
  try {
    token = await login();
  } catch (err) {
    console.error(`❌ ${err.message}`);
    console.error('  Asegúrate de que el servidor de Vercel esté funcionando y las credenciales sean correctas.');
    process.exit(1);
  }

  // 4. Subir cada archivo
  let successCount = 0;
  let errorCount = 0;

  for (const [index, file] of files.entries()) {
    const filePath = path.join(UPLOADS_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    
    process.stdout.write(`  [${index + 1}/${files.length}] 📤 ${file} (${sizeKB} KB)... `);

    try {
      const result = await uploadFile(filePath, token);
      console.log(`✅ → ${result.imageUrl?.slice(0, 60) || 'ok'}`);
      successCount++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      errorCount++;
    }
  }

  // 5. Resumen
  console.log('\n══════════════════════════════════════════════');
  console.log(`  ✅ ${successCount} imágenes subidas correctamente`);
  if (errorCount > 0) console.log(`  ❌ ${errorCount} errores`);
  console.log('══════════════════════════════════════════════\n');
  console.log('  ⚠️  NOTA: En Vercel sin Blob, las imágenes se guardan en /tmp');
  console.log('  que es TEMPORAL y se pierde al reiniciar la instancia.');
  console.log('  Para almacenamiento permanente, configura Vercel Blob:\n');
  console.log('  1. https://vercel.com/dashboard/stores/blob');
  console.log('  2. Crea un store y copia BLOB_READ_WRITE_TOKEN');
  console.log('  3. Agrégalo en las Environment Variables de Vercel\n');
}

main().catch(err => {
  console.error(`\n❌ Error general: ${err.message}`);
  process.exit(1);
});
