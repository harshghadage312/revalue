import React from 'react';
import { Smartphone, ShieldCheck, Gavel, Handshake, Sparkles, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs pt-14 pb-10 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Trust Value Propositions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-8 border-b border-slate-800/80">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-slate-200 text-xs">17-Feature Resale Pricing</h5>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Objective secondary market estimates based on real hardware specs and physical cosmetic wear.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Gavel className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-slate-200 text-xs">Sealed-Bid Reserve Auctions</h5>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Competitor bids remain completely sealed with private reserve protection and deterministic tie-breaking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Handshake className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-slate-200 text-xs">Rule-Assisted Negotiation</h5>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Transparent buyer offers and seller counteroffers with automated floor protections.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-slate-200 text-xs">Escrow-Protected Payouts</h5>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Seller payouts remain securely held until the buyer receives and confirms physical device condition.
              </p>
            </div>
          </div>
        </div>

        {/* 4-Column Footer Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-extrabold text-white tracking-tight">ReValue</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              India's trusted AI-assisted secondary smartphone marketplace. Fair pricing, sealed auctions, and protected settlements for conscious smartphone consumers.
            </p>
          </div>

          {/* Device Brands */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Device Catalogue</h4>
            <ul className="space-y-1.5 text-slate-400 text-xs">
              <li>Apple iPhone Series (11 to 16 Pro)</li>
              <li>Samsung Galaxy S & Z Fold Series</li>
              <li>Google Pixel & Pixel Pro Series</li>
              <li>OnePlus Flagship & Nord Series</li>
              <li>Xiaomi, Motorola, Nothing & Vivo</li>
            </ul>
          </div>

          {/* Trading Mechanisms */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Marketplace Workflows</h4>
            <ul className="space-y-1.5 text-slate-400 text-xs">
              <li>Open Negotiation & Counteroffers</li>
              <li>Sealed Bidding & Private Reserve</li>
              <li>MobileNetV2 Visual Condition AI</li>
              <li>Courier Tracking & Delivery Release</li>
              <li>Verified Review System</li>
            </ul>
          </div>

          {/* Trust & Transparency */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Trust & Integrity</h4>
            <ul className="space-y-1.5 text-slate-400 text-xs">
              <li>Zero Synthetic Inventory</li>
              <li>Dispute Freezing Protocol</li>
              <li>HMAC-SHA256 Webhook Verification</li>
              <li>Role-Based Server Authorization</li>
              <li>Provider-Ready Settlement Rails</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            © 2026 ReValue Technologies. Production Marketplace Suite.
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Fabrication Architecture • Real MongoDB Data Only</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
