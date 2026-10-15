import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Shield,
  Bot,
  User,
  ExternalLink,
  Minimize2,
  Maximize2,
  Trash2,
  Settings,
  Key,
  CheckCircle2,
  AlertTriangle,
  Camera
} from 'lucide-react';

export function GeminiCopilot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: `Hello ${user?.name?.split(' ')[0] || 'Investigator'}. I am **FinShield Sentinel Copilot**, powered by Google Gemini. How can I assist you with financial scam analysis, mule account investigation, or 1930 reporting?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ configured: false, model: 'gemini-flash-latest' });
  const [showSettings, setShowSettings] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-flash-latest');
  const [savingKey, setSavingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const handleImageAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.scanImageOcr(formData);
      if (res?.ok && res.rawText) {
        const query = `[Scanned Screenshot OCR]: "${res.rawText.slice(0, 400)}" — Please analyze if this advertisement or message is an illegal financial scam or mule solicitation.`;
        handleSend(query);
      } else {
        alert(res?.error || 'Could not extract text from this image.');
      }
    } catch (err) {
      alert(`OCR Error: ${err.message}`);
    } finally {
      setOcrLoading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSaveKey = async () => {
    if (!inputKey.trim()) return;
    setSavingKey(true);
    setKeyStatus(null);
    try {
      const res = await api.geminiSetKey(inputKey.trim(), selectedModel);
      setKeyStatus({ ok: true, message: `✅ Connected! Google Gemini verified (${res.model}).` });
      setStatus({ configured: true, model: res.model });
      setInputKey('');
      setTimeout(() => {
        setKeyStatus(null);
        setShowSettings(false);
      }, 2500);
    } catch (err) {
      setKeyStatus({ ok: false, message: err.message || 'Key validation failed with Google.' });
    } finally {
      setSavingKey(false);
    }
  };

  useEffect(() => {
    api.geminiStatus()
      .then(res => setStatus(res))
      .catch(() => setStatus({ configured: false, model: 'gemini-1.5-flash' }));
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    'What is the 1930 Golden Hour freeze process?',
    'Explain legal penalties for renting a bank account (IT Act 66D)',
    'How do I identify a fake investment or task scam?',
    'What steps should an investigator take to freeze a mule account?'
  ];

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await api.geminiChat(text, newMessages, user?.role || 'Investigator');
      setMessages([...newMessages, { role: 'model', text: res.reply || 'No response generated.' }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: 'model', text: `⚠️ Error contacting Gemini AI: ${err.message}. Please verify your GEMINI_API_KEY.` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'model',
        text: `Chat history cleared. How can I help you today, ${user?.name?.split(' ')[0] || 'Investigator'}?`
      }
    ]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white font-semibold text-xs shadow-2xl shadow-blue-500/40 hover:scale-105 hover:shadow-blue-500/60 transition-all border border-sky-400/50 group"
          aria-label="Open FinShield AI Copilot"
        >
          <div className="relative">
            <Sparkles className="h-4 w-4 animate-spin text-amber-300" style={{ animationDuration: '4s' }} />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span>Sentinel AI Copilot</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/20 uppercase tracking-wider">
            Gemini
          </span>
        </button>
      )}

      {/* Floating Chatbot Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col rounded-2xl border border-sky-500/40 bg-[#061433]/95 backdrop-blur-2xl shadow-2xl shadow-black/70 overflow-hidden ${
            isExpanded
              ? 'inset-6 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[680px] lg:h-[720px]'
              : 'bottom-6 right-6 w-[94vw] sm:w-[420px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-950 via-slate-900 to-sky-950 border-b border-sky-500/30">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">Sentinel AI Copilot</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {status.configured ? 'Gemini Live' : 'Simulated AI'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 -mt-0.5">
                  AI Fraud Advisor · {user?.role || 'Guest'} Mode
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'text-sky-400 bg-sky-950/80 border border-sky-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
                title="Connect Real Google Gemini API Key"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleClear}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/60 transition-colors"
                title="Clear Chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors hidden sm:block"
                title={isExpanded ? 'Restore' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Interactive Gemini Key Configuration Drawer */}
          {showSettings && (
            <div className="p-3 bg-[#020b22] border-b border-sky-500/30 text-xs space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-sky-300">
                  <Key className="h-3.5 w-3.5 text-amber-400" />
                  <span>Connect Real Google Gemini API</span>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10.5px] text-sky-400 hover:underline flex items-center gap-1"
                >
                  <span>Get free key</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>

              <div>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Paste your Gemini API key (AIzaSy...)"
                  className="w-full bg-[#040A22] border border-sky-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-[#040A22] border border-sky-500/40 rounded-lg px-2 py-1 text-[11px] text-slate-200"
                >
                  <option value="gemini-flash-latest">gemini-flash-latest (Google Gemini 3.8 Flash - Recommended)</option>
                  <option value="gemini-pro-latest">gemini-pro-latest (Deep Reasoning)</option>
                  <option value="gemini-3.8-flash">gemini-3.8-flash</option>
                </select>

                <button
                  type="button"
                  onClick={handleSaveKey}
                  disabled={savingKey || !inputKey.trim()}
                  className="flex-1 px-3 py-1 bg-gradient-to-r from-blue-600 to-sky-500 text-white font-semibold rounded-lg text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {savingKey ? 'Verifying with Google...' : 'Test & Connect'}
                </button>
              </div>

              {keyStatus && (
                <div className={`p-2 rounded text-[11px] flex items-center gap-1.5 ${keyStatus.ok ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' : 'bg-red-950/60 text-red-300 border border-red-500/30'}`}>
                  {keyStatus.ok ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
                  <span className="break-all">{keyStatus.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Quick Prompts Bar */}
          <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 overflow-x-auto flex gap-1.5 no-scrollbar">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-blue-950/60 hover:bg-blue-900/60 border border-sky-500/30 text-[10.5px] text-sky-300 transition-colors flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role !== 'user' && (
                  <div className="h-6 w-6 rounded-md bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/30'
                      : 'bg-[#0b1f48] text-slate-200 border border-sky-500/30 rounded-bl-none shadow-md shadow-black/40'
                  }`}
                >
                  {m.text}
                </div>
                {m.role === 'user' && (
                  <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sky-400 text-xs py-2 px-1">
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                <span className="font-mono text-[11px]">Gemini AI is analyzing threat indicators...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-slate-900/90 border-t border-sky-500/30 flex items-center gap-2"
          >
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageAttach}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={loading || ocrLoading}
              title="Upload Screenshot / Ad Image for OCR Analysis"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-sky-400 hover:text-white border border-sky-500/30 transition-all flex items-center justify-center disabled:opacity-50"
            >
              <Camera className={`h-3.5 w-3.5 ${ocrLoading ? 'animate-pulse text-amber-300' : ''}`} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={ocrLoading ? 'Extracting text from image via OCR...' : 'Ask Gemini about a scam ad, phone, or 1930...'}
              disabled={loading || ocrLoading}
              className="flex-1 bg-[#040A22] border border-sky-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-sky-500/30 flex items-center justify-center"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
