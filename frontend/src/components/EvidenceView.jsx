import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { RiskBadge, CategoryBadge } from './RiskBadge.jsx';
import {
  ShieldAlert,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Copy,
  ExternalLink,
  Eye,
  Lock,
  Clock,
  Layers,
  Info,
  Hash,
  Send,
  Sparkles
} from 'lucide-react';

export function EvidenceView({ evidence, onStatusUpdate }) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState(evidence.analyst_notes || []);
  const [unmaskReason, setUnmaskReason] = useState('');
  const [unmaskModalClue, setUnmaskModalClue] = useState(null);
  const [unmaskedValues, setUnmaskedValues] = useState({});
  const [submittingAction, setSubmittingAction] = useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText(evidence.content_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = async (action) => {
    setSubmittingAction(true);
    try {
      await api.submitAdFeedback(evidence.ad_id, action, evidence.categories?.[0] || 'SUSPICIOUS', noteText);
      if (onStatusUpdate) onStatusUpdate(action);
      alert(`Action recorded: ${action}`);
    } catch (err) {
      alert(`Failed to submit action: ${err.message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      const res = await api.addAdNote(evidence.ad_id, noteText.trim());
      setNotes(res.notes);
      setNoteText('');
    } catch (err) {
      alert(`Failed to add note: ${err.message}`);
    }
  };

  const handleUnmaskSubmit = async () => {
    if (!unmaskModalClue || !unmaskReason.trim()) return;
    try {
      const res = await api.unmaskEntity(
        evidence.ad_id,
        unmaskModalClue.type,
        unmaskModalClue.normalized_value,
        unmaskReason
      );
      setUnmaskedValues(prev => ({
        ...prev,
        [unmaskModalClue.type + ':' + unmaskModalClue.normalized_value]: res.unmasked_value
      }));
      setUnmaskModalClue(null);
      setUnmaskReason('');
      alert('Forensic unmasking audited and logged successfully.');
    } catch (err) {
      alert(`Unmasking failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Triage Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-cyan-400" />
              Dossier #{evidence.ad_id}
            </h2>
            <RiskBadge level={evidence.risk_level} score={evidence.risk_score} size="lg" />
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
              Status: {evidence.investigation_status || 'New'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
            <span>Platform: <b className="text-slate-200">{evidence.platform}</b></span>
            <span>•</span>
            <span>User: <b className="text-slate-200">@{evidence.username}</b></span>
            <span>•</span>
            <span>City: <b className="text-slate-200">{evidence.city}</b></span>
            <span>•</span>
            <span>Date: <b className="text-slate-200">{new Date(evidence.posted_at).toLocaleString('en-IN')}</b></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleAction('CONFIRM')}
            disabled={submittingAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition-all"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Confirm Illicit</span>
          </button>
          <button
            onClick={() => handleAction('ESCALATE')}
            disabled={submittingAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-md shadow-orange-600/20 transition-all"
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>Escalate Nodal</span>
          </button>
          <button
            onClick={() => handleAction('FALSE_POSITIVE')}
            disabled={submittingAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>False Positive</span>
          </button>
          <button
            onClick={() => api.downloadPdf(evidence.ad_id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* SHA-256 Fingerprint Box */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
          <Hash className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
          <span className="text-slate-500">SHA-256 Integrity Fingerprint:</span>
          <span className="text-slate-300 select-all truncate">{evidence.content_hash}</span>
        </div>
        <button
          onClick={copyHash}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-400 ml-2 flex-shrink-0"
        >
          <Copy className="h-3 w-3" />
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Executive Summary */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
          <Info className="h-4 w-4" />
          Executive Intelligence Summary
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">
          {evidence.summary}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(evidence.categories || []).map(cat => (
            <CategoryBadge key={cat} category={cat} />
          ))}
        </div>
      </div>

      {/* Gemini AI Deep Threat Analysis Card */}
      {evidence.gemini && (
        <div className="p-4 lg:p-5 rounded-xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-sky-500/40 space-y-3.5 shadow-xl shadow-sky-500/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-sky-300 font-mono">
                Google Gemini AI Threat Breakdown
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-sky-500/20 text-sky-400 border border-sky-400/30">
                {evidence.gemini.scam_category || 'Identified Scam'}
              </span>
            </div>
            {evidence.gemini.verdict && (
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider border ${
                evidence.gemini.verdict.includes('CRITICAL') || evidence.gemini.verdict.includes('HIGH')
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                Verdict: {evidence.gemini.verdict}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-200 leading-relaxed bg-[#061536]/70 p-3 rounded-lg border border-sky-500/20">
            {evidence.gemini.executive_summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Red Flags */}
            {evidence.gemini.red_flags?.length > 0 && (
              <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/30 space-y-1.5">
                <div className="font-bold text-red-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Key Red Flags (Gemini AI)
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11.5px]">
                  {evidence.gemini.red_flags.map((flag, idx) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Legal Violations & Investigator Actions */}
            <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/30 space-y-2">
              {evidence.gemini.legal_violations?.length > 0 && (
                <div>
                  <div className="font-bold text-sky-400 text-[11px] uppercase tracking-wide mb-1">
                    Applicable Statutes & RBI Guidelines
                  </div>
                  <div className="space-y-0.5 text-slate-300 text-[11.5px]">
                    {evidence.gemini.legal_violations.map((statute, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                        <span>{statute}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {evidence.gemini.investigator_action && (
                <div className="pt-1.5 border-t border-blue-900/40 text-[11.5px] text-slate-300">
                  <span className="font-semibold text-sky-300">Recommended Action: </span>
                  {evidence.gemini.investigator_action}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Grid: Left (Evidence & Highlighting), Right (Risk Factor Attribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Highlighted Post & Graphic Preview */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" />
                Raw Post with Highlighted Clues
              </span>
              <a
                href={evidence.source_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:underline normal-case"
              >
                <span>Platform Link</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Post Content with Markup */}
            <div
              className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap font-sans"
              dangerouslySetInnerHTML={{ __html: evidence.highlighted_text_html || evidence.original_text }}
            />

            {/* OCR Text if graphic exists */}
            {evidence.ocr_text && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-bold text-amber-400 font-mono uppercase">
                  Optical Character Recognition (OCR Overlay)
                </div>
                <div className="p-2.5 rounded bg-slate-950/70 border border-amber-500/20 text-xs font-mono text-amber-200/90">
                  {evidence.ocr_text}
                </div>
              </div>
            )}

            {/* Sample graphic thumbnail if available */}
            {evidence.image_paths && evidence.image_paths.length > 0 && (
              <div className="pt-2">
                <div className="text-[11px] font-mono text-slate-400 mb-1.5">Attached Graphic Evidence:</div>
                <img
                  src={evidence.image_paths[0]}
                  alt="Seized Evidence Graphic"
                  className="rounded-lg border border-slate-800 max-h-48 w-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Extracted Clues Table */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                Extracted Clues & Identifiers
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                {evidence.clues?.length || 0} Forensic Clues
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Value</th>
                    <th className="pb-2">Conf.</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {(evidence.clues || []).map((clue, idx) => {
                    const unmaskKey = clue.type + ':' + clue.normalized_value;
                    const isUnmasked = !!unmaskedValues[unmaskKey];

                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 text-cyan-400 uppercase font-semibold">
                          {clue.type.replace('_', ' ')}
                        </td>
                        <td className="py-2 text-slate-200 select-all">
                          {isUnmasked ? (
                            <span className="text-emerald-400 font-bold bg-emerald-950/40 px-1 rounded">
                              {unmaskedValues[unmaskKey]}
                            </span>
                          ) : (
                            clue.masked_value || clue.value
                          )}
                        </td>
                        <td className="py-2 text-slate-400">
                          {Math.round((clue.confidence || 0.9) * 100)}%
                        </td>
                        <td className="py-2 text-right">
                          {clue.is_sensitive && !isUnmasked && (
                            <button
                              onClick={() => setUnmaskModalClue(clue)}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30"
                              title="Investigator Role Required"
                            >
                              <Lock className="h-3 w-3" />
                              <span>Unmask</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Factor Breakdown & Entity Repetition History */}
        <div className="space-y-4">
          {/* Why This Score? Factor Breakdown */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-cyan-400" />
                "Why This Score?" Factor Attribution
              </span>
              <span className="font-mono text-cyan-400">{evidence.risk_score}/100 Pts</span>
            </div>

            <div className="space-y-2.5">
              {(evidence.factor_breakdown || []).map((factor, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-slate-200">{factor.factor}</span>
                    <span className={`font-bold ${factor.points > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {factor.points > 0 ? `+${factor.points}` : factor.points} Pts
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {factor.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Syndication & Shared Entity History */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                Entity Frequency & Cross-Platform History
              </span>
              {evidence.campaign_id && (
                <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-[10px]">
                  {evidence.campaign_name || evidence.campaign_id}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {(evidence.entity_history || []).map((eh, idx) => (
                <div key={idx} className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-mono text-slate-200">
                      <span className="text-cyan-400 uppercase text-[10px] mr-1.5">{eh.clue_type}:</span>
                      {eh.masked_value}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Seen on: {eh.platforms_seen?.join(', ') || 'Telegram'}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                      eh.repetition_count >= 5 ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {eh.repetition_count}x Repeated
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chain of Custody & Analyst Notes */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
              <Lock className="h-4 w-4 text-cyan-400" />
              Chain of Custody & Investigator Notes
            </div>

            {/* Existing notes */}
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {notes.map((n, i) => (
                <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800 text-xs space-y-0.5">
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>{n.author} ({n.role})</span>
                    <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300">{n.text}</p>
                </div>
              ))}
            </div>

            {/* Append note form */}
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Append formal investigation note..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center gap-1"
              >
                <Send className="h-3 w-3" />
                <span>Save</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Officer Sensitive Unmasking Modal */}
      {unmaskModalClue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Lock className="h-5 w-5" />
              <span>Investigator Forensic Unmask Request</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Per data privacy and banking standards, revealing sensitive identifiers ({unmaskModalClue.type}) requires mandatory justification and will be permanently logged in the immutable audit trail.
            </p>
            <div className="p-2.5 rounded bg-slate-950 font-mono text-xs text-slate-300">
              Identifier: {unmaskModalClue.masked_value}
            </div>
            <textarea
              rows={3}
              value={unmaskReason}
              onChange={(e) => setUnmaskReason(e.target.value)}
              placeholder="Enter official investigation / FIR reference and justification..."
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setUnmaskModalClue(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUnmaskSubmit}
                disabled={!unmaskReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-lg shadow-amber-600/20 disabled:opacity-50"
              >
                Confirm & Log Unmask
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
