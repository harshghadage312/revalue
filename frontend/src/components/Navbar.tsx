import React, { useState, useEffect } from 'react';
import {
  Search, Heart, Bell, PlusCircle,
  LogOut, ChevronDown, Package, Handshake,
  Menu, X, Smartphone, ArrowRight, ShieldCheck, Sparkles, User as UserIcon
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
      setMobileMenuOpen(false);
    }
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
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3 sm:gap-6">
          {/* Left: Mobile Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-slate-700 hover:text-slate-900 rounded-lg"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => { onNavigate('landing'); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-2xs">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                  ReValue
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>

          {/* Desktop Search Bar (Center) */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search phones by brand or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs font-medium rounded-lg border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </form>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <button
              onClick={() => onNavigate('marketplace')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                currentPage === 'marketplace'
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Buy Phones
            </button>

            <button
              onClick={() => onNavigate('create-listing')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                currentPage === 'create-listing'
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Sell Your Phone
            </button>

            <button
              onClick={handleHowItWorksClick}
              className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              How It Works
            </button>

            <button
              onClick={onOpenValuator}
              className="px-2.5 py-1.5 rounded-lg text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100/70 border border-emerald-200/70 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Estimate Value</span>
            </button>
          </nav>

          {/* Right: Wishlist & User Account */}
          <div className="flex items-center gap-2">
            {/* Wishlist Link */}
            {isAuthenticated && (
              <button
                onClick={() => onNavigate('buyer-dashboard')}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative transition-colors"
                title="Saved Phones"
                aria-label="Saved Phones"
              >
                <Heart className="w-4 h-4 text-slate-600" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-600 text-white text-[9.5px] font-bold rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>
            )}

            {/* Notifications */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative transition-colors"
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
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50 animate-in fade-in">
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
                    <div className="max-h-60 overflow-y-auto space-y-1.5">
                      {notifications.length === 0 ? (
                        <div className="text-center py-5 text-xs text-slate-400">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            className={`p-2 rounded-lg text-xs ${
                              n.is_read ? 'bg-slate-50 text-slate-600' : 'bg-emerald-50 text-emerald-900 font-semibold'
                            }`}
                          >
                            <p className="line-clamp-2">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Account / Sign In */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-xs font-semibold text-slate-800 transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="max-w-[80px] sm:max-w-[120px] truncate">{user?.name || 'Account'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <span className="font-bold text-slate-900 block truncate">{user?.name}</span>
                      <span className="text-[10.5px] text-slate-500 block truncate">{user?.email}</span>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600">
                        {user?.role}
                      </span>
                    </div>

                    <button
                      onClick={() => { onNavigate('buyer-dashboard'); setShowUserMenu(false); }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span>My Purchases & Offers</span>
                    </button>

                    <button
                      onClick={() => { onNavigate('seller-dashboard'); setShowUserMenu(false); }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Handshake className="w-3.5 h-3.5 text-slate-400" />
                      <span>Seller Dashboard</span>
                    </button>

                    {user?.role === 'admin' && (
                      <button
                        onClick={() => { onNavigate('admin-dashboard'); setShowUserMenu(false); }}
                        className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span>Admin Dashboard</span>
                      </button>
                    )}

                    {/* Switch Persona for Testing */}
                    <div className="border-t border-slate-100 pt-1 mt-1 px-3 py-1.5">
                      <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-1">
                        Quick Persona Switch
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { quickLogin('seller'); setShowUserMenu(false); }}
                          className="flex-1 py-1 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-center"
                        >
                          Seller
                        </button>
                        <button
                          onClick={() => { quickLogin('buyer'); setShowUserMenu(false); }}
                          className="flex-1 py-1 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-center"
                        >
                          Buyer
                        </button>
                        <button
                          onClick={() => { quickLogin('admin'); setShowUserMenu(false); }}
                          className="flex-1 py-1 text-[10px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-center"
                        >
                          Admin
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); }}
                        className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Field (Persistent below header on mobile) */}
        <div className="md:hidden pb-3 pt-1">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search phones by brand or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 text-xs font-medium rounded-lg border border-slate-200 focus:bg-white focus:border-emerald-600 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </form>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 animate-in fade-in">
          <nav className="space-y-1 text-sm font-semibold text-slate-800">
            <button
              onClick={() => { onNavigate('marketplace'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between"
            >
              <span>Buy Phones</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => { onNavigate('create-listing'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-emerald-700 font-bold"
            >
              <span>Sell Your Phone</span>
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={handleHowItWorksClick}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between"
            >
              <span>How It Works</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => { onOpenValuator(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-emerald-800"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Estimate Phone Value</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            {isAuthenticated ? (
              <>
                <div className="pt-2 border-t border-slate-100" />
                <button
                  onClick={() => { onNavigate('buyer-dashboard'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 font-medium"
                >
                  My Orders & Offers
                </button>
                <button
                  onClick={() => { onNavigate('seller-dashboard'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 font-medium"
                >
                  Seller Dashboard
                </button>
              </>
            ) : (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}
                  className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-lg text-center"
                >
                  Sign In / Register
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
