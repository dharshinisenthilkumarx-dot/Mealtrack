import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { RoleSwitcher } from './components/RoleSwitcher';
import { Header } from './components/Header';
import { FoodMenu } from './components/CustomerView/FoodMenu';
import { LiveTracker } from './components/CustomerView/LiveTracker';
import { OrderHistory } from './components/CustomerView/OrderHistory';
import { CustomerAnalytics } from './components/CustomerView/CustomerAnalytics';
import { RestaurantDashboard } from './components/RestaurantView/RestaurantDashboard';
import { DeliveryDashboard } from './components/DeliveryView/DeliveryDashboard';
import { CartDrawer } from './components/CustomerView/CartDrawer';
import { AuthModal } from './components/AuthModal';
import { UserProfile } from './components/UserProfile';

function MainApp() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [trackedOrderId, setTrackedOrderId] = useState<string | undefined>(undefined);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  React.useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const handleOrderPlaced = (orderId: string) => {
    setTrackedOrderId(orderId);
    setCurrentTab('tracker');
  };

  const handleTrackOrder = (orderId: string) => {
    setTrackedOrderId(orderId);
    setCurrentTab('tracker');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col text-zinc-900 selection:bg-orange-500 selection:text-white">
      {/* Tier 2: Google Maps Quota Defense Banner */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm flex items-center justify-center gap-2">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
          <button
            type="button"
            onClick={() => setQuotaExceeded(false)}
            className="text-amber-700 hover:text-amber-950 text-xs font-bold ml-2 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Demo Role Switcher */}
      <RoleSwitcher />

      {/* Main App Navigation Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'tracker') {
            setTrackedOrderId(undefined);
          }
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Body Content */}
      <main className="flex-1 pb-16">
        {user?.role === 'restaurant' ? (
          /* Restaurant Dashboard Views */
          currentTab === 'menu' ? (
            <FoodMenu />
          ) : (
            <RestaurantDashboard />
          )
        ) : user?.role === 'delivery' ? (
          /* Delivery Partner Dashboard Views */
          <DeliveryDashboard />
        ) : (
          /* Customer Views */
          <>
            {currentTab === 'dashboard' && (
              <FoodMenu onOrderPlaced={handleOrderPlaced} />
            )}

            {currentTab === 'tracker' && (
              <LiveTracker
                orderId={trackedOrderId}
                onSelectOrder={(id) => setTrackedOrderId(id)}
                onBackToMenu={() => setCurrentTab('dashboard')}
              />
            )}

            {currentTab === 'history' && (
              <OrderHistory onTrackOrder={handleTrackOrder} />
            )}

            {currentTab === 'analytics' && (
              <CustomerAnalytics onTrackOrder={handleTrackOrder} />
            )}
          </>
        )}
      </main>

      {/* Slide-over Cart for Customers */}
      <CartDrawer onOrderPlaced={handleOrderPlaced} />

      {/* Authentication and Profile Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-8 px-4 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-zinc-900 font-display">Food Delivery Order Tracker</span>
            <span>·</span>
            <span>Real-Time Stage Telemetry & ETA Engine</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>Powered by SQLite & Express SSE</span>
            <span>·</span>
            <span>Zero Manual Refresh Required</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </AuthProvider>
  );
}
