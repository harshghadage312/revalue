import React from 'react';
import { Heart, Gavel, ArrowRight, Smartphone } from 'lucide-react';
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

  const hasImage = Boolean(product.images && product.images.length > 0 && product.images[0]);
  const isBidding = product.selling_method === 'bidding';
  const displayedPrice = isBidding
    ? (product.starting_bid ?? product.auction_info?.starting_bid ?? product.asking_price)
    : product.asking_price;

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border border-slate-200 hover:border-emerald-600 hover:shadow-md transition-all duration-150 flex flex-col justify-between overflow-hidden cursor-pointer relative product-card-hover h-full"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-[4/3] bg-slate-50/80 flex items-center justify-center p-3 overflow-hidden border-b border-slate-100">
        {hasImage ? (
          <img
            src={resolveMediaUrl(product.images[0])}
            alt={`${product.brand} ${product.model}`}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-2 text-slate-300 group-hover:text-emerald-500 transition-colors">
            <Smartphone className="w-10 h-10 stroke-[1.5]" />
            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
              {product.brand}
            </span>
          </div>
        )}

        {/* Condition Badge (Top Left) */}
        <div className="absolute top-2 left-2 z-10">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-2xs ${conditionMeta.badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${conditionMeta.dotColor}`} />
            {conditionMeta.shortLabel}
          </span>
        </div>

        {/* Wishlist Button (Top Right) */}
        {onToggleWishlist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(e);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-400 hover:text-rose-500 transition-all shadow-2xs z-10 active:scale-95"
            aria-label={isWishlisted ? "Remove from saved phones" : "Save phone to wishlist"}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        )}

        {/* Auction Flag (Bottom Right) */}
        {isBidding && (
          <div className="absolute bottom-2 right-2 z-10">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-600 text-white shadow-2xs">
              <Gavel className="w-2.5 h-2.5" />
              Auction
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          {/* Brand & City */}
          <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-semibold mb-0.5">
            <span className="uppercase tracking-wider text-slate-500 font-bold">{product.brand}</span>
            {product.location_city && (
              <span className="truncate max-w-[80px]">{product.location_city}</span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 text-xs sm:text-sm">
            {product.title}
          </h3>

          {/* Hardware Specs line */}
          <div className="flex flex-wrap items-center gap-1 mt-1 text-[11px] text-slate-500">
            {product.specs?.storage_gb && (
              <span className="font-medium text-slate-600">{product.specs.storage_gb} GB</span>
            )}
            {product.specs?.ram_gb && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-600">{product.specs.ram_gb} GB RAM</span>
              </>
            )}
            {product.specs?.battery_health_percent && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-emerald-700">{product.specs.battery_health_percent}% Bat</span>
              </>
            )}
          </div>
        </div>

        {/* Price & Action Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-end justify-between gap-2 mt-auto">
          <div>
            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
              {isBidding ? 'Starting Bid' : 'Price'}
            </div>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
              {formatCurrency(displayedPrice)}
            </div>
          </div>

          <button
            type="button"
            className="px-2.5 py-1 bg-slate-900 group-hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
          >
            <span>View</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
