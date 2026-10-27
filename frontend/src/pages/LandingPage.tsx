import React, { useState, useEffect } from 'react';
import {
  Sparkles, ShieldCheck, ArrowRight, Gavel, Handshake,
  TrendingUp, CheckCircle, Smartphone, RefreshCw, Star,
  Search, ShieldAlert, CheckCircle2, ChevronRight, Sliders,
  Award, PackageCheck, Zap, Lock
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
  { name: 'Nothing', modelHint: 'Phone (1), (2) & CMF', count: '10+ models' },
];

const CONDITION_CATEGORIES = [
  {
    id: 'excellent',
    label: 'Like New (Mint)',
    badge: 'Flawless',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Flawless screen and body with zero visible scratches. Battery health typically 90% or higher.',
  },
  {
    id: 'good',
    label: 'Good Condition',
    badge: 'Popular Value',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Minor cosmetic hairline marks not visible at arm\'s length. 100% fully functional hardware.',
  },
  {
    id: 'bad',
    label: 'Noticeable Wear',
    badge: 'Budget Pick',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Visible scratches or small casing dents from regular use. Hardware is tested and fully operational.',
  },
  {
    id: 'defective',
    label: 'Heavily Damaged',
    badge: 'For Parts / DIY',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Cracked glass or physical faults clearly disclosed by the seller. Perfect for repairs or spare parts.',
  },
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
              <span>India's Trusted Pre-Owned Smartphone Marketplace</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Your next phone. <br />
              <span className="text-emerald-700">A smarter choice.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Buy and sell pre-owned smartphones with total confidence. Get fair resale valuations based on real hardware specs, negotiate transparently with sellers, or participate in sealed-bid auctions.
            </p>

            {/* Interactive Hero Search Form */}
            <form onSubmit={handleHeroSearch} className="max-w-xl mx-auto pt-2">
              <div className="flex items-center bg-slate-50 border border-slate-200 hover:border-slate-300 focus-within:border-emerald-600 focus-within:bg-white rounded-2xl p-1.5 shadow-xs transition-all">
                <Search className="w-4 h-4 text-slate-400 ml-3 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search phones by brand or model (e.g. iPhone 14, Galaxy S23)..."
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
                <span>Browse Verified Phones</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenValuator}
                className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Estimate Resale Value</span>
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
            <h3 className="font-bold text-slate-900 text-sm">Fair Resale Price Valuation</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Objective market estimates based on actual phone specifications, storage capacity, battery health, and cosmetic wear.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Gavel className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Sealed-Bid Auctions</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Competitor bids remain completely sealed with private seller reserve protection. The highest confidential bid wins.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Handshake className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Direct Negotiation</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Submit private offers or accept counteroffers. Built-in minimum price floor rules protect fair value for both sides.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Protected Settlements</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Buyer funds stay safely protected in escrow until delivery is confirmed and the phone matches its listed condition.
            </p>
          </div>
        </div>
      </section>

      {/* Popular Brand Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Browse by Brand</h2>
            <p className="text-xs text-slate-500 mt-0.5">Explore authenticated pre-owned devices from top manufacturers.</p>
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

      {/* Browse by Condition Category Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Browse by Condition</h2>
            <p className="text-xs text-slate-500 mt-0.5">Find the exact cosmetic grade that matches your expectations and budget.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CONDITION_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onNavigate('marketplace', { condition: cat.id })}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-600 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.badgeColor}`}>
                    {cat.badge}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {cat.label}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {cat.description}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:underline">
                <span>View {cat.label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Marketplace Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Featured Smartphones</h2>
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
              Direct Purchase & Offers
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
              className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Sell Your Smartphone
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
            Explore All Listings ({featuredProducts.length}+ Active)
          </button>
        </div>
      </section>

      {/* How ReValue Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white border border-slate-800 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>Simple, Transparent & Secure</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              How ReValue Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Whether you are buying your next smartphone or selling your current one, ReValue makes the transaction fair, verified, and protected from start to finish.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-extrabold text-sm border border-emerald-500/30">
                1
              </div>
              <h3 className="font-bold text-white text-base">Browse or List with AI Checks</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Find verified smartphones by brand and condition. Sellers can upload phone photos for instant cosmetic wear checks and get fair market price valuations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-extrabold text-sm border border-emerald-500/30">
                2
              </div>
              <h3 className="font-bold text-white text-base">Direct Negotiation or Sealed Bids</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Buy immediately at the asking price, submit private counteroffers with floor protection, or participate in sealed-bid auctions with private reserve prices.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-extrabold text-sm border border-emerald-500/30">
                3
              </div>
              <h3 className="font-bold text-white text-base">Inspected Delivery & Safe Payouts</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Track insured courier shipment right to your doorstep. Funds are held safely in escrow until you confirm the device matches its advertised condition.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Recommendation Highlight */}
      {recommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Personalized For You</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">Recommended Matches</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Smart matches based on price proximity, hardware specs, and device condition ratings.
                </p>
              </div>
              <button
                onClick={() => onNavigate('marketplace')}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-colors shrink-0"
              >
                Browse All Matches
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recommendations.slice(0, 3).map((item) => (
                <div
                  key={item.product_id}
                  onClick={() => onNavigate('product-detail', { id: item.product_id })}
                  className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-600 rounded-2xl p-4 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="text-[10px] uppercase font-bold text-emerald-700 mb-1">
                    {item.recommendation_reason}
                  </div>
                  <div className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors">
                    {item.title}
                  </div>
                  <div className="text-base font-extrabold text-slate-900 mt-2">
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
