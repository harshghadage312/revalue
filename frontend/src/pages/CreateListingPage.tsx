import React, { useState, useEffect } from 'react';
import {
  Sparkles, Camera, Upload, ShieldCheck, Gavel, Handshake,
  CheckCircle2, AlertCircle, ArrowLeft, Trash2, Smartphone,
  Info, Cpu, HardDrive, Battery, Check
} from 'lucide-react';
import { api } from '../services/api';
import { ProductCondition, SellingMethod } from '../types';
import { useAuth } from '../context/AuthContext';
import { AiConditionModal } from '../components/AiConditionModal';

const EXPANDED_BRANDS = [
  'Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Realme',
  'Vivo', 'iQOO', 'Oppo', 'Motorola', 'Nothing', 'Poco',
  'Infinix', 'Tecno', 'Lava', 'Honor', 'itel', 'CMF'
];

interface CreateListingPageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: () => void;
}

export const CreateListingPage: React.FC<CreateListingPageProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  const { user, isAuthenticated } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('Apple');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [condition, setCondition] = useState<ProductCondition>('good');
  const [askingPrice, setAskingPrice] = useState('');
  const [originalMSRP, setOriginalMSRP] = useState('');
  const [ageMonths, setAgeMonths] = useState(12);
  const [locationCity, setLocationCity] = useState('Mumbai');

  // Hardware Specs
  const [storageGb, setStorageGb] = useState(128);
  const [ramGb, setRamGb] = useState(6);
  const [batteryHealth, setBatteryHealth] = useState(88);
  const [color, setColor] = useState('Black');
  const [hasBox, setHasBox] = useState(true);
  const [hasCharger, setHasCharger] = useState(true);
  const [knownFaults, setKnownFaults] = useState('');

  // Advanced Physical Condition Features
  const [screenCrack, setScreenCrack] = useState('No');
  const [scratches, setScratches] = useState('Minor');
  const [repairHistory, setRepairHistory] = useState('No');
  const [warrantyAvailable, setWarrantyAvailable] = useState('No');
  const [showAdvancedCondition, setShowAdvancedCondition] = useState(false);

  // Selling Method
  const [sellingMethod, setSellingMethod] = useState<SellingMethod>('negotiation');
  const [minAcceptablePrice, setMinAcceptablePrice] = useState('');
  const [startingBid, setStartingBid] = useState('');
  const [reservePrice, setReservePrice] = useState('');
  const [auctionDays, setAuctionDays] = useState(3);

  // Images
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // AI Assistance states
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [aiPriceLoading, setAiPriceLoading] = useState(false);
  const [aiPriceSuggestion, setAiPriceSuggestion] = useState<number | null>(null);

  const [customModel, setCustomModel] = useState(false);
  const [loading, setLoading] = useState(false);
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

  // Fetch model specs on model change to auto-fill MSRP and specs
  useEffect(() => {
    if (brand && model) {
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
  }, [model, brand]);

  // Auto-generate title if empty
  useEffect(() => {
    if (!title && brand && model) {
      setTitle(`${brand} ${model} (${storageGb}GB) - ${condition.toUpperCase()}`);
    }
  }, [brand, model, storageGb, condition]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Seller Sign In Required</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          You must be signed in with a verified account to publish authenticated smartphone listings.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs"
        >
          Sign In to Continue
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

  const handleGetAiPrice = async () => {
    if (!model.trim()) {
      setError('Please select or enter a smartphone model first.');
      return;
    }
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
      setAiPriceSuggestion(est.estimated_price);
      if (!askingPrice) {
        setAskingPrice(String(est.estimated_price));
      }
    } catch (err: any) {
      setError(err.message || 'Price estimation currently unavailable.');
    } finally {
      setAiPriceLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <button
            onClick={() => onNavigate('marketplace')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Marketplace
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            List a Smartphone for Resale
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create an authenticated secondary market listing with AI condition assessment and fair price estimation.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: Device Identification & Brand Specs */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">1</span>
            <h3 className="font-bold text-slate-900 text-sm">Smartphone Model & Brand</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Brand Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Manufacturer Brand *</label>
              <select
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setCustomModel(false);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-emerald-600"
                required
              >
                {EXPANDED_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Model Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Model *</label>
                <button
                  type="button"
                  onClick={() => setCustomModel(!customModel)}
                  className="text-[10px] text-emerald-700 font-bold hover:underline"
                >
                  {customModel ? 'Select from catalogue' : 'Type custom model'}
                </button>
              </div>

              {customModel || availableModels.length === 0 ? (
                <input
                  type="text"
                  placeholder="e.g. iPhone 14 Pro Max"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-emerald-600"
                  required
                />
              ) : (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-emerald-600"
                  required
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Launch MSRP */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Original Retail MSRP (₹)</label>
              <input
                type="number"
                placeholder="e.g. 79900"
                value={originalMSRP}
                onChange={(e) => setOriginalMSRP(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>

            {/* Approximate Age Months */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Approximate Age (Months)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={ageMonths}
                onChange={(e) => setAgeMonths(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-600"
                required
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: Hardware Specifications */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">2</span>
            <h3 className="font-bold text-slate-900 text-sm">Hardware Specs & Inclusions</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            {/* Storage */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Storage (GB)</label>
              <select
                value={storageGb}
                onChange={(e) => setStorageGb(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600"
              >
                {[64, 128, 256, 512, 1024].map((s) => (
                  <option key={s} value={s}>{s} GB</option>
                ))}
              </select>
            </div>

            {/* RAM */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">RAM (GB)</label>
              <select
                value={ramGb}
                onChange={(e) => setRamGb(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600"
              >
                {[3, 4, 6, 8, 12, 16, 24].map((r) => (
                  <option key={r} value={r}>{r} GB</option>
                ))}
              </select>
            </div>

            {/* Battery Health */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Battery Health %</label>
              <input
                type="number"
                min="50"
                max="100"
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600"
                required
              />
            </div>

            {/* Color */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Color Finish</label>
              <input
                type="text"
                placeholder="e.g. Space Black"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Inclusions */}
          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={hasBox}
                onChange={(e) => setHasBox(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
              <span>Original retail box included</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={hasCharger}
                onChange={(e) => setHasCharger(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
              <span>Original charger / cable included</span>
            </label>
          </div>
        </section>

        {/* SECTION 3: Visual Condition & AI Scanner */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">3</span>
              <h3 className="font-bold text-slate-900 text-sm">Physical Condition & Visual AI Scanner</h3>
            </div>

            {/* MobileNetV2 AI Scanner Button */}
            <button
              type="button"
              onClick={() => setShowConditionModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Scan Condition with MobileNetV2 AI</span>
            </button>
          </div>

          {/* Condition Tier Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Select Condition Tier *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'excellent', label: 'Mint / Like New', desc: 'No scratches or dents' },
                { id: 'good', label: 'Good Condition', desc: 'Minor hairline marks' },
                { id: 'bad', label: 'Heavy Wear', desc: 'Deep scuffs or dents' },
                { id: 'defective', label: 'Functional Fault', desc: 'Cracked screen or fault' },
              ].map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCondition(c.id as ProductCondition)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    condition === c.id
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 text-slate-700'
                  }`}
                >
                  <span className="text-xs block font-bold">{c.label}</span>
                  <span className="text-[10px] text-slate-500 font-normal mt-0.5 block">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced MindValue Physical Features Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvancedCondition(!showAdvancedCondition)}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>{showAdvancedCondition ? 'Hide' : 'Show'} Physical Condition Details (Cracks, Scratches, Warranty)</span>
            </button>

            {showAdvancedCondition && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Screen Crack</label>
                  <select
                    value={screenCrack}
                    onChange={(e) => setScreenCrack(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exterior Scratches</label>
                  <select
                    value={scratches}
                    onChange={(e) => setScratches(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="None">None</option>
                    <option value="Minor">Minor</option>
                    <option value="Major">Major</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Repair History</label>
                  <select
                    value={repairHistory}
                    onChange={(e) => setRepairHistory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="No">No Repairs</option>
                    <option value="Yes">Repaired</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Warranty Available</label>
                  <select
                    value={warrantyAvailable}
                    onChange={(e) => setWarrantyAvailable(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="No">Expired</option>
                    <option value="Yes">Valid Warranty</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Known Faults Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cosmetic Flaws or Known Faults</label>
            <input
              type="text"
              placeholder="e.g. Tiny scratch near charging port; camera lens is flawless."
              value={knownFaults}
              onChange={(e) => setKnownFaults(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>
        </section>

        {/* SECTION 4: Photos Upload & Preview */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">4</span>
            <h3 className="font-bold text-slate-900 text-sm">Smartphone Photographs</h3>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-6 text-center bg-slate-50/60 transition-colors">
            <input
              type="file"
              id="phone-image-upload"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />
            <label htmlFor="phone-image-upload" className="cursor-pointer block">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <span className="text-xs font-bold text-slate-800 block">
                {uploadingImage ? 'Uploading image...' : 'Click to upload smartphone photographs'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                JPEG, PNG or WebP up to 5MB. Clear front, back and edge photos recommended.
              </span>
            </label>
          </div>

          {/* Image Previews with Remove Button */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {images.map((url, idx) => (
                <div key={idx} className="relative aspect-[4/3] rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden group">
                  <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-bold">
                    {idx === 0 ? 'Primary' : `#${idx + 1}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition-colors"
                    title="Remove photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 5: Valuation & Asking Price */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">5</span>
              <h3 className="font-bold text-slate-900 text-sm">Resale Valuation & Asking Price</h3>
            </div>

            {/* AI Valuation Button */}
            <button
              type="button"
              onClick={handleGetAiPrice}
              disabled={aiPriceLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{aiPriceLoading ? 'Evaluating 17 Features...' : 'Get AI Price Suggestion'}</span>
            </button>
          </div>

          {/* AI Valuation Suggestion Box */}
          {aiPriceSuggestion && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                  17-Feature Random Forest Valuation
                </span>
                <span className="text-xl font-extrabold text-emerald-950 mt-0.5 block">
                  Suggested Resale: ₹{aiPriceSuggestion.toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAskingPrice(String(aiPriceSuggestion))}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl self-start sm:self-auto"
              >
                Apply Suggested Price
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Asking Price (₹) *</label>
              <input
                type="number"
                placeholder="e.g. 45000"
                min="500"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Seller Location City *</label>
              <input
                type="text"
                placeholder="e.g. Bengaluru"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-600"
                required
              />
            </div>
          </div>
        </section>

        {/* SECTION 6: Selling Method & Auction Settings */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">6</span>
            <h3 className="font-bold text-slate-900 text-sm">Trading Mechanism</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Open Negotiation Option */}
            <div
              onClick={() => setSellingMethod('negotiation')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                sellingMethod === 'negotiation'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Handshake className={`w-4 h-4 ${sellingMethod === 'negotiation' ? 'text-emerald-700' : 'text-slate-500'}`} />
                <span className="font-bold text-xs text-slate-900">Open Negotiation</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Buyers can submit private offers. You receive instant rule-guided counteroffer advice.
              </p>
            </div>

            {/* Sealed Auction Option */}
            <div
              onClick={() => setSellingMethod('bidding')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                sellingMethod === 'bidding'
                  ? 'border-amber-600 bg-amber-50/70 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Gavel className={`w-4 h-4 ${sellingMethod === 'bidding' ? 'text-amber-700' : 'text-slate-500'}`} />
                <span className="font-bold text-xs text-slate-900">Sealed Bidding Auction</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Competitors cannot view each other's bids. The highest bid meeting your secret reserve wins.
              </p>
            </div>
          </div>

          {/* Conditional Method Settings */}
          {sellingMethod === 'negotiation' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Private Minimum Floor (₹) <span className="text-slate-400 font-normal">(Secret, never shown to buyers)</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 40000"
                value={minAcceptablePrice}
                onChange={(e) => setMinAcceptablePrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Starting Bid (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 35000"
                  value={startingBid}
                  onChange={(e) => setStartingBid(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Secret Reserve Floor (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 42000"
                  value={reservePrice}
                  onChange={(e) => setReservePrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Auction Duration</label>
                <select
                  value={auctionDays}
                  onChange={(e) => setAuctionDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value={1}>1 Day (Fast)</option>
                  <option value={3}>3 Days (Recommended)</option>
                  <option value={5}>5 Days</option>
                  <option value={7}>7 Days</option>
                </select>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 7: Title & Description */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">7</span>
            <h3 className="font-bold text-slate-900 text-sm">Listing Title & Overview</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Listing Title *</label>
            <input
              type="text"
              placeholder="e.g. Apple iPhone 14 (128GB) - Space Black (Mint Condition)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Detailed Description</label>
            <textarea
              rows={4}
              placeholder="Describe phone condition, reason for selling, accessories included, and pick-up options..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-600 leading-relaxed"
            />
          </div>
        </section>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl shadow-sm text-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Publishing Authenticated Listing...' : 'Publish Smartphone Listing'}
          </button>
        </div>
      </form>

      {/* Visual Condition Modal */}
      <AiConditionModal
        isOpen={showConditionModal}
        onClose={() => setShowConditionModal(false)}
        onConditionConfirmed={(c) => setCondition(c as ProductCondition)}
      />
    </div>
  );
};
