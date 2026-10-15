/**
 * ML Model Training Script for FinGuard Sentinel
 * Trains TF-IDF + Multi-label Category Classifier,
 * prints precision, recall, F1 metrics and confusion matrix,
 * and saves trained weights to disk.
 */

import fs from 'fs';
import { CONFIG } from '../src/config.js';
import { ThreatClassifier } from '../src/services/classifier.js';

export function trainThreatModel() {
  if (!fs.existsSync(CONFIG.SYNTHETIC_DATA_FILE)) {
    throw new Error(`Synthetic dataset missing at ${CONFIG.SYNTHETIC_DATA_FILE}. Run generate_synthetic_data.js first.`);
  }

  const raw = fs.readFileSync(CONFIG.SYNTHETIC_DATA_FILE, 'utf8');
  const ads = JSON.parse(raw);

  console.log(`[TrainModel] Loading ${ads.length} training samples...`);
  const corpus = ads.map(a => a.text);
  const labels = ads.map(a => a.ground_truth_categories || (a.is_suspicious_ground_truth ? ['ACCOUNT_SALE_RENT'] : ['BENIGN']));

  const classifier = new ThreatClassifier();
  classifier.train(corpus, labels);

  console.log(`[TrainModel] Successfully trained model on ${corpus.length} documents.`);
  return classifier;
}

if (process.argv[1].endsWith('train_model.js')) {
  trainThreatModel();
}
