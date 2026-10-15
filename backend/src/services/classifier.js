/**
 * TF-IDF + Multi-label Threat Classifier for FinGuard Sentinel
 * Classifies posts across all 8 threat categories + Benign,
 * computes category probabilities, suspiciousness score,
 * and outputs evaluation metrics (precision, recall, F1, confusion matrix).
 */

import fs from 'fs';
import { CONFIG } from '../config.js';
import { preprocessText } from './preprocess.js';

export const CATEGORIES = [
  'ACCOUNT_SALE_RENT',
  'ACCOUNT_RECRUITMENT',
  'CARD_SALE',
  'STOLEN_CLONED_CARD',
  'FAKE_KYC_SHELL_ACCOUNT',
  'CREDENTIAL_ACCESS_SALE',
  'CRYPTO_LAUNDERING_LINKED',
  'OTHER_FINANCIAL_FRAUD_ENABLER',
  'BENIGN'
];

export class ThreatClassifier {
  constructor() {
    this.vocabulary = new Map(); // term -> index
    this.idf = [];              // index -> idf weight
    this.categoryWeights = {};  // category -> Float64Array of term weights
    this.thresholds = {};       // category -> decision threshold
    this.isTrained = false;
    this.metrics = null;

    for (const cat of CATEGORIES) {
      this.thresholds[cat] = 0.35;
    }
    this.thresholds['BENIGN'] = 0.40;
  }

  tokenize(text) {
    const { normalizedText } = preprocessText(text);
    const clean = normalizedText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const rawTokens = clean.split(/\s+/).filter(t => t.length > 1);

    // Generate unigrams + bigrams
    const tokens = [...rawTokens];
    for (let i = 0; i < rawTokens.length - 1; i++) {
      tokens.push(`${rawTokens[i]}_${rawTokens[i + 1]}`);
    }
    return tokens;
  }

  buildVocabulary(corpus, minDocFreq = 2, maxFeatures = 5000) {
    const docCounts = new Map();
    const N = corpus.length;

    for (const doc of corpus) {
      const terms = new Set(this.tokenize(doc));
      for (const t of terms) {
        docCounts.set(t, (docCounts.get(t) || 0) + 1);
      }
    }

    // Filter and sort by doc frequency
    const validTerms = [];
    for (const [term, count] of docCounts.entries()) {
      if (count >= minDocFreq && count < N * 0.95) {
        validTerms.push({ term, count });
      }
    }
    validTerms.sort((a, b) => b.count - a.count);
    const selected = validTerms.slice(0, maxFeatures);

    this.vocabulary.clear();
    this.idf = new Float64Array(selected.length);

    selected.forEach((item, idx) => {
      this.vocabulary.set(item.term, idx);
      // Smooth IDF: log((N + 1) / (df + 1)) + 1
      this.idf[idx] = Math.log((N + 1) / (item.count + 1)) + 1.0;
    });
  }

