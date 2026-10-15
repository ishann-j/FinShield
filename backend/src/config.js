import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 5050,
  HOST: process.env.HOST || '0.0.0.0',
  JWT_SECRET: process.env.JWT_SECRET || 'finguard_sentinel_hyper_secure_jwt_token_2026',
  JWT_EXPIRY: '24h',
  DATA_DIR: path.join(__dirname, '../data'),
  UPLOADS_DIR: path.join(__dirname, '../uploads'),
  DB_FILE: path.join(__dirname, '../data/finguard_store.json'),
  MODEL_FILE: path.join(__dirname, '../data/trained_model.json'),
  SYNTHETIC_DATA_FILE: path.join(__dirname, '../data/synthetic_ads.json'),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  
  ROLES: {
    ADMIN: 'Admin',
    VICTIM: 'Victim',
    INVESTIGATOR: 'Investigator',
    // Compatibility aliases
    ANALYST: 'Victim',
    OFFICER: 'Investigator',
    CITIZEN: 'Victim'
  },
  
  DEFAULT_USERS: [
    {
      id: 'usr_admin_01',
      username: 'admin',
      email: 'admin@finguard.soc',
      passwordHash: '$2a$10$wT8vM9gX51Lq6pDkHQ2wz.gT2Y6W7W0o8cKl7C.e7E5sW5B/4W7mS', // Admin@123
      name: 'Aditya Roy (Director)',
      role: 'Admin',
      badge: 'FG-ADM-001'
    },
    {
      id: 'usr_victim_01',
      username: 'victim',
      email: 'victim@finguard.soc',
      passwordHash: '$2a$10$wT8vM9gX51Lq6pDkHQ2wz.gT2Y6W7W0o8cKl7C.e7E5sW5B/4W7mS', // Victim@123 / Admin@123
      name: 'Priya Sharma (Victim / Citizen)',
      role: 'Victim',
      badge: 'FG-VIC-104'
    },
    {
      id: 'usr_investigator_01',
      username: 'investigator',
      email: 'investigator@finguard.soc',
      passwordHash: '$2a$10$wT8vM9gX51Lq6pDkHQ2wz.gT2Y6W7W0o8cKl7C.e7E5sW5B/4W7mS', // Investigator@123 / Admin@123
      name: 'Vikram Singh (Cyber Crime Investigator)',
      role: 'Investigator',
      badge: 'FG-INV-992'
    }
  ],
  
  DISCLAIMER: 'FinGuard Sentinel Prototype - Synthetic Data Only. Flags are indicators for investigation, not proof of guilt.'
};
