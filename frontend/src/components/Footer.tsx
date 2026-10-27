import React from 'react';
import { Smartphone, ShieldCheck, Gavel, Handshake, Sparkles, CheckCircle2, ChevronRight, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate?: (page: string, params?: any) => void;
  onOpenValuator?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenValuator }) => {
  const handleNav = (page: string, params: any = {}) => {
    if (onNavigate) {
      onNavigate(page, params);
    } else {
      const query = new URLSearchParams(params).toString();
      window.location.hash = query ? `${page}?${query}` : page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScrollToHowItWorks = () => {
    if (window.location.hash !== '#landing' && window.location.hash !== '' && window.location.hash !== '#') {
      handleNav('landing');
      setTimeout(() => {
        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Marketplace Value Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-10 border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-slate-100 text-xs sm:text-sm">Fair Resale Valuation</h5>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Objective secondary market price estimates based on exact hardware specs and physical phone condition.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Gavel className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-slate-100 text-xs sm:text-sm">Sealed-Bid Auctions</h5>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Competitor bids stay completely private with secret seller reserve price protection and fair tie-breaking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Handshake className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-slate-100 text-xs sm:text-sm">Direct Negotiation</h5>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Transparent buyer offers and seller counteroffers with automated minimum price floor safeguards.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-slate-100 text-xs sm:text-sm">Protected Settlements</h5>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Seller payouts are held securely until the buyer inspects and confirms the physical device upon delivery.
              </p>
            </div>
          </div>
        </div>

        {/* 4-Column Footer Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">ReValue</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              India's trusted smartphone resale marketplace. Fair market prices, sealed-bid auctions, and protected order fulfillment for conscious smartphone consumers.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>All device listings physically verified by sellers</span>
            </div>
          </div>

          {/* Device Brands */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Popular Brands</h4>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('marketplace', { brand: 'Apple' })}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Apple iPhone (11 through 16 Pro)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('marketplace', { brand: 'Samsung' })}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Samsung Galaxy (S, Z & A Series)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('marketplace', { brand: 'Google' })}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Google Pixel & Pixel Pro</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('marketplace', { brand: 'OnePlus' })}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>OnePlus Flagship & Nord</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('marketplace', { brand: 'Xiaomi' })}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Xiaomi, Redmi & Poco</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Marketplace</h4>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('marketplace')}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Browse All Smartphones</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('create-listing')}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Sell Your Smartphone</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenValuator) onOpenValuator();
                    else handleNav('marketplace');
                  }}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Instant Price Estimator</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleScrollToHowItWorks}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>How ReValue Works</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('buyer-dashboard')}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Buyer Account & Orders</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Buying & Selling Trust */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Trust & Protection</h4>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('marketplace', { condition: 'excellent' })}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Like New (Mint Condition)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('marketplace', { condition: 'good' })}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Good Condition Phones</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('seller-dashboard')}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Seller Dashboard & Shipments</span>
                </button>
              </li>
              <li>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Inspected Courier Delivery</span>
                </span>
              </li>
              <li>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  <span>Transparent Buyer Protection</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} ReValue Technologies. All rights reserved.
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Fair resale valuations & verified pre-owned smartphone listings</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
