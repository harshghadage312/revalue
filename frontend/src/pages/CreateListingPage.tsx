import React, { useState, useEffect } from 'react';
import {
  Camera, Upload, ShieldCheck, Gavel, Handshake,
  CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Trash2, Smartphone,
  Cpu, Check, MapPin, Sparkles
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
  { id: 1, title: 'Phone Specs', stepLabel: 'Specs' },
  { id: 2, title: 'Phone Condition Check', stepLabel: 'Condition' },
  { id: 3, title: 'Estimated Resale Value', stepLabel: 'Valuation' },
  { id: 4, title: 'Listing Details', stepLabel: 'Details' },
  { id: 5, title: 'Choose How to Sell', stepLabel: 'Method' },
  { id: 6, title: 'Review Your Listing', stepLabel: 'Review' },
];

export const CreateListingPage: React.FC<CreateListingPageProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Specs
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

  // Step 2: Condition & Photos
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

  // Submission State
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

  // Auto-generate title draft
  useEffect(() => {
    if (!title && brand && model) {
      const condMeta = getConditionMeta(condition);
      setTitle(`${brand} ${model} (${storageGb}GB) - ${condMeta.label}`);
    }
  }, [brand, model, storageGb, condition]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Sign in to Sell Your Phone</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Log in with your verified ReValue account to create a listing.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg"
        >
          Sign In
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
        setError(err.message || 'Image upload failed. Allowed formats: JPEG, PNG, WebP up to 5MB.');
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
      setError(err.message || 'Price valuation is currently unavailable.');
    } finally {
      setAiPriceLoading(false);
    }
  };

  const handleNextStep = () => {
    setError(null);
    if (currentStep === 1) {
      if (!model.trim()) {
        setError('Please select or enter your phone model.');
        return;
      }
    } else if (currentStep === 2) {
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
      setError(err.message || 'Failed to publish listing. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <button
            onClick={() => onNavigate('marketplace')}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
          <h1 className="text-xl font-extrabold text-slate-900">
            Sell Your Phone
          </h1>
        </div>

        <div className="text-right text-xs">
          <span className="text-slate-400">Step {currentStep} of 6</span>
          <span className="font-bold text-slate-800 block">{STEPS[currentStep - 1].title}</span>
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-6 gap-1">
          {STEPS.map((s) => {
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { if (isCompleted) setCurrentStep(s.id); }}
                disabled={!isCompleted && !isCurrent}
                className={`py-1.5 px-1 rounded text-center transition-all ${
                  isCurrent
                    ? 'bg-emerald-50 text-emerald-900 font-bold'
                    : isCompleted
                    ? 'text-slate-700 hover:bg-slate-50 cursor-pointer'
                    : 'text-slate-300 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className={`w-5 h-5 mx-auto rounded-full text-[10px] font-bold flex items-center justify-center mb-0.5 ${
                  isCurrent
                    ? 'bg-emerald-600 text-white'
                    : isCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {isCompleted ? <Check className="w-3 h-3" /> : s.id}
                </div>
                <span className="text-[10px] truncate block">
                  {s.stepLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* STEP 1: PHONE INFO */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 space-y-4 shadow-2xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Phone Specifications</h2>
            <p className="text-xs text-slate-500">Provide accurate hardware specifications for your phone.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Brand *</label>
              <select
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setCustomModel(false);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-emerald-600 outline-none"
              >
                {EXPANDED_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block font-bold text-slate-700">Model *</label>
                <button
                  type="button"
                  onClick={() => setCustomModel(!customModel)}
                  className="text-[10px] text-emerald-700 font-semibold hover:underline"
                >
                  {customModel ? 'Select from list' : 'Custom model'}
                </button>
              </div>

              {customModel || availableModels.length === 0 ? (
                <input
                  type="text"
                  placeholder="e.g. Galaxy S23 Ultra"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 outline-none"
                  required
                />
              ) : (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white focus:border-emerald-600 outline-none"
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Storage *</label>
              <select
                value={storageGb}
                onChange={(e) => setStorageGb(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold outline-none"
              >
                {[32, 64, 128, 256, 512, 1024].map((s) => (
                  <option key={s} value={s}>{s} GB</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">RAM *</label>
              <select
                value={ramGb}
                onChange={(e) => setRamGb(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold outline-none"
              >
                {[3, 4, 6, 8, 12, 16].map((r) => (
                  <option key={r} value={r}>{r} GB</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Battery Health %</label>
              <input
                type="number"
                min="50"
                max="100"
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Age (Months)</label>
              <input
                type="number"
                min="1"
                max="72"
                value={ageMonths}
                onChange={(e) => setAgeMonths(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Color</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Space Grey, Black"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Original Price (MSRP in ₹)</label>
              <input
                type="number"
                value={originalMSRP}
                onChange={(e) => setOriginalMSRP(e.target.value)}
                placeholder="e.g. 69900"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PHONE CONDITION & PHOTOS */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Phone Condition Check & Photos</h2>
              <p className="text-xs text-slate-500">Upload device photos and select the cosmetic condition.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowConditionModal(true)}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>Run Condition Check</span>
            </button>
          </div>

          {/* Photo Upload Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Photos</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {images.map((imgUrl, index) => (
                <div key={index} className="aspect-square rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative group p-1">
                  <img src={imgUrl} alt="Uploaded device" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1.5 right-1.5 p-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <label className="aspect-square rounded-lg border-2 border-dashed border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/20 cursor-pointer flex flex-col items-center justify-center p-2 text-center transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-[11px] font-bold text-slate-700">Add Photo</span>
              </label>
            </div>
            {uploadingImage && (
              <p className="text-xs text-emerald-700 font-semibold mt-1.5">Uploading...</p>
            )}
          </div>

          {/* Condition Radio Options */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Condition Grade *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { key: 'excellent', label: 'Like New', desc: 'Flawless screen & body. Zero visible scratches.' },
                { key: 'good', label: 'Good Condition', desc: 'Screen in great shape with light micro-marks.' },
                { key: 'bad', label: 'Noticeable Wear', desc: 'Visible casing scuffs or scratches from use.' },
                { key: 'defective', label: 'Heavily Damaged', desc: 'Cracked glass or physical faults. Sold for parts.' },
              ].map((c) => (
                <label
                  key={c.key}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-start gap-2.5 ${
                    condition === c.key
                      ? 'bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="condition"
                    value={c.key}
                    checked={condition === c.key}
                    onChange={() => setCondition(c.key as ProductCondition)}
                    className="accent-emerald-600 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">{c.label}</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{c.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Physical Verification Inputs */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">Physical Checks</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Screen Glass</label>
                <select
                  value={screenCrack}
                  onChange={(e) => setScreenCrack(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
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
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
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
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="No">None / Original</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Warranty</label>
                <select
                  value={warrantyAvailable}
                  onChange={(e) => setWarrantyAvailable(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="No">Expired</option>
                  <option value="Yes">Active Warranty</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: RESALE VALUATION */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 space-y-4 shadow-2xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Estimated Resale Value</h2>
            <p className="text-xs text-slate-500">
              Resale price estimate based on secondary market data and your phone's specifications.
            </p>
          </div>

          {aiPriceLoading ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Calculating resale price estimate...</p>
            </div>
          ) : priceEstimate ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10.5px]">
                    Estimated Resale Value
                  </span>
                  <span className="text-slate-400">{brand} {model}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block">Recommended Price:</span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-0.5 block">
                      {formatCurrency(priceEstimate.estimated_price)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="text-[10px] text-slate-400 block">Estimated Range:</span>
                    <span>{formatCurrency(priceEstimate.price_range_low)} - {formatCurrency(priceEstimate.price_range_high)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-slate-800">
                  {priceEstimate.explanation}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
                <span className="text-emerald-950 font-medium">
                  Use recommended price of {formatCurrency(priceEstimate.estimated_price)}?
                </span>
                <button
                  type="button"
                  onClick={() => setAskingPrice(String(priceEstimate.estimated_price))}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shrink-0 transition-colors"
                >
                  Apply {formatCurrency(priceEstimate.estimated_price)}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-slate-500">Valuation not yet computed.</p>
              <button
                type="button"
                onClick={calculateResalePrice}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg"
              >
                Estimate Value
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: LISTING DETAILS */}
      {currentStep === 4 && (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 space-y-3.5 shadow-2xs text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Listing Details & Price</h2>
            <p className="text-slate-500">Set your title, asking price, and seller notes.</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Listing Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Apple iPhone 14 (128GB) - Like New"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-600 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Asking Price (₹) *</label>
              <input
                type="number"
                min="500"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                placeholder="Enter price in ₹"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">City Location *</label>
              <div className="relative">
                <input
                  type="text"
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  placeholder="e.g. Mumbai, Bengaluru"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 outline-none"
                  required
                />
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Accessories Checkboxes */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-wrap gap-4 text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={hasBox}
                onChange={(e) => setHasBox(e.target.checked)}
                className="accent-emerald-600 rounded"
              />
              <span>Original Box included</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={hasCharger}
                onChange={(e) => setHasCharger(e.target.checked)}
                className="accent-emerald-600 rounded"
              />
              <span>Original Charger included</span>
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Seller Notes / Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe condition, phone usage, battery health habits..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Disclosed Faults (Optional)</label>
            <input
              type="text"
              value={knownFaults}
              onChange={(e) => setKnownFaults(e.target.value)}
              placeholder="e.g. Minor mark on edge, never dropped"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
            />
          </div>
        </div>
      )}

      {/* STEP 5: SELLING METHOD */}
      {currentStep === 5 && (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 space-y-4 shadow-2xs text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Choose How to Sell</h2>
            <p className="text-slate-500">Select direct purchase with negotiation or a sealed auction.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Direct Buy */}
            <div
              onClick={() => setSellingMethod('negotiation')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-colors space-y-2 ${
                sellingMethod === 'negotiation'
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Direct Buy & Offers</span>
                <input
                  type="radio"
                  name="sellingMethod"
                  checked={sellingMethod === 'negotiation'}
                  onChange={() => setSellingMethod('negotiation')}
                  className="accent-emerald-600"
                />
              </div>
              <p className="text-slate-500 leading-relaxed">
                Buyers can buy instantly at {formatCurrency(Number(askingPrice) || 0)} or submit private counteroffers.
              </p>
            </div>

            {/* Sealed Auction */}
            <div
              onClick={() => setSellingMethod('bidding')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-colors space-y-2 ${
                sellingMethod === 'bidding'
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Sealed-Bid Auction</span>
                <input
                  type="radio"
                  name="sellingMethod"
                  checked={sellingMethod === 'bidding'}
                  onChange={() => setSellingMethod('bidding')}
                  className="accent-emerald-600"
                />
              </div>
              <p className="text-slate-500 leading-relaxed">
                Buyers place confidential bids. Highest bid meeting your secret reserve price wins.
              </p>
            </div>
          </div>

          {/* Settings depending on method */}
          {sellingMethod === 'negotiation' ? (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <label className="block font-bold text-slate-800">
                Minimum Acceptable Price (Private Floor in ₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 45000 (offers below this are automatically rejected)"
                value={minAcceptablePrice}
                onChange={(e) => setMinAcceptablePrice(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none"
              />
              <span className="text-[10.5px] text-slate-400 block">
                This floor is confidential and never shown to buyers.
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-amber-950 mb-1">Starting Bid Floor (₹) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 35000"
                    value={startingBid}
                    onChange={(e) => setStartingBid(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-amber-950 mb-1">Secret Reserve Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 48000"
                    value={reservePrice}
                    onChange={(e) => setReservePrice(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg outline-none"
                  />
                  <span className="text-[10px] text-amber-800 mt-0.5 block">Confidential to you.</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-amber-950 mb-1">Auction Duration</label>
                <select
                  value={auctionDays}
                  onChange={(e) => setAuctionDays(Number(e.target.value))}
                  className="w-full sm:w-44 px-3 py-1.5 bg-white border border-amber-200 rounded-lg font-semibold outline-none"
                >
                  <option value={1}>1 Day</option>
                  <option value={3}>3 Days</option>
                  <option value={5}>5 Days</option>
                  <option value={7}>7 Days</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 6: REVIEW */}
      {currentStep === 6 && (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 space-y-4 shadow-2xs text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Review Your Listing</h2>
            <p className="text-slate-500">Confirm specifications and price before publishing.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/80 pb-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">{brand} • {model}</span>
                <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {sellingMethod === 'bidding' ? 'Starting Bid' : 'Asking Price'}
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  {formatCurrency(Number(sellingMethod === 'bidding' ? startingBid : askingPrice) || 0)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded bg-white border border-slate-200">
                <span className="text-slate-400 block text-[9.5px] uppercase">Condition</span>
                <span className="font-bold text-slate-900">{getConditionMeta(condition).label}</span>
              </div>
              <div className="p-2.5 rounded bg-white border border-slate-200">
                <span className="text-slate-400 block text-[9.5px] uppercase">Storage / RAM</span>
                <span className="font-bold text-slate-900">{storageGb}GB / {ramGb}GB</span>
              </div>
              <div className="p-2.5 rounded bg-white border border-slate-200">
                <span className="text-slate-400 block text-[9.5px] uppercase">Battery</span>
                <span className="font-bold text-emerald-700">{batteryHealth}%</span>
              </div>
              <div className="p-2.5 rounded bg-white border border-slate-200">
                <span className="text-slate-400 block text-[9.5px] uppercase">Method</span>
                <span className="font-bold text-slate-900">{getSellingMethodMeta(sellingMethod).tag}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1">
              <span>Photos: <strong>{images.length} attached</strong></span>
              <span>City: <strong>{locationCity}</strong></span>
              <span>Box: <strong>{hasBox ? 'Yes' : 'No'}</strong></span>
              <span>Charger: <strong>{hasCharger ? 'Yes' : 'No'}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStep === 1 || submitting}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors disabled:opacity-40"
        >
          Previous
        </button>

        {currentStep < 6 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmitListing}
            disabled={submitting}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Publish Listing</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Condition Check Modal */}
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
