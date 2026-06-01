import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set([
  '.git',
  '.expo',
  '.expo-shared',
  'node_modules',
  'dist',
  'dist-test',
  'coverage',
  'DerivedData',
  'Pods',
]);
const textExtensions = new Set([
  '.cjs',
  '.css',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.yml',
  '.yaml',
]);
const serverOnlySecretNames = [
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'ANTHROPIC_API_KEY',
  'APNS_PRIVATE_KEY',
  'APNS_KEY_ID',
  'APNS_TEAM_ID',
  'FCM_SERVICE_ACCOUNT_JSON',
  'APP_STORE_SHARED_SECRET',
  'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON',
];
const requiredDocs = [
  'docs/adr/0001-technology-stack.md',
  'docs/local-development.md',
  'docs/security-and-secrets.md',
];

async function* walk(directory) {
  for (const entry of await readdir(directory)) {
    const fullPath = path.join(directory, entry);
    const relativePath = path.relative(root, fullPath);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      if (!ignoredDirectories.has(entry)) {
        yield* walk(fullPath);
      }
      continue;
    }

    if (stats.isFile() && textExtensions.has(path.extname(entry))) {
      yield relativePath;
    }
  }
}

function isMobileSource(relativePath) {
  return relativePath.startsWith(`apps${path.sep}mobile${path.sep}`);
}

const failures = [];

for (const docPath of requiredDocs) {
  try {
    await stat(path.join(root, docPath));
  } catch {
    failures.push(`Missing required foundation document: ${docPath}`);
  }
}

for await (const relativePath of walk(root)) {
  const contents = await readFile(path.join(root, relativePath), 'utf8');

  if (relativePath.includes('.env') && !relativePath.endsWith('.env.example')) {
    failures.push(`Committed environment file is not allowed: ${relativePath}`);
  }

  if (isMobileSource(relativePath)) {
    for (const secretName of serverOnlySecretNames) {
      if (contents.includes(secretName)) {
        failures.push(
          `Server-only secret name ${secretName} appears in mobile source: ${relativePath}`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Repository lint checks passed.');
