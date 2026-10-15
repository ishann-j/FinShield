import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import { api } from '../services/api.js';
import { RiskBadge } from '../components/RiskBadge.jsx';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Layers,
  Info,
  ExternalLink,
  X,
  ShieldAlert
} from 'lucide-react';

cytoscape.use(cola);

export function NetworkGraph() {
  const [searchParams] = useSearchParams();
  const campaignParam = searchParams.get('campaignId') || '';
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(campaignParam);
  const [selectedNode, setSelectedNode] = useState(null);
  const [stats, setStats] = useState({ total_nodes: 0, total_edges: 0 });

  // Type visibility filters
  const [filters, setFilters] = useState({
    ad: true,
    profile: true,
    phone: true,
    upi: true,
    url: true,
    crypto_wallet: true
  });

  useEffect(() => {
    api.getCampaigns().then(res => setCampaigns(res.campaigns || [])).catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.getGraphData(selectedCampaign || null, 150)
      .then((data) => {
        if (!isMounted) return;
        setStats(data.stats || { total_nodes: data.nodes.length, total_edges: data.edges.length });

        if (cyRef.current) {
          cyRef.current.destroy();
        }

        const cy = cytoscape({
          container: containerRef.current,
          elements: {
            nodes: data.nodes,
            edges: data.edges
          },
          style: [
            // Base Node Style
            {
              selector: 'node',
              style: {
                'label': 'data(label)',
                'font-size': '10px',
                'color': '#cbd5e1',
                'text-valign': 'bottom',
                'text-margin-y': 4,
                'background-color': '#0284c7',
                'border-width': 2,
                'border-color': '#38bdf8',
                'width': 26,
                'height': 26
              }
            },
            // Ad Node Styles based on Risk
            {
              selector: 'node[type = "ad"]',
              style: {
                'shape': 'diamond',
                'width': 30,
                'height': 30,
                'background-color': '#ef4444',
                'border-color': '#f87171'
              }
            },
            {
              selector: 'node[type = "ad"][risk_score < 70]',
              style: {
                'background-color': '#f97316',
                'border-color': '#fb923c'
              }
            },
            {
              selector: 'node[type = "ad"][risk_score < 40]',
              style: {
                'background-color': '#10b981',
                'border-color': '#34d399'
              }
            },
            // Profile Node
            {
              selector: 'node[type = "profile"]',
              style: {
                'shape': 'ellipse',
                'background-color': '#6366f1',
                'border-color': '#818cf8',
                'width': 24,
                'height': 24
              }
            },
            // Phone Node
            {
              selector: 'node[type = "phone"]',
              style: {
                'shape': 'round-rectangle',
                'background-color': '#10b981',
                'border-color': '#34d399',
                'width': 28,
                'height': 20
              }
            },
            // UPI Node
            {
              selector: 'node[type = "upi"]',
              style: {
                'shape': 'hexagon',
                'background-color': '#a855f7',
                'border-color': '#c084fc',
                'width': 26,
                'height': 26
              }
            },
            // URL Node
            {
              selector: 'node[type = "url"]',
              style: {
                'shape': 'triangle',
                'background-color': '#38bdf8',
                'border-color': '#7dd3fc',
                'width': 24,
                'height': 24
              }
            },
            // Crypto Wallet
            {
              selector: 'node[type = "crypto_wallet"]',
              style: {
                'shape': 'star',
                'background-color': '#eab308',
                'border-color': '#fde047',
                'width': 28,
                'height': 28
              }
            },
            // Edges
            {
              selector: 'edge',
              style: {
                'width': 1.5,
                'line-color': '#334155',
                'curve-style': 'bezier',
                'opacity': 0.7
              }
            },
            {
              selector: 'edge[relation = "POSTED"]',
              style: {
                'line-color': '#475569',
                'line-style': 'dashed'
              }
            },
            {
              selector: 'edge[relation = "CONTAINS"]',
              style: {
                'line-color': '#38bdf8',
                'width': 2
              }
            },
            // Node Selection Highlight
            {
              selector: ':selected',
              style: {
                'border-width': 4,
                'border-color': '#ffffff',
                'shadow-blur': 12,
                'shadow-color': '#38bdf8'
              }
            }
          ],
          layout: {
            name: 'cola',
            animate: true,
            maxSimulationTime: 2000,
            nodeSpacing: 35,
            edgeLengthVal: 60
          }
        });

        // Event listeners
        cy.on('tap', 'node', (evt) => {
          const node = evt.target;
          setSelectedNode(node.data());
        });

        cy.on('tap', (evt) => {
          if (evt.target === cy) {
            setSelectedNode(null);
          }
        });

        cyRef.current = cy;
      })
      .catch((err) => {
        console.error('Failed to load Cytoscape graph data:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (cyRef.current) cyRef.current.destroy();
    };
  }, [selectedCampaign]);

  // Apply visibility filters to nodes
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.batch(() => {
      cy.nodes().forEach(n => {
        const type = n.data('type');
        if (filters[type] === false) {
          n.hide();
        } else {
          n.show();
        }
      });
    });
  }, [filters]);

  const handleZoomIn = () => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current && cyRef.current.fit(null, 30);
  const handleResetLayout = () => {
    if (cyRef.current) {
      cyRef.current.layout({ name: 'cola', animate: true, maxSimulationTime: 1500 }).run();
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto h-[calc(100vh-60px)] flex flex-col">
      {/* Top Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-purple-400" />
          <h1 className="text-base font-bold text-white font-mono tracking-tight">
            Cytoscape Syndicate Graph
          </h1>
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            ({stats.total_nodes} Nodes, {stats.total_edges} Connections)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Campaign Selector */}
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">Global Syndicate Overview</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>
                {c.id}: {c.name.substring(0, 32)}...
              </option>
            ))}
          </select>

          {/* Canvas Actions */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button onClick={handleZoomIn} className="p-1 rounded hover:bg-slate-800 text-slate-300" title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button onClick={handleZoomOut} className="p-1 rounded hover:bg-slate-800 text-slate-300" title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </button>
            <button onClick={handleFit} className="p-1 rounded hover:bg-slate-800 text-slate-300" title="Fit to Screen">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas & Inspector Drawer */}
      <div className="relative flex-1 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-cyan-400 font-mono text-sm">
              <span className="h-4 w-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span>Simulating Network Topology & Louvain Clustering...</span>
            </div>
          </div>
        )}

        {/* Legend Overlay */}
        <div className="absolute top-3 left-3 z-10 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-[11px] font-mono space-y-1.5 backdrop-blur-md hidden sm:block">
          <div className="font-bold text-slate-400 uppercase text-[10px]">Graph Legend</div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
            <span>Ad (Red = Critical)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <span>Profile / Poster</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            <span>Phone / WhatsApp</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
            <span>UPI Handle</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500" />
            <span>URL / Shortener</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            <span>Crypto Wallet</span>
          </div>
        </div>

        {/* Cytoscape Canvas Container */}
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-3 right-3 z-10 w-80 max-h-[85%] rounded-2xl bg-slate-900/95 border border-slate-700 p-4 shadow-2xl backdrop-blur-md overflow-y-auto text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-mono text-cyan-400 uppercase font-bold text-[11px]">
                {selectedNode.type} Node Details
              </span>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5 font-mono">
              <div className="text-white font-bold text-sm break-all">
                {selectedNode.label}
              </div>
              {selectedNode.type === 'ad' && (
                <>
                  <div className="flex items-center gap-2 pt-1">
                    <RiskBadge level={selectedNode.risk_level} score={selectedNode.risk_score} size="sm" />
                    <span className="text-slate-400 text-[11px]">{selectedNode.platform}</span>
                  </div>
                  <div className="text-slate-400 pt-1">
                    User: @{selectedNode.username}
                  </div>
                  <div className="text-slate-400 pt-1">
                    Categories: {selectedNode.categories}
                  </div>
                  <div className="pt-2">
                    <Link
                      to={`/ads/${selectedNode.id.replace('ad_', '')}`}
                      className="w-full py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Inspect Dossier</span>
                    </Link>
                  </div>
                </>
              )}

              {selectedNode.type !== 'ad' && (
                <div className="pt-2">
                  <Link
                    to={`/entities?q=${encodeURIComponent(selectedNode.label)}`}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Search Entity History</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
