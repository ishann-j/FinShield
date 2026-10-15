/**
 * Interactive Cytoscape Graph Exporter for FinGuard Sentinel
 * Translates ad, profile, and forensic entity connections into
 * rich styled nodes & edges for frontend visual exploration.
 */

export function buildCytoscapeGraph(ads = [], { campaignId = null, maxAds = 120 } = {}) {
  let targetAds = ads;
  if (campaignId) {
    targetAds = ads.filter(a => a.campaign_id === campaignId);
  } else {
    // Priority: critical & high risk ads, capped for smooth interactive rendering
    targetAds = [...ads]
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
      .slice(0, maxAds);
  }

  const nodesMap = new Map();
  const edgesMap = new Map();

  for (const ad of targetAds) {
    // Ad Node
    const adNodeId = `ad_${ad.id}`;
    if (!nodesMap.has(adNodeId)) {
      nodesMap.set(adNodeId, {
        data: {
          id: adNodeId,
          label: `${ad.platform} (${ad.id})`,
          type: 'ad',
          risk_score: ad.risk_score || 0,
          risk_level: ad.risk_level || 'Low',
          platform: ad.platform,
          username: ad.username,
          categories: (ad.categories || []).join(', '),
          campaign_id: ad.campaign_id || null
        }
      });
    }

    // Profile Node
    const profileNodeId = `prof_${ad.platform}_${ad.username}`;
    if (!nodesMap.has(profileNodeId)) {
      nodesMap.set(profileNodeId, {
        data: {
          id: profileNodeId,
          label: `@${ad.username}`,
          type: 'profile',
          platform: ad.platform,
          risk_level: ad.risk_level || 'Low'
        }
      });
    }

    const postEdgeId = `edge_post_${ad.id}_${ad.username}`;
    if (!edgesMap.has(postEdgeId)) {
      edgesMap.set(postEdgeId, {
        data: {
          id: postEdgeId,
          source: profileNodeId,
          target: adNodeId,
          relation: 'POSTED',
          weight: 1
        }
      });
    }

    // Clues / Shared Entities
    if (ad.clues && Array.isArray(ad.clues)) {
      for (const clue of ad.clues) {
        if (['phone', 'whatsapp', 'telegram', 'upi', 'crypto_wallet', 'bank_account', 'card_number'].includes(clue.type)) {
          const entityNodeId = `ent_${clue.type}_${clue.normalized_value}`;
          if (!nodesMap.has(entityNodeId)) {
            nodesMap.set(entityNodeId, {
              data: {
                id: entityNodeId,
                label: clue.masked_value || clue.normalized_value,
                type: clue.type,
                raw_type: clue.type,
                risk_level: 'High'
              }
            });
          }

          const clueEdgeId = `edge_has_${ad.id}_${clue.type}_${clue.normalized_value}`;
          if (!edgesMap.has(clueEdgeId)) {
            edgesMap.set(clueEdgeId, {
              data: {
                id: clueEdgeId,
                source: adNodeId,
                target: entityNodeId,
                relation: 'CONTAINS',
                weight: 1
              }
            });
          }
        }
      }
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
    stats: {
      total_nodes: nodesMap.size,
      total_edges: edgesMap.size,
      ad_nodes: targetAds.length
    }
  };
}
