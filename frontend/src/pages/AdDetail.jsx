import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { EvidenceView } from '../components/EvidenceView.jsx';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export function AdDetail() {
  const { id } = useParams();
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const data = await api.getAdEvidence(id);
      setEvidence(data.evidence);
    } catch (err) {
      setError(err.message || 'Failed to load forensic evidence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-40 bg-slate-800 rounded animate-pulse" />
        <div className="h-96 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <Link to="/ads" className="inline-flex items-center gap-2 text-cyan-400 text-xs font-mono hover:underline">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Evidence Dossiers</span>
        </Link>
        <div className="p-6 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 text-sm">
          {error || 'Evidence not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <Link to="/ads" className="inline-flex items-center gap-2 text-slate-400 text-xs font-mono hover:text-cyan-400 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Evidence Dossiers</span>
      </Link>
      <EvidenceView evidence={evidence} onStatusUpdate={fetchEvidence} />
    </div>
  );
}
