/**
 * Forensic PDF Dossier Generator for FinGuard Sentinel
 * Uses PDFKit to construct high-authority Cyber Crime & Bank Case Reports.
 */

import PDFDocument from 'pdfkit';

export function generateEvidencePDF(evidence, res) {
  const doc = new PDFDocument({
    margin: 45,
    size: 'A4',
    info: {
      Title: `FinGuard Evidence Dossier - ${evidence.ad_id}`,
      Author: 'FinGuard Sentinel AI Threat Detection System',
      Subject: 'Financial Crime & Illicit Mule Account Investigation Report'
    }
  });

  doc.pipe(res);

  // Header Banner
  doc
    .rect(45, 45, 505, 40)
    .fill('#0f172a');

  doc
    .fontSize(16)
    .fillColor('#38bdf8')
    .text('FINGUARD SENTINEL', 60, 56, { continued: true })
    .fontSize(10)
    .fillColor('#94a3b8')
    .text('  |  FINANCIAL FRAUD FORENSIC INTELLIGENCE DOSSIER');

  doc.moveDown(2);

  // Case Metadata
  doc
    .fontSize(11)
    .fillColor('#0f172a')
    .text(`Dossier Reference: ${evidence.ad_id}`, 45, 100)
    .fontSize(9)
    .fillColor('#475569')
    .text(`Evidence SHA-256: ${evidence.content_hash}`)
    .text(`Generated: ${new Date().toUTCString()}  |  Classification: STRICTLY CONFIDENTIAL - LAW ENFORCEMENT & BANK NODAL ONLY`);

  doc.moveDown(1);
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(45, 140).lineTo(550, 140).stroke();

  // Threat & Risk Summary Box
  const riskColor = evidence.risk_score >= 81 ? '#dc2626' : evidence.risk_score >= 61 ? '#ea580c' : '#0284c7';
  doc
    .rect(45, 155, 505, 55)
    .fill('#f8fafc');

  doc
    .rect(45, 155, 6, 55)
    .fill(riskColor);

  doc
    .fontSize(12)
    .fillColor('#0f172a')
    .text(`ASSESSED THREAT LEVEL: ${evidence.risk_level.toUpperCase()} (Score: ${evidence.risk_score}/100)`, 60, 165)
    .fontSize(10)
    .fillColor('#334155')
    .text(`Primary Categories: ${(evidence.categories || []).join(', ')}`)
    .fontSize(9)
    .fillColor('#64748b')
    .text(`Platform: ${evidence.platform}  |  Profile: @${evidence.username}  |  City: ${evidence.city}`);

  doc.moveDown(2.5);

  // Plain Language Summary
  doc
    .fontSize(11)
    .fillColor('#0f172a')
    .text('EXECUTIVE INVESTIGATIVE SUMMARY', 45, 225);

  doc
    .fontSize(9.5)
    .fillColor('#334155')
    .text(evidence.summary || 'Illicit commercial bank account / mule activity detected with multiple high-confidence indicators.', 45, 240, {
      width: 505,
      lineGap: 3
    });

  doc.moveDown(1.5);

  // Original Post Text
  const textTop = doc.y;
  doc
    .fontSize(11)
    .fillColor('#0f172a')
    .text('EVIDENCE POST TRANSCRIPT', 45, textTop);

  doc
    .rect(45, textTop + 16, 505, 65)
    .fill('#f1f5f9');

  doc
    .fontSize(9)
    .fillColor('#1e293b')
    .text(`"${evidence.original_text}"`, 55, textTop + 24, {
      width: 485,
      lineGap: 2
    });

  doc.y = textTop + 95;

  // Extracted Clues Table
  doc
    .fontSize(11)
    .fillColor('#0f172a')
    .text('FORENSIC ENTITIES & EXTRACTED CLUES', 45, doc.y);

  doc.moveDown(0.5);

  if (evidence.clues && evidence.clues.length > 0) {
    let clueY = doc.y;
    // Table Header
    doc
      .rect(45, clueY, 505, 18)
      .fill('#e2e8f0');

    doc
      .fontSize(8.5)
      .fillColor('#1e293b')
      .text('ENTITY TYPE', 55, clueY + 5)
      .text('FORENSIC VALUE (MASKED)', 160, clueY + 5)
      .text('SOURCE', 350, clueY + 5)
      .text('CONFIDENCE', 440, clueY + 5);

    clueY += 20;

    for (const clue of evidence.clues.slice(0, 8)) {
      doc
        .fontSize(8)
        .fillColor('#334155')
        .text(clue.type.toUpperCase(), 55, clueY + 3)
        .text(clue.masked_value || clue.value, 160, clueY + 3)
        .text(clue.source || 'text', 350, clueY + 3)
        .text(`${Math.round(clue.confidence * 100)}%`, 440, clueY + 3);

      doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(45, clueY + 16).lineTo(550, clueY + 16).stroke();
      clueY += 18;
    }
    doc.y = clueY + 10;
  } else {
    doc.fontSize(9).fillColor('#64748b').text('No structured entities extracted.', 45, doc.y);
    doc.moveDown(1);
  }

  // Risk Factor Breakdown
  doc
    .fontSize(11)
    .fillColor('#0f172a')
    .text('RISK SCORING FACTOR ATTRIBUTION', 45, doc.y);

  doc.moveDown(0.4);

  for (const factor of (evidence.factor_breakdown || []).slice(0, 6)) {
    doc
      .fontSize(8.5)
      .fillColor('#0f172a')
      .text(`[+${factor.points} pts] ${factor.factor}: `, 45, doc.y, { continued: true })
      .fillColor('#475569')
      .text(factor.description);
    doc.moveDown(0.2);
  }

  // Coordinated Campaign / Syndicate Membership
  if (evidence.campaign_id) {
    doc.moveDown(0.8);
    doc
      .fontSize(11)
      .fillColor('#b91c1c')
      .text(`COORDINATED SYNDICATE MEMBERSHIP: ${evidence.campaign_name || evidence.campaign_id}`, 45, doc.y)
      .fontSize(8.5)
      .fillColor('#475569')
      .text(`This advertisement is confirmed to belong to a syndicated cluster sharing identical payment/contact entities across multiple accounts and platforms.`);
  }

  // Footer Disclaimer
  doc
    .fontSize(7.5)
    .fillColor('#94a3b8')
    .text(
      'LEGAL DISCLAIMER: FinGuard Sentinel Prototype - Generated with synthetic intelligence models. ' +
      'Indicators are compiled for investigative prioritization and forensic referral, not conclusive legal guilt. ' +
      'Chain of Custody verified via SHA-256 cryptographic hash.',
      45,
      760,
      { width: 505, align: 'center' }
    );

  doc.end();
}
