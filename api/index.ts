import { createRequire } from 'node:module';
import type { Express } from 'express';

const require = createRequire(import.meta.url);
const mod = require('./bundle.cjs') as Express | { default: Express };
const app = (typeof mod === 'function' ? mod : mod.default) as Express;

export default app;
