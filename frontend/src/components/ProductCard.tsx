import React from 'react';
import { Star, Heart, Gavel, Handshake, MapPin, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { resolveMediaUrl } from '../services/api';
import { formatCurrency, getConditionMeta } from '../utils/formatters';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onClick,
  isWishlisted = false,
  onToggleWishlist,
}) => {
  const conditionMeta = getConditionMeta(product.condition);

  const hasImage = product.images && product.images.length > 0 && Boolean(product.images[0]);
  const isBidding = product.selling_method === 'bidding';
  const displayedPrice = isBidding
    ? (product.starting_bid ?? product.auction_info?.starting_bid ?? product.asking_price)
    : product.asking_price;

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-600/60 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden cursor-pointer relative product-card-hover"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-[4/3] bg-gradient-to-b from-slate-100/70 to-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100">
        {hasImage ? (
          <img
            src={resolveMediaUrl(product.images[0])}
            alt={`${product.brand} ${product.model}`}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="text-center p-4 flex flex-col items-center justify-center">
            {/* Minimal Modern Smartphone Graphic */}
            <div className="w-16 h-28 rounded-2xl border-2 border-slate-300/80 bg-white shadow-xs flex flex-col justify-between p-1.5 items-center group-hover:border-emerald-500 transition-colors">
              <div className="w-4 h-1 bg-slate-200 rounded-full" />
              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {product.brand}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block truncate max-w-[50px]">
                  {product.model}
                </span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full border border-slate-300" />
            </div>
          </div>
        )}

        {/* Selling Method Badge (Top Left) */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap z-10">
          {isBidding ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-amber-600 text-white shadow-sm">
              <Gavel className="w-3 h-3" />
              Sealed Auction
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-slate-900 text-white shadow-sm">
              <Handshake className="w-3 h-3 text-emerald-400" />
              Open Negotiation
            </span>
          )}
        </div>

        {/* Wishlist Button (Top Right) */}
        {onToggleWishlist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(e);
            }}
            className="absolute top-2.5 right-2.5 p-2 rounded-xl bg-white/90 backdrop-blur-sm hover:bg-white text-slate-400 hover:text-rose-500 transition-all shadow-sm z-10 active:scale-95"
            aria-label={isWishlisted ? "Remove from saved phones" : "Save phone to wishlist"}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        )}

        {/* Condition Chip (Bottom Left) */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider border backdrop-blur-sm shadow-xs ${conditionMeta.badgeClass}`}>
            {conditionMeta.shortLabel}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Brand & City */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-emerald-700">{product.brand}</span>
            {product.location_city && (
              <span className="flex items-center gap-0.5 text-slate-400">
                <MapPin className="w-3 h-3" />
                {product.location_city}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 text-sm sm:text-base">
            {product.title}
          </h3>

          {/* Key Smartphone Hardware Specs */}
          {product.specs && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {product.specs.storage_gb && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10.5px] font-semibold">
                  {product.specs.storage_gb} GB
                </span>
              )}
              {product.specs.ram_gb && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10.5px] font-semibold">
                  {product.specs.ram_gb} GB RAM
                </span>
              )}
              {product.specs.battery_health_percent && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10.5px] font-semibold">
                  {product.specs.battery_health_percent}% Battery
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price & Action Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-end justify-between">
          <div>
            <div className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">
              {isBidding ? 'Starting Bid' : 'Asking Price'}
            </div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900">
              {formatCurrency(displayedPrice)}
            </div>
          </div>

          {/* Rating or View Details action */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{(product.seller_rating || 5.0).toFixed(1)}</span>
            </div>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
