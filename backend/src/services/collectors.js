/**
 * Pluggable Collector Interface for FinGuard Sentinel
 * Includes BaseCollector, CSVCollector, JSONCollector, and compliant Stubs
 * for Telegram, X, Facebook/Instagram, OLX, and Underground Forums.
 * NOTE: Stubs must strictly comply with official APIs, public feeds,
 * robots.txt, and terms of service.
 */

import fs from 'fs';
import crypto from 'crypto';

export class BaseCollector {
  constructor(name = 'BaseCollector') {
    this.name = name;
  }

  async collect() {
    throw new Error('collect() method must be implemented by subclass.');
  }

  generateHash(text, platform, username) {
    return crypto.createHash('sha256').update(`${platform}|${username}|${text}`).digest('hex');
  }
}

export class CSVCollector extends BaseCollector {
  constructor(filePath) {
    super('CSVCollector');
    this.filePath = filePath;
  }

  async collect() {
    if (!fs.existsSync(this.filePath)) {
      throw new Error(`CSV file not found at ${this.filePath}`);
    }
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = parts[idx] || '';
      });
      if (obj.text) {
        items.push({
          ...obj,
          collected_at: new Date().toISOString(),
          content_hash: this.generateHash(obj.text, obj.platform || 'CSV', obj.username || 'unknown')
        });
      }
    }
    return items;
  }
}

export class JSONCollector extends BaseCollector {
  constructor(filePath) {
    super('JSONCollector');
    this.filePath = filePath;
  }

  async collect() {
    if (!fs.existsSync(this.filePath)) {
      throw new Error(`JSON file not found at ${this.filePath}`);
    }
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : data.ads || [];
    return list.map(item => ({
      ...item,
      collected_at: item.collected_at || new Date().toISOString(),
      content_hash: item.content_hash || this.generateHash(item.text, item.platform || 'JSON', item.username || 'unknown')
    }));
  }
}

// Compliance Notice for all platform scrapers / public collectors
const COMPLIANCE_NOTICE = 'Stubs use only official developer APIs or explicitly permitted public data. Respect platform Terms of Service, robots.txt, and rate limits. No unauthorized scraping or credential use.';

export class TelegramPublicChannelCollector extends BaseCollector {
  constructor(channelHandles = ['@mule_alert_demo']) {
    super('TelegramPublicChannelCollector');
    this.channels = channelHandles;
    this.notice = COMPLIANCE_NOTICE;
  }

  async collect() {
    console.log(`[TelegramCollector] Mocking public broadcast check for ${this.channels.length} channels. (${this.notice})`);
    return [];
  }
}

export class XPublicSearchCollector extends BaseCollector {
  constructor(searchQueries = ['#BankAccountSale', '#KitAvailable']) {
    super('XPublicSearchCollector');
    this.queries = searchQueries;
    this.notice = COMPLIANCE_NOTICE;
  }

  async collect() {
    console.log(`[XCollector] Mocking official v2 search endpoint. (${this.notice})`);
    return [];
  }
}

export class MetaPublicPagesCollector extends BaseCollector {
  constructor() {
    super('MetaPublicPagesCollector');
    this.notice = COMPLIANCE_NOTICE;
  }

  async collect() {
    console.log(`[MetaCollector] Official Graph API public page post collector stub. (${this.notice})`);
    return [];
  }
}

export class ClassifiedsPublicCollector extends BaseCollector {
  constructor() {
    super('ClassifiedsPublicCollector');
    this.notice = COMPLIANCE_NOTICE;
  }

  async collect() {
    console.log(`[ClassifiedsCollector] Public classified ad listing collector stub. (${this.notice})`);
    return [];
  }
}

export class ForumPublicCollector extends BaseCollector {
  constructor() {
    super('ForumPublicCollector');
    this.notice = COMPLIANCE_NOTICE;
  }

  async collect() {
    console.log(`[ForumCollector] Public syndicate forum thread monitor stub. (${this.notice})`);
    return [];
  }
}
