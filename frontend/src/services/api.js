/**
 * Central API Client for FinGuard Sentinel Frontend
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getStoredToken() {
  return localStorage.getItem('finguard_token') || '';
}

export function setStoredToken(token) {
  if (token) localStorage.setItem('finguard_token', token);
  else localStorage.removeItem('finguard_token');
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('finguard_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('finguard_user', JSON.stringify(user));
  else localStorage.removeItem('finguard_user');
}

import { handleMockRequest } from './mockFallback.js';

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      setStoredToken('');
      setStoredUser(null);
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    if (!response.ok) {
      // If 404 (static host missing API) or server error, use high-fidelity mock fallback
      if (response.status === 404 || response.status >= 500) {
        try {
          return handleMockRequest(endpoint, options);
        } catch (mockErr) {
          throw mockErr;
        }
      }

      let errorMsg = `Error ${response.status}: ${response.statusText}`;
      try {
        const errData = await response.json();
        errorMsg = errData.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    // Check if response is a blob/file download
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('application/pdf') || contentType.includes('text/csv'))) {
      return response.blob();
    }

    return await response.json();
  } catch (networkOrFetchErr) {
    // If backend server cannot be reached, serve instant offline mock data
    console.warn(`[FinShield] Backend offline (${endpoint}). Using mock fallback.`);
    return handleMockRequest(endpoint, options);
  }
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }),
  signup: (userData) => request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  googleLogin: (email, name, role) => request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ email, name, role })
  }),
  requestPasswordReset: (emailOrUsername) => request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ emailOrUsername })
  }),
  resetPassword: (emailOrUsername, code, newPassword) => request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ emailOrUsername, code, newPassword })
  }),
  getMe: () => request('/auth/me'),
  getUsers: () => request('/auth/users'),
  approveUser: (username) => request(`/auth/users/${encodeURIComponent(username)}/approve`, { method: 'POST' }),
  deleteUser: (username) => request(`/auth/users/${encodeURIComponent(username)}`, { method: 'DELETE' }),

  // Stats / Overview
  getOverviewStats: () => request('/stats/overview'),

  // Ads
  getAds: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/ads?${q}`);
  },
  getAd: (id) => request(`/ads/${id}`),
  getAdEvidence: (id) => request(`/ads/${id}/evidence`),
  submitAdFeedback: (id, action, label, notes) => request(`/ads/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ action, label, notes })
  }),
  addAdNote: (id, note) => request(`/ads/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note })
  }),

  // Alerts
  getAlerts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/alerts?${q}`);
  },
  getUnreadAlertsCount: () => request('/alerts/unread-count'),
  updateAlertStatus: (id, status, note = '') => request(`/alerts/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, note })
  }),

  // Campaigns
  getCampaigns: () => request('/campaigns'),
  getCampaign: (id) => request(`/campaigns/${id}`),

  // Network Graph
  getGraphData: (campaignId = null, maxAds = 120) => {
    const params = new URLSearchParams();
    if (campaignId) params.append('campaignId', campaignId);
    if (maxAds) params.append('maxAds', maxAds);
    return request(`/graph?${params.toString()}`);
  },

  // Entities
  searchEntity: (query) => request(`/entities/search?q=${encodeURIComponent(query)}`),
  unmaskEntity: (adId, clueType, normalizedValue, reason) => request('/entities/unmask', {
    method: 'POST',
    body: JSON.stringify({ adId, clueType, normalizedValue, reason })
  }),

  // Sandbox / Live Analysis
  analyzePost: (formData) => request('/analyze', {
    method: 'POST',
    body: formData
  }),

  // Reports
  downloadPdf: async (adId) => {
    const blob = await request(`/reports/ad/${adId}/pdf`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FinGuard_Evidence_${adId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
  downloadAdsCsv: async (campaignId = null, riskLevel = null) => {
    const params = new URLSearchParams();
    if (campaignId) params.append('campaignId', campaignId);
    if (riskLevel) params.append('riskLevel', riskLevel);
    const blob = await request(`/reports/ads/csv?${params.toString()}`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'FinGuard_Suspect_Ads.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
  downloadCampaignsCsv: async () => {
    const blob = await request('/reports/campaigns/csv');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'FinGuard_Syndicates.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  // Rules & Retraining
  getRules: () => request('/rules'),
  updateRuleWeights: (ruleWeights) => request('/rules/weights', {
    method: 'PUT',
    body: JSON.stringify({ ruleWeights })
  }),
  retrainModel: () => request('/rules/retrain', {
    method: 'POST'
  }),

  // Audit Logs
  getAuditLogs: (limit = 100) => request(`/audit?limit=${limit}`),

  // Ingestion
  submitManualPost: (formData) => request('/ingest/manual', {
    method: 'POST',
    body: formData
  }),

  // Google Gemini AI Intelligence
  geminiStatus: () => request('/gemini/status'),
  geminiSetKey: (apiKey, model = 'gemini-1.5-flash') => request('/gemini/set-key', {
    method: 'POST',
    body: JSON.stringify({ apiKey, model })
  }),
  geminiAnalyze: (data) => request('/gemini/analyze', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  geminiChat: (message, history = [], role = 'Investigator') => request('/gemini/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history, role })
  }),

  // Multimodal OCR Scanning Engine
  ocrStatus: () => request('/ocr/status'),
  scanImageOcr: (formDataOrBase64, engine = 'auto') => {
    if (formDataOrBase64 instanceof FormData) {
      if (engine && !formDataOrBase64.has('engine')) {
        formDataOrBase64.append('engine', engine);
      }
      return request('/ocr/scan', {
        method: 'POST',
        body: formDataOrBase64
      });
    } else {
      return request('/ocr/scan', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: formDataOrBase64,
          engine
        })
      });
    }
  }
};
