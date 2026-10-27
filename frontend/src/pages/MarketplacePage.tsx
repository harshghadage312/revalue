import React, { useState, useEffect } from 'react';
import {
  Search, Filter, X, Smartphone, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { api } from '../services/api';
import { Product } from '../types';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Browse Smartphones
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {total} {total === 1 ? 'phone' : 'phones'} available
          </p>
        </div>

        {/* Search Bar on Desktop & Mobile Filter Trigger */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search brand, model..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:border-emerald-600 outline-none placeholder:text-slate-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </form>

          {/* Mobile Filter Button */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
          >
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 bg-emerald-600 text-white rounded-full text-[9.5px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Selling Method Tabs & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Method Segment Control */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg w-fit overflow-x-auto max-w-full text-xs font-semibold">
          <button
            onClick={() => { setSellingMethod(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              sellingMethod === '' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Phones
          </button>
          <button
            onClick={() => { setSellingMethod('negotiation'); setPage(1); }}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              sellingMethod === 'negotiation' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Direct Buy / Offers
          </button>
          <button
            onClick={() => { setSellingMethod('bidding'); setPage(1); }}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              sellingMethod === 'bidding' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sealed Auctions
          </button>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs text-slate-500">
          <span className="font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none hover:border-slate-300"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-slate-400 mr-0.5">Filters:</span>

          {brand && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium">
              {brand}
              <button onClick={() => { setBrand(''); setPage(1); }}><X className="w-3 h-3 hover:text-rose-500" /></button>
            </span>
          )}

          {condition && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium">
              {getConditionMeta(condition).label}
              <button onClick={() => { setCondition(''); setPage(1); }}><X className="w-3 h-3 hover:text-rose-500" /></button>
            </span>
          )}

          {(minPrice || maxPrice) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium">
              ₹{minPrice || 0} - ₹{maxPrice || 'Any'}
              <button onClick={() => { setMinPrice(''); setMaxPrice(''); setPage(1); fetchProducts(); }}><X className="w-3 h-3 hover:text-rose-500" /></button>
            </span>
          )}

          {query && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium">
              "{query}"
              <button onClick={() => { setQuery(''); setPage(1); fetchProducts(); }}><X className="w-3 h-3 hover:text-rose-500" /></button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="text-emerald-700 hover:text-emerald-800 font-bold ml-1 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Grid & Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block lg:col-span-1 space-y-4 bg-white p-4 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-900 uppercase tracking-wider text-[11px]">
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <button onClick={handleResetFilters} className="text-emerald-700 hover:underline capitalize font-semibold">
                Clear all
              </button>
            )}
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Brand</label>
            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
              <label
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
                  brand === '' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>All Brands</span>
                <input
                  type="radio"
                  name="brand"
                  checked={brand === ''}
                  onChange={() => { setBrand(''); setPage(1); }}
                  className="accent-emerald-600"
                />
              </label>
              {BRANDS.map((b) => (
                <label
                  key={b}
                  className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
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
          <div className="pt-2 border-t border-slate-100">
            <label className="block font-bold text-slate-800 mb-1.5">Condition</label>
            <select
              value={condition}
              onChange={(e) => { setCondition(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-emerald-600"
            >
              <option value="">Any Condition</option>
              <option value="excellent">Like New</option>
              <option value="good">Good Condition</option>
              <option value="bad">Noticeable Wear</option>
              <option value="defective">Heavily Damaged</option>
            </select>
          </div>

          {/* Price Range Presets */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block font-bold text-slate-800 mb-1.5">Price Range</label>
            <div className="grid grid-cols-2 gap-1 mb-2">
              {PRICE_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => handlePresetPrice(p.min, p.max)}
                  className="px-2 py-1 text-[10.5px] font-semibold rounded bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-center transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:bg-white focus:border-emerald-600"
              />
              <span className="text-slate-400">—</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
            <button
              onClick={() => { setPage(1); fetchProducts(); }}
              className="w-full mt-2 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded transition-colors"
            >
              Apply Price
            </button>
          </div>

          {/* Location */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block font-bold text-slate-800 mb-1">City Location</label>
            <input
              type="text"
              placeholder="e.g. Mumbai, Bengaluru"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>
        </aside>

        {/* Product Grid Area (2 columns on mobile, 3-4 columns on desktop) */}
        <main className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-64 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 space-y-2">
              <Smartphone className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No phones match your filters</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try widening your price range or clearing selected brands.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-2xs"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
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

      {/* Mobile Slide-Over Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs lg:hidden animate-in fade-in">
          <div className="w-full max-w-xs bg-white h-full flex flex-col shadow-xl animate-in slide-in-from-right">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <span className="font-bold text-sm text-slate-900">Filters</span>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Brand Filter */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Brand</label>
                <div className="space-y-1">
                  <label className="flex items-center justify-between py-1.5 cursor-pointer">
                    <span>All Brands</span>
                    <input
                      type="radio"
                      name="m-brand"
                      checked={brand === ''}
                      onChange={() => { setBrand(''); setPage(1); }}
                      className="accent-emerald-600"
                    />
                  </label>
                  {BRANDS.map((b) => (
                    <label key={b} className="flex items-center justify-between py-1.5 cursor-pointer">
                      <span>{b}</span>
                      <input
                        type="radio"
                        name="m-brand"
                        checked={brand.toLowerCase() === b.toLowerCase()}
                        onChange={() => { setBrand(b); setPage(1); }}
                        className="accent-emerald-600"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Condition */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block font-bold text-slate-800 mb-1.5">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => { setCondition(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                >
                  <option value="">Any Condition</option>
                  <option value="excellent">Like New</option>
                  <option value="good">Good Condition</option>
                  <option value="bad">Noticeable Wear</option>
                  <option value="defective">Heavily Damaged</option>
                </select>
              </div>

              {/* Price */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block font-bold text-slate-800 mb-1.5">Price Range</label>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {PRICE_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.label}
                      onClick={() => handlePresetPrice(p.min, p.max)}
                      className="px-2 py-1.5 text-[11px] font-semibold rounded bg-slate-100 text-slate-700 text-center"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Min ₹"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                  <span>—</span>
                  <input
                    type="number"
                    placeholder="Max ₹"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                </div>
              </div>

              {/* City */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block font-bold text-slate-800 mb-1">City</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai, Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 flex gap-2">
              <button
                onClick={handleResetFilters}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset All
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-2 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
