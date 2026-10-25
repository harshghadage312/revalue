import React, { useState } from 'react';
import { X, Camera, ShieldAlert, CheckCircle, AlertTriangle, Sparkles, Upload } from 'lucide-react';
import { api } from '../services/api';
import { MobileCondition } from '../types';

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95">
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
              MobileNetV2 Visual Condition AI
            </h2>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold tracking-wider">
              Objective Cosmetic Wear Analysis
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Upload a clear photograph of the smartphone to assess exterior physical wear (scratches, glass integrity, casing scuffs).
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
                <span className="text-xs font-bold text-slate-800 block">Click to select phone photo</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">JPEG, PNG or WebP up to 5MB</span>
              </div>
            )}
          </label>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!selectedFile || loading}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-40"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Assess Visual Condition</span>
            </>
          )}
        </button>

        {/* Result Card */}
        {result && (
          <div className="mt-5">
            {result.is_model_available && result.predicted_condition ? (
              /* Successful Inference Card */
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div>
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                      Assessed Cosmetic Tier
                    </span>
                    {result.confidence_score !== undefined && result.confidence_score !== null && (
                      <span className="text-xs text-slate-600 font-semibold">
                        {Math.round(result.confidence_score * 100)}% Confidence
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-lg bg-emerald-600 text-white shadow-xs">
                    {result.predicted_condition}
                  </span>
                </div>

                {/* Class Probabilities Breakdown */}
                {result.class_probabilities && Object.keys(result.class_probabilities).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Model Class Probabilities Breakdown
                    </span>
                    {Object.entries(result.class_probabilities).map(([cls, prob]) => (
                      <div key={cls} className="flex items-center justify-between text-xs">
                        <span className="capitalize text-slate-700 font-medium">{cls}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-28 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full"
                              style={{ width: `${Math.round(prob * 100)}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-900 w-8 text-right text-[11px]">
                            {Math.round(prob * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Physical Inspection Disclaimer */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{result.disclaimer}</span>
                </div>

                {onConditionConfirmed && (
                  <button
                    onClick={() => {
                      onConditionConfirmed(result.predicted_condition!);
                      onClose();
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                  >
                    Apply Assessed Condition ({result.predicted_condition}) to Listing
                  </button>
                )}
              </div>
            ) : (
              /* Honest Model Unavailable Card */
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Visual Condition AI Model Unavailable
                    </h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      {result.error_message || 'A trained 4-class MobileNetV2 model artifact has not been deployed to the server.'}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 pt-1">
                  Please manually select the condition tier (Excellent, Good, Bad, Defective) in the listing form.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
