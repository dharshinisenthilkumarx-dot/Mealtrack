import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { X, Trash2, Plus, Minus, ArrowRight, MapPin, Phone, MessageSquare, ShoppingBag } from 'lucide-react';

interface CartDrawerProps {
  onOrderPlaced: (orderId: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOrderPlaced }) => {
  const {
    cart,
    currentRestaurant,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    deliveryFee,
    tax,
    grandTotal,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const { user } = useAuth();

  const [address, setAddress] = useState(user?.address || '452 Elm Street, Apt 3B, Downtown');
  const [phone, setPhone] = useState(user?.phone || '+1 (555) 234-5678');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isCartOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRestaurant || cart.length === 0) return;
    if (!address.trim()) {
      setErrorMessage('Please provide a delivery address.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const itemsPayload = cart.map((c) => ({
        itemId: c.item.item_id,
        quantity: c.quantity,
      }));

      const res = await api.createOrder({
        customer_id: user?.id || 'usr_cust_1',
        restaurant_id: currentRestaurant.restaurant_id,
        items: itemsPayload,
        delivery_address: address,
        customer_phone: phone,
        notes: notes.trim() || undefined,
      });

      clearCart();
      setIsCartOpen(false);
      onOrderPlaced(res.order_id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-600" />
              <h2 className="text-base font-bold text-zinc-900 font-display">
                Your Delivery Basket
              </h2>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Contents */}
          {cart.length === 0 ? (
            <div className="flex-1 p-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-3">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-900">Your basket is empty</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                Explore our restaurants and add handcrafted dishes to begin live tracking.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Restaurant source header */}
              {currentRestaurant && (
                <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-200/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-500">Ordering from</span>
                    <div className="font-bold text-zinc-900">{currentRestaurant.restaurant_name}</div>
                  </div>
                  <span className="text-orange-700 font-mono text-[11px] font-medium">
                    ~{currentRestaurant.prep_time_minutes + currentRestaurant.pickup_time_minutes + currentRestaurant.travel_time_minutes}m ETA
                  </span>
                </div>
              )}

              {/* Items List */}
              <div className="divide-y divide-zinc-100">
                {cart.map((cartItem) => (
                  <div key={cartItem.item.item_id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-zinc-900 truncate">
                        {cartItem.item.item_name}
                      </h4>
                      <div className="text-[11px] text-zinc-500 font-mono tabular-nums">
                        ${cartItem.item.price.toFixed(2)} each
                      </div>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50">
                        <button
                          type="button"
                          onClick={() => updateQuantity(cartItem.item.item_id, -1)}
                          className="p-1 hover:bg-zinc-200 text-zinc-600 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-zinc-900 font-mono tabular-nums">
                          {cartItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(cartItem.item.item_id, 1)}
                          className="p-1 hover:bg-zinc-200 text-zinc-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-zinc-900 font-mono tabular-nums min-w-[50px] text-right">
                        ${(cartItem.item.price * cartItem.quantity).toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFromCart(cartItem.item.item_id)}
                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Details Form */}
              <div className="pt-4 border-t border-zinc-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Delivery Details
                </h3>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-orange-600" />
                    Delivery Street Address
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter street, apartment, suite..."
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-orange-600" />
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-orange-600" />
                    Dropoff Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Gate code #1234, leave by doorstep"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Price Calculation Breakdown */}
              <div className="pt-4 border-t border-zinc-200 space-y-1.5 text-xs text-zinc-600">
                <div className="flex justify-between">
                  <span>Food Subtotal</span>
                  <span className="font-mono tabular-nums text-zinc-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Standard Delivery Fee</span>
                  <span className="font-mono tabular-nums text-zinc-900">${deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Tax (8%)</span>
                  <span className="font-mono tabular-nums text-zinc-900">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-200 text-sm font-bold text-zinc-950">
                  <span>Total Amount</span>
                  <span className="font-mono tabular-nums text-orange-600">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  {errorMessage}
                </div>
              )}
            </div>
          )}

          {/* Checkout Footer Button */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-zinc-200 bg-zinc-50">
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Dispatching to Kitchen...</span>
                ) : (
                  <>
                    <span>Place Order & Track Live (${grandTotal.toFixed(2)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
