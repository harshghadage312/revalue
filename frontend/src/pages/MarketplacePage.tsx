import React, { useState, useEffect } from 'react';
import {
  Search, Filter, SlidersHorizontal, ArrowUpDown, Smartphone,
  RefreshCw, X, ChevronDown, Check, Sparkles, MapPin, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Product, ProductListResponse } from '../types';
import { ProductCard } from '../components/ProductCard';
import { getConditionMeta } from '../utils/formatters';

interface MarketplacePageProps {
  onNavigate: (page: string, params?: any) => void;
  initialQuery?: string;
  initialBrand?: string;
  initialCondition?: string;
}

const BRANDS = [
  'Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi',
  'Realme', 'Vivo', 'Motorola', 'Nothing', 'iQOO'
];

const PRICE_PRESETS = [
  { label: 'Under ₹15K', min: undefined, max: 15000 },
  { label: '₹15K - ₹35K', min: 15000, max: 35000 },
  { label: '₹35K - ₹60K', min: 35000, max: 60000 },
  { label: '₹60K+', min: 60000, max: undefined },
];

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  onNavigate,
  initialQuery = '',
  initialBrand = '',
  initialCondition = '',
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [query, setQuery] = useState(initialQuery);
  const [brand, setBrand] = useState<string>(initialBrand);
  const [condition, setCondition] = useState<string>(initialCondition);
  const [sellingMethod, setSellingMethod] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Mobile drawer
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync props if navigation triggers a parameter change
  useEffect(() => {
    if (initialQuery !== undefined) setQuery(initialQuery);
    if (initialBrand !== undefined) setBrand(initialBrand);
    if (initialCondition !== undefined) setCondition(initialCondition);
  }, [initialQuery, initialBrand, initialCondition]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.listProducts({
        query: query.trim() || undefined,
        brand: brand || undefined,
        condition: condition || undefined,
        selling_method: sellingMethod || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        city: city || undefined,
        sort_by: sortBy,
        page,
        size: 12,
      });
      setProducts(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [brand, condition, sellingMethod, sortBy, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleResetFilters = () => {
    setQuery('');
    setBrand('');
    setCondition('');
    setSellingMethod('');
    setMinPrice('');
    setMaxPrice('');
    setCity('');
    setSortBy('newest');
    setPage(1);
  };

  const handlePresetPrice = (min?: number, max?: number) => {
    setMinPrice(min !== undefined ? String(min) : '');
    setMaxPrice(max !== undefined ? String(max) : '');
    setPage(1);
    fetchProducts();
  };

  const activeFilterCount = [
    brand,
    condition,
    sellingMethod,
    minPrice,
    maxPrice,
    city,
    query,
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Smartphone Marketplace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing <span className="font-semibold text-slate-800">{total}</span> pre-owned smartphones with verified specifications.
          </p>
        </div>

        {/* Search Bar & Mobile Filter Trigger */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-80">
            <input
              type="text"
              placeholder="Search model, specs, brand..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-xl text-xs font-medium outline-none transition-all placeholder:text-slate-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </form>

          {/* Mobile Filter Button */}
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="lg:hidden px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
          >
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 bg-emerald-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Selling Method Tabs & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Method Segment Control */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
          <button
            onClick={() => { setSellingMethod(''); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              sellingMethod === '' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Listings ({total})
          </button>
          <button
            onClick={() => { setSellingMethod('negotiation'); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              sellingMethod === 'negotiation' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Direct Purchase & Offers
          </button>
          <button
            onClick={() => { setSellingMethod('bidding'); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              sellingMethod === 'bidding' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sealed Auctions
          </button>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[11px] font-semibold text-slate-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none hover:border-slate-300"
          >
            <option value="newest">Newest Listed</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Active:</span>

          {brand && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
              Brand: {brand}
              <button onClick={() => { setBrand(''); setPage(1); }}><X className="w-3 h-3 hover:text-rose-500" /></button>
            </span>
          )}

          {condition && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
              Condition: {getConditionMeta(condition).label}
              <button onClick={() => { setCondition(''); setPage(1); }}><X className="w-3 h-3 hover:text-rose-500" /></button>
            </span>
          )}

          {(minPrice || maxPrice) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
              Price: ₹{minPrice || 0} - ₹{maxPrice || '∞'}
              <button onClick={() => { setMinPrice(''); setMaxPrice(''); setPage(1); fetchProducts(); }}><X className="w-3 h-3 hover:text-rose-500" /></button>
            </span>
          )}

          {query && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
              "{query}"
              <button onClick={() => { setQuery(''); setPage(1); fetchProducts(); }}><X className="w-3 h-3 hover:text-rose-500" /></button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline ml-2"
          >
            Reset All
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar Filters (Desktop + Mobile Drawer) */}
        <aside
          className={`lg:col-span-1 space-y-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs ${
            mobileFilterOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              Filter By
            </span>
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-emerald-700 hover:underline font-bold"
            >
              Reset All
            </button>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">Smartphone Brand</label>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {BRANDS.map((b) => (
                <label
                  key={b}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    brand.toLowerCase() === b.toLowerCase()
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{b}</span>
                  <input
                    type="radio"
                    name="brand"
                    checked={brand.toLowerCase() === b.toLowerCase()}
                    onChange={() => { setBrand(b); setPage(1); }}
                    className="accent-emerald-600"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Condition Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">Device Condition</label>
            <select
              value={condition}
              onChange={(e) => { setCondition(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
            >
              <option value="">Any Condition</option>
              <option value="excellent">Like New (Mint Condition)</option>
              <option value="good">Good Condition (Light Wear)</option>
              <option value="bad">Noticeable Wear (Scratches/Dents)</option>
              <option value="defective">Heavily Damaged (For Parts)</option>
            </select>
          </div>

          {/* Price Range Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">Price Presets</label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {PRICE_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => handlePresetPrice(p.min, p.max)}
                  className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-center transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 mt-2">
              <input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-emerald-600"
              />
              <span className="text-slate-400 text-xs">—</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
            <button
              onClick={() => { setPage(1); fetchProducts(); }}
              className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Apply Price Range
            </button>
          </div>

          {/* City / Location */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">City Location</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Mumbai, Bengaluru"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-600"
              />
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>
          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-80 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
              <Smartphone className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No matching smartphone listings found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active listings matched your filter criteria. Try clearing the brand or widening your price parameters.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onClick={() => onNavigate('product-detail', { id: p.id })}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6 border-t border-slate-200">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-500 font-medium px-2">
                    Page <span className="font-bold text-slate-800">{page}</span> of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
