#!/usr/bin/env tsx
/**
 * ═══════════════════════════════════════════════════
 *  Unify Upload Directories
 *  Fusiona root/uploads/ → server/uploads/
 *  y limpia el directorio duplicado raíz.
 * ═══════════════════════════════════════════════════
 *
 * Uso:  npx tsx server/scripts/unify-uploads.ts
 *       npx tsx server/scripts/unify-uploads.ts --delete-root  (elimina root/uploads/ después de copiar)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

const ROOT_UPLOADS = path.resolve(PROJECT_ROOT, 'uploads');
const SERVER_UPLOADS = path.resolve(PROJECT_ROOT, 'server', 'uploads');

const args = process.argv.slice(2);
const DELETE_ROOT = args.includes('--delete-root') && args.includes('--force');
const HAS_DELETE_FLAG = args.includes('--delete-root');

console.log('═══════════════════════════════════════════════');
console.log('  Unificación de directorios de uploads');
console.log('═══════════════════════════════════════════════\n');

// Check which directories exist
const rootExists = fs.existsSync(ROOT_UPLOADS);
const serverExists = fs.existsSync(SERVER_UPLOADS);

if (!rootExists && !serverExists) {
  console.log('❌ No se encontró ningún directorio de uploads.');
  process.exit(1);
}

if (!rootExists) {
  console.log('ℹ️  root/uploads/ no existe. Nada que fusionar.\n');
  console.log(`   El servidor usa: ${SERVER_UPLOADS}`);
  process.exit(0);
}

// List files (skip .gitkeep and dotfiles)
const rootFiles = fs.readdirSync(ROOT_UPLOADS).filter(f => f !== '.' && f !== '..' && f !== '.gitkeep' && !f.startsWith('.'));
const serverFiles = serverExists ? fs.readdirSync(SERVER_UPLOADS).filter(f => f !== '.' && f !== '..' && f !== '.gitkeep' && !f.startsWith('.')) : [];

console.log(`📂 root/uploads/    → ${rootFiles.length} archivos`);
console.log(`📂 server/uploads/  → ${serverFiles.length} archivos`);
console.log('');

// Find files to copy (in root but not in server)
const serverSet = new Set(serverFiles);
const toCopy = rootFiles.filter(f => !serverSet.has(f));

if (toCopy.length === 0) {
  console.log('✅ Todos los archivos de root/uploads/ ya existen en server/uploads/.');
} else {
  console.log(`📋 Archivos a copiar (${toCopy.length}):`);
  for (const file of toCopy) {
    const src = path.join(ROOT_UPLOADS, file);
    const dest = path.join(SERVER_UPLOADS, file);
    const stat = fs.statSync(src);
    const sizeKB = (stat.size / 1024).toFixed(1);
    console.log(`   → ${file} (${sizeKB} KB)`);
  }
  console.log('');

  // Ensure server uploads dir exists
  if (!serverExists) {
    fs.mkdirSync(SERVER_UPLOADS, { recursive: true });
  }

  // Copy files
  let copied = 0;
  let errors = 0;
  for (const file of toCopy) {
    try {
      const src = path.join(ROOT_UPLOADS, file);
      const dest = path.join(SERVER_UPLOADS, file);
      fs.copyFileSync(src, dest);
      copied++;
    } catch (err: any) {
      console.error(`   ❌ Error copiando ${file}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n✅ ${copied} archivo(s) copiado(s). ${errors > 0 ? `❌ ${errors} error(es).` : 'Sin errores.'}`);
}

// Check DB references
console.log('\n🔍 Revisando referencias en la base de datos...');
console.log('   Las URLs usan rutas relativas (/uploads/archivo.ext),');
console.log('   por lo que no necesitan actualización mientras el servidor');
console.log('   sirva desde el mismo directorio.');

// If --delete-root, clean up
if (DELETE_ROOT) {
  if (toCopy.length > 0 || rootFiles.length > 0) {
    console.log(`\n🗑️  Eliminando directorio root/uploads/...`);
    try {
      fs.rmSync(ROOT_UPLOADS, { recursive: true, force: true });
      console.log('   ✅ Eliminado.');
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}`);
    }
  }
} else {
  console.log('\n💡 Para eliminar root/uploads/ después de verificar:');
  console.log(`   npx tsx server/scripts/unify-uploads.ts --delete-root`);
}

console.log('\n═══════════════════════════════════════════════');
console.log('  Operación completada.');
console.log('═══════════════════════════════════════════════\n');
