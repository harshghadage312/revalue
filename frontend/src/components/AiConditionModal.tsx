import React, { useState } from 'react';
import { X, Camera, ShieldAlert, CheckCircle, AlertTriangle, Sparkles, Upload, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { MobileCondition } from '../types';
import { getConditionMeta } from '../utils/formatters';

interface AiConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConditionConfirmed?: (condition: string) => void;
}

export const AiConditionModal: React.FC<AiConditionModalProps> = ({
  isOpen,
  onClose,
  onConditionConfirmed,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MobileCondition | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.assessCondition(selectedFile);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze phone image.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (conditionKey: string) => {
    if (onConditionConfirmed) {
      onConditionConfirmed(conditionKey);
    }
    onClose();
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
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Phone Condition Check
            </h2>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold tracking-wider">
              Instant Exterior Cosmetic Analysis
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Upload a clear photograph of your smartphone to automatically check exterior physical condition (glass integrity, scratches, and casing scuffs).
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Dropzone */}
        <div className="mb-4">
          <label className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            {previewUrl ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="text-center py-2">
                <Upload className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                <span className="text-xs font-bold text-slate-700 block">Choose device photo</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">JPEG, PNG, or WebP up to 5MB</span>
              </div>
            )}
          </label>
        </div>

        {selectedFile && !result && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Checking device condition...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Condition Check</span>
              </>
            )}
          </button>
        )}

        {/* Result Card */}
        {result && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Assessed Condition
                  </span>
                  <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                    {getConditionMeta(result.predicted_condition).label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Confidence
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    {Math.round(result.confidence_score * 100)}%
                  </span>
                </div>
              </div>

              {/* Class probabilities */}
              {result.class_probabilities && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-[11px]">
                  {Object.entries(result.class_probabilities).map(([cKey, prob]) => {
                    const meta = getConditionMeta(cKey);
                    const pct = Math.round((prob as number) * 100);
                    return (
                      <div key={cKey} className="space-y-0.5">
                        <div className="flex justify-between text-slate-600">
                          <span>{meta.label}</span>
                          <span className="font-semibold text-slate-800">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cKey === result.predicted_condition ? 'bg-emerald-600' : 'bg-slate-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleApply(result.predicted_condition)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Apply Assessed Condition
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
