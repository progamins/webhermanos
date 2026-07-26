#!/usr/bin/env node

/**
 * Professional Semantic Versioning Manager for Maison Rosas
 *
 * Usage:
 *   node scripts/version.mjs patch                          → bumps PATCH (1.0.0 → 1.0.1)
 *   node scripts/version.mjs minor                          → bumps MINOR (1.0.0 → 1.1.0)
 *   node scripts/version.mjs major                          → bumps MAJOR (1.0.0 → 2.0.0)
 *   node scripts/version.mjs prerelease alpha               → adds pre-release (1.0.0 → 1.0.1-alpha.0)
 *   node scripts/version.mjs show                           → prints current version
 *   node scripts/version.mjs patch --dry-run                → preview changes without writing
 *   node scripts/version.mjs patch --tag                    → bump + create git tag
 *   node scripts/version.mjs patch --changelog              → bump + auto-update CHANGELOG.md
 *   node scripts/version.mjs patch --release                → bump + tag + changelog (full release)
 *   node scripts/version.mjs patch --no-verify              → skip git dirty check
 *
 * Use with npm: `npm run version:patch`, `npm run version:minor`, etc.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── File paths ───
const PKG_FILES = [
  path.join(ROOT, 'package.json'),         // root workspace
  path.join(ROOT, 'client', 'package.json'),
  path.join(ROOT, 'server', 'package.json'),
];
const LOCKFILE = path.join(ROOT, 'package-lock.json');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');

// ─── ANSI colors (no deps) ───
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function info(msg)  { console.log(`${C.green}${msg}${C.reset}`); }
function warn(msg)  { console.log(`${C.yellow}${msg}${C.reset}`); }
function error(msg) { console.error(`${C.red}${msg}${C.reset}`); }
function highlight(msg) { return `${C.cyan}${msg}${C.reset}`; }

// ─── CLI flags ───
const args = process.argv.slice(2);
const cmd = args[0] || '';
const flags = new Set();
let arg = ''; // first positional arg after command

for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    flags.add(a.slice(2));
  } else if (!arg) {
    arg = a;
  }
}

const FLAG = {
  DRY_RUN: flags.has('dry-run') || flags.has('dryrun'),
  TAG: flags.has('tag'),
  NO_TAG: flags.has('no-tag'),
  CHANGELOG: flags.has('changelog'),
  RELEASE: flags.has('release'),
  NO_VERIFY: flags.has('no-verify') || flags.has('force'),
};

// --release implies --tag + --changelog
if (FLAG.RELEASE) {
  FLAG.TAG = true;
  FLAG.CHANGELOG = true;
}

// ─── Helpers ───

function readPkg(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writePkg(file, json) {
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf-8');
  info(`  ✓ Updated ${path.relative(ROOT, file)}`);
}

function parseVersion(v) {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) throw new Error(`Invalid semver: ${v}`);
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
    pre: match[4] || null,
  };
}

function formatVersion({ major, minor, patch, pre }) {
  return `${major}.${minor}.${patch}${pre ? '-' + pre : ''}`;
}

function exec(cmdStr) {
  try {
    return execSync(cmdStr, { cwd: ROOT, encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function hasGit() {
  return exec('git --version') !== null;
}

function getLastTag() {
  return exec('git describe --tags --abbrev=0 2>/dev/null');
}

function getGitLog(from) {
  if (!from) return exec(`git log --oneline --no-decorate HEAD`);
  return exec(`git log --oneline --no-decorate ${from}..HEAD`);
}

// ─── Workspace version validation ───

function validateWorkspaceVersions() {
  const versions = PKG_FILES.map(f => ({
    file: path.relative(ROOT, f),
    version: readPkg(f).version,
  }));

  const unique = new Set(versions.map(v => v.version));
  if (unique.size > 1) {
    warn('\n⚠  Workspace versions are OUT OF SYNC!');
    for (const v of versions) {
      warn(`   ${v.file}: ${v.version}`);
    }
    warn('   The bump will overwrite all to the new version.\n');
  }
  return versions[0].version; // return root version
}

// ─── Git pre-checks ───

function checkGitStatus() {
  if (!hasGit()) {
    warn('⚠  git not found — skipping git-related checks');
    return true;
  }

  if (FLAG.NO_VERIFY) return true;

  const status = exec('git status --porcelain');
  if (status) {
    const lines = status.split('\n').filter(Boolean);
    // Allow version.mjs itself and CHANGELOG.md to be dirty (we're about to modify them)
    const relevant = lines.filter(l => {
      const file = l.slice(3).trim();
      return file !== 'scripts/version.mjs' && file !== 'CHANGELOG.md' && !file.startsWith('package');
    });
    if (relevant.length > 0) {
      error('❌ Working tree has uncommitted changes!');
      for (const l of relevant) {
        error(`   ${l}`);
      }
      error('\n   Commit or stash them first, or use --no-verify to force.');
      return false;
    }
  }
  return true;
}

// ─── package-lock.json updater ───

function updateLockfile(oldVersion, newVersion) {
  if (!fs.existsSync(LOCKFILE)) {
    warn('⚠  package-lock.json not found — skipping');
    return;
  }

  // NOTE: This function is called AFTER package.json files have been updated
  // to the newVersion. That's fine — we only read the `name` field from them
  // (which doesn't change), and compare lockfile versions against oldVersion.

  const content = fs.readFileSync(LOCKFILE, 'utf-8');
  const lock = JSON.parse(content);

  // Pre-build a map of package name → file path for matching workspace entries
  const pkgNameMap = new Map();
  for (const f of PKG_FILES) {
    try {
      const p = JSON.parse(fs.readFileSync(f, 'utf-8'));
      if (p.name) pkgNameMap.set(p.name, f);
    } catch { /* skip unparseable */ }
  }

  // 1. Update root package version (top-level)
  if (lock.version === oldVersion) {
    lock.version = newVersion;
  }

  // 2. Update root workspace entry in "packages" (key: "")
  if (lock.packages?.['']?.version === oldVersion) {
    lock.packages[''].version = newVersion;
  }

  // 3. Update workspace entries by path keys (e.g. "client", "server")
  //    and by node_modules/<name> keys
  const workspaceDirs = new Set(PKG_FILES.map(f => path.relative(ROOT, path.dirname(f))));

  for (const [key, value] of Object.entries(lock.packages || {})) {
    if (value?.version !== oldVersion) continue;

    const isWorkspaceKey = key === '' || workspaceDirs.has(key) || key.startsWith('node_modules/');
    if (!isWorkspaceKey) continue;

    // Root already handled above; for other entries, verify it's one of our workspaces
    if (key !== '') {
      const name = value.name || '';
      if (!pkgNameMap.has(name)) continue;
    }

    value.version = newVersion;
  }

  fs.writeFileSync(LOCKFILE, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
  info(`  ✓ Updated ${path.relative(ROOT, LOCKFILE)}`);
}

