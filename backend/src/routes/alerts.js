/**
 * Alerts API Router for FinGuard Sentinel
 */

import express from 'express';
import { db } from '../database.js';
import { authenticateToken } from './auth.js';
import { alertService } from '../services/alerts.js';

export const alertsRouter = express.Router();

// GET /api/alerts
alertsRouter.get('/', authenticateToken, (req, res) => {
  const { status, severity, limit, offset } = req.query;
  const result = db.getAlerts({
    status,
    severity,
    limit: parseInt(limit, 10) || 50,
    offset: parseInt(offset, 10) || 0
  });
  res.json(result);
});

// GET /api/alerts/unread-count
alertsRouter.get('/unread-count', authenticateToken, (req, res) => {
  const alerts = db.getAlerts({ limit: 1000 }).alerts;
  const unread = alerts.filter(a => a.status === 'New').length;
  res.json({ unread_count: unread });
});

// PUT /api/alerts/:id/status
alertsRouter.put('/:id/status', authenticateToken, (req, res) => {
  const { status, note } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  const updated = alertService.updateAlertStatus(req.params.id, status, req.user, note);
  if (!updated) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  res.json({ success: true, alert: updated });
});
