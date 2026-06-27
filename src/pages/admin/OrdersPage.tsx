import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, Printer, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, PaymentMethod } from '@/lib/types';
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel, getPaymentStatusColor, cn } from '@/lib/utils';
import { OrderCardSkeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'] as const;
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus | null> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'served',
  served: 'completed',
  completed: null,
  cancelled: null,
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [markingPaid, setMarkingPaid] = useState(false);
  const billRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({ contentRef: billRef });

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('orders-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, order_item_extras(*)), table:tables(table_number, table_name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) setOrders(data as Order[]);
    setLoading(false);
  }

  async function updateStatus(orderId: string, newStatus: OrderStatus) {
    const timestamp: Record<OrderStatus, string> = {
      confirmed: 'confirmed_at',
      preparing: 'prepared_at',
      ready: 'ready_at',
      served: 'served_at',
      completed: 'completed_at',
      cancelled: 'cancelled_at',
      pending: '',
    };

    const updateData: Record<string, string | OrderStatus> = { status: newStatus };
    if (timestamp[newStatus]) {
      updateData[timestamp[newStatus]] = new Date().toISOString();
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Order marked as ${getOrderStatusLabel(newStatus)}`);
      fetchOrders();
    }
  }

  async function cancelOrder(orderId: string) {
    await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', orderId);
    toast.success('Order cancelled');
    fetchOrders();
  }

  async function markPaid(order: Order) {
    setMarkingPaid(true);
    try {
      await supabase
        .from('orders')
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          payment_status: 'paid',
          payment_method: paymentMethod,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Create payment record
      await supabase.from('payments').insert({
        order_id: order.id,
        amount: order.total_amount,
        method: paymentMethod,
        status: 'paid',
        paid_at: new Date().toISOString(),
      });

      // Reset table if session completed
      if (order.table_id) {
        await supabase.rpc('reset_table', { p_table_id: order.table_id });
      }

      toast.success('Order marked as paid');
      setBillOrder(null);
      fetchOrders();
    } catch {
      toast.error('Failed to mark as paid');
    } finally {
      setMarkingPaid(false);
    }
  }

  async function bulkUpdateStatus(status: OrderStatus) {
    await Promise.all(
      selectedOrders.map((id) =>
        supabase.from('orders').update({ status }).eq('id', id)
      )
    );
    toast.success(`${selectedOrders.length} orders updated`);
    setSelectedOrders([]);
    fetchOrders();
  }

  const filtered = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String((o.table as unknown as { table_number: number })?.table_number).includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-primary">Orders</h1>
        <div className="flex items-center gap-2">
          {selectedOrders.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">{selectedOrders.length} selected</span>
              <Button size="sm" variant="secondary" onClick={() => bulkUpdateStatus('confirmed')}>
                Confirm All
              </Button>
              <Button size="sm" variant="secondary" onClick={() => bulkUpdateStatus('preparing')}>
                Mark Preparing
              </Button>
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={fetchOrders}
            className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary border border-default rounded-xl px-3 py-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
          <input
            type="text"
            placeholder="Search by order number or table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize flex items-center gap-1.5',
                statusFilter === s
                  ? 'bg-amber-700 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-secondary hover:text-primary'
              )}
            >
              {s === 'all' ? 'All' : getOrderStatusLabel(s as OrderStatus)}
              {s !== 'all' && statusCounts[s] ? (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-md text-[10px] font-bold',
                  statusFilter === s ? 'bg-white/20' : 'bg-stone-200 dark:bg-stone-700'
                )}>
                  {statusCounts[s]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <OrderCardSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="bg-surface rounded-2xl p-10 text-center shadow-card">
            <p className="text-secondary">No orders found</p>
          </div>
        ) : (
          filtered.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-surface rounded-2xl shadow-card overflow-hidden"
              style={{ borderLeft: `3px solid ${getOrderStatusColor(order.status)}` }}
            >
              {/* Order header */}
              <div className="flex items-center gap-3 p-4">
                <input
                  type="checkbox"
                  checked={selectedOrders.includes(order.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedOrders((prev) => [...prev, order.id]);
                    else setSelectedOrders((prev) => prev.filter((id) => id !== order.id));
                  }}
                  className="rounded border-stone-300"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-primary">{order.order_number}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${getOrderStatusColor(order.status)}20`,
                        color: getOrderStatusColor(order.status),
                      }}
                    >
                      {getOrderStatusLabel(order.status)}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${getPaymentStatusColor(order.payment_status)}20`,
                        color: getPaymentStatusColor(order.payment_status),
                      }}
                    >
                      {order.payment_status}
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    Table {(order.table as unknown as { table_number: number })?.table_number} &bull; {formatDateTime(order.created_at)}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-primary tabular-nums">{formatCurrency(order.total_amount)}</p>
                  <p className="text-xs text-secondary">{order.order_items?.length || 0} items</p>
                </div>

                <button
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  className="text-secondary hover:text-primary ml-1"
                >
                  {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {expandedOrder === order.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-default"
                  >
                    <div className="p-4 space-y-4">
                      {/* Items */}
                      <div>
                        <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Order Items</p>
                        <div className="space-y-1.5">
                          {order.order_items?.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <div>
                                <span className="text-primary">{item.quantity}x {item.dish_name}</span>
                                {item.order_item_extras && item.order_item_extras.length > 0 && (
                                  <p className="text-xs text-secondary">
                                    + {item.order_item_extras.map((e) => e.extra_name).join(', ')}
                                  </p>
                                )}
                                {item.special_instructions && (
                                  <p className="text-xs text-secondary italic">{item.special_instructions}</p>
                                )}
                              </div>
                              <span className="text-secondary tabular-nums">{formatCurrency(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Requests */}
                      {(order.request_waiter || order.request_water || order.request_bill) && (
                        <div className="flex gap-2 flex-wrap">
                          {order.request_waiter && <span className="text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-700 px-2 py-1 rounded-lg">Waiter Requested</span>}
                          {order.request_water && <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 px-2 py-1 rounded-lg">Water Requested</span>}
                          {order.request_bill && <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 px-2 py-1 rounded-lg">Bill Requested</span>}
                        </div>
                      )}

                      {/* Special instructions */}
                      {order.special_instructions && (
                        <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl text-sm text-secondary">
                          Note: {order.special_instructions}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {STATUS_TRANSITIONS[order.status] && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => updateStatus(order.id, STATUS_TRANSITIONS[order.status]!)}
                          >
                            Mark {getOrderStatusLabel(STATUS_TRANSITIONS[order.status]!)}
                          </Button>
                        )}

                        {!order.is_paid && order.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<CheckCircle className="w-3.5 h-3.5" />}
                            onClick={() => setBillOrder(order)}
                          >
                            Mark Paid
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Printer className="w-3.5 h-3.5" />}
                          onClick={() => { setBillOrder(order); setTimeout(() => handlePrint(), 100); }}
                        >
                          Print Bill
                        </Button>

                        {!['completed', 'cancelled'].includes(order.status) && (
                          <Button
                            size="sm"
                            variant="danger"
                            icon={<X className="w-3.5 h-3.5" />}
                            onClick={() => cancelOrder(order.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Mark Paid Modal */}
      <Modal isOpen={!!billOrder} onClose={() => setBillOrder(null)} title="Mark Order as Paid" size="sm">
        {billOrder && (
          <div className="p-6 space-y-4">
            <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-4 space-y-2">
              {billOrder.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-primary">{item.quantity}x {item.dish_name}</span>
                  <span className="tabular-nums text-secondary">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              <div className="border-t border-default pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(billOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">GST</span>
                  <span className="tabular-nums">{formatCurrency(billOrder.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-primary mt-2 pt-2 border-t border-default">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(billOrder.total_amount)}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-primary mb-2">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {(['cash', 'upi', 'card', 'online'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'py-2.5 rounded-xl text-sm font-semibold capitalize border transition-all',
                      paymentMethod === method
                        ? 'bg-amber-700 text-white border-amber-700'
                        : 'border-default text-secondary hover:text-primary hover:border-amber-300'
                    )}
                  >
                    {method.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <Button
              fullWidth
              loading={markingPaid}
              onClick={() => markPaid(billOrder)}
            >
              Confirm Payment - {formatCurrency(billOrder.total_amount)}
            </Button>
          </div>
        )}
      </Modal>

      {/* Printable Bill */}
      <div className="hidden">
        <div ref={billRef} className="p-8 bg-white text-black font-sans max-w-sm mx-auto">
          {billOrder && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Cafe Receipt</h1>
                <p className="text-sm text-gray-500 mt-1">{formatDateTime(billOrder.created_at)}</p>
                <p className="text-sm font-medium">Order: {billOrder.order_number}</p>
                <p className="text-sm">Table: {(billOrder.table as unknown as { table_number: number })?.table_number}</p>
              </div>
              <div className="border-t border-b border-gray-200 py-4 space-y-2 mb-4">
                {billOrder.order_items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.dish_name}</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 mb-6">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(billOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (5%)</span>
                  <span>{formatCurrency(billOrder.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>Total</span>
                  <span>{formatCurrency(billOrder.total_amount)}</span>
                </div>
              </div>
              <div className="text-center text-sm text-gray-400">
                <p>Thank you for dining with us!</p>
                <p className="mt-1">Please visit again</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
