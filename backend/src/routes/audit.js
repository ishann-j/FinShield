/**
 * Audit Log API Router for FinGuard Sentinel
 */

import express from 'express';
import { db } from '../database.js';
import { authenticateToken, requireRoles } from './auth.js';

export const auditRouter = express.Router();

// GET /api/audit
auditRouter.get('/', authenticateToken, requireRoles('Admin', 'Investigator', 'Officer'), (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  const logs = db.getAuditLogs(limit);
  res.json({ total: logs.length, logs });
});
