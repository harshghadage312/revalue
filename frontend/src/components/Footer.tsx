import React from 'react';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

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
    <footer className="bg-slate-900 text-slate-400 text-xs pt-10 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-2.5">
            <button
              type="button"
              onClick={() => handleNav('landing')}
              className="text-left focus:outline-none"
            >
              <BrandLogo size="md" variant="dark" showTagline={true} />
            </button>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
              Every phone has more value. A straightforward marketplace to buy and sell pre-owned smartphones with clear condition checks and fair resale estimates.
            </p>
          </div>

          {/* Shop */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Shop Phones</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('marketplace')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  All Phones
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('marketplace', { brand: 'Apple' })}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Apple iPhones
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('marketplace', { brand: 'Samsung' })}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Samsung Galaxy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('marketplace', { brand: 'OnePlus' })}
                  className="hover:text-emerald-400 transition-colors"
                >
                  OnePlus
                </button>
              </li>
            </ul>
          </div>

          {/* Sell */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Sell & Estimate</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('create-listing')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Sell Your Phone
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenValuator) onOpenValuator();
                    else handleNav('marketplace');
                  }}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Instant Resale Estimate
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleScrollToHowItWorks}
                  className="hover:text-emerald-400 transition-colors"
                >
                  How ReValue Works
                </button>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Account</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('buyer-dashboard')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  My Orders & Offers
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('seller-dashboard')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Seller Dashboard
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('delivery-partner-signup')}
                  className="hover:text-emerald-400 transition-colors text-emerald-400 font-semibold"
                >
                  Become a Delivery Partner
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('rider-dashboard')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Partner Dashboard
                </button>
              </li>
              <li>
                <span className="text-slate-500">Local Verified Couriers & Payout Protection</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} ReValue. All rights reserved.
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fulfillment Tracking & Buyer Payout Protection • Indian Rupee (₹)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
