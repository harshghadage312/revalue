import React, { useState, useEffect } from 'react';
import {
  Sparkles, Camera, Upload, ShieldCheck, Gavel, Handshake,
  CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Trash2, Smartphone,
  Info, Cpu, HardDrive, Battery, Check, Eye, HelpCircle, MapPin, Box, BatteryMedium
} from 'lucide-react';
import { api } from '../services/api';
import { ProductCondition, SellingMethod, PriceEstimate } from '../types';
import { useAuth } from '../context/AuthContext';
import { AiConditionModal } from '../components/AiConditionModal';
import { formatCurrency, getConditionMeta, getSellingMethodMeta } from '../utils/formatters';

const EXPANDED_BRANDS = [
  'Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Realme',
  'Vivo', 'iQOO', 'Oppo', 'Motorola', 'Nothing', 'Poco',
  'Infinix', 'Tecno', 'Lava', 'Honor', 'itel', 'CMF'
];

interface CreateListingPageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: () => void;
}

const STEPS = [
  { id: 1, label: 'Phone Info', shortLabel: 'Specs' },
  { id: 2, label: 'Condition & Photos', shortLabel: 'Condition' },
  { id: 3, label: 'Resale Valuation', shortLabel: 'Valuation' },
  { id: 4, label: 'Listing Details', shortLabel: 'Details' },
  { id: 5, label: 'Selling Method', shortLabel: 'Method' },
  { id: 6, label: 'Review & Publish', shortLabel: 'Review' },
];

