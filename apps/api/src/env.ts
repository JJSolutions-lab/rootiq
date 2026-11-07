import { config } from 'dotenv';
import { resolve } from 'node:path';

// Supports both workspace development (apps/api) and production launches from
// the repository root. Environment variables configured by the host still win.
config({
  path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
});
