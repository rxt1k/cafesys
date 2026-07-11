import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Bell, Droplets, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Order } from '@/lib/types';
import { STORAGE_KEYS, ORDER_STATUS_STEPS } from '@/lib/constants';
import { formatCurrency, formatTime, getOrderStatusLabel, cn } from '@/lib/utils';
import { BottomSheet } from '@/components/ui/BottomSheet';
import toast from 'react-hot-toast';

interface OrderTrackingSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderTrackingSheet({ isOpen, onClose }: OrderTrackingSheetProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchOrders();

    const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) return;

    const channel = supabase
      .channel('customer-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  async function fetchOrders() {
    const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, order_item_extras(*))')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
      // Auto-expand latest active order
      const active = data.find((o) => !['completed', 'cancelled'].includes(o.status));
      if (active && !expandedOrder) {
        setExpandedOrder(active.id);
      }
    }
    setLoading(false);
  }

  const handleRequest = async (orderId: string, type: 'waiter' | 'water' | 'bill') => {
    const fieldMap = {
      waiter: 'request_waiter',
      water: 'request_water',
      bill: 'request_bill',
    };

    await supabase
      .from('orders')
      .update({ [fieldMap[type]]: true })
      .eq('id', orderId);

    toast.success(`${type === 'waiter' ? 'Waiter' : type === 'water' ? 'Water' : 'Bill'} requested`);
  };

  const activeOrders = orders.filter((o) => !['completed', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter((o) => ['completed', 'cancelled'].includes(o.status));

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Order Status" fullHeight>
      {loading ? (
        <div className="p-5 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
            <Clock className="w-6 h-6 text-secondary" />
          </div>
          <p className="font-display text-lg font-semibold text-primary">No orders yet</p>
          <p className="text-secondary text-sm">Place an order from the menu to get started</p>
        </div>
      ) : (
        <div className="px-5 py-3 space-y-4">
          {activeOrders.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Active Orders</p>
              {activeOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  expanded={expandedOrder === order.id}
                  onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  onRequest={handleRequest}
                />
              ))}
            </div>
          )}

          {pastOrders.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Past Orders</p>
              {pastOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  expanded={expandedOrder === order.id}
                  onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  onRequest={handleRequest}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

function OrderCard({
  order,
  expanded,
  onToggle,
  onRequest,
}: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onRequest: (id: string, type: 'waiter' | 'water' | 'bill') => void;
}) {
  const isActive = !['completed', 'cancelled'].includes(order.status);
  const currentStepIndex = ORDER_STATUS_STEPS.indexOf(order.status as typeof ORDER_STATUS_STEPS[number]);

  const statusColors: Record<string, string> = {
    pending: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
    confirmed: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
    preparing: 'border-purple-400 bg-purple-50 dark:bg-purple-900/20',
    ready: 'border-green-400 bg-green-50 dark:bg-green-900/20',
    served: 'border-teal-400 bg-teal-50 dark:bg-teal-900/20',
    completed: 'border-stone-300 bg-stone-50 dark:bg-stone-800',
    cancelled: 'border-red-300 bg-red-50 dark:bg-red-900/20',
  };

  const dotColors: Record<string, string> = {
    pending: 'bg-amber-400',
    confirmed: 'bg-blue-400',
    preparing: 'bg-purple-400',
    ready: 'bg-green-400',
    served: 'bg-teal-400',
    completed: 'bg-stone-400',
    cancelled: 'bg-red-400',
  };

  return (
    <div className={cn('rounded-2xl border-l-4 overflow-hidden', statusColors[order.status] || 'border-stone-300')}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          {isActive && (
            <span className={cn('w-2 h-2 rounded-full pulse-dot flex-shrink-0', dotColors[order.status])} />
          )}
          <div className="text-left">
            <p className="text-sm font-semibold text-primary">{order.order_number}</p>
            <p className="text-xs text-secondary">{formatTime(order.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-bold text-accent tabular-nums">{formatCurrency(order.total_amount)}</p>
            <p className="text-xs text-secondary capitalize">{getOrderStatusLabel(order.status)}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Status timeline */}
              {order.status !== 'cancelled' && (
                <div className="flex items-center justify-between">
                  {ORDER_STATUS_STEPS.map((step, idx) => {
                    const isCompleted = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const isFuture = idx > currentStepIndex;
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                              isCompleted ? 'bg-green-500 text-white' :
                              isCurrent ? `${dotColors[step]} text-white` :
                              'bg-stone-200 dark:bg-stone-700 text-secondary'
                            )}
                          >
                            {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                          </div>
                          <span className={cn(
                            'text-[9px] mt-1 text-center capitalize leading-tight',
                            isCurrent ? 'text-primary font-semibold' : 'text-secondary',
                            isFuture && 'opacity-50'
                          )}>
                            {step === 'pending' ? 'Received' : step}
                          </span>
                        </div>
                        {idx < ORDER_STATUS_STEPS.length - 1 && (
                          <div className={cn(
                            'flex-1 h-0.5 mx-1',
                            isCompleted ? 'bg-green-400' : 'bg-stone-200 dark:bg-stone-700'
                          )} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Items */}
              <div className="space-y-1.5">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-primary">{item.quantity}x {item.dish_name}</span>
                    <span className="text-secondary tabular-nums">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Request buttons - only for active orders */}
              {isActive && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onRequest(order.id, 'waiter')}
                    disabled={order.request_waiter}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all',
                      order.request_waiter
                        ? 'bg-stone-100 dark:bg-stone-800 text-secondary border-default cursor-not-allowed'
                        : 'border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                    )}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {order.request_waiter ? 'Requested' : 'Call Waiter'}
                  </button>
                  <button
                    onClick={() => onRequest(order.id, 'water')}
                    disabled={order.request_water}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all',
                      order.request_water
                        ? 'bg-stone-100 dark:bg-stone-800 text-secondary border-default cursor-not-allowed'
                        : 'border-blue-300 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    )}
                  >
                    <Droplets className="w-3.5 h-3.5" />
                    {order.request_water ? 'Requested' : 'Water'}
                  </button>
                  <button
                    onClick={() => onRequest(order.id, 'bill')}
                    disabled={order.request_bill}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all',
                      order.request_bill
                        ? 'bg-stone-100 dark:bg-stone-800 text-secondary border-default cursor-not-allowed'
                        : 'border-green-300 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                    )}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    {order.request_bill ? 'Requested' : 'Bill'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
