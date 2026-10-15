import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';

class Database {
  constructor() {
    this.dataFile = CONFIG.DB_FILE;
    this.state = {
      users: [...CONFIG.DEFAULT_USERS],
      ads: [],
      alerts: [],
      campaigns: [],
      entities: {},
      auditLogs: [],
      feedback: [],
      rules: null
    };
    this.init();
  }

  init() {
    if (!fs.existsSync(CONFIG.DATA_DIR)) {
      fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
      fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
    }
    if (fs.existsSync(this.dataFile)) {
      try {
        const raw = fs.readFileSync(this.dataFile, 'utf8');
        const parsed = JSON.parse(raw);
        this.state = {
          ...this.state,
          ...parsed,
          users: parsed.users?.length ? parsed.users : [...CONFIG.DEFAULT_USERS]
        };
      } catch (err) {
        console.error('Failed to load existing database file, initializing fresh store:', err.message);
        this.save();
      }
    } else {
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving database:', err.message);
    }
  }

  // Users
  getUserByUsername(username) {
    let q = (username || '').toLowerCase().trim();
    if (q === 'analyst') q = 'victim';
    if (q === 'officer') q = 'investigator';
    return this.state.users.find(u => 
      u.username.toLowerCase() === q || 
      (u.email && u.email.toLowerCase() === q)
    );
  }

  getUserById(id) {
    return this.state.users.find(u => u.id === id);
  }

  updateUserPassword(usernameOrEmail, newPasswordHash) {
    const q = (usernameOrEmail || '').toLowerCase().trim();
    const user = this.state.users.find(u => 
      u.username.toLowerCase() === q || 
      (u.email && u.email.toLowerCase() === q)
    );
    if (user) {
      user.passwordHash = newPasswordHash;
      this.save();
      return user;
    }
    return null;
  }

  createUser(userData) {
    this.state.users.push(userData);
    this.save();
    return userData;
  }

  getAllUsers() {
    return this.state.users.map(({ passwordHash, securityAnswerHash, ...u }) => u);
  }

  approveUser(username) {
    const q = (username || '').toLowerCase().trim();
    const user = this.state.users.find(u => u.username.toLowerCase() === q);
    if (user) {
      user.approved = true;
      this.save();
      return user;
    }
    return null;
  }

  deleteUser(username) {
    const q = (username || '').toLowerCase().trim();
    const idx = this.state.users.findIndex(u => u.username.toLowerCase() === q);
    if (idx !== -1) {
      const removed = this.state.users.splice(idx, 1)[0];
      this.save();
      return removed;
    }
    return null;
  }

  // Ads
  getAds({ category, riskLevel, platform, search, campaignId, limit = 50, offset = 0, sort = 'newest' } = {}) {
    let result = [...this.state.ads];

    if (category) {
      result = result.filter(ad => ad.categories?.includes(category));
    }
    if (riskLevel) {
      result = result.filter(ad => ad.risk_level?.toLowerCase() === riskLevel.toLowerCase());
    }
    if (platform) {
      result = result.filter(ad => ad.platform?.toLowerCase() === platform.toLowerCase());
    }
    if (campaignId) {
      result = result.filter(ad => ad.campaign_id === campaignId);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(ad => 
        ad.text?.toLowerCase().includes(q) ||
        ad.username?.toLowerCase().includes(q) ||
        ad.id?.toLowerCase().includes(q) ||
        ad.clues?.some(c => c.value?.toLowerCase().includes(q))
      );
    }

    if (sort === 'risk_desc') {
      result.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
    } else if (sort === 'oldest') {
      result.sort((a, b) => new Date(a.posted_at) - new Date(b.posted_at));
    } else {
      // newest
      result.sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
    }

    const total = result.length;
    const paginated = result.slice(offset, offset + limit);
    return { total, ads: paginated, limit, offset };
  }

  getAdById(id) {
    return this.state.ads.find(a => a.id === id);
  }

  setAds(adsList) {
    this.state.ads = adsList;
    this.save();
  }

  setAlerts(alertsList) {
    this.state.alerts = alertsList;
    this.save();
  }

  addAd(ad) {
    const existingIndex = this.state.ads.findIndex(a => a.content_hash === ad.content_hash || a.id === ad.id);
    if (existingIndex >= 0) {
      this.state.ads[existingIndex] = { ...this.state.ads[existingIndex], ...ad };
      this.save();
      return this.state.ads[existingIndex];
    }
    this.state.ads.unshift(ad);
    this.save();
    return ad;
  }

  updateAd(id, updates) {
    const ad = this.state.ads.find(a => a.id === id);
    if (!ad) return null;
    Object.assign(ad, updates);
    this.save();
    return ad;
  }

  // Alerts
  getAlerts({ status, severity, limit = 50, offset = 0 } = {}) {
    let result = [...this.state.alerts];
    if (status) {
      result = result.filter(al => al.status.toLowerCase() === status.toLowerCase());
    }
    if (severity) {
      result = result.filter(al => al.severity.toLowerCase() === severity.toLowerCase());
    }
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = result.length;
    const paginated = result.slice(offset, offset + limit);
    return { total, alerts: paginated, limit, offset };
  }

  getAlertById(id) {
    return this.state.alerts.find(a => a.id === id);
  }

  addAlert(alert) {
    this.state.alerts.unshift(alert);
    this.save();
    return alert;
  }

  updateAlert(id, updates) {
    const alert = this.state.alerts.find(a => a.id === id);
    if (!alert) return null;
    Object.assign(alert, updates);
    this.save();
    return alert;
  }

  // Campaigns
  getCampaigns() {
    return [...this.state.campaigns].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
  }

  getCampaignById(id) {
    return this.state.campaigns.find(c => c.id === id);
  }

  setCampaigns(campaigns) {
    this.state.campaigns = campaigns;
    this.save();
  }

  // Entities
  getEntity(key) {
    return this.state.entities[key] || null;
  }

  getAllEntities() {
    return this.state.entities;
  }

  setEntities(entities) {
    this.state.entities = entities;
    this.save();
  }

  // Audit Logs
  logAudit({ userId, username, role, action, targetType, targetId, details, ip = '127.0.0.1' }) {
    const entry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId,
      username,
      role,
      action,
      targetType,
      targetId,
      details,
      ip
    };
    this.state.auditLogs.unshift(entry);
    if (this.state.auditLogs.length > 2000) {
      this.state.auditLogs.pop();
    }
    this.save();
    return entry;
  }

  getAuditLogs(limit = 100) {
    return this.state.auditLogs.slice(0, limit);
  }

  // Feedback
  addFeedback(feedback) {
    this.state.feedback.push({
      ...feedback,
      id: `fb_${Date.now()}`,
      created_at: new Date().toISOString()
    });
    this.save();
  }

  getFeedback() {
    return this.state.feedback;
  }

  // Clear / Reset
  clearAll() {
    this.state.ads = [];
    this.state.alerts = [];
    this.state.campaigns = [];
    this.state.entities = {};
    this.state.auditLogs = [];
    this.state.feedback = [];
    this.save();
  }
}

export const db = new Database();
