import React, { useState, useEffect } from 'react';
import {
  ArrowRight, Smartphone, ChevronRight, CheckCircle2,
  Package, Handshake, Gavel, ShieldCheck, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { Product, RecommendationItem } from '../types';
import { ProductCard } from '../components/ProductCard';

interface LandingPageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenValuator: () => void;
}

const POPULAR_BRANDS = [
  { name: 'Apple', hint: 'iPhone 11 to 16 Pro' },
  { name: 'Samsung', hint: 'Galaxy S, Z & A Series' },
  { name: 'OnePlus', hint: 'Flagship & Nord' },
  { name: 'Google', hint: 'Pixel 6 to 9 Pro' },
  { name: 'Xiaomi', hint: 'Redmi & Xiaomi' },
  { name: 'Nothing', hint: 'Phone (1), (2) & CMF' },
];

const CONDITION_TIERS = [
  {
    id: 'excellent',
    label: 'Like New',
    description: 'Flawless screen and casing. Virtually zero visible marks.',
    dot: 'bg-emerald-500',
  },
  {
    id: 'good',
    label: 'Good Condition',
    description: 'Screen in great shape with light micro-scratches from normal use.',
    dot: 'bg-blue-500',
  },
  {
    id: 'bad',
    label: 'Noticeable Wear',
    description: 'Visible casing scuffs or edge marks. 100% operational hardware.',
    dot: 'bg-amber-500',
  },
  {
    id: 'defective',
    label: 'Heavily Damaged',
    description: 'Cracked glass or exterior damage clearly disclosed for parts/repair.',
    dot: 'bg-rose-500',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onOpenValuator,
}) => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'negotiation' | 'bidding'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listProducts({ size: 8, sort_by: 'newest' }).then(res => res.items).catch(() => []),
      api.getRecommendations().then(res => res.items).catch(() => []),
    ]).then(([prods, recs]) => {
      setFeaturedProducts(prods);
      setRecommendations(recs);
      setLoading(false);
    });
  }, []);

  const filteredListings = featuredProducts.filter(p => {
    if (activeTab === 'all') return true;
    return p.selling_method === activeTab;
  });

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      {/* 1. Concise, High-Impact Hero */}
      <section className="bg-white border-b border-slate-200 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Find your next phone for less.
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Explore pre-owned smartphones, compare prices, and choose the right device for you. Real listings, transparent conditions, and fair resale estimates.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                onClick={() => onNavigate('marketplace')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>Browse Phones</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('create-listing')}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm rounded-lg border border-slate-200 shadow-2xs transition-colors"
              >
                Sell Your Phone
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Popular Brands */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Popular Brands
          </h2>
          <button
            onClick={() => onNavigate('marketplace')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {POPULAR_BRANDS.map((b) => (
            <button
              key={b.name}
              type="button"
              onClick={() => onNavigate('marketplace', { brand: b.name })}
              className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-600 text-left transition-colors group flex flex-col justify-between"
            >
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors block">
                  {b.name}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                  {b.hint}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Featured / Recently Listed Phones */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Recently Listed Phones
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified devices ready for purchase, offer, or auction.
            </p>
          </div>

          {/* Filter Segment Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('negotiation')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'negotiation' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Direct Buy / Offers
            </button>
            <button
              onClick={() => setActiveTab('bidding')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'bidding' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sealed Auctions
            </button>
          </div>
        </div>

        {/* 2-Column on Mobile, 4-Column on Desktop */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-64 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6 space-y-2">
            <Smartphone className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-800">No active listings found in this category</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be the first to list a smartphone or explore all available models.
            </p>
            <button
              onClick={() => onNavigate('create-listing')}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-2xs"
            >
              List a Phone
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredListings.slice(0, 8).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => onNavigate('product-detail', { id: p.id })}
              />
            ))}
          </div>
        )}

        {/* Explore All CTA */}
        <div className="text-center mt-6">
          <button
            onClick={() => onNavigate('marketplace')}
            className="px-5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs transition-colors"
          >
            Explore All Available Phones
          </button>
        </div>
      </section>

      {/* 4. Browse by Condition */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Shop by Condition
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent exterior condition tiers to match your budget.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {CONDITION_TIERS.map((tier) => (
            <div
              key={tier.id}
              onClick={() => onNavigate('marketplace', { condition: tier.id })}
              className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-600 cursor-pointer transition-colors group flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${tier.dot}`} />
                  <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {tier.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {tier.description}
                </p>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-emerald-700">
                <span>View Phones</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white space-y-6">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-white">
              How ReValue Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              A transparent, safe way to buy and sell pre-owned smartphones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Find or List Phones</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Browse verified phones with detailed specs. Sellers can check physical condition and get resale price estimates before listing.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Buy, Offer, or Bid</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Buy instantly at asking price, submit private counteroffers with floor protection, or participate in sealed-bid auctions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Inspected Delivery</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track your courier delivery. Buyer payments are held safely until you receive the phone and confirm its listed condition.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Recommendations (when available) */}
      {recommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Recommended For You
              </h2>
              <p className="text-xs text-slate-500">
                Matches based on price and hardware specifications.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recommendations.slice(0, 3).map((item) => (
              <div
                key={item.product_id}
                onClick={() => onNavigate('product-detail', { id: item.product_id })}
                className="bg-white hover:border-emerald-600 border border-slate-200 rounded-xl p-3.5 transition-colors cursor-pointer group"
              >
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">
                  {item.recommendation_reason}
                </div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 group-hover:text-emerald-700">
                  {item.title}
                </div>
                <div className="text-sm font-extrabold text-slate-900 mt-1.5">
                  ₹{item.asking_price.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
