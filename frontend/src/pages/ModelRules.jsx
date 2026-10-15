import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Sliders,
  Save,
  RotateCcw,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Cpu
} from 'lucide-react';

export function ModelRules() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [ruleWeights, setRuleWeights] = useState({});
  const [modelMetrics, setModelMetrics] = useState({});
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingWeights, setSavingWeights] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState(null);

  useEffect(() => {
    api.getRules()
      .then(data => {
        setRuleWeights(data.ruleWeights || {});
        setModelMetrics(data.modelMetrics || {});
        setFeedbackCount(data.feedbackCount || 0);
      })
      .catch(err => console.error('Failed to load rules:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleWeightChange = (key, value) => {
    setRuleWeights(prev => ({
      ...prev,
      [key]: parseInt(value, 10) || 0
    }));
  };

  const handleSaveWeights = async () => {
    setSavingWeights(true);
    try {
      await api.updateRuleWeights(ruleWeights);
      alert('Rule engine weights successfully updated.');
    } catch (err) {
      alert(`Failed to save weights: ${err.message}`);
    } finally {
      setSavingWeights(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const res = await api.retrainModel();
      setRetrainResult(res);
      setModelMetrics(res.updatedMetrics || {});
      alert(`Model successfully retrained with ${res.incorporatedFeedbackSamples} investigator feedback samples!`);
    } catch (err) {
      alert(`Retraining failed: ${err.message}`);
    } finally {
      setRetraining(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-96 bg-slate-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Sliders className="h-6 w-6 text-cyan-400" />
            Risk Rules Configuration & ML Feedback Loop
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Configurable rule heuristics, multi-label NLP model evaluation, and continuous learning
          </p>
        </div>

        {/* Retrain Trigger Button */}
        {isAdmin && (
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider font-mono shadow-lg shadow-purple-600/25 disabled:opacity-50 transition-all self-start sm:self-auto"
          >
            <Cpu className="h-4 w-4" />
            <span>{retraining ? 'Retraining Weights...' : `Retrain Model (${feedbackCount} Labels)`}</span>
          </button>
        )}
      </div>

      {/* Retrain Feedback Result Banner */}
      {retrainResult && (
        <div className="p-4 rounded-xl bg-purple-950/50 border border-purple-500/40 text-xs text-purple-200 space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-purple-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Active Learning Retraining Completed</span>
          </div>
          <p>
            Successfully recalculated TF-IDF category centroids incorporating {retrainResult.incorporatedFeedbackSamples} investigator ground-truth feedback labels.
          </p>
        </div>
      )}

      {/* Model Performance Metrics Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
            <BarChart3 className="h-4 w-4" />
            <span>TF-IDF Multi-Label Classifier Evaluation Metrics</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">1,500 Test Documents</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2.5">Threat Category</th>
                <th className="pb-2.5">Precision</th>
                <th className="pb-2.5">Recall</th>
                <th className="pb-2.5">F1 Score</th>
                <th className="pb-2.5 text-right">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Object.entries(modelMetrics).map(([cat, m]) => (
                <tr key={cat} className="hover:bg-slate-800/30">
                  <td className="py-2.5 text-slate-200 font-bold uppercase text-[11px]">
                    {cat.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 text-cyan-400 font-semibold">{m.precision}</td>
                  <td className="py-2.5 text-emerald-400 font-semibold">{m.recall}</td>
                  <td className="py-2.5 text-purple-400 font-semibold">{m.f1}</td>
                  <td className="py-2.5 text-right text-slate-400">{m.support}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configurable Rule Weights Section */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
            <Sliders className="h-4 w-4" />
            <span>Configurable Rule Engine Scoring Weights</span>
          </div>
          {isAdmin ? (
            <button
              onClick={handleSaveWeights}
              disabled={savingWeights}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider font-mono shadow-md shadow-amber-600/20 disabled:opacity-50 transition-all"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingWeights ? 'Saving...' : 'Save Weights'}</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>Admin Role Required to Edit</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(ruleWeights).map(([ruleKey, weight]) => (
            <div key={ruleKey} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-slate-200">{ruleKey}</span>
                <span className="font-extrabold text-cyan-400">{weight} pts</span>
              </div>
              <input
                type="range"
                min={ruleKey.includes('BENIGN') ? -50 : 0}
                max={50}
                value={weight}
                disabled={!isAdmin}
                onChange={(e) => handleWeightChange(ruleKey, e.target.value)}
                className="w-full accent-cyan-400 cursor-pointer disabled:opacity-40"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
