/**
 * Network Graph API Router for Cytoscape.js Frontend
 */

import express from 'express';
import { db } from '../database.js';
import { authenticateToken } from './auth.js';
import { buildCytoscapeGraph } from '../services/graph.js';

export const graphRouter = express.Router();

// GET /api/graph
graphRouter.get('/', authenticateToken, (req, res) => {
  const { campaignId, maxAds } = req.query;
  const allAds = db.getAds({ limit: 1000 }).ads;
  const graphData = buildCytoscapeGraph(allAds, {
    campaignId: campaignId || null,
    maxAds: parseInt(maxAds, 10) || 120
  });

  res.json(graphData);
});
