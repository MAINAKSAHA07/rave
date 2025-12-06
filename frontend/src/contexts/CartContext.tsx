'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface CartItem {
  eventId: string;
  eventName: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  price: number;
  currency: string;
  ticketTypeCategory?: 'GA' | 'TABLE';
  selectedSeats?: string[]; // For seated events
  selectedTables?: string[]; // For table events
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (eventId: string, ticketTypeId: string) => void;
  updateQuantity: (eventId: string, ticketTypeId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          setItems(JSON.parse(savedCart));
        } catch (error) {
          console.error('Failed to load cart from localStorage:', error);
        }
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items]);

  const addToCart = useCallback((item: CartItem) => {
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (i) => i.eventId === item.eventId && i.ticketTypeId === item.ticketTypeId
      );

      if (existingIndex >= 0) {
        // Update existing item
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity,
          selectedSeats: item.selectedSeats || updated[existingIndex].selectedSeats,
          selectedTables: item.selectedTables || updated[existingIndex].selectedTables,
        };
        return updated;
      } else {
        // Add new item
        return [...prevItems, item];
      }
    });
  }, []);

  const removeFromCart = useCallback((eventId: string, ticketTypeId: string) => {
    setItems((prevItems) =>
      prevItems.filter((item) => !(item.eventId === eventId && item.ticketTypeId === ticketTypeId))
    );
  }, []);

  const updateQuantity = useCallback((eventId: string, ticketTypeId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(eventId, ticketTypeId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.eventId === eventId && item.ticketTypeId === ticketTypeId
          ? { ...item, quantity }
          : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotalAmount = useCallback(() => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalAmount,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

