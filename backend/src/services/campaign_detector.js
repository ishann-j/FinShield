/**
 * Coordinated Campaign Detection Engine for FinGuard Sentinel
 * Identifies syndicated mule operations, bot rings, shared-entity networks,
 * image near-duplicates (pHash), and temporal bursts.
 */

import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import { hammingDistance } from './extractors.js';

// Calculate token Jaccard similarity for near-duplicate text
export function jaccardSimilarity(text1 = '', text2 = '') {
  const set1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const set2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (set1.size === 0 || set2.size === 0) return 0;

  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }
  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function detectCampaigns(ads = []) {
  console.log(`[CampaignDetector] Analyzing ${ads.length} ads for coordinated operations...`);
  const graph = new Graph({ type: 'undirected' });

  // Add all ad nodes
  for (const ad of ads) {
    if (!graph.hasNode(`ad:${ad.id}`)) {
      graph.addNode(`ad:${ad.id}`, {
        type: 'ad',
        adId: ad.id,
        platform: ad.platform,
        username: ad.username,
        risk_score: ad.risk_score || 0,
        posted_at: ad.posted_at
      });
    }

    // Add profile node
    const profileNodeId = `profile:${ad.platform}:${ad.username}`;
    if (!graph.hasNode(profileNodeId)) {
      graph.addNode(profileNodeId, {
        type: 'profile',
        platform: ad.platform,
        username: ad.username
      });
    }
    graph.addEdge(`ad:${ad.id}`, profileNodeId, { relation: 'POSTED_BY' });

    // Add entity nodes for extracted clues
    if (ad.clues && Array.isArray(ad.clues)) {
      for (const clue of ad.clues) {
        // Exclude generic low-entropy clues
        if (['phone', 'whatsapp', 'telegram', 'upi', 'crypto_wallet', 'bank_account', 'url'].includes(clue.type)) {
          const entityNodeId = `entity:${clue.type}:${clue.normalized_value}`;
          if (!graph.hasNode(entityNodeId)) {
            graph.addNode(entityNodeId, {
              type: clue.type,
              value: clue.normalized_value,
              masked_value: clue.masked_value
            });
          }
          if (!graph.hasEdge(`ad:${ad.id}`, entityNodeId)) {
            graph.addEdge(`ad:${ad.id}`, entityNodeId, { relation: 'CONTAINS' });
          }
        }
      }
    }
  }

  // Near-duplicate text and image pHash edges between ads (sample comparison)
  const suspiciousAds = ads.filter(a => (a.risk_score || 0) >= 30);
  for (let i = 0; i < suspiciousAds.length; i++) {
    for (let j = i + 1; j < Math.min(suspiciousAds.length, i + 50); j++) {
      const adA = suspiciousAds[i];
      const adB = suspiciousAds[j];

      // Text similarity
      const textSim = jaccardSimilarity(adA.text, adB.text);
      if (textSim >= 0.70) {
        const edgeKey = `sim_text:${adA.id}:${adB.id}`;
        if (!graph.hasEdge(`ad:${adA.id}`, `ad:${adB.id}`)) {
          graph.addEdge(`ad:${adA.id}`, `ad:${adB.id}`, {
            relation: 'SIMILAR_TEXT',
            similarity: textSim
          });
        }
      }

      // Image pHash similarity
      if (adA.phash && adB.phash) {
        const dist = hammingDistance(adA.phash, adB.phash);
        if (dist <= 8) {
          if (!graph.hasEdge(`ad:${adA.id}`, `ad:${adB.id}`)) {
            graph.addEdge(`ad:${adA.id}`, `ad:${adB.id}`, {
              relation: 'SIMILAR_IMAGE',
              hamming_distance: dist
            });
          }
        }
      }
    }
  }

  // Group nodes into campaigns using Connected Components
  const communities = {};
  let compId = 0;
  const visited = new Set();

  graph.forEachNode(node => {
    if (!visited.has(node)) {
      const componentNodes = [];
      const queue = [node];
      visited.add(node);

      while (queue.length > 0) {
        const curr = queue.shift();
        componentNodes.push(curr);
        graph.forEachNeighbor(curr, neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }

      // If component is large (> 35 nodes), sub-cluster with Louvain
      if (componentNodes.length > 35) {
        try {
          const subGraph = new Graph({ type: 'undirected' });
          componentNodes.forEach(n => subGraph.addNode(n, graph.getNodeAttributes(n)));
          componentNodes.forEach(n => {
            graph.forEachNeighbor(n, neighbor => {
              if (subGraph.hasNode(neighbor) && !subGraph.hasEdge(n, neighbor)) {
                subGraph.addEdge(n, neighbor, graph.getEdgeAttributes(n, neighbor));
              }
            });
          });
          const subLouvain = louvain(subGraph);
          for (const [sNode, sComm] of Object.entries(subLouvain)) {
            communities[sNode] = `comm_${compId}_${sComm}`;
          }
          compId++;
        } catch {
          componentNodes.forEach(n => { communities[n] = `comm_${compId}`; });
          compId++;
        }
      } else {
        componentNodes.forEach(n => { communities[n] = `comm_${compId}`; });
        compId++;
      }
    }
  });

  // Group nodes by community
  const communityMap = new Map();
  for (const [nodeId, commId] of Object.entries(communities)) {
    if (!communityMap.has(commId)) {
      communityMap.set(commId, { ads: [], profiles: new Set(), entities: new Set() });
    }
    const group = communityMap.get(commId);
    const nodeAttrs = graph.getNodeAttributes(nodeId);

    if (nodeAttrs.type === 'ad') {
      const ad = ads.find(a => a.id === nodeAttrs.adId);
      if (ad) group.ads.push(ad);
    } else if (nodeAttrs.type === 'profile') {
      group.profiles.add(`${nodeAttrs.platform}:${nodeAttrs.username}`);
    } else {
      group.entities.add({
        type: nodeAttrs.type,
        value: nodeAttrs.value,
        masked_value: nodeAttrs.masked_value
      });
    }
  }

  // Filter into genuine coordinated campaigns (size >= 3 ads, or multiple profiles sharing entity)
  const campaigns = [];
  let campaignIndex = 1;

  for (const [commId, group] of communityMap.entries()) {
    // Only flag clusters with at least 3 suspicious ads or multi-account coordination
    const suspiciousInGroup = group.ads.filter(a => (a.risk_score || 0) >= 40);
    if (suspiciousInGroup.length >= 3 || (suspiciousInGroup.length >= 2 && group.profiles.size >= 2)) {
      const allAds = group.ads;
      const platforms = [...new Set(allAds.map(a => a.platform))];
      const usernames = [...new Set(allAds.map(a => a.username))];
      
      // Calculate temporal burst
      const timestamps = allAds.map(a => new Date(a.posted_at).getTime()).sort();
      const firstSeen = new Date(timestamps[0]).toISOString();
      const lastSeen = new Date(timestamps[timestamps.length - 1]).toISOString();
      const timeSpanHours = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 3600);
      const isBurst = timestamps.length >= 4 && timeSpanHours < 6;

      // Primary categories
      const categoryCounts = {};
      allAds.forEach(a => {
        (a.categories || []).forEach(cat => {
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
      });
      const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([cat]) => cat)
        .slice(0, 3);

      const avgRisk = Math.round(
        allAds.reduce((acc, a) => acc + (a.risk_score || 0), 0) / allAds.length
      );

      // Extract shared entities
      const sharedEntities = Array.from(group.entities);

      // Auto-generate realistic Campaign Name
      const leadEntity = sharedEntities.find(e => e.type === 'phone' || e.type === 'upi' || e.type === 'crypto_wallet');
      const leadPlatform = platforms[0] || 'CrossPlatform';
      const leadCategory = topCategories[0]?.replace(/_/g, ' ') || 'Syndicate';
      const campaignName = `Operation ${leadCategory.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} [${leadPlatform}-${String(campaignIndex).padStart(2, '0')}]`;

      const campaignId = `CAMP-${String(campaignIndex).padStart(3, '0')}`;
      campaignIndex++;

      const campaignObj = {
        id: campaignId,
        name: campaignName,
        community_id: commId,
        member_ad_ids: allAds.map(a => a.id),
        ad_count: allAds.length,
        platform_count: platforms.length,
        platforms,
        account_count: usernames.length,
        accounts: usernames,
        shared_entities: sharedEntities.slice(0, 10),
        first_seen: firstSeen,
        last_seen: lastSeen,
        time_span_hours: Math.round(timeSpanHours * 10) / 10,
        is_burst: isBurst,
        risk_score: avgRisk,
        primary_categories: topCategories,
        confidence: Math.min(0.98, 0.70 + (platforms.length * 0.05) + (usernames.length * 0.04)),
        status: avgRisk >= 75 ? 'Active - High Priority' : 'Monitoring'
      };

      campaigns.push(campaignObj);

      // Tag ads with detected campaign_id
      for (const ad of allAds) {
        ad.campaign_id = campaignId;
        ad.campaign_name = campaignName;
      }
    }
  }

  campaigns.sort((a, b) => b.risk_score - a.risk_score || b.ad_count - a.ad_count);
  console.log(`[CampaignDetector] Identified ${campaigns.length} coordinated campaigns.`);
  return { campaigns, graph };
}

export function evaluateCampaignsAgainstGroundTruth(ads = [], detectedCampaigns = []) {
  // Evaluates detected clusters against injected ground truth campaign_ids
  let pairsTrueSame = 0;
  let pairsPredSame = 0;
  let pairsBothSame = 0;

  // Sample comparison on ads with ground truth
  const adsWithGt = ads.filter(a => a.ground_truth_campaign_id);
  const sample = adsWithGt.slice(0, 300);

  for (let i = 0; i < sample.length; i++) {
    for (let j = i + 1; j < sample.length; j++) {
      const trueSame = sample[i].ground_truth_campaign_id === sample[j].ground_truth_campaign_id;
      const predSame = sample[i].campaign_id && sample[j].campaign_id && sample[i].campaign_id === sample[j].campaign_id;

      if (trueSame) pairsTrueSame++;
      if (predSame) pairsPredSame++;
      if (trueSame && predSame) pairsBothSame++;
    }
  }

  const precision = pairsPredSame > 0 ? pairsBothSame / pairsPredSame : 0;
  const recall = pairsTrueSame > 0 ? pairsBothSame / pairsTrueSame : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  console.log('[CampaignDetector] Clustering Evaluation:');
  console.table([{
    'Total Injected': new Set(adsWithGt.map(a => a.ground_truth_campaign_id)).size,
    'Detected Campaigns': detectedCampaigns.length,
    'Pairwise Precision': Math.round(precision * 1000) / 1000,
    'Pairwise Recall': Math.round(recall * 1000) / 1000,
    'F1 Score': Math.round(f1 * 1000) / 1000
  }]);

  return { precision, recall, f1 };
}
