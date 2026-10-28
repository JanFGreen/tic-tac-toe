import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const sqliteImport = /(?:from\s+|import\s*\(\s*|import\s+|require\s*\(\s*)['"]node:sqlite['"]/;

function sourceFiles(): string[] {
  return readdirSync(serverDirectory, { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.tsx?$/.test(file))
    .map((file) => file.split('\\').join('/'));
}

describe('storage boundary', () => {
  it('only results-store.ts imports node:sqlite', () => {
    const importers = sourceFiles().filter((file) =>
      sqliteImport.test(readFileSync(join(serverDirectory, file), 'utf8')),
    );
    expect(importers).toEqual(['results-store.ts']);
  });
});