export const CreateListingPage: React.FC<CreateListingPageProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Phone Info
  const [brand, setBrand] = useState('Apple');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [customModel, setCustomModel] = useState(false);
  const [storageGb, setStorageGb] = useState(128);
  const [ramGb, setRamGb] = useState(6);
  const [batteryHealth, setBatteryHealth] = useState(88);
  const [color, setColor] = useState('Space Grey');
  const [ageMonths, setAgeMonths] = useState(12);
  const [originalMSRP, setOriginalMSRP] = useState('69900');

  // Step 2: Phone Condition & Photos
  const [condition, setCondition] = useState<ProductCondition>('good');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [screenCrack, setScreenCrack] = useState('No');
  const [scratches, setScratches] = useState('Minor');
  const [repairHistory, setRepairHistory] = useState('No');
  const [warrantyAvailable, setWarrantyAvailable] = useState('No');

  // Step 3: Resale Valuation
  const [aiPriceLoading, setAiPriceLoading] = useState(false);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);

  // Step 4: Listing Information
  const [title, setTitle] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [description, setDescription] = useState('');
  const [locationCity, setLocationCity] = useState('Mumbai');
  const [hasBox, setHasBox] = useState(true);
  const [hasCharger, setHasCharger] = useState(true);
  const [knownFaults, setKnownFaults] = useState('');

  // Step 5: Selling Method
  const [sellingMethod, setSellingMethod] = useState<SellingMethod>('negotiation');
  const [minAcceptablePrice, setMinAcceptablePrice] = useState('');
  const [startingBid, setStartingBid] = useState('');
  const [reservePrice, setReservePrice] = useState('');
  const [auctionDays, setAuctionDays] = useState(3);

  // General State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch catalogue models on brand change
  useEffect(() => {
    if (brand) {
      api.getCatalogueModels(brand)
        .then((res) => {
          if (res?.models?.length) {
            setAvailableModels(res.models);
            if (!model || !res.models.includes(model)) {
              setModel(res.models[0]);
            }
          } else {
            setAvailableModels([]);
          }
        })
        .catch(() => setAvailableModels([]));
    }
  }, [brand]);

  // Fetch model specs on model change
  useEffect(() => {
    if (brand && model && !customModel) {
      api.getCatalogueSpecs(brand, model)
        .then((specs) => {
          if (specs) {
            if (specs.original_retail_price) {
              setOriginalMSRP(String(specs.original_retail_price));
            }
            if (specs.ram_options?.length) {
              setRamGb(specs.ram_options[0]);
            }
            if (specs.storage_options?.length) {
              setStorageGb(specs.storage_options[0]);
            }
          }
        })
        .catch(() => {});
    }
  }, [model, brand, customModel]);

  // Auto-generate title if user hasn't explicitly customized it
  useEffect(() => {
    if (!title && brand && model) {
      const condMeta = getConditionMeta(condition);
      setTitle(`${brand} ${model} (${storageGb}GB) - ${condMeta.label}`);
    }
  }, [brand, model, storageGb, condition]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Sign In to Sell Your Smartphone</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          You must be logged in to create listings, access market valuations, and receive buyer offers.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingImage(true);
      setError(null);
      try {
        const res = await api.uploadImage(file);
        setImages(prev => [...prev, res.image_url]);
      } catch (err: any) {
        setError(err.message || 'Image upload failed. Only JPEG, PNG, or WebP up to 5MB allowed.');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const calculateResalePrice = async () => {
    if (!model.trim()) return;
    setAiPriceLoading(true);
    setError(null);
    try {
      const est = await api.getPriceEstimate({
        brand,
        model,
        category: 'smartphone',
        approximate_age_months: Number(ageMonths),
        condition,
        storage_gb: Number(storageGb),
        ram_gb: Number(ramGb),
        battery_health_percent: Number(batteryHealth),
        original_retail_price: originalMSRP ? Number(originalMSRP) : undefined,
        screen_crack: screenCrack,
        scratches: scratches,
        repair_history: repairHistory,
        warranty_available: warrantyAvailable,
      });
      setPriceEstimate(est);
      if (!askingPrice) {
        setAskingPrice(String(est.estimated_price));
      }
      if (!startingBid) {
        setStartingBid(String(Math.round(est.estimated_price * 0.75)));
      }
      if (!reservePrice) {
        setReservePrice(String(Math.round(est.estimated_price * 0.9)));
      }
    } catch (err: any) {
      setError(err.message || 'Valuation estimation currently unavailable.');
    } finally {
      setAiPriceLoading(false);
    }
  };

  const handleNextStep = async () => {
    setError(null);
    // Step validation
    if (currentStep === 1) {
      if (!model.trim()) {
        setError('Please select or specify a smartphone model.');
        return;
      }
    } else if (currentStep === 2) {
      // Transitioning to Step 3 (Valuation) -> Trigger automatic calculation
      calculateResalePrice();
    } else if (currentStep === 4) {
      if (!title.trim()) {
        setError('Please enter a listing title.');
        return;
      }
      if (sellingMethod === 'negotiation' && (!askingPrice || Number(askingPrice) <= 0)) {
        setError('Please enter a valid asking price.');
        return;
      }
    } else if (currentStep === 5) {
      if (sellingMethod === 'bidding') {
        if (!startingBid || Number(startingBid) <= 0) {
          setError('Please specify a starting bid floor.');
          return;
        }
      }
    }
    setCurrentStep(prev => Math.min(6, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setError(null);
    setCurrentStep(prev => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitListing = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const now = new Date();
      const deadline = new Date(now.getTime() + auctionDays * 24 * 60 * 60 * 1000);
      const sBid = Number(startingBid || askingPrice);

      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        category: 'smartphone',
        brand,
        model: model.trim(),
        condition,
        asking_price: sellingMethod === 'bidding' ? sBid : Number(askingPrice),
        currency: 'INR',
        original_retail_price: originalMSRP ? Number(originalMSRP) : undefined,
        approximate_age_months: Number(ageMonths),
        location_city: locationCity.trim(),
        selling_method: sellingMethod,
        images,
        specs: {
          storage_gb: Number(storageGb),
          ram_gb: Number(ramGb),
          battery_health_percent: Number(batteryHealth),
          color: color.trim(),
          has_original_box: hasBox,
          has_original_charger: hasCharger,
          known_faults: knownFaults.trim() || undefined,
        },
      };

      if (sellingMethod === 'negotiation') {
        payload.negotiation_settings = {
          min_acceptable_price: minAcceptablePrice ? Number(minAcceptablePrice) : undefined,
          allow_counteroffers: true,
        };
      } else {
        payload.auction_settings = {
          starting_bid: sBid,
          reserve_price: reservePrice ? Number(reservePrice) : undefined,
          min_increment: 500,
          deadline: deadline.toISOString(),
        };
      }

      const created = await api.createProduct(payload);
      onNavigate('product-detail', { id: created.id });
    } catch (err: any) {
      setError(err.message || 'Failed to publish listing. Please check form inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <button
            onClick={() => onNavigate('marketplace')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Marketplace</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sell Your Smartphone
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Step-by-step listing wizard with instant condition check and market valuation.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Step</span>
          <span className="text-sm font-extrabold text-emerald-700">{currentStep} of 6</span>
        </div>
      </div>

      {/* Wizard Progress Steps Indicator */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs">
        <div className="grid grid-cols-6 gap-1 sm:gap-2">
          {STEPS.map((s) => {
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (isCompleted) setCurrentStep(s.id);
                }}
                disabled={!isCompleted && !isCurrent}
                className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-emerald-50 text-emerald-900 font-bold'
                    : isCompleted
                    ? 'text-slate-700 hover:bg-slate-50 cursor-pointer'
                    : 'text-slate-300 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center mb-1 transition-all ${
                  isCurrent
                    ? 'bg-emerald-600 text-white'
                    : isCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span className="text-[11px] font-medium hidden sm:block truncate max-w-full">
                  {s.label}
                </span>
                <span className="text-[10px] font-medium sm:hidden">
                  {s.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* STEP 1: PHONE INFO */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Step 1: Smartphone Specifications</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select your device manufacturer, model, and hardware specifications.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Manufacturer Brand</label>
              <select
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setCustomModel(false);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-emerald-600 outline-none"
              >
                {EXPANDED_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Model Name</label>
                <button
                  type="button"
                  onClick={() => setCustomModel(!customModel)}
                  className="text-[10.5px] font-bold text-emerald-700 hover:underline"
                >
                  {customModel ? 'Select from catalog' : 'Other / Custom Model'}
                </button>
              </div>

              {customModel || availableModels.length === 0 ? (
                <input
                  type="text"
                  placeholder="e.g. Galaxy S23 Ultra"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
                  required
                />
              ) : (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-emerald-600 outline-none"
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Storage Capacity</label>
              <select
                value={storageGb}
                onChange={(e) => setStorageGb(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
              >
                {[32, 64, 128, 256, 512, 1024].map((s) => (
                  <option key={s} value={s}>{s} GB</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">RAM</label>
              <select
                value={ramGb}
                onChange={(e) => setRamGb(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
              >
                {[3, 4, 6, 8, 12, 16].map((r) => (
                  <option key={r} value={r}>{r} GB</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Battery Health %</label>
              <input
                type="number"
                min="50"
                max="100"
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Approx. Age (Months)</label>
              <input
                type="number"
                min="1"
                max="72"
                value={ageMonths}
                onChange={(e) => setAgeMonths(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Color / Finish</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Space Grey, Midnight Blue"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Original Launch Price (MSRP in ₹)</label>
              <input
                type="number"
                value={originalMSRP}
                onChange={(e) => setOriginalMSRP(e.target.value)}
                placeholder="e.g. 69900"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: CONDITION & PHOTOS */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 2: Phone Condition & Photos</h2>
              <p className="text-xs text-slate-500 mt-0.5">Upload photos and specify cosmetic condition grade.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowConditionModal(true)}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Instant AI Condition Check</span>
            </button>
          </div>

          {/* Photo Upload Section */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">Device Photos</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((imgUrl, index) => (
                <div key={index} className="aspect-square rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative group">
                  <img src={imgUrl} alt="Uploaded smartphone" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/20 cursor-pointer flex flex-col items-center justify-center p-3 text-center transition-all">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <Upload className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-bold text-slate-700">Add Photo</span>
                <span className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WebP</span>
              </label>
            </div>
            {uploadingImage && (
              <p className="text-xs text-emerald-700 font-semibold mt-2 animate-pulse">Uploading photo...</p>
            )}
          </div>

          {/* Cosmetic Condition Radio Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2.5">Cosmetic Condition Grade</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'excellent', label: 'Like New (Mint)', desc: 'Flawless screen and casing. Zero visible scratches.' },
                { key: 'good', label: 'Good Condition', desc: 'Minor cosmetic hairline scuffs. 100% fully functional.' },
                { key: 'bad', label: 'Noticeable Wear', desc: 'Visible scratches or small casing dents from regular use.' },
                { key: 'defective', label: 'Heavily Damaged', desc: 'Cracked glass or physical faults. Sold for parts / repair.' },
              ].map((c) => (
                <label
                  key={c.key}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    condition === c.key
                      ? 'bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-600'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="condition"
                    value={c.key}
                    checked={condition === c.key}
                    onChange={() => setCondition(c.key as ProductCondition)}
                    className="accent-emerald-600 mt-1"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{c.label}</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">{c.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Physical Factors */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Physical Verification Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Screen Glass</label>
                <select
                  value={screenCrack}
                  onChange={(e) => setScreenCrack(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="No">No Cracks</option>
                  <option value="Minor">Minor Hairline</option>
                  <option value="Severe">Severe Crack</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Scratches</label>
                <select
                  value={scratches}
                  onChange={(e) => setScratches(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="None">None</option>
                  <option value="Minor">Minor</option>
                  <option value="Heavy">Heavy Scuffs</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Past Repairs</label>
                <select
                  value={repairHistory}
                  onChange={(e) => setRepairHistory(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="No">None / Original</option>
                  <option value="Yes">Yes (Disclosed)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Brand Warranty</label>
                <select
                  value={warrantyAvailable}
                  onChange={(e) => setWarrantyAvailable(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="No">Expired</option>
                  <option value="Yes">Active Warranty</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: RESALE PRICE VALUATION */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Step 3: Resale Price Valuation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Marketplace AI valuation calculated from secondary market depreciation models and your entered specs.
            </p>
          </div>

          {aiPriceLoading ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Evaluating smartphone depreciation model...</p>
            </div>
          ) : priceEstimate ? (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Resale Valuation
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {brand} {model} ({storageGb}GB)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-baseline">
                  <div>
                    <span className="text-xs text-slate-400 block">Recommended Resale Price:</span>
                    <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mt-1 block">
                      {formatCurrency(priceEstimate.estimated_price)}
                    </span>
                  </div>

                  <div className="sm:text-right space-y-1">
                    <span className="text-xs text-slate-400 block">Expected Market Range:</span>
                    <span className="text-sm font-bold text-slate-200">
                      {formatCurrency(priceEstimate.price_range_low)} — {formatCurrency(priceEstimate.price_range_high)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                  {priceEstimate.explanation}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs text-emerald-950">
                  <span className="font-bold block">Apply Recommended Asking Price:</span>
                  <span>Set your listing asking price to {formatCurrency(priceEstimate.estimated_price)}.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAskingPrice(String(priceEstimate.estimated_price))}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 transition-colors"
                >
                  Apply {formatCurrency(priceEstimate.estimated_price)}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-xs text-slate-500">Valuation not yet generated.</p>
              <button
                type="button"
                onClick={calculateResalePrice}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Calculate Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: LISTING INFORMATION */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Step 4: Listing Details & Pricing</h2>
            <p className="text-xs text-slate-500 mt-0.5">Customize your listing title, description, and asking price.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Listing Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Apple iPhone 14 (128GB) - Like New (Mint)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Asking Price (₹)</label>
                <input
                  type="number"
                  min="500"
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                  placeholder="Enter asking price in ₹"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">City Location</label>
                <div className="relative">
                  <input
                    type="text"
                    value={locationCity}
                    onChange={(e) => setLocationCity(e.target.value)}
                    placeholder="e.g. Mumbai, Bengaluru"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
                    required
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            {/* Packaging & Accessories */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
              <span className="text-xs font-bold text-slate-800 block">Included Accessories</span>
              <div className="flex flex-wrap gap-6 text-xs text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasBox}
                    onChange={(e) => setHasBox(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span>Original Retail Box included</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCharger}
                    onChange={(e) => setHasCharger(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span>Original Charger / Cable included</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Seller Notes & Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe phone history, usage, battery habits, reason for selling..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Disclosed Faults or Imperfections (Optional)</label>
              <input
                type="text"
                value={knownFaults}
                onChange={(e) => setKnownFaults(e.target.value)}
                placeholder="e.g. Tiny scratch on upper right corner, never dropped"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-600 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: SELLING METHOD */}
      {currentStep === 5 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Step 5: Choose Selling Method</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select how buyers can purchase or bid on your smartphone.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Method A */}
            <div
              onClick={() => setSellingMethod('negotiation')}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all space-y-3 ${
                sellingMethod === 'negotiation'
                  ? 'border-emerald-600 bg-emerald-50/40'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                  <Handshake className="w-4 h-4" />
                </div>
                <input
                  type="radio"
                  name="sellingMethod"
                  checked={sellingMethod === 'negotiation'}
                  onChange={() => setSellingMethod('negotiation')}
                  className="accent-emerald-600"
                />
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm">Direct Purchase & Offers</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Buyers can purchase immediately at asking price ({formatCurrency(Number(askingPrice) || 0)}) or submit private counteroffers.
                </p>
              </div>
            </div>

            {/* Method B */}
            <div
              onClick={() => setSellingMethod('bidding')}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all space-y-3 ${
                sellingMethod === 'bidding'
                  ? 'border-emerald-600 bg-emerald-50/40'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <Gavel className="w-4 h-4" />
                </div>
                <input
                  type="radio"
                  name="sellingMethod"
                  checked={sellingMethod === 'bidding'}
                  onChange={() => setSellingMethod('bidding')}
                  className="accent-emerald-600"
                />
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm">Sealed-Bid Auction</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Buyers submit confidential sealed bids. The highest bid meeting your secret reserve price wins when the timer expires.
                </p>
              </div>
            </div>
          </div>

          {/* Conditional Selling Method Fields */}
          {sellingMethod === 'negotiation' ? (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">Negotiation Safeguards</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Minimum Acceptable Price (Private Floor in ₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 45000 (offers below this will be rejected automatically)"
                  value={minAcceptablePrice}
                  onChange={(e) => setMinAcceptablePrice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600"
                />
                <span className="text-[10.5px] text-slate-400 mt-1 block">
                  This floor is strictly private and never disclosed to buyers.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/90 space-y-4">
              <h4 className="text-xs font-bold text-amber-950">Sealed Auction Settings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Starting Bid Floor (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 35000"
                    value={startingBid}
                    onChange={(e) => setStartingBid(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Secret Reserve Price (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 48000"
                    value={reservePrice}
                    onChange={(e) => setReservePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs outline-none"
                  />
                  <span className="text-[10px] text-amber-800/80 mt-1 block">
                    Strictly confidential. If no bids meet this reserve, you are under no obligation to sell.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">Auction Duration</label>
                <select
                  value={auctionDays}
                  onChange={(e) => setAuctionDays(Number(e.target.value))}
                  className="w-full sm:w-48 px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value={1}>1 Day (Fast)</option>
                  <option value={3}>3 Days (Standard)</option>
                  <option value={5}>5 Days</option>
                  <option value={7}>7 Days (Max reach)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 6: REVIEW & PUBLISH */}
      {currentStep === 6 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Step 6: Review & Publish Listing</h2>
            <p className="text-xs text-slate-500 mt-0.5">Please verify your smartphone specifications and pricing before going live.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                  {brand} • {model}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{title}</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {sellingMethod === 'bidding' ? 'Starting Bid' : 'Asking Price'}
                </span>
                <span className="text-xl font-extrabold text-slate-900">
                  {formatCurrency(Number(sellingMethod === 'bidding' ? startingBid : askingPrice) || 0)}
                </span>
              </div>
            </div>

            {/* Specs Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Condition</span>
                <span className="font-bold text-slate-900">{getConditionMeta(condition).label}</span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Storage / RAM</span>
                <span className="font-bold text-slate-900">{storageGb} GB / {ramGb} GB</span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Battery Health</span>
                <span className="font-bold text-emerald-700">{batteryHealth}%</span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Selling Method</span>
                <span className="font-bold text-slate-900">{getSellingMethodMeta(sellingMethod).tag}</span>
              </div>
            </div>

            {/* Photos count & Disclosed Faults */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-600">
              <span>Photos attached: <strong>{images.length} photo(s)</strong></span>
              <span>Location: <strong>{locationCity}</strong></span>
              <span>Box: <strong>{hasBox ? 'Yes' : 'No'}</strong></span>
              <span>Charger: <strong>{hasCharger ? 'Yes' : 'No'}</strong></span>
            </div>

            {knownFaults && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <strong>Disclosed Wear / Faults:</strong> {knownFaults}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              By publishing, your smartphone will be immediately listed on the ReValue Marketplace. Buyer funds are held in escrow until physical delivery confirmation.
            </p>
          </div>
        </div>
      )}

      {/* Wizard Footer Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStep === 1 || submitting}
          className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous Step</span>
        </button>

        {currentStep < 6 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.99] flex items-center gap-1.5"
          >
            <span>Continue to {STEPS[currentStep].label}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmitListing}
            disabled={submitting}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Publishing Listing...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Publish Smartphone Listing</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* AI Condition Modal */}
      <AiConditionModal
        isOpen={showConditionModal}
        onClose={() => setShowConditionModal(false)}
        onConditionConfirmed={(assessedCond) => {
          setCondition(assessedCond as ProductCondition);
        }}
      />
    </div>
  );
};
