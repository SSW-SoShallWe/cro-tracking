import express from 'express';
import path from 'path';
import { config } from './config';
import { checkConnection } from './db';
import { eventsRouter } from './events';
import { reportRouter } from './report';
import { corsMiddleware, rateLimiter, trackingKeyCheck } from './middleware';

const app = express();
app.set('trust proxy', 1);

app.use(corsMiddleware);
app.use(express.json({ limit: '16kb' }));

// Tracking key + rate limit only on event ingestion
app.use('/events', rateLimiter, trackingKeyCheck);

app.use(eventsRouter);
app.use(reportRouter);

// Serve tracker script
app.get('/ab.js', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../tracker/ab.js'));
});

// Serve demo pages in development
if (process.env.NODE_ENV !== 'production') {
  app.use('/demo', express.static(path.join(__dirname, '../../demo')));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  try {
    await checkConnection();
    console.log('Connected to PostgreSQL');
  } catch (err) {
    console.error('Could not connect to PostgreSQL:', err);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`CRO Tracker API running on port ${config.port}`);
  });
}

start();
