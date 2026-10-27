/**
 * ReValue Formatting & Customer-Facing Terminology Utilities
 * Maps underlying machine-learning classes and data formats to customer-friendly labels.
 */

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export interface ConditionDisplay {
  canonical: string;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  badgeBorderClass: string;
}

export function getConditionMeta(condition: string | undefined | null): ConditionDisplay {
  const normalized = (condition || '').toLowerCase().trim();

  switch (normalized) {
    case 'excellent':
      return {
        canonical: 'excellent',
        label: 'Like New (Mint)',
        shortLabel: 'Like New',
        description: 'Flawless screen and casing with virtually zero visible scuffs or scratches.',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
        badgeBorderClass: 'border-emerald-300',
      };
    case 'good':
      return {
        canonical: 'good',
        label: 'Good Condition',
        shortLabel: 'Good',
        description: 'Screen in great shape with light micro-scratches from normal everyday handling.',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        badgeBorderClass: 'border-slate-300',
      };
    case 'bad':
      return {
        canonical: 'bad',
        label: 'Noticeable Wear',
        shortLabel: 'Noticeable Wear',
        description: 'Visible casing scuffs, edge marks, or moderate cosmetic wear throughout.',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        badgeBorderClass: 'border-amber-300',
      };
    case 'defective':
    case 'defeactive':
      return {
        canonical: 'defective',
        label: 'Heavily Damaged',
        shortLabel: 'Heavily Damaged',
        description: 'Significant physical damage, deep exterior scratches, or heavy impact marks.',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        badgeBorderClass: 'border-rose-300',
      };
    default:
      return {
        canonical: normalized || 'good',
        label: condition || 'Pre-Owned',
        shortLabel: condition || 'Pre-Owned',
        description: 'Pre-owned smartphone inspected by visible exterior assessment.',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        badgeBorderClass: 'border-slate-200',
      };
  }
}

export function getSellingMethodMeta(method: string | undefined | null): {
  label: string;
  tag: string;
  badgeClass: string;
  description: string;
} {
  const norm = (method || '').toLowerCase().trim();
  if (norm === 'bidding') {
    return {
      label: 'Sealed-Bid Auction',
      tag: 'Sealed Auction',
      badgeClass: 'bg-amber-600 text-white',
      description: 'Submit confidential bids before the deadline. Highest bid meeting the seller reserve price wins.',
    };
  }
  return {
    label: 'Direct Purchase & Negotiation',
    tag: 'Open Negotiation',
    badgeClass: 'bg-slate-900 text-white',
    description: 'Buy now at asking price or make a private offer with instant seller response.',
  };
}
