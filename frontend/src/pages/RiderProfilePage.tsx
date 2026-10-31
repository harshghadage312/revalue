import React, { useState, useEffect } from 'react';
import {
  User, Bike, ShieldCheck, MapPin, Phone,
  Mail, Award, AlertCircle, ArrowLeft, RotateCw
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RiderProfile } from '../types';

interface RiderProfilePageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth?: () => void;
}

export const RiderProfilePage: React.FC<RiderProfilePageProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRiderProfile();
      setProfile(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
          <User className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Partner Profile</h2>
          <p className="text-xs text-slate-600 mb-6">
            Please log in with your delivery partner account to access your profile.
          </p>
          <button
            onClick={() => onOpenAuth ? onOpenAuth() : onNavigate('landing')}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <RotateCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading partner profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Profile Found</h2>
          <button
            onClick={() => onNavigate('delivery-partner-signup')}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
          >
            Apply to Become a Partner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 pb-20">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('rider-dashboard')}
              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Delivery Partner Profile</h1>
              <p className="text-xs text-slate-500">ID: {profile.id}</p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
            profile.application_status === 'approved'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            {profile.application_status.replace(/_/g, ' ')}
          </span>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-lg flex items-center justify-center">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{profile.name}</h2>
              <p className="text-xs text-slate-500">{profile.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-semibold text-slate-700">⭐ {profile.rating.toFixed(1)} Partner Rating</span>
                <span>•</span>
                <span className="text-[11px] text-emerald-600 font-bold">{profile.successful_deliveries} Delivered</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Phone</span>
              <span className="font-semibold text-slate-900">{profile.phone}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Operating City</span>
              <span className="font-semibold text-slate-900">{profile.city}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehicle Details</span>
              <span className="font-semibold text-slate-900 capitalize">
                {profile.vehicle_type.replace(/_/g, ' ')} ({profile.vehicle_registration_number})
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Driving License Number</span>
              <span className="font-semibold text-slate-900">{profile.driving_license_number}</span>
            </div>

            <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Covered Delivery PIN Codes</span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {profile.service_pincodes.map((pin) => (
                  <span
                    key={pin}
                    className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md font-mono text-[11px]"
                  >
                    {pin}
                  </span>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl space-y-0.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Emergency Contact</span>
              <span className="font-semibold text-slate-900">
                {profile.emergency_contact?.name} ({profile.emergency_contact?.relationship}) • {profile.emergency_contact?.phone}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
