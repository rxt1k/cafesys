import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { CartItem, CartExtra, Dish } from '@/lib/types';
import { STORAGE_KEYS } from '@/lib/constants';

interface CartState {
  items: CartItem[];
  sessionId: string | null;
  tableId: string | null;
  tableNumber: number | null;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { dish: Dish; quantity: number; selectedExtras: CartExtra[]; specialInstructions: string } }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'UPDATE_INSTRUCTIONS'; payload: { id: string; instructions: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_SESSION'; payload: { sessionId: string; tableId: string; tableNumber: number } }
  | { type: 'LOAD_CART'; payload: CartState };

const initialState: CartState = {
  items: [],
  sessionId: null,
  tableId: null,
  tableNumber: null,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { dish, quantity, selectedExtras, specialInstructions } = action.payload;
      const existingIndex = state.items.findIndex(
        (item) =>
          item.dish.id === dish.id &&
          JSON.stringify(item.selectedExtras.map((e) => e.id).sort()) ===
            JSON.stringify(selectedExtras.map((e) => e.id).sort()) &&
          item.specialInstructions === specialInstructions
      );

      if (existingIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + quantity,
        };
        return { ...state, items: newItems };
      }

      return {
        ...state,
        items: [
          ...state.items,
          {
            id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            dish,
            quantity,
            selectedExtras,
            specialInstructions,
          },
        ],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload.id),
      };
    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((item) => item.id !== id),
        };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === id ? { ...item, quantity } : item
        ),
      };
    }
    case 'UPDATE_INSTRUCTIONS':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, specialInstructions: action.payload.instructions }
            : item
        ),
      };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'SET_SESSION':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        tableId: action.payload.tableId,
        tableNumber: action.payload.tableNumber,
      };
    case 'LOAD_CART':
      return action.payload;
    default:
      return state;
  }
}

interface CartContextType {
  state: CartState;
  addItem: (dish: Dish, quantity: number, selectedExtras: CartExtra[], specialInstructions: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateInstructions: (id: string, instructions: string) => void;
  clearCart: () => void;
  setSession: (sessionId: string, tableId: string, tableNumber: number) => void;
  totalItems: number;
  subtotal: number;
  tax: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CART);
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_CART', payload: parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(state));
  }, [state]);

  const addItem = (
    dish: Dish,
    quantity: number,
    selectedExtras: CartExtra[],
    specialInstructions: string
  ) => {
    dispatch({ type: 'ADD_ITEM', payload: { dish, quantity, selectedExtras, specialInstructions } });
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
  };

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const updateInstructions = (id: string, instructions: string) => {
    dispatch({ type: 'UPDATE_INSTRUCTIONS', payload: { id, instructions } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const setSession = (sessionId: string, tableId: string, tableNumber: number) => {
    dispatch({ type: 'SET_SESSION', payload: { sessionId, tableId, tableNumber } });
  };

  const subtotal = state.items.reduce((sum, item) => {
    const extrasTotal = item.selectedExtras.reduce((eSum, e) => eSum + e.price, 0);
    return sum + (item.dish.discounted_price ?? item.dish.price + extrasTotal) * item.quantity;
  }, 0);

  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        updateInstructions,
        clearCart,
        setSession,
        totalItems,
        subtotal,
        tax,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
