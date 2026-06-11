import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const backendEnvPath = join(__dirname, '../.env');

dotenv.config({ path: backendEnvPath, override: true });
