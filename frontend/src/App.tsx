import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CreateListingPage } from './pages/CreateListingPage';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { SellerDashboard } from './pages/SellerDashboard';
import { CheckoutPage } from './pages/CheckoutPage';
import { DeliveryTrackingPage } from './pages/DeliveryTrackingPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AiPriceValuatorModal } from './components/AiPriceValuatorModal';
import { AuthModal } from './components/AuthModal';

export const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [pageParams, setPageParams] = useState<any>({});
  const [showValuator, setShowValuator] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Sync with browser hash if present
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') || 'landing';
      const [page, queryString] = hash.split('?');
      setCurrentPage(page);
      if (queryString) {
        const params = Object.fromEntries(new URLSearchParams(queryString));
        setPageParams(params);
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigate = (page: string, params: any = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    const query = new URLSearchParams(params).toString();
    window.location.hash = query ? `${page}?${query}` : page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Navbar
        onNavigate={navigate}
        currentPage={currentPage}
        onOpenValuator={() => setShowValuator(true)}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      <main className="flex-1">
        {currentPage === 'landing' && (
          <LandingPage
            onNavigate={navigate}
            onOpenValuator={() => setShowValuator(true)}
          />
        )}

        {currentPage === 'marketplace' && (
          <MarketplacePage
            onNavigate={navigate}
            initialQuery={pageParams.query || ''}
          />
        )}

        {currentPage === 'product-detail' && (
          <ProductDetailPage
            productId={pageParams.id}
            onNavigate={navigate}
            onOpenAuth={() => setShowAuthModal(true)}
            onOpenValuator={() => setShowValuator(true)}
          />
        )}

        {currentPage === 'create-listing' && (
          <CreateListingPage
            onNavigate={navigate}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}

        {currentPage === 'buyer-dashboard' && (
          <BuyerDashboard
            onNavigate={navigate}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}

        {currentPage === 'seller-dashboard' && (
          <SellerDashboard
            onNavigate={navigate}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}

        {currentPage === 'checkout' && (
          <CheckoutPage
            productId={pageParams.productId}
            source={pageParams.source}
            offerId={pageParams.offerId}
            auctionId={pageParams.auctionId}
            orderId={pageParams.orderId}
            onNavigate={navigate}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}

        {currentPage === 'delivery-tracking' && (
          <DeliveryTrackingPage
            orderId={pageParams.orderId}
            onNavigate={navigate}
          />
        )}

        {currentPage === 'admin-dashboard' && (
          <AdminDashboard
            onNavigate={navigate}
          />
        )}
      </main>

      <Footer />

      {/* Global Modals */}
      <AiPriceValuatorModal
        isOpen={showValuator}
        onClose={() => setShowValuator(false)}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
