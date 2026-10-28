import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app';
import { openResultsStore } from './results-store';

const port = Number(process.env.PORT ?? 3001);
const dataDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
mkdirSync(dataDirectory, { recursive: true });

const store = openResultsStore(join(dataDirectory, 'results.db'));
const app = buildApp({ store, trustProxy: process.env.TRUST_PROXY === 'true' });
app.addHook('onClose', () => {
  store.close();
});
await app.listen({ host: '127.0.0.1', port });
console.warn(`API listening on http://127.0.0.1:${port}`);
