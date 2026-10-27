import React, { useState, useEffect } from 'react';
import {
  ArrowRight, Smartphone, ChevronRight, CheckCircle2,
  Package, Handshake, Gavel, ShieldCheck, Sparkles, PlusCircle,
  Cpu, Check, Tag, ArrowUpRight, Search
} from 'lucide-react';
import { api } from '../services/api';
import { Product, RecommendationItem } from '../types';
import { ProductCard } from '../components/ProductCard';
import { formatCurrency } from '../utils/formatters';

interface LandingPageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenValuator: () => void;
}

const POPULAR_BRANDS = [
  { name: 'Apple', hint: 'iPhone 11 to 16 Pro' },
  { name: 'Samsung', hint: 'Galaxy S, Z & A Series' },
  { name: 'OnePlus', hint: 'Flagship & Nord Series' },
  { name: 'Google', hint: 'Pixel 6 to 9 Pro' },
  { name: 'Xiaomi', hint: 'Redmi & Xiaomi Flagship' },
  { name: 'Nothing', hint: 'Phone (1), (2) & CMF' },
];

const CONDITION_TIERS = [
  {
    id: 'excellent',
    label: 'Like New',
    description: 'Flawless screen and casing. Virtually zero visible marks.',
    dot: 'bg-emerald-500',
    badge: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'good',
    label: 'Good Condition',
    description: 'Screen in great shape with light micro-marks from normal use.',
    dot: 'bg-blue-500',
    badge: 'text-blue-800 bg-blue-50 border-blue-200',
  },
  {
    id: 'bad',
    label: 'Noticeable Wear',
    description: 'Visible casing scuffs or edge wear. 100% operational hardware.',
    dot: 'bg-amber-500',
    badge: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  {
    id: 'defective',
    label: 'Heavily Damaged',
    description: 'Cracked glass or exterior damage clearly disclosed for parts/repair.',
    dot: 'bg-rose-500',
    badge: 'text-rose-800 bg-rose-50 border-rose-200',
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

  // Quick valuation teaser widget state
  const [teaserBrand, setTeaserBrand] = useState('Apple');
  const [teaserStorage, setTeaserStorage] = useState('128');

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
    <div className="space-y-10 sm:space-y-14 pb-16">
      {/* 1. DISTINCTIVE CONSUMER HERO WITH EDITORIAL SHOWCASE */}
      <section className="bg-white border-b border-slate-200 py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Brand Positioning & Actionable Copy (7 Cols) */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-left">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-emerald-800 tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>The Smarter Way to Reshop</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                Every phone has <span className="text-emerald-700 underline decoration-emerald-300 decoration-wavy decoration-2 underline-offset-4">more value.</span>
              </h1>

              {/* Supporting Copy */}
              <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                Find your next smartphone or discover what your current one could be worth. Real seller listings, transparent condition checks, and fair resale price estimates.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('marketplace')}
                  className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-2"
                >
                  <span>Shop Phones</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('create-listing')}
                  className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 hover:border-slate-400 shadow-2xs transition-colors flex items-center gap-2"
                >
                  <span>Sell Your Phone</span>
                  <PlusCircle className="w-4 h-4 text-emerald-700" />
                </button>
              </div>

              {/* Core Commercial Clarity Metrics */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 max-w-lg text-left">
                <div>
                  <span className="block text-xs font-extrabold text-slate-900">Condition Check</span>
                  <span className="text-[11px] text-slate-500">4 transparent tiers</span>
                </div>
                <div>
                  <span className="block text-xs font-extrabold text-slate-900">Fair Valuations</span>
                  <span className="text-[11px] text-slate-500">Secondary market data</span>
                </div>
                <div>
                  <span className="block text-xs font-extrabold text-slate-900">Direct or Auction</span>
                  <span className="text-[11px] text-slate-500">Flexible selling options</span>
                </div>
              </div>
            </div>

            {/* Right: Editorial Product Showcase Card (5 Cols) */}
            <div className="lg:col-span-5">
              <div className="relative max-w-sm mx-auto lg:ml-auto">
                {/* Smartphone Showcase Chassis */}
                <div className="bg-slate-950 rounded-3xl p-3 shadow-xl border-2 border-slate-800 text-white relative">
                  {/* Speaker slot & status */}
                  <div className="flex items-center justify-between px-3 pt-1 pb-2">
                    <span className="text-[10px] text-slate-400 font-bold">ReValue Live</span>
                    <div className="w-12 h-1 bg-slate-800 rounded-full" />
                    <span className="text-[10px] text-emerald-400 font-semibold">Verified</span>
                  </div>

                  {/* Device Screen Preview */}
                  <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
                    {/* Top Device Specs Bar */}
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-800/60">
                        Like New • 92% Battery
                      </span>
                      <span className="text-slate-400 font-medium">128 GB Storage</span>
                    </div>

                    {/* Editorial Device Focus */}
                    <div className="py-2 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Featured Flagship</span>
                      <h3 className="text-lg font-black text-white leading-tight">
                        Apple iPhone 14 Pro
                      </h3>
                      <p className="text-xs text-slate-400">Deep Purple • Flawless Display • Original Box</p>
                    </div>

                    {/* Price & Valuation Benchmark Card */}
                    <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Deal Asking Price</span>
                          <span className="text-xl font-black text-emerald-400">₹48,500</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Original MSRP</span>
                          <span className="text-xs line-through text-slate-500 font-semibold">₹1,19,900</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Resale Valuation Index:</span>
                        <span className="font-bold text-slate-200">₹49,200</span>
                      </div>

                      <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        Buyer Saves ₹71,400 (60% vs New)
                      </div>
                    </div>

                    {/* Quick CTA inside mockup */}
                    <button
                      type="button"
                      onClick={() => onNavigate('marketplace', { brand: 'Apple' })}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Explore Similar Deals</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Floating Contextual Badges */}
                  <div className="hidden sm:flex absolute -top-3 -right-3 bg-white text-slate-900 border border-slate-200 shadow-md rounded-xl px-2.5 py-1.5 items-center gap-1.5 text-[10.5px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Flawless Screen Inspected</span>
                  </div>

                  <div className="hidden sm:flex absolute -bottom-3 -left-3 bg-white text-slate-900 border border-slate-200 shadow-md rounded-xl px-2.5 py-1.5 items-center gap-1.5 text-[10.5px] font-bold">
                    <Handshake className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Direct Buy or Private Offer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. POPULAR BRANDS BAR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Popular Smartphone Brands
            </h2>
            <p className="text-xs text-slate-500">Filter catalogue by certified models</p>
          </div>
          <button
            type="button"
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
              className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-600 text-left transition-colors group flex flex-col justify-between shadow-2xs"
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

      {/* 3. REAL LIVE MARKETPLACE INVENTORY (DIRECTLY NEAR THE TOP FOLD) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Recently Listed Phones
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real pre-owned smartphones ready for direct purchase, negotiation, or auction.
            </p>
          </div>

          {/* Filter Segment Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold self-start sm:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Phones
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('negotiation')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'negotiation' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Direct Buy / Offers
            </button>
            <button
              type="button"
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
              type="button"
              onClick={() => onNavigate('create-listing')}
              className="mt-2 px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs"
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
            type="button"
            onClick={() => onNavigate('marketplace')}
            className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold shadow-2xs transition-colors inline-flex items-center gap-1.5"
          >
            <span>Explore All Available Phones</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 4. SELLING EXPERIENCE & QUICK ESTIMATE SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 lg:p-10 text-white border border-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Selling Path Explanation (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                <Tag className="w-3 h-3" />
                <span>Sell With Confidence</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                Know what your phone is worth before you list it.
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
                ReValue replaces lowball guesswork with data-backed resale benchmarks and transparent cosmetic grading. Here is how selling works:
              </p>

              {/* 3 Step Selling Journey */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-600/30 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-white">Device Details</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Select brand, model, storage, and disclosed hardware condition.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-600/30 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-white">Condition Check</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Upload photos for automated exterior grading and physical checks.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-600/30 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-white">Resale Valuation</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    View fair market price benchmark, set asking price, and publish.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('create-listing')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Start Selling Your Phone</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: Quick Valuation Teaser Card (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Quick Resale Estimate</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Algorithmic Benchmark</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Select Brand</label>
                    <select
                      value={teaserBrand}
                      onChange={(e) => setTeaserBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium outline-none focus:border-emerald-500"
                    >
                      <option value="Apple">Apple iPhone</option>
                      <option value="Samsung">Samsung Galaxy</option>
                      <option value="OnePlus">OnePlus</option>
                      <option value="Google">Google Pixel</option>
                      <option value="Xiaomi">Xiaomi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Storage Tier</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['64', '128', '256'].map((storage) => (
                        <button
                          key={storage}
                          type="button"
                          onClick={() => setTeaserStorage(storage)}
                          className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            teaserStorage === storage
                              ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {storage} GB
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                    Secondary market pricing trained on tens of thousands of real smartphone transactions across India.
                  </p>

                  <button
                    type="button"
                    onClick={onOpenValuator}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>Check Instant Resale Value</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SHOP BY CONDITION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Shop by Condition
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent exterior condition tiers to match your expectations and budget.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {CONDITION_TIERS.map((tier) => (
            <div
              key={tier.id}
              onClick={() => onNavigate('marketplace', { condition: tier.id })}
              className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-600 cursor-pointer transition-colors group flex flex-col justify-between shadow-2xs"
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

      {/* 6. HOW IT WORKS (HONEST COMMERCIAL CLARITY) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-bold uppercase tracking-wider mb-1.5">
              <span>Transparent Marketplace Process</span>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-slate-900">
              How Buying & Selling Works on ReValue
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Clear condition checks, fair market valuations, and protected delivery tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Find or List Phones</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Browse real phone listings with full hardware specs. Sellers run automated condition checks and view fair pricing benchmarks before publishing.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Buy, Offer, or Bid</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Buy immediately at the asking price, send private counteroffers with seller price floors, or join sealed-bid auctions with confidential reserve prices.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Fulfillment & Delivery</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track door-to-door courier delivery. Buyer payments are held securely until the shipment is received and verified against the seller's condition notes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. RECOMMENDATIONS (WHEN AVAILABLE) */}
      {recommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Recommended For You
              </h2>
              <p className="text-xs text-slate-500">
                Matches based on secondary market pricing and hardware specs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recommendations.slice(0, 3).map((item) => (
              <div
                key={item.product_id}
                onClick={() => onNavigate('product-detail', { id: item.product_id })}
                className="bg-white hover:border-emerald-600 border border-slate-200 rounded-xl p-3.5 transition-colors cursor-pointer group shadow-2xs"
              >
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">
                  {item.recommendation_reason}
                </div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 group-hover:text-emerald-700">
                  {item.title}
                </div>
                <div className="text-sm font-extrabold text-slate-900 mt-1.5">
                  {formatCurrency(item.asking_price)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
