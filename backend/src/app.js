import { backendEnvPath } from './loadEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import mongoose from 'mongoose';

import uploadRouter from './routes/upload.js';
import jobsRouter   from './routes/jobs.js';
import authRouter   from './routes/auth.js';

const app        = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT || 3001);
const DB_NAME = process.env.MONGODB_DB || 'resumeforge';
const requiredEnv = [
  'MONGODB_URI',
  'JWT_SECRET',
  'AWS_REGION',
  'S3_BUCKET',
  'SQS_QUEUE_URL',
];

const missingEnv = requiredEnv.filter((name) => !process.env[name]?.trim());

if (missingEnv.length > 0) {
  console.error(`Missing backend env vars: ${missingEnv.join(', ')}`);
  process.exit(1);
}

console.log(`Loaded backend env from ${backendEnvPath}`);
console.log(`Backend Mongo database: ${DB_NAME}`);

// ── WebSocket ─────────────────────────────────────────────────────────────────
const wss     = new WebSocketServer({ server: httpServer });
const clients = new Map();   // jobId → ws

wss.on('connection', (ws, req) => {
  const jobId = new URL(req.url, 'http://x').searchParams.get('jobId');
  if (jobId) {
    clients.set(jobId, ws);
    console.log(`WS connected: ${jobId}`);
  }
  ws.on('close', () => clients.delete(jobId));
  ws.on('error', (e) => console.error('WS error', e));
});

export const pushProgress = (jobId, payload) => {
  const ws = clients.get(jobId);
  if (ws?.readyState === 1) ws.send(JSON.stringify(payload));
};

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',   authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/jobs',   jobsRouter);

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'hireforge-backend' });
});

// ── DB + Start ────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI, { dbName: DB_NAME })
  .then(() => {
    console.log('MongoDB connected');
    httpServer.listen(PORT, () => console.log(`Backend on http://localhost:${PORT}`));
  })
  .catch(err => { console.error(err); process.exit(1); });
