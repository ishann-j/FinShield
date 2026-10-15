/**
 * FinGuard Sentinel - Main Backend Server Entrypoint
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import { db } from './database.js';
import { classifier } from './services/classifier.js';

// Routers
import { authRouter } from './routes/auth.js';
import { adsRouter } from './routes/ads.js';
import { alertsRouter } from './routes/alerts.js';
import { campaignsRouter } from './routes/campaigns.js';
import { graphRouter } from './routes/graph.js';
import { entitiesRouter } from './routes/entities.js';
import { analyzeRouter } from './routes/analyze.js';
import { reportsRouter } from './routes/reports.js';
import { statsRouter } from './routes/stats.js';
import { rulesRouter } from './routes/rules.js';
import { auditRouter } from './routes/audit.js';
import { ingestRouter } from './routes/ingest.js';
import { geminiRouter } from './routes/gemini.js';
import { ocrRouter } from './routes/ocr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static files (uploads & sample images)
app.use('/uploads', express.static(CONFIG.UPLOADS_DIR));
app.use('/data/images', express.static(path.join(CONFIG.DATA_DIR, 'sample_images')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/ads', adsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/graph', graphRouter);
app.use('/api/entities', entitiesRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/audit', auditRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/ocr', ocrRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'FinGuard Sentinel Core Engine',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    database_ads: db.getAds({ limit: 1 }).total,
    model_loaded: classifier.isTrained
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[FinGuard Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

process.on('uncaughtException', (err) => {
  console.error('[Server UncaughtException]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server UnhandledRejection]', reason);
});

// Try to auto-load classifier model
classifier.loadModel();

// Start Server
const server = app.listen(CONFIG.PORT, CONFIG.HOST, () => {
  console.log(`=======================================================`);
  console.log(`🛡️  FINGUARD SENTINEL INTELLIGENCE BACKEND READY`);
  console.log(`📡 URL: http://${CONFIG.HOST === '0.0.0.0' ? 'localhost' : CONFIG.HOST}:${CONFIG.PORT}`);
  console.log(`⚙️  Mode: Production / Prototype (Synthetic Data Only)`);
  console.log(`=======================================================`);
});

export default app;
