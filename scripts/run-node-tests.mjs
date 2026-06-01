import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const testRoot = path.resolve(process.argv[2] ?? 'dist');

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      yield fullPath;
    }
  }
}

const testFiles = [];

for await (const testFile of walk(testRoot)) {
  testFiles.push(testFile);
}

testFiles.sort();

if (testFiles.length === 0) {
  console.error(`No compiled test files found under ${testRoot}`);
  process.exit(1);
}

const child = spawn(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
