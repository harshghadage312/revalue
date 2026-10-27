import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Star, Sparkles, Gavel, Handshake,
  CheckCircle2, Clock, AlertCircle, ArrowLeft, Heart,
  Smartphone, MapPin, Box, BatteryMedium, Cpu, HardDrive,
  Info, Check, AlertTriangle, ChevronRight, Truck, RefreshCw
} from 'lucide-react';
import { api, resolveMediaUrl } from '../services/api';
import { Product, PriceEstimate, Auction, Offer } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getConditionMeta, getSellingMethodMeta } from '../utils/formatters';
import { ProductCard } from '../components/ProductCard';

interface ProductDetailPageProps {
  productId: string;
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: () => void;
  onOpenValuator: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productId,
  onNavigate,
  onOpenAuth,
  onOpenValuator,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [userOffer, setUserOffer] = useState<Offer | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Negotiation offer form state
  const [offerAmount, setOfferAmount] = useState<string>('');
  const [offerNote, setOfferNote] = useState<string>('');
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);

  // Sealed bid form state
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidSuccess, setBidSuccess] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    setSelectedImageIndex(0);
    try {
      const prod = await api.getProduct(productId);
      setProduct(prod);

      // Fetch auction if bidding
      if (prod.selling_method === 'bidding') {
        const auc = await api.getAuctionByProduct(productId).catch(() => null);
        setAuction(auc);
      }

      // Fetch price estimate using machine learning model
      api.getPriceEstimate({
        brand: prod.brand,
        model: prod.model,
        category: prod.category,
        condition: prod.condition,
        storage_gb: prod.specs?.storage_gb || 128,
        ram_gb: prod.specs?.ram_gb || 6,
        approximate_age_months: prod.approximate_age_months || 12,
        battery_health_percent: prod.specs?.battery_health_percent || 85,
        original_retail_price: prod.original_retail_price || prod.asking_price * 1.5,
      }).then(setPriceEstimate).catch(() => {});

      // Fetch related products from same brand
      api.listProducts({ brand: prod.brand, size: 5 }).then((res) => {
        const related = (res.items || []).filter(item => item.id !== prod.id).slice(0, 4);
        setRelatedProducts(related);
      }).catch(() => {});

      // If user is authenticated, check for existing offer
      if (isAuthenticated) {
        api.getMyOffers('buyer').then(offers => {
          const matching = offers.find(o => o.product_id === productId);
          if (matching) setUserOffer(matching);
        }).catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Product not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [productId, isAuthenticated]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    setOfferLoading(true);
    try {
      const res = await api.createOffer({
        product_id: productId,
        amount: Number(offerAmount),
        note: offerNote.trim() || undefined,
      });
      setUserOffer(res);
      setOfferSuccess(true);
    } catch (err: any) {
      alert(err.message || 'Failed to submit offer.');
    } finally {
      setOfferLoading(false);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    if (!auction) return;
    setBidLoading(true);
    try {
      await api.submitBid(auction.id, Number(bidAmount));
      setBidSuccess(true);
      fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to place sealed bid.');
    } finally {
      setBidLoading(false);
    }
  };

  const handleFinalizeAuction = async () => {
    if (!auction) return;
    try {
      const res = await api.finalizeAuction(auction.id);
      setAuction(res);
      alert(res.status === 'finalized' ? 'Auction finalized! Winner declared.' : 'Auction closed without winner (reserve unmet).');
      fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Auction cannot be finalized yet (deadline pending).');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <span className="text-xs font-semibold text-slate-500">Loading verified smartphone specifications...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Listing Unavailable</h2>
        <p className="text-xs text-slate-500">{error || 'This listing does not exist or has been removed.'}</p>
        <button
          onClick={() => onNavigate('marketplace')}
          className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  const isSeller = user && user.id === product.seller_id;
  const conditionMeta = getConditionMeta(product.condition);
  const methodMeta = getSellingMethodMeta(product.selling_method);

  const discountPercent = product.original_retail_price
    ? Math.round(((product.original_retail_price - product.asking_price) / product.original_retail_price) * 100)
    : null;

  const currentPrice = product.selling_method === 'bidding'
    ? (auction?.starting_bid ?? product.starting_bid ?? product.auction_info?.starting_bid ?? product.asking_price)
    : product.asking_price;

  const imagesList = product.images && product.images.length > 0 ? product.images : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <button
          onClick={() => onNavigate('marketplace')}
          className="hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Marketplace</span>
        </button>
        <span>/</span>
        <button
          onClick={() => onNavigate('marketplace', { brand: product.brand })}
          className="hover:text-slate-900 transition-colors"
        >
          {product.brand}
        </button>
        <span>/</span>
        <span className="text-slate-900 font-semibold truncate max-w-xs">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Gallery & Hardware Specs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Photo Card */}
          <div className="space-y-3">
            <div className="aspect-[4/3] rounded-3xl bg-slate-100 border border-slate-200/90 overflow-hidden relative flex items-center justify-center">
              {imagesList.length > 0 ? (
                <img
                  src={resolveMediaUrl(imagesList[selectedImageIndex] || imagesList[0])}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <div className="text-center p-8 flex flex-col items-center">
                  <div className="w-20 h-36 rounded-2xl border-2 border-slate-300 bg-white shadow-sm flex flex-col justify-between p-2 items-center mb-2">
                    <div className="w-5 h-1 bg-slate-200 rounded-full" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{product.brand}</span>
                    <div className="w-3 h-3 rounded-full border border-slate-300" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{product.brand} {product.model}</span>
                </div>
              )}

              {/* Selling Method Badge (Top Left) */}
              <div className="absolute top-4 left-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm backdrop-blur-sm ${
                  product.selling_method === 'bidding'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-900 text-white'
                }`}>
                  {product.selling_method === 'bidding' ? (
                    <Gavel className="w-3.5 h-3.5" />
                  ) : (
                    <Handshake className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {methodMeta.tag}
                </span>
              </div>

              {/* Condition Chip (Bottom Left) */}
              <div className="absolute bottom-4 left-4">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider backdrop-blur-sm border shadow-xs ${conditionMeta.badgeClass}`}>
                  {conditionMeta.label}
                </span>
              </div>
            </div>

            {/* Thumbnail Gallery (if more than 1 image) */}
            {imagesList.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      selectedImageIndex === idx ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={resolveMediaUrl(img)}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Smartphone Hardware Specs */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-600" />
              <span>Verified Specifications</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Storage</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                  {product.specs?.storage_gb ? `${product.specs.storage_gb} GB` : 'Standard'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">RAM</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                  {product.specs?.ram_gb ? `${product.specs.ram_gb} GB` : 'Standard'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Battery Health</span>
                <span className="font-extrabold text-emerald-700 text-sm mt-0.5 block">
                  {product.specs?.battery_health_percent ? `${product.specs.battery_health_percent}%` : '85%+'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Color Finish</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block truncate">
                  {product.specs?.color || 'Original'}
                </span>
              </div>
            </div>

            {/* Accessories & Disclosed Faults */}
            <div className="pt-1 text-xs space-y-2.5">
              <div className="flex flex-wrap items-center gap-4 text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Box className="w-3.5 h-3.5 text-emerald-600" />
                  {product.specs?.has_original_box ? 'Original Retail Box included' : 'No retail packaging'}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <BatteryMedium className="w-3.5 h-3.5 text-emerald-600" />
                  {product.specs?.has_original_charger ? 'Fast Charger included' : 'No charger included'}
                </span>
              </div>

              {product.specs?.known_faults && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Seller Disclosed Wear / Faults: </span>
                    {product.specs.known_faults}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Seller Notes</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description || 'No additional notes provided by the seller.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Action Engine (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Pricing Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold uppercase tracking-wider text-emerald-700">
                  {product.brand} • {product.model}
                </span>
                {product.location_city && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3 h-3" />
                    {product.location_city}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{product.title}</h1>

              <div className="mt-4 flex items-baseline justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    {product.selling_method === 'bidding' ? 'Starting Auction Bid' : 'Asking Price'}
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 block">
                    {formatCurrency(currentPrice)}
                  </span>
                </div>

                {product.original_retail_price && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Original MSRP</span>
                    <span className="text-xs line-through text-slate-400 font-semibold block">
                      {formatCurrency(product.original_retail_price)}
                    </span>
                    {discountPercent && discountPercent > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Fair Resale Price Valuation Card */}
            {priceEstimate && priceEstimate.is_model_available && (
              <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    Estimated Resale Value
                  </span>
                  <span className="text-[10px] text-slate-400">Marketplace AI Valuation</span>
                </div>

                <div className="flex items-baseline justify-between pt-0.5">
                  <div>
                    <span className="text-xs text-slate-400 block">Fair Market Price:</span>
                    <span className="text-lg font-extrabold text-emerald-400">
                      {formatCurrency(priceEstimate.estimated_price)}
                    </span>
                  </div>
                  <div className="text-right text-xs text-slate-300">
                    <span className="text-[10px] text-slate-400 block">Expected Range:</span>
                    <span>{formatCurrency(priceEstimate.price_range_low)} - {formatCurrency(priceEstimate.price_range_high)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
                  {priceEstimate.explanation}
                </p>
              </div>
            )}

            {/* SELLING METHOD 1: OPEN NEGOTIATION */}
            {product.selling_method === 'negotiation' && (
              <div className="space-y-4 pt-1">
                {/* Buy Now Button */}
                <button
                  disabled={isSeller || product.status !== 'active'}
                  onClick={() => onNavigate('checkout', { productId: product.id, source: 'buy_now' })}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-all active:scale-[0.99] disabled:opacity-40 text-xs sm:text-sm"
                >
                  Buy Now at Asking Price ({formatCurrency(product.asking_price)})
                </button>

                {/* Make a Private Offer Form */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Handshake className="w-4 h-4 text-emerald-600" />
                      Make a Private Offer
                    </span>
                    <span className="text-[10px] text-slate-400">Seller counteroffers supported</span>
                  </div>

                  {userOffer ? (
                    <div className="space-y-2 text-xs">
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Your Active Offer:</span>
                          <span className="text-slate-900 font-extrabold text-sm">
                            {formatCurrency(userOffer.amount)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <span className="text-slate-400">Offer Status:</span>
                          <span className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded text-[10px] ${
                            userOffer.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                            userOffer.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {userOffer.status}
                          </span>
                        </div>

                        {userOffer.status === 'accepted' && (
                          <button
                            onClick={() => onNavigate('checkout', { productId: product.id, source: 'offer', offerId: userOffer.id })}
                            className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                          >
                            Proceed to Checkout ({formatCurrency(userOffer.amount)})
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateOffer} className="space-y-2.5">
                      {/* Offer Shortcuts */}
                      <div className="flex gap-1.5">
                        {[-5, -10, -15].map((pct) => {
                          const suggested = Math.round((product.asking_price * (100 + pct)) / 100);
                          return (
                            <button
                              type="button"
                              key={pct}
                              onClick={() => setOfferAmount(String(suggested))}
                              className="flex-1 py-1 text-[10px] font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              {pct}% ({formatCurrency(suggested)})
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="number"
                        placeholder="Enter offer amount in ₹"
                        min="1000"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-600"
                        required
                      />

                      <input
                        type="text"
                        placeholder="Optional note to seller (e.g. Can pick up or complete order immediately)"
                        value={offerNote}
                        onChange={(e) => setOfferNote(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600"
                      />

                      <button
                        type="submit"
                        disabled={offerLoading || isSeller || product.status !== 'active'}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-40"
                      >
                        {offerLoading ? 'Sending Private Offer...' : 'Send Private Offer'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* SELLING METHOD 2: SEALED BIDDING AUCTION */}
            {product.selling_method === 'bidding' && auction && (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Gavel className="w-4 h-4 text-amber-600" />
                      Sealed-Bid Rules
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded">
                      {auction.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Bids remain completely confidential. When the auction closes, the highest bid meeting or exceeding the seller's secret reserve price wins.
                  </p>

                  <div className="text-xs space-y-1.5 pt-2 border-t border-amber-200/60 font-medium text-amber-950">
                    <div className="flex justify-between">
                      <span className="text-amber-800">Starting Bid Floor:</span>
                      <span className="font-bold">{formatCurrency(auction.starting_bid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-800">Minimum Bid Increment:</span>
                      <span className="font-bold">{formatCurrency(auction.min_increment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-800">Sealed Submissions:</span>
                      <span className="font-bold">{auction.total_bids_count} bids placed</span>
                    </div>
                  </div>

                  {auction.user_own_bid && (
                    <div className="p-3 rounded-xl bg-white border border-amber-200 text-xs">
                      <span className="text-slate-500 font-medium">Your current sealed bid:</span>
                      <div className="text-base font-extrabold text-slate-900 mt-0.5">
                        {formatCurrency(auction.user_own_bid.amount)}
                      </div>
                    </div>
                  )}

                  {/* Bid Form or Finalize */}
                  {auction.status === 'active' ? (
                    <form onSubmit={handleSubmitBid} className="space-y-2">
                      <input
                        type="number"
                        placeholder={`Enter sealed bid (min ${formatCurrency(Math.max(auction.starting_bid, (auction.user_own_bid?.amount || 0) + auction.min_increment))})`}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold outline-none focus:border-amber-500"
                        required
                      />
                      <button
                        type="submit"
                        disabled={bidLoading || isSeller}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-40"
                      >
                        {bidLoading ? 'Submitting Sealed Bid...' : 'Submit Sealed Bid'}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-center font-bold">
                        Auction has ended. Status: {auction.status}
                      </div>
                      {auction.winner_id === user?.id && (
                        <button
                          onClick={() => onNavigate('checkout', { productId: product.id, source: 'auction', auctionId: auction.id })}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                        >
                          Complete Winner Order ({formatCurrency(auction.winning_amount || 0)})
                        </button>
                      )}
                    </div>
                  )}

                  {/* Trigger Server Finalization */}
                  <button
                    onClick={handleFinalizeAuction}
                    className="w-full py-1.5 text-[10.5px] font-semibold text-amber-900/80 hover:text-amber-950 border border-amber-200/80 rounded-lg bg-white/70"
                  >
                    Check Auction Status / Finalize
                  </button>
                </div>
              </div>
            )}

            {/* Seller Trust & Verification Card */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Seller</span>
                <span className="text-xs font-bold text-slate-900">{product.seller_name || 'Verified Member'}</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{(product.seller_rating || 5.0).toFixed(1)} Rating</span>
              </div>
            </div>

            {/* Trust Assurances */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Escrow Protected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Insured Courier</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Smartphones Section */}
      {relatedProducts.length > 0 && (
        <section className="pt-8 border-t border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                More from {product.brand}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Other available devices from this manufacturer.</p>
            </div>
            <button
              onClick={() => onNavigate('marketplace', { brand: product.brand })}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => onNavigate('product-detail', { id: p.id })}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
