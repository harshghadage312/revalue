import React, { useState, useEffect } from 'react';
import {
  Sparkles, ShieldCheck, ArrowRight, Gavel, Handshake,
  TrendingUp, CheckCircle, Smartphone, RefreshCw, Star,
  Search, ShieldAlert, CheckCircle2, ChevronRight, Sliders
} from 'lucide-react';
import { api } from '../services/api';
import { Product, RecommendationItem } from '../types';
import { ProductCard } from '../components/ProductCard';

interface LandingPageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenValuator: () => void;
}

const TOP_BRANDS = [
  { name: 'Apple', modelHint: 'iPhone 11 to 16 Pro', count: '180+ models' },
  { name: 'Samsung', modelHint: 'Galaxy S, Z & A Series', count: '140+ models' },
  { name: 'OnePlus', modelHint: 'OnePlus 9 to 12 & Nord', count: '45+ models' },
  { name: 'Google', modelHint: 'Pixel 6 to 9 Pro', count: '30+ models' },
  { name: 'Xiaomi', modelHint: 'Redmi & Xiaomi Flagships', count: '70+ models' },
  { name: 'Nothing', modelHint: 'Phone (1) & (2)', count: '10+ models' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onOpenValuator,
}) => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'negotiation' | 'bidding'>('all');
  const [heroSearch, setHeroSearch] = useState('');
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

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      onNavigate('marketplace', { query: heroSearch.trim() });
    } else {
      onNavigate('marketplace');
    }
  };

  const filteredListings = featuredProducts.filter(p => {
    if (activeTab === 'all') return true;
    return p.selling_method === activeTab;
  });

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200/90 pt-12 pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-900 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Secondary Smartphone Marketplace</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              The smarter way to buy and sell used smartphones.
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Verify fair resale prices using our 17-feature machine learning model, negotiate with rule-based assistant protection, or participate in sealed-bid auctions with private seller reserves.
            </p>

            {/* Interactive Hero Search Form */}
            <form onSubmit={handleHeroSearch} className="max-w-xl mx-auto pt-2">
              <div className="flex items-center bg-slate-50 border border-slate-200 hover:border-slate-300 focus-within:border-emerald-600 focus-within:bg-white rounded-2xl p-1.5 shadow-xs transition-all">
                <Search className="w-4 h-4 text-slate-400 ml-3 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search iPhone 15, Galaxy S24, OnePlus 12..."
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none pr-2"
                />
                <button
                  type="submit"
                  className="px-4 sm:px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shrink-0 transition-colors"
                >
                  Search
                </button>
              </div>

              {/* Quick Tags */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-400">Popular:</span>
                {['iPhone 14', 'Galaxy S23', 'OnePlus 11', 'Pixel 8', 'Xiaomi 13 Pro'].map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => onNavigate('marketplace', { query: tag })}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium transition-colors text-[11px]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </form>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <button
                onClick={() => onNavigate('marketplace')}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-[0.99]"
              >
                <span>Browse Verified Listings</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenValuator}
                className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Estimate Phone Price (Free)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Marketplace Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">17-Feature ML Valuator</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Objective resale valuations evaluated by scikit-learn Random Forest model trained on secondary market depreciation.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Gavel className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Sealed-Bid Auctions</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              True bid privacy with secret reserve price protection. Competitors never see your bid and winners pay transparently.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Handshake className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Rule-Assisted Negotiation</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Submit private offers with instant automated counter-strategy advice that prevents lowballs and protects margins.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Escrow-Safe Settlements</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Buyer funds stay safely held until delivery and physical inspection are confirmed. Disputes freeze seller payouts instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Popular Brand Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Browse by Certified Brand</h2>
            <p className="text-xs text-slate-500 mt-0.5">Explore authenticated secondary devices from 26 supported manufacturers.</p>
          </div>
          <button
            onClick={() => onNavigate('marketplace')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>All Brands</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TOP_BRANDS.map((b) => (
            <div
              key={b.name}
              onClick={() => onNavigate('marketplace', { brand: b.name })}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between space-y-2 group"
            >
              <div>
                <span className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors block">
                  {b.name}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">{b.modelHint}</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 w-fit px-2 py-0.5 rounded-md">
                {b.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Marketplace Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Live Smartphone Listings</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real devices with verified hardware specifications and condition assessments.</p>
          </div>

          {/* Filter Segment Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Listings
            </button>
            <button
              onClick={() => setActiveTab('negotiation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'negotiation' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Open Negotiation
            </button>
            <button
              onClick={() => setActiveTab('bidding')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'bidding' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sealed Auctions
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-80 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
            <Smartphone className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No active listings in this category</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be the first to list a smartphone in this category or browse all available devices.
            </p>
            <button
              onClick={() => onNavigate('create-listing')}
              className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
            >
              List a Phone
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredListings.slice(0, 8).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => onNavigate('product-detail', { id: p.id })}
              />
            ))}
          </div>
        )}

        {/* View All CTA */}
        <div className="text-center mt-8">
          <button
            onClick={() => onNavigate('marketplace')}
            className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs transition-colors"
          >
            Explore All Marketplace Listings ({featuredProducts.length}+ Active)
          </button>
        </div>
      </section>

      {/* AI Recommendation Engine Highlight */}
      {recommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Attribute-Affinity Matching</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">Smart Match Recommendations</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ranked by secondary attribute affinity, price proximity, and cosmetic condition scoring.
                </p>
              </div>
              <button
                onClick={() => onNavigate('marketplace')}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors shrink-0"
              >
                Browse All Matches
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recommendations.slice(0, 3).map((item) => (
                <div
                  key={item.product_id}
                  onClick={() => onNavigate('product-detail', { id: item.product_id })}
                  className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-4 transition-all cursor-pointer group"
                >
                  <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1">
                    {item.recommendation_reason}
                  </div>
                  <div className="font-bold text-white text-sm line-clamp-1 group-hover:text-emerald-300 transition-colors">
                    {item.title}
                  </div>
                  <div className="text-base font-extrabold text-slate-100 mt-2">
                    ₹{item.asking_price.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
