import React, { createContext, useContext, useState, useEffect } from 'react';
import { FoodItem, CartItem, Restaurant } from '../types';

interface CartContextType {
  cart: CartItem[];
  currentRestaurant: Restaurant | null;
  addToCart: (item: FoodItem, restaurant: Restaurant) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  totalItemsCount: number;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  grandTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('food_tracker_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(() => {
    try {
      const saved = localStorage.getItem('food_tracker_cart_rest');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('food_tracker_cart', JSON.stringify(cart));
    if (currentRestaurant) {
      localStorage.setItem('food_tracker_cart_rest', JSON.stringify(currentRestaurant));
    } else {
      localStorage.removeItem('food_tracker_cart_rest');
    }
  }, [cart, currentRestaurant]);

  const addToCart = (item: FoodItem, restaurant: Restaurant) => {
    // If cart has items from another restaurant, reset cart to new restaurant
    if (currentRestaurant && currentRestaurant.restaurant_id !== restaurant.restaurant_id && cart.length > 0) {
      if (!window.confirm(`Your cart contains items from ${currentRestaurant.restaurant_name}. Starting an order from ${restaurant.restaurant_name} will clear your current cart. Proceed?`)) {
        return;
      }
      setCart([{ item, quantity: 1 }]);
      setCurrentRestaurant(restaurant);
      setIsCartOpen(true);
      return;
    }

    setCurrentRestaurant(restaurant);
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.item.item_id === item.item_id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { item, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const next = prev.filter((c) => c.item.item_id !== itemId);
      if (next.length === 0) {
        setCurrentRestaurant(null);
      }
      return next;
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const next = prev
        .map((c) => {
          if (c.item.item_id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];

      if (next.length === 0) {
        setCurrentRestaurant(null);
      }
      return next;
    });
  };

  const clearCart = () => {
    setCart([]);
    setCurrentRestaurant(null);
  };

  const totalItemsCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = Math.round(cart.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0) * 100) / 100;
  const deliveryFee = cart.length > 0 ? 3.99 : 0;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const grandTotal = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

  return (
    <CartContext.Provider
      value={{
        cart,
        currentRestaurant,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItemsCount,
        subtotal,
        deliveryFee,
        tax,
        grandTotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
