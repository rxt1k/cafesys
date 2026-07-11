import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, cn } from '@/lib/utils';
import { STORAGE_KEYS } from '@/lib/constants';
import { BottomSheet } from '@/components/ui/BottomSheet';
import toast from 'react-hot-toast';

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSheet({ isOpen, onClose }: CartSheetProps) {
  const { state, removeItem, updateQuantity, clearCart, subtotal, tax, total, totalItems } = useCart();
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const handlePlaceOrder = async () => {
    if (state.items.length === 0) return;

    const sessionId = state.sessionId || localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    const tableInfo = JSON.parse(localStorage.getItem(STORAGE_KEYS.TABLE_INFO) || '{}');
    const tableId = state.tableId || tableInfo.tableId;

    if (!sessionId || !tableId) {
      toast.error('Session expired. Please scan the QR code again.');
      return;
    }

    setPlacingOrder(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          session_id: sessionId,
          table_id: tableId,
          status: 'pending',
          special_instructions: specialInstructions || null,
          subtotal,
          tax_amount: tax,
          discount_amount: 0,
          total_amount: total,
          payment_status: 'unpaid',
          is_paid: false,
          request_waiter: false,
          request_water: false,
          request_bill: false,
        })
        .select()
        .single();

      if (orderError || !order) {
        throw new Error(orderError?.message || 'Failed to create order');
      }

      // Create order items
      const orderItemsData = state.items.map((item) => ({
        order_id: order.id,
        dish_id: item.dish.id,
        dish_name: item.dish.name,
        dish_price: item.dish.discounted_price ?? item.dish.price,
        quantity: item.quantity,
        subtotal: (item.dish.discounted_price ?? item.dish.price) * item.quantity,
        special_instructions: item.specialInstructions || null,
      }));

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)
        .select();

      if (itemsError) throw new Error(itemsError.message);

      // Create order item extras
      if (orderItems) {
        const extrasData: {
          order_item_id: string;
          extra_id: string;
          extra_name: string;
          extra_price: number;
          quantity: number;
        }[] = [];

        state.items.forEach((cartItem, idx) => {
          if (cartItem.selectedExtras.length > 0 && orderItems[idx]) {
            cartItem.selectedExtras.forEach((extra) => {
              extrasData.push({
                order_item_id: orderItems[idx].id,
                extra_id: extra.id,
                extra_name: extra.name,
                extra_price: extra.price,
                quantity: 1,
              });
            });
          }
        });

        if (extrasData.length > 0) {
          await supabase.from('order_item_extras').insert(extrasData);
        }
      }

      clearCart();
      setOrderPlaced(true);
      toast.success('Order placed successfully!');
      setTimeout(() => {
        setOrderPlaced(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Your Order" fullHeight>
      {orderPlaced ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center h-64 gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </motion.svg>
          </div>
          <div className="text-center">
            <h3 className="font-display text-xl font-semibold text-primary">Order Placed!</h3>
            <p className="text-secondary text-sm mt-1">We are preparing your order</p>
          </div>
        </motion.div>
      ) : state.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
            <svg className="w-7 h-7 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <p className="font-display text-lg font-semibold text-primary">Cart is empty</p>
          <p className="text-secondary text-sm">Browse the menu and add items to get started</p>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Items list */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
            <AnimatePresence>
              {state.items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-primary truncate">{item.dish.name}</p>
                      {item.selectedExtras.length > 0 && (
                        <p className="text-xs text-secondary mt-0.5">
                          + {item.selectedExtras.map((e) => e.name).join(', ')}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-xs text-secondary mt-0.5 italic">{item.specialInstructions}</p>
                      )}
                      <p className="text-xs font-semibold text-accent mt-1 tabular-nums">
                        {formatCurrency((item.dish.discounted_price ?? item.dish.price) * item.quantity)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center gap-1 border border-default rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-secondary hover:text-primary transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold text-primary w-6 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-secondary hover:text-primary transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Special instructions */}
            <div className="pt-1">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Order Notes</p>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requests for the kitchen?"
                rows={2}
                className="input-base resize-none text-sm"
              />
            </div>
          </div>

          {/* Bill summary */}
          <div className="flex-shrink-0 border-t border-default px-5 pt-3 pb-6">
            <button
              onClick={() => setShowBreakdown((v) => !v)}
              className="w-full flex items-center justify-between mb-2 text-secondary hover:text-primary transition-colors"
            >
              <span className="text-sm font-medium">Bill Summary</span>
              {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showBreakdown && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 py-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Subtotal ({totalItems} items)</span>
                      <span className="text-primary tabular-nums">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">GST (5%)</span>
                      <span className="text-primary tabular-nums">{formatCurrency(tax)}</span>
                    </div>
                  </div>
                  <div className="border-t border-default my-2" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-primary">Total</span>
              <span className="font-bold text-lg text-accent tabular-nums">{formatCurrency(total)}</span>
            </div>

            <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Payment will be collected at the table. You can pay by cash, UPI, or card.
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePlaceOrder}
              disabled={placingOrder || state.items.length === 0}
              className={cn(
                'w-full py-3.5 rounded-xl font-semibold text-white transition-all',
                placingOrder || state.items.length === 0
                  ? 'bg-stone-300 dark:bg-stone-600 cursor-not-allowed'
                  : 'bg-amber-700 dark:bg-amber-500 hover:bg-amber-800'
              )}
            >
              {placingOrder ? 'Placing Order...' : `Place Order - ${formatCurrency(total)}`}
            </motion.button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
