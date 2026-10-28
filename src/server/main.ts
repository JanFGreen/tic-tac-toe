import { buildApp } from './app';

const port = Number(process.env.PORT ?? 3001);
const app = buildApp();
await app.listen({ host: '127.0.0.1', port });
console.warn(`API listening on http://127.0.0.1:${port}`);
