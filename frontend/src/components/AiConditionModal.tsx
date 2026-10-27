import React, { useState } from 'react';
import { X, Camera, AlertTriangle, Upload, Check } from 'lucide-react';
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
      setError(err.message || 'Unable to analyze image. Please ensure a clear photo of the phone.');
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 my-6 text-xs">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1.5">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Phone Condition Check
            </h2>
          </div>
        </div>

        <p className="text-slate-500 mb-4 leading-relaxed">
          Upload a clear photo of the phone screen or back casing to evaluate exterior wear.
        </p>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Dropzone */}
        <div className="mb-3">
          <label className="border-2 border-dashed border-slate-200 hover:border-emerald-600 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            {previewUrl ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-100">
                <img src={previewUrl} alt="Phone preview" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="text-center py-2">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <span className="font-bold text-slate-700 block">Choose device photo</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">JPEG, PNG, WebP up to 5MB</span>
              </div>
            )}
          </label>
        </div>

        {selectedFile && !result && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Checking condition...</span>
              </>
            ) : (
              <span>Check Condition</span>
            )}
          </button>
        )}

        {/* Result Card */}
        {result && (
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Estimated Condition
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 block">
                    {getConditionMeta(result.predicted_condition).label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Match Confidence
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    {Math.round(result.confidence_score * 100)}%
                  </span>
                </div>
              </div>

              {result.class_probabilities && (
                <div className="space-y-1 pt-1.5 border-t border-slate-200/60 text-[10.5px]">
                  {Object.entries(result.class_probabilities).map(([cKey, prob]) => {
                    const meta = getConditionMeta(cKey);
                    const pct = Math.round((prob as number) * 100);
                    return (
                      <div key={cKey} className="space-y-0.5">
                        <div className="flex justify-between text-slate-600">
                          <span>{meta.label}</span>
                          <span className="font-semibold text-slate-800">{pct}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
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
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Condition</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
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
