import React from 'react';

export function RiskBadge({ level = 'Low', score = null, showScore = true, size = 'md' }) {
  const normLevel = String(level || 'Low').toLowerCase();

  const styles = {
    critical: {
      bg: 'bg-red-500/15 border-red-500/30 text-red-400',
      dot: 'bg-red-500 shadow-[0_0_8px_#ef4444]',
      label: 'Critical Threat'
    },
    high: {
      bg: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
      dot: 'bg-orange-500 shadow-[0_0_8px_#f97316]',
      label: 'High Risk'
    },
    medium: {
      bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      dot: 'bg-amber-500 shadow-[0_0_8px_#eab308]',
      label: 'Medium Risk'
    },
    low: {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-500 shadow-[0_0_8px_#10b981]',
      label: 'Low / Benign'
    }
  };

  const current = styles[normLevel] || styles.low;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-semibold'
  }[size] || 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${current.bg} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot} animate-pulse`} />
      <span>{current.label}</span>
      {showScore && score !== null && (
        <span className="font-mono opacity-80 pl-1 border-l border-current/20">
          {score}/100
        </span>
      )}
    </span>
  );
}

export function CategoryBadge({ category }) {
  const labelMap = {
    ACCOUNT_SALE_RENT: 'Account Sale / Rent',
    ACCOUNT_RECRUITMENT: 'Mule Recruitment',
    CARD_SALE: 'ATM / Card Sale',
    STOLEN_CLONED_CARD: 'Carding / CVV Dump',
    FAKE_KYC_SHELL_ACCOUNT: 'Fake KYC / Shell Firm',
    CREDENTIAL_ACCESS_SALE: 'Credential & Access',
    CRYPTO_LAUNDERING_LINKED: 'Crypto Laundering',
    OTHER_FINANCIAL_FRAUD_ENABLER: 'Fraud Enabler',
    BENIGN: 'Benign / Genuine'
  };

  const isBenign = category === 'BENIGN';

  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded border ${
      isBenign
        ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300'
        : 'bg-sky-950/50 border-sky-600/40 text-sky-300'
    }`}>
      {labelMap[category] || category?.replace(/_/g, ' ')}
    </span>
  );
}