// ─── Changelog updater ───

function updateChangelog(version, gitLog) {
  if (!fs.existsSync(CHANGELOG)) {
    warn('⚠  CHANGELOG.md not found — creating one');
    const header = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n`;
    fs.writeFileSync(CHANGELOG, header, 'utf-8');
  }

  const today = new Date().toISOString().slice(0, 10);
  let notes = '';
  let hasUnreleased = false;

  // Classify commits by conventional commit type
  if (gitLog) {
    const lines = gitLog.split('\n').filter(Boolean);
    const categories = {
      feat: [],
      fix: [],
      chore: [],
      refactor: [],
      perf: [],
      docs: [],
      style: [],
      test: [],
      security: [],
      other: [],
    };

    for (const line of lines) {
      const match = line.match(/^[a-f0-9]+ (.+)$/);
      if (!match) continue;
      const msg = match[1];
      const typeMatch = msg.match(/^(feat|fix|chore|refactor|perf|docs|style|test|security)(?:\(([^)]+)\))?[:!]\s*(.+)$/i);
      if (typeMatch) {
        const type = typeMatch[1].toLowerCase();
        const scope = typeMatch[2] ? `**${typeMatch[2]}**: ` : '';
        const desc = typeMatch[3];
        if (categories[type]) {
          categories[type].push(`- ${scope}${desc}`);
        } else {
          categories.other.push(`- ${msg}`);
        }
      } else {
        categories.other.push(`- ${msg}`);
      }
    }

    const categoryLabels = {
      feat: 'Added',
      fix: 'Fixed',
      chore: 'Changed',
      refactor: 'Changed',
      perf: 'Changed',
      docs: 'Changed',
      style: 'Changed',
      test: 'Changed',
      security: 'Security',
      other: 'Changed',
    };

    for (const [cat, items] of Object.entries(categories)) {
      if (items.length > 0) {
        const label = categoryLabels[cat] || 'Changed';
        notes += `### ${label}\n\n`;
        notes += items.join('\n') + '\n\n';
      }
    }

    if (!notes) {
      notes = '### Changed\n\n- Actualización general.\n\n';
    }
  }

  const newEntry = `## [${version}] - ${today}\n\n${notes}`;

  // Check if there's an [Unreleased] section we should insert before
  const content = fs.readFileSync(CHANGELOG, 'utf-8');
  const unreleasedMatch = content.match(/^## \[Unreleased\].*\n(?:[\s\S]*?)(?=^## )/m);

  let newContent;
  if (unreleasedMatch) {
    // Insert after [Unreleased] section
    newContent = content.replace(
      unreleasedMatch[0],
      `${unreleasedMatch[0].trimRight()}\n\n${newEntry}`
    );
    hasUnreleased = true;
  } else {
    // Insert after the first heading line
    const firstHeading = content.match(/^(# .+\n)/m);
    if (firstHeading) {
      newContent = content.replace(firstHeading[1], `${firstHeading[1]}\n${newEntry}`);
    } else {
      newContent = content + `\n${newEntry}`;
    }
  }

  fs.writeFileSync(CHANGELOG, newContent, 'utf-8');
  info(`  ✓ Updated ${path.relative(ROOT, CHANGELOG)}`);

  if (!hasUnreleased) {
    info(`  💡 Tip: add an [Unreleased] section at the top for future changes`);
  }
}

// ─── Git tag ───

function createGitTag(version) {
  if (!hasGit()) {
    warn('⚠  git not found — cannot create tag');
    return false;
  }

  const tagName = `v${version}`;
  const existing = exec(`git tag -l "${tagName}"`);
  if (existing) {
    warn(`⚠  Tag ${highlight(tagName)} already exists — skipping`);
    return false;
  }

  try {
    execSync(`git tag -a "${tagName}" -m "Release ${tagName}"`, { cwd: ROOT, encoding: 'utf-8' });
    info(`  ✓ Created git tag ${highlight(tagName)}`);
    return true;
  } catch (e) {
    error(`❌ Failed to create tag: ${e.message}`);
    return false;
  }
}

// ─── Show version info ───

function showVersionInfo() {
  const version = validateWorkspaceVersions();
  console.log(`\n${C.bold}Current version:${C.reset} ${highlight(version)}`);

  if (hasGit()) {
    const lastTag = getLastTag();
    if (lastTag) {
      console.log(`${C.dim}Last tag:${C.reset}       ${lastTag}`);
      const log = getGitLog(lastTag);
      if (log) {
        const count = log.split('\n').filter(Boolean).length;
        console.log(`${C.dim}Commits since:${C.reset}  ${count}`);
      }
    }
    const branch = exec('git branch --show-current');
    if (branch) console.log(`${C.dim}Branch:${C.reset}         ${branch}`);
  }

  console.log(`${C.dim}Lockfile:${C.reset}       ${fs.existsSync(LOCKFILE) ? highlight(path.relative(ROOT, LOCKFILE)) : 'not found'}`);
  console.log(`${C.dim}Changelog:${C.reset}      ${fs.existsSync(CHANGELOG) ? highlight(path.relative(ROOT, CHANGELOG)) : 'not found'}`);
  console.log();
}

// ══════════════════════════════════
//  MAIN
// ══════════════════════════════════

if (!cmd) {
  console.error(`Usage: node scripts/version.mjs <patch|minor|major|prerelease|show> [options]`);
  console.error(`\nCommands:`);
  console.error(`  ${C.bold}patch${C.reset}         Bump PATCH (1.0.0 → 1.0.1)`);
  console.error(`  ${C.bold}minor${C.reset}         Bump MINOR (1.0.0 → 1.1.0)`);
  console.error(`  ${C.bold}major${C.reset}         Bump MAJOR (1.0.0 → 2.0.0)`);
  console.error(`  ${C.bold}prerelease${C.reset}    Bump pre-release (1.0.0 → 1.0.1-alpha.0)`);
  console.error(`  ${C.bold}show${C.reset}          Show current version info`);
  console.error(`\nOptions:`);
  console.error(`  ${C.bold}--dry-run${C.reset}     Preview changes without writing`);
  console.error(`  ${C.bold}--tag${C.reset}         Create an annotated git tag (v{version})`);
  console.error(`  ${C.bold}--no-tag${C.reset}      Skip git tag creation (default)`);
  console.error(`  ${C.bold}--changelog${C.reset}   Auto-update CHANGELOG.md with release notes`);
  console.error(`  ${C.bold}--release${C.reset}     Full release: --tag + --changelog`);
  console.error(`  ${C.bold}--no-verify${C.reset}   Skip git dirty check`);
  process.exit(1);
}

// ─── show ───

if (cmd === 'show') {
  showVersionInfo();
  process.exit(0);
}

// ─── Bump logic ───

const current = validateWorkspaceVersions();
const parsed = parseVersion(current);

let next;
switch (cmd) {
  case 'patch':
    next = { ...parsed, patch: parsed.patch + 1, pre: null };
    break;
  case 'minor':
    next = { ...parsed, minor: parsed.minor + 1, patch: 0, pre: null };
    break;
  case 'major':
    next = { ...parsed, major: parsed.major + 1, minor: 0, patch: 0, pre: null };
    break;
  case 'prerelease':
    if (!arg) {
      error('prerelease requires a label (e.g. alpha, beta, rc).');
      process.exit(1);
    }
    if (parsed.pre) {
      const match = parsed.pre.match(/(.+?)\.(\d+)$/);
      if (match) {
        next = { ...parsed, pre: `${match[1]}.${parseInt(match[2]) + 1}` };
      } else {
        next = { ...parsed, pre: `${arg}.0` };
      }
    } else {
      next = { ...parsed, patch: parsed.patch + 1, pre: `${arg}.0` };
    }
    break;
  default:
    error(`Unknown command: ${cmd}`);
    process.exit(1);
}

const newVersion = formatVersion(next);

// ─── Git pre-flight check ───

if (!FLAG.DRY_RUN && !checkGitStatus()) {
  process.exit(1);
}

// ─── Get git log for release notes ───

let gitLog = null;
if ((FLAG.CHANGELOG || FLAG.RELEASE) && hasGit()) {
  const lastTag = getLastTag();
  if (lastTag) {
    gitLog = getGitLog(lastTag);
  } else {
    gitLog = getGitLog();
  }
}

// ─── Dry-run mode ───

if (FLAG.DRY_RUN) {
  console.log(`\n${C.bold}═══ DRY RUN ═══${C.reset}`);
  console.log(`  ${C.dim}Would bump:${C.reset}  ${current} → ${highlight(newVersion)}`);
  console.log(`  ${C.dim}Workspaces:${C.reset}  ${PKG_FILES.length} package.json files`);
  console.log(`  ${C.dim}Lockfile:${C.reset}    ${fs.existsSync(LOCKFILE) ? 'Would update' : 'N/A'}`);
  console.log(`  ${C.dim}Tag:${C.reset}         ${FLAG.TAG ? `Would create v${newVersion}` : 'No'}`);
  console.log(`  ${C.dim}Changelog:${C.reset}   ${FLAG.CHANGELOG ? `Would add [${newVersion}] entry` : 'No'}`);

  if (gitLog) {
    console.log(`\n  ${C.dim}Release notes preview:${C.reset}`);
    const lines = gitLog.split('\n').slice(0, 20);
    for (const line of lines) {
      console.log(`    ${C.gray}${line}${C.reset}`);
    }
    if (lines.length < gitLog.split('\n').length) {
      console.log(`    ${C.gray}... and more${C.reset}`);
    }
  }

  console.log(`\n  Run without --dry-run to apply.\n`);
  process.exit(0);
}

// ═══ Apply version bump ═══

console.log(`\n${C.bold}Version bump:${C.reset} ${current} → ${highlight(newVersion)}\n`);

// 1. Update package.json files
for (const file of PKG_FILES) {
  const pkg = readPkg(file);
  pkg.version = newVersion;
  writePkg(file, pkg);
}

// 2. Update package-lock.json
updateLockfile(current, newVersion);

// 3. Update CHANGELOG.md
if (FLAG.CHANGELOG) {
  updateChangelog(newVersion, gitLog);
}

// 4. Create git tag
if (FLAG.TAG) {
  createGitTag(newVersion);
}

// ─── Summary ───

console.log(`\n${C.bold}═══ Summary ═══${C.reset}`);
console.log(`  ${C.green}✓${C.reset} Version: ${current} → ${highlight(newVersion)}`);
if (FLAG.CHANGELOG) console.log(`  ${C.green}✓${C.reset} CHANGELOG.md updated`);
if (FLAG.TAG) console.log(`  ${C.green}✓${C.reset} Git tag created`);
console.log();

console.log(`${C.dim}Next steps:${C.reset}`);
console.log(`  ${C.gray}1. Review the changes:    git diff${C.reset}`);
console.log(`  ${C.gray}2. Stage everything:      git add -A${C.reset}`);
console.log(`  ${C.gray}3. Commit:                git commit -m "chore: bump version to ${newVersion}"${C.reset}`);
if (!FLAG.TAG) {
  console.log(`  ${C.gray}4. Tag (manual):          git tag -a v${newVersion} -m "Release v${newVersion}"${C.reset}`);
  console.log(`  ${C.gray}5. Push tags:             git push --follow-tags${C.reset}`);
} else {
  console.log(`  ${C.gray}4. Push tags:             git push --follow-tags${C.reset}`);
}
console.log();