import React, { useState, useEffect } from 'react';
import {
  Search, Heart, Bell, PlusCircle,
  LogOut, ChevronDown, Package, Handshake,
  Menu, X, Smartphone, ArrowRight, ShieldCheck, Sparkles, HelpCircle, User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Notification } from '../types';

interface NavbarProps {
  onNavigate: (page: string, params?: any) => void;
  currentPage: string;
  onOpenValuator: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  currentPage,
  onOpenValuator,
  onOpenAuth,
}) => {
  const { user, isAuthenticated, logout, quickLogin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      api.getNotifications()
        .then(setNotifications)
        .catch(() => {});
      api.getWishlist()
        .then(items => setWishlistCount(items.length))
        .catch(() => {});
    } else {
      setWishlistCount(0);
      setNotifications([]);
    }
  }, [isAuthenticated]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('marketplace', { query: searchQuery.trim() });
      setMobileSearchOpen(false);
      setMobileMenuOpen(false);
    }
  };

  const handleBrandClick = (brandName: string) => {
    onNavigate('marketplace', { brand: brandName });
    setMobileMenuOpen(false);
  };

  const handleHowItWorksClick = () => {
    if (currentPage !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        const el = document.getElementById('how-it-works');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById('how-it-works');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      {/* Announcement Strip */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-medium text-slate-200">
              Find your next phone for less.
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              Transparent condition ratings & realistic resale estimates
            </span>
          </div>

          {/* Quick Demo Persona Switcher (Convenient testing) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Demo:</span>
            <button
              onClick={() => quickLogin('seller')}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 transition-colors"
              title="Sign in as Seller persona"
            >
              Seller Demo
            </button>
            <button
              onClick={() => quickLogin('buyer')}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Sign in as Buyer persona"
            >
              Buyer Demo
            </button>
            <button
              onClick={() => quickLogin('admin')}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
              title="Sign in as Admin persona"
            >
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => { onNavigate('landing'); setMobileMenuOpen(false); }}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-sm group-hover:bg-slate-800 transition-colors">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  ReValue
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <span className="text-[9.5px] block font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Pre-Owned Smartphone Marketplace
              </span>
            </div>
          </div>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search phones by brand or model"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs font-medium rounded-xl border border-slate-200/90 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </form>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => onNavigate('marketplace')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                currentPage === 'marketplace'
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              Browse Phones
            </button>

            <button
              onClick={handleHowItWorksClick}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-colors"
            >
              How It Works
            </button>

            <button
              onClick={onOpenValuator}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-lg transition-colors ml-1"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Estimate Value</span>
            </button>
          </nav>

          {/* Action Buttons & Profile */}
          <div className="flex items-center gap-2">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Search phones"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist Link (if authenticated) */}
            {isAuthenticated && (
              <button
                onClick={() => onNavigate('buyer-dashboard')}
                className="hidden sm:flex items-center gap-1 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition-colors"
                title="Saved Phones"
                aria-label="Saved Phones"
              >
                <Heart className="w-4 h-4 text-slate-600" />
                {wishlistCount > 0 && (
                  <span className="w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>
            )}

            {/* Notifications Dropdown */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition-colors"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Notifications ({notifications.length})
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1.5">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            className={`p-2.5 rounded-xl text-xs transition-colors ${
                              n.is_read
                                ? 'bg-slate-50 text-slate-600'
                                : 'bg-emerald-50/70 text-emerald-950 border border-emerald-100'
                            }`}
                          >
                            <div className="font-bold text-[11px]">{n.title}</div>
                            <div className="text-[10px] mt-0.5 text-slate-500">{n.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sell Phone Primary Action */}
            <button
              onClick={() => { onNavigate('create-listing'); setMobileMenuOpen(false); }}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Sell Your Phone</span>
            </button>

            {/* Authenticated User Menu or Sign In */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 pl-2 pr-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-slate-900 text-emerald-400 text-xs font-bold flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 hidden sm:inline max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <div className="font-bold text-xs text-slate-900 truncate">{user.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                      <div className="inline-block mt-1 px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {user.role}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => { onNavigate('buyer-dashboard'); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <span>Buyer Dashboard</span>
                      </button>

                      <button
                        onClick={() => { onNavigate('seller-dashboard'); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Handshake className="w-3.5 h-3.5 text-slate-400" />
                        <span>Seller Dashboard</span>
                      </button>

                      {user.role === 'admin' && (
                        <button
                          onClick={() => { onNavigate('admin-dashboard'); setShowUserMenu(false); }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          <span>Admin Control</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 sm:py-2 text-xs font-bold text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all"
              >
                Sign In
              </button>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Input Drawer */}
        {mobileSearchOpen && (
          <div className="md:hidden py-3 border-t border-slate-100 animate-in fade-in">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search phones by brand or model"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 text-xs font-medium rounded-xl border border-slate-200 outline-none"
                autoFocus
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </form>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-100 space-y-3 animate-in fade-in">
            <div className="space-y-1">
              <button
                onClick={() => { onNavigate('marketplace'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 rounded-lg flex items-center justify-between"
              >
                <span>Browse All Phones</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => { onNavigate('create-listing'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center justify-between"
              >
                <span>Sell Your Phone</span>
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              </button>
              <button
                onClick={() => { onOpenValuator(); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 rounded-lg flex items-center justify-between"
              >
                <span>Estimate Resale Value</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              </button>
              <button
                onClick={handleHowItWorksClick}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 rounded-lg flex items-center justify-between"
              >
                <span>How It Works</span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Popular Brand Shortcuts in Mobile Menu */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 px-3 tracking-wider block mb-1.5">
                Popular Brands
              </span>
              <div className="flex flex-wrap gap-1 px-3">
                {['Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi'].map((b) => (
                  <button
                    key={b}
                    onClick={() => handleBrandClick(b)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Demo Personas in Mobile Menu */}
            <div className="pt-2 border-t border-slate-100 px-3 flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-semibold">Test Persona:</span>
              <button
                onClick={() => { quickLogin('seller'); setMobileMenuOpen(false); }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700"
              >
                Seller
              </button>
              <button
                onClick={() => { quickLogin('buyer'); setMobileMenuOpen(false); }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700"
              >
                Buyer
              </button>
              <button
                onClick={() => { quickLogin('admin'); setMobileMenuOpen(false); }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-amber-700"
              >
                Admin
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
