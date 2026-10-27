import React, { useState, useEffect } from 'react';
import { X, Sparkles, TrendingUp, Info, CheckCircle2, AlertCircle, Wrench, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { PriceEstimate } from '../types';
import { formatCurrency, getConditionMeta } from '../utils/formatters';

interface AiPriceValuatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBrand?: string;
  initialModel?: string;
  initialCondition?: string;
}

const EXPANDED_BRANDS = [
  'Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Realme',
  'Vivo', 'iQOO', 'Oppo', 'Motorola', 'Nothing', 'Poco',
  'Infinix', 'Tecno', 'Lava', 'Honor', 'itel', 'CMF'
];

export const AiPriceValuatorModal: React.FC<AiPriceValuatorModalProps> = ({
  isOpen,
  onClose,
  initialBrand = 'Apple',
  initialModel = 'iPhone 13',
  initialCondition = 'good',
}) => {
  const [brand, setBrand] = useState(initialBrand);
  const [model, setModel] = useState(initialModel);
  const [condition, setCondition] = useState(initialCondition);
  const [ageMonths, setAgeMonths] = useState(12);
  const [storageGb, setStorageGb] = useState(128);
  const [ramGb, setRamGb] = useState(6);
  const [batteryHealth, setBatteryHealth] = useState(88);
  const [originalRetailPrice, setOriginalRetailPrice] = useState(69900);

  // Physical condition features
  const [screenCrack, setScreenCrack] = useState('No');
  const [scratches, setScratches] = useState('Minor');
  const [repairHistory, setRepairHistory] = useState('No');
  const [warrantyAvailable, setWarrantyAvailable] = useState('No');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch catalogue models when brand changes
  useEffect(() => {
    if (brand) {
      api.getCatalogueModels(brand)
        .then((res) => {
          if (res?.models?.length) {
            setAvailableModels(res.models);
            if (!res.models.includes(model)) {
              setModel(res.models[0]);
            }
          }
        })
        .catch(() => {});
    }
  }, [brand]);

  // Fetch model specs when model changes
  useEffect(() => {
    if (brand && model) {
      api.getCatalogueSpecs(brand, model)
        .then((specs) => {
          if (specs) {
            if (specs.original_retail_price) setOriginalRetailPrice(specs.original_retail_price);
            if (specs.ram_options?.length) setRamGb(specs.ram_options[0]);
            if (specs.storage_options?.length) setStorageGb(specs.storage_options[0]);
          }
        })
        .catch(() => {});
    }
  }, [model, brand]);

  if (!isOpen) return null;

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPriceEstimate({
        brand,
        model,
        category: 'smartphone',
        approximate_age_months: Number(ageMonths),
        condition,
        storage_gb: Number(storageGb),
        ram_gb: Number(ramGb),
        battery_health_percent: Number(batteryHealth),
        original_retail_price: Number(originalRetailPrice),
        screen_crack: screenCrack,
        scratches: scratches,
        repair_history: repairHistory,
        warranty_available: warrantyAvailable,
      });
      setEstimate(res);
    } catch (err: any) {
      setError(err.message || 'Resale price estimation currently unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-slate-900 text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Resale Price Valuation
            </h2>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold tracking-wider">
              Objective Secondary Market Estimator
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Input your smartphone's hardware specifications and condition to calculate an accurate secondary market resale estimate.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEstimate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Brand</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-emerald-600 outline-none"
              >
                {EXPANDED_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Model</label>
              {availableModels.length > 0 ? (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-emerald-600 outline-none"
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  required
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Storage</label>
              <select
                value={storageGb}
                onChange={(e) => setStorageGb(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
              >
                {[32, 64, 128, 256, 512, 1024].map((s) => (
                  <option key={s} value={s}>{s} GB</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">RAM</label>
              <select
                value={ramGb}
                onChange={(e) => setRamGb(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
              >
                {[3, 4, 6, 8, 12, 16].map((r) => (
                  <option key={r} value={r}>{r} GB</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Battery %</label>
              <input
                type="number"
                min="50"
                max="100"
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
              >
                <option value="excellent">Like New (Mint)</option>
                <option value="good">Good Condition</option>
                <option value="bad">Noticeable Wear</option>
                <option value="defective">Heavily Damaged</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age (Months)</label>
              <input
                type="number"
                min="1"
                max="72"
                value={ageMonths}
                onChange={(e) => setAgeMonths(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
              />
            </div>
          </div>

          {/* Toggle Physical Checks */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>{showAdvanced ? 'Hide Detailed Wear Factors' : '+ Add Detailed Wear Factors'}</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Screen Glass</label>
                  <select
                    value={screenCrack}
                    onChange={(e) => setScreenCrack(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                  >
                    <option value="No">No Cracks</option>
                    <option value="Minor">Minor Hairline</option>
                    <option value="Severe">Severe Crack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Scratches</label>
                  <select
                    value={scratches}
                    onChange={(e) => setScratches(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                  >
                    <option value="None">None</option>
                    <option value="Minor">Minor</option>
                    <option value="Heavy">Heavy Scuffs</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Calculating market valuation...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Estimate Resale Price</span>
              </>
            )}
          </button>
        </form>

        {/* Estimate Result */}
        {estimate && (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                Fair Market Estimate
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                Marketplace Valuation
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-xs text-emerald-900/80 block">Estimated Price:</span>
                <span className="text-2xl font-extrabold text-emerald-950">
                  {formatCurrency(estimate.estimated_price)}
                </span>
              </div>
              <div className="text-right text-xs text-emerald-900/80">
                <span className="text-[10px] text-emerald-800 block">Expected Range:</span>
                <span className="font-semibold">{formatCurrency(estimate.price_range_low)} - {formatCurrency(estimate.price_range_high)}</span>
              </div>
            </div>

            <p className="text-[11px] text-emerald-950/90 leading-relaxed pt-1">
              {estimate.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