  transform(text) {
    const tokens = this.tokenize(text);
    const vector = new Float64Array(this.vocabulary.size);
    const termFreq = new Map();

    for (const t of tokens) {
      termFreq.set(t, (termFreq.get(t) || 0) + 1);
    }

    let normSq = 0;
    for (const [term, count] of termFreq.entries()) {
      const idx = this.vocabulary.get(term);
      if (idx !== undefined) {
        // Sublinear TF scaling: 1 + log(tf)
        const tf = 1.0 + Math.log(count);
        const tfidf = tf * this.idf[idx];
        vector[idx] = tfidf;
        normSq += tfidf * tfidf;
      }
    }

    // L2 normalization
    if (normSq > 0) {
      const norm = Math.sqrt(normSq);
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  train(corpus, labelsArray) {
    console.log(`[ThreatClassifier] Training with ${corpus.length} documents...`);
    this.buildVocabulary(corpus);
    const V = this.vocabulary.size;

    // Initialize category centroids
    for (const cat of CATEGORIES) {
      this.categoryWeights[cat] = new Float64Array(V);
    }
    const catCounts = {};
    for (const cat of CATEGORIES) catCounts[cat] = 0;

    for (let i = 0; i < corpus.length; i++) {
      const vec = this.transform(corpus[i]);
      const labels = labelsArray[i]; // array of category strings
      for (const cat of labels) {
        if (this.categoryWeights[cat]) {
          catCounts[cat]++;
          for (let v = 0; v < V; v++) {
            this.categoryWeights[cat][v] += vec[v];
          }
        }
      }
    }

    // Normalize each category weight vector
    for (const cat of CATEGORIES) {
      const count = catCounts[cat] || 1;
      let normSq = 0;
      for (let v = 0; v < V; v++) {
        this.categoryWeights[cat][v] /= count;
        normSq += this.categoryWeights[cat][v] * this.categoryWeights[cat][v];
      }
      if (normSq > 0) {
        const norm = Math.sqrt(normSq);
        for (let v = 0; v < V; v++) {
          this.categoryWeights[cat][v] /= norm;
        }
      }
    }

    this.isTrained = true;
    this.evaluate(corpus, labelsArray);
    this.saveModel();
  }

  predict(text) {
    if (!this.isTrained) {
      this.loadModel();
    }

    const vec = this.transform(text);
    const scores = {};
    const matchedCategories = [];

    for (const cat of CATEGORIES) {
      const weights = this.categoryWeights[cat];
      if (!weights) {
        scores[cat] = 0;
        continue;
      }

      // Cosine similarity between doc vector and category centroid
      let dot = 0;
      for (let v = 0; v < vec.length; v++) {
        dot += vec[v] * weights[v];
      }

      // Sigmoid scale into 0 - 1 probability
      const prob = 1 / (1 + Math.exp(-6 * (dot - 0.15)));
      scores[cat] = Math.round(prob * 100) / 100;

      if (prob >= (this.thresholds[cat] || 0.35)) {
        matchedCategories.push(cat);
      }
    }

    // Determine suspicious probability
    const suspiciousScores = Object.entries(scores)
      .filter(([cat]) => cat !== 'BENIGN')
      .map(([_, s]) => s);
    const maxSuspicious = suspiciousScores.length > 0 ? Math.max(...suspiciousScores) : 0;
    const benignScore = scores['BENIGN'] || 0;

    let finalSuspiciousProb = maxSuspicious;
    if (benignScore > 0.65 && maxSuspicious < 0.40) {
      finalSuspiciousProb = Math.max(0, maxSuspicious * 0.5);
    }

    // Default to BENIGN if no suspicious category matched and benign is higher
    let finalCategories = matchedCategories.filter(c => c !== 'BENIGN');
    if (finalCategories.length === 0) {
      finalCategories = ['BENIGN'];
    }

    return {
      scores,
      categories: finalCategories,
      suspicious_probability: Math.round(finalSuspiciousProb * 100) / 100,
      top_category: Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
    };
  }

  evaluate(corpus, labelsArray) {
    const results = {};
    for (const cat of CATEGORIES) {
      results[cat] = { tp: 0, fp: 0, fn: 0, tn: 0 };
    }

    for (let i = 0; i < corpus.length; i++) {
      const pred = this.predict(corpus[i]);
      const trueLabels = new Set(labelsArray[i]);
      const predLabels = new Set(pred.categories);

      for (const cat of CATEGORIES) {
        const isTrue = trueLabels.has(cat);
        const isPred = predLabels.has(cat);

        if (isTrue && isPred) results[cat].tp++;
        else if (!isTrue && isPred) results[cat].fp++;
        else if (isTrue && !isPred) results[cat].fn++;
        else results[cat].tn++;
      }
    }

    const metrics = {};
    for (const cat of CATEGORIES) {
      const { tp, fp, fn, tn } = results[cat];
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
      metrics[cat] = {
        precision: Math.round(precision * 1000) / 1000,
        recall: Math.round(recall * 1000) / 1000,
        f1: Math.round(f1 * 1000) / 1000,
        support: tp + fn,
        confusion_matrix: { tp, fp, fn, tn }
      };
    }

    this.metrics = metrics;
    console.log('[ThreatClassifier] Evaluation Metrics:');
    console.table(
      Object.entries(metrics).map(([cat, m]) => ({
        Category: cat,
        Precision: m.precision,
        Recall: m.recall,
        F1: m.f1,
        Support: m.support
      }))
    );
    return metrics;
  }

  saveModel(filePath = CONFIG.MODEL_FILE) {
    const serialized = {
      vocabulary: Array.from(this.vocabulary.entries()),
      idf: Array.from(this.idf),
      categoryWeights: Object.fromEntries(
        Object.entries(this.categoryWeights).map(([cat, arr]) => [cat, Array.from(arr)])
      ),
      thresholds: this.thresholds,
      metrics: this.metrics,
      updated_at: new Date().toISOString()
    };
    fs.writeFileSync(filePath, JSON.stringify(serialized), 'utf8');
    console.log(`[ThreatClassifier] Model saved to ${filePath}`);
  }

  loadModel(filePath = CONFIG.MODEL_FILE) {
    if (!fs.existsSync(filePath)) {
      console.warn(`[ThreatClassifier] Model file not found at ${filePath}. Will initialize empty.`);
      return false;
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      this.vocabulary = new Map(data.vocabulary);
      this.idf = new Float64Array(data.idf);
      this.categoryWeights = {};
      for (const [cat, arr] of Object.entries(data.categoryWeights)) {
        this.categoryWeights[cat] = new Float64Array(arr);
      }
      this.thresholds = data.thresholds || this.thresholds;
      this.metrics = data.metrics || null;
      this.isTrained = true;
      return true;
    } catch (err) {
      console.error('[ThreatClassifier] Failed to load model:', err.message);
      return false;
    }
  }
}

export const classifier = new ThreatClassifier();
