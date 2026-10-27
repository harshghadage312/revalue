import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Sparkles, Gavel, Handshake,
  CheckCircle2, Clock, AlertCircle, ArrowLeft, Heart,
  Smartphone, MapPin, Box, BatteryMedium, Cpu,
  Check, AlertTriangle, ChevronRight, Truck
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

  // Sealed bid form state
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidLoading, setBidLoading] = useState(false);

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

      // Fetch price estimate
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

      // Check for user's existing offer
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
      setOfferAmount('');
      setOfferNote('');
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
      setBidAmount('');
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
      alert(res.status === 'finalized' ? 'Auction ended. Winner declared.' : 'Auction closed without winner (reserve unmet).');
      fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Auction cannot be finalized yet.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <span className="text-xs font-semibold text-slate-500">Loading phone details...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Phone Unavailable</h2>
        <p className="text-xs text-slate-500">{error || 'This listing does not exist or has been removed.'}</p>
        <button
          onClick={() => onNavigate('marketplace')}
          className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  const isSeller = user && user.id === product.seller_id;
  const conditionMeta = getConditionMeta(product.condition);
  const methodMeta = getSellingMethodMeta(product.selling_method);

  const displayedPrice = product.selling_method === 'bidding'
    ? (auction?.starting_bid ?? product.starting_bid ?? product.auction_info?.starting_bid ?? product.asking_price)
    : product.asking_price;

  const imagesList = product.images && product.images.length > 0 ? product.images : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
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
        <span className="text-slate-800 font-semibold truncate max-w-[200px]">{product.title}</span>
      </div>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Gallery & Hardware Specs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Photo Card */}
          <div className="space-y-3">
            <div className="aspect-[4/3] rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden relative flex items-center justify-center p-4">
              {imagesList.length > 0 ? (
                <img
                  src={resolveMediaUrl(imagesList[selectedImageIndex] || imagesList[0])}
                  alt={product.title}
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                  <Smartphone className="w-16 h-16 stroke-[1.25]" />
                  <span className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">
                    {product.brand} {product.model}
                  </span>
                </div>
              )}

              {/* Selling Method Badge (Top Left) */}
              <div className="absolute top-3 left-3 z-10">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs ${
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

              {/* Condition Badge (Bottom Left) */}
              <div className="absolute bottom-3 left-3 z-10">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border shadow-2xs ${conditionMeta.badgeClass}`}>
                  <span className={`w-2 h-2 rounded-full ${conditionMeta.dotColor}`} />
                  {conditionMeta.label}
                </span>
              </div>
            </div>

            {/* Thumbnails */}
            {imagesList.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 bg-slate-50 p-1 ${
                      selectedImageIndex === idx
                        ? 'border-emerald-600 ring-1 ring-emerald-600'
                        : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={resolveMediaUrl(img)}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hardware Specifications */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-600" />
              <span>Specifications</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Storage</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                  {product.specs?.storage_gb ? `${product.specs.storage_gb} GB` : 'Standard'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">RAM</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                  {product.specs?.ram_gb ? `${product.specs.ram_gb} GB` : 'Standard'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Battery Health</span>
                <span className="font-extrabold text-emerald-700 text-sm mt-0.5 block">
                  {product.specs?.battery_health_percent ? `${product.specs.battery_health_percent}%` : '85%+'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Color</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block truncate">
                  {product.specs?.color || 'Original'}
                </span>
              </div>
            </div>

            {/* Packaging & Accessories */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Box className="w-3.5 h-3.5 text-slate-500" />
                {product.specs?.has_original_box ? 'Original box included' : 'No retail box'}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <BatteryMedium className="w-3.5 h-3.5 text-slate-500" />
                {product.specs?.has_original_charger ? 'Original charger included' : 'No charger'}
              </span>
            </div>

            {/* Known faults / cosmetic notes */}
            {product.specs?.known_faults && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Disclosed Wear / Notes: </span>
                  {product.specs.known_faults}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Seller Description</h4>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold uppercase tracking-wider text-slate-600">
                  {product.brand} • {product.model}
                </span>
                {product.location_city && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3 h-3" />
                    {product.location_city}
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                {product.title}
              </h1>

              {/* Price Display */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    {product.selling_method === 'bidding' ? 'Starting Bid' : 'Asking Price'}
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 block">
                    {formatCurrency(displayedPrice)}
                  </span>
                </div>

                {product.original_retail_price && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Original MSRP</span>
                    <span className="text-xs line-through text-slate-400 font-semibold block">
                      {formatCurrency(product.original_retail_price)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Estimated Resale Value Card */}
            {priceEstimate && priceEstimate.is_model_available && (
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 text-[10.5px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    Estimated Resale Value
                  </span>
                  <span className="text-[10px] text-slate-400">Market Benchmark</span>
                </div>

                <div className="flex items-baseline justify-between pt-0.5">
                  <div>
                    <span className="text-xs text-slate-400 block">Estimated Fair Price:</span>
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

            {/* SELLING METHOD 1: DIRECT PURCHASE / OPEN NEGOTIATION */}
            {product.selling_method === 'negotiation' && (
              <div className="space-y-3 pt-1">
                {/* Buy Now Button */}
                <button
                  disabled={isSeller || product.status !== 'active'}
                  onClick={() => onNavigate('checkout', { productId: product.id, source: 'buy_now' })}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors disabled:opacity-40 text-xs sm:text-sm"
                >
                  Buy Now at Asking Price ({formatCurrency(product.asking_price)})
                </button>

                {/* Make a Private Offer Form */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Handshake className="w-3.5 h-3.5 text-emerald-600" />
                      Make a Private Offer
                    </span>
                    <span className="text-[10.5px] text-slate-400">Seller receives privately</span>
                  </div>

                  {userOffer ? (
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Your Active Offer:</span>
                        <span className="text-slate-900 font-extrabold text-sm">
                          {formatCurrency(userOffer.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                        <span className="text-slate-400">Status:</span>
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
                          className="w-full mt-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                        >
                          Proceed to Checkout ({formatCurrency(userOffer.amount)})
                        </button>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleCreateOffer} className="space-y-2">
                      {/* Offer Shortcuts */}
                      <div className="flex gap-1.5">
                        {[-5, -10, -15].map((pct) => {
                          const suggested = Math.round((product.asking_price * (100 + pct)) / 100);
                          return (
                            <button
                              type="button"
                              key={pct}
                              onClick={() => setOfferAmount(String(suggested))}
                              className="flex-1 py-1 text-[10.5px] font-semibold rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              {pct}% ({formatCurrency(suggested)})
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="number"
                        placeholder="Offer amount in ₹"
                        min="1000"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-emerald-600"
                        required
                      />

                      <input
                        type="text"
                        placeholder="Optional note to seller"
                        value={offerNote}
                        onChange={(e) => setOfferNote(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-600"
                      />

                      <button
                        type="submit"
                        disabled={offerLoading || isSeller || product.status !== 'active'}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
                      >
                        {offerLoading ? 'Submitting Offer...' : 'Send Private Offer'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* SELLING METHOD 2: SEALED BIDDING AUCTION */}
            {product.selling_method === 'bidding' && auction && (
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Gavel className="w-3.5 h-3.5 text-amber-600" />
                      Sealed-Bid Auction
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded">
                      {auction.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    All bids remain strictly confidential. When the auction closes, the highest bid meeting or exceeding the seller's secret reserve price wins.
                  </p>

                  <div className="text-xs space-y-1 pt-1.5 border-t border-amber-200/60 text-amber-950">
                    <div className="flex justify-between">
                      <span className="text-amber-800">Starting Bid Floor:</span>
                      <span className="font-bold">{formatCurrency(auction.starting_bid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-800">Minimum Increment:</span>
                      <span className="font-bold">{formatCurrency(auction.min_increment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-800">Total Bids:</span>
                      <span className="font-bold">{auction.total_bids_count} bids submitted</span>
                    </div>
                  </div>

                  {auction.user_own_bid && (
                    <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-xs">
                      <span className="text-slate-500 font-medium">Your current sealed bid:</span>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {formatCurrency(auction.user_own_bid.amount)}
                      </div>
                    </div>
                  )}

                  {/* Bid Form or Finalize */}
                  {auction.status === 'active' ? (
                    <form onSubmit={handleSubmitBid} className="space-y-2">
                      <input
                        type="number"
                        placeholder={`Enter bid (min ${formatCurrency(Math.max(auction.starting_bid, (auction.user_own_bid?.amount || 0) + auction.min_increment))})`}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold outline-none focus:border-amber-500"
                        required
                      />
                      <button
                        type="submit"
                        disabled={bidLoading || isSeller}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
                      >
                        {bidLoading ? 'Submitting Bid...' : 'Submit Sealed Bid'}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-center font-bold">
                        Auction has ended. Status: {auction.status}
                      </div>
                      {auction.winner_id === user?.id && (
                        <button
                          onClick={() => onNavigate('checkout', { productId: product.id, source: 'auction', auctionId: auction.id })}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs"
                        >
                          Complete Winner Order ({formatCurrency(auction.winning_amount || 0)})
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleFinalizeAuction}
                    className="w-full py-1 text-[10.5px] font-semibold text-amber-900/80 hover:text-amber-950 border border-amber-200/80 rounded bg-white/70"
                  >
                    Check Status / Finalize
                  </button>
                </div>
              </div>
            )}

            {/* Seller Info & Protection */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Seller</span>
                <span className="font-bold text-slate-800">{product.seller_name || 'Verified Member'}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Buyer Payout Protection</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Smartphones Section */}
      {relatedProducts.length > 0 && (
        <section className="pt-8 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                More from {product.brand}
              </h2>
              <p className="text-xs text-slate-500">Other available models from this brand.</p>
            </div>
            <button
              onClick={() => onNavigate('marketplace', { brand: product.brand })}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
