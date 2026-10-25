import React, { useState, useEffect } from 'react';
import { X, Sparkles, TrendingUp, Info, CheckCircle2, AlertCircle, Wrench, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { PriceEstimate } from '../types';

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

  // Advanced MindValue condition features
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
      setError(err.message || 'Failed to calculate price estimate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-slate-900 text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Random Forest Resale Valuator
            </h2>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold tracking-wider">
              17-Feature Secondary Market Pipeline
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Estimate realistic secondary market valuation using hardware specifications, brand depreciation curves, and verified cosmetic condition.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEstimate} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Manufacturer Brand</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
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
                  placeholder="e.g. iPhone 15"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
                  required
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cosmetic Tier</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
              >
                <option value="excellent">Mint / Like New</option>
                <option value="good">Good (Normal Wear)</option>
                <option value="bad">Heavy Scuffs</option>
                <option value="defective">Damaged / Defect</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age (Months)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={ageMonths}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAgeMonths(val);
                  setWarrantyAvailable(val <= 11 ? 'Yes' : 'No');
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Battery Health %</label>
              <input
                type="number"
                min="50"
                max="100"
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Storage (GB)</label>
              <select
                value={storageGb}
                onChange={(e) => setStorageGb(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
              >
                <option value={64}>64 GB</option>
                <option value={128}>128 GB</option>
                <option value={256}>256 GB</option>
                <option value={512}>512 GB</option>
                <option value={1024}>1 TB</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">RAM (GB)</label>
              <select
                value={ramGb}
                onChange={(e) => setRamGb(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
              >
                <option value={4}>4 GB</option>
                <option value={6}>6 GB</option>
                <option value={8}>8 GB</option>
                <option value={12}>12 GB</option>
                <option value={16}>16 GB</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Launch MSRP (₹)</label>
              <input
                type="number"
                min="5000"
                value={originalRetailPrice}
                onChange={(e) => setOriginalRetailPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
              />
            </div>
          </div>

          {/* Toggle Advanced Condition Parameters */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Detailed Wear Features' : 'Show Detailed Wear Features (Cracks, Scratches, Repairs, Warranty)'}</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs animate-in fade-in">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Screen Crack</label>
                <select
                  value={screenCrack}
                  onChange={(e) => setScreenCrack(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="No">No Cracks</option>
                  <option value="Yes">Yes (Cracked)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Scratches</label>
                <select
                  value={scratches}
                  onChange={(e) => setScratches(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="None">None</option>
                  <option value="Minor">Minor</option>
                  <option value="Major">Major</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Repair History</label>
                <select
                  value={repairHistory}
                  onChange={(e) => setRepairHistory(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="No">No Repairs</option>
                  <option value="Yes">Repaired</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Active Warranty</label>
                <select
                  value={warrantyAvailable}
                  onChange={(e) => setWarrantyAvailable(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="No">Expired</option>
                  <option value="Yes">Valid Warranty</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Calculate Fair Market Valuation</span>
              </>
            )}
          </button>
        </form>

        {/* Prediction Results Card */}
        {estimate && (
          <div className="mt-5 p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                MindValue Estimate ({estimate.model_version})
              </span>
              <span className="text-[10px] text-slate-400">
                17 Features Evaluated
              </span>
            </div>

            <div className="text-center py-1">
              <span className="text-xs text-slate-400 block">Suggested Fair Resale Price</span>
              <div className="text-3xl font-extrabold text-white mt-0.5">
                ₹{estimate.estimated_price.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-300 mt-1">
                Fair Market Range: <span className="font-semibold text-emerald-400">₹{estimate.price_range_low.toLocaleString('en-IN')}</span> — <span className="font-semibold text-emerald-400">₹{estimate.price_range_high.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{estimate.explanation}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
