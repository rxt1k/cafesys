import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ShoppingBag, Users, Table2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Order, Table } from '@/lib/types';
import { formatCurrency, formatTime, getOrderStatusColor, getOrderStatusLabel, cn } from '@/lib/utils';
import { StatCardSkeleton, OrderCardSkeleton } from '@/components/ui/Skeleton';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  activeOrders: number;
  occupiedTables: number;
  totalTables: number;
}

interface PopularDish {
  dish_name: string;
  count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [popularDishes, setPopularDishes] = useState<PopularDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    setRefreshing(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const [ordersRes, tablesRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, order_items(*), table:tables(table_number, table_name)')
          .gte('created_at', todayStr)
          .order('created_at', { ascending: false }),
        supabase
          .from('tables')
          .select('*')
          .eq('is_active', true)
          .order('table_number'),
      ]);

      const allOrders = (ordersRes.data || []) as Order[];
      const allTables = (tablesRes.data || []) as Table[];

      const completedOrders = allOrders.filter((o) => !['cancelled'].includes(o.status));
      const totalRevenue = completedOrders.reduce((s, o) => s + o.total_amount, 0);
      const activeOrders = allOrders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length;
      const occupiedTables = allTables.filter((t) => t.status === 'occupied').length;

      setStats({
        totalOrders: allOrders.length,
        totalRevenue,
        avgOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
        activeOrders,
        occupiedTables,
        totalTables: allTables.length,
      });

      setOrders(allOrders.slice(0, 8));
      setTables(allTables);

      // Calculate popular dishes
      const dishCount: Record<string, number> = {};
      allOrders.forEach((o) => {
        o.order_items?.forEach((item) => {
          dishCount[item.dish_name] = (dishCount[item.dish_name] || 0) + item.quantity;
        });
      });
      const sorted = Object.entries(dishCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([dish_name, count]) => ({ dish_name, count }));
      setPopularDishes(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const statCards = [
    {
      label: "Today's Revenue",
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: "Today's Orders",
      value: stats?.totalOrders || 0,
      icon: ShoppingBag,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Active Orders',
      value: stats?.activeOrders || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Tables Occupied',
      value: `${stats?.occupiedTables || 0} / ${stats?.totalTables || 0}`,
      icon: Table2,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Dashboard</h1>
          <p className="text-secondary text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={loadData}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary border border-default rounded-xl px-3 py-2 transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          Refresh
        </motion.button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-surface rounded-2xl p-5 shadow-card"
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', card.bg)}>
                  <card.icon className={cn('w-4.5 h-4.5', card.color)} />
                </div>
                <p className="text-secondary text-xs uppercase tracking-wide font-medium mb-1">{card.label}</p>
                <p className="font-display text-2xl font-bold text-primary tabular-nums">{card.value}</p>
              </motion.div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-primary">Recent Orders</h2>
            <a href="/admin/orders" className="text-sm text-accent hover:underline">View all</a>
          </div>
          <div className="space-y-2">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)
              : orders.length === 0
              ? (
                <div className="bg-surface rounded-2xl p-8 text-center shadow-card">
                  <p className="text-secondary text-sm">No orders today yet</p>
                </div>
              )
              : orders.map((order, i) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-surface rounded-xl p-4 shadow-card flex items-center gap-3"
                    style={{ borderLeft: `3px solid ${getOrderStatusColor(order.status)}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-primary">{order.order_number}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-md font-medium capitalize"
                          style={{
                            backgroundColor: `${getOrderStatusColor(order.status)}15`,
                            color: getOrderStatusColor(order.status),
                          }}
                        >
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-xs text-secondary">
                        Table {(order.table as unknown as { table_number: number })?.table_number} &bull; {formatTime(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-primary tabular-nums">{formatCurrency(order.total_amount)}</p>
                      <p className="text-xs text-secondary">{order.order_items?.length || 0} items</p>
                    </div>
                  </motion.div>
                ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Table map */}
          <div>
            <h2 className="font-display text-lg font-semibold text-primary mb-3">Table Status</h2>
            <div className="bg-surface rounded-2xl p-4 shadow-card">
              {loading ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton h-14 rounded-xl" />
                  ))}
                </div>
              ) : tables.length === 0 ? (
                <p className="text-secondary text-sm text-center py-4">No tables configured</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {tables.map((table) => (
                    <div
                      key={table.id}
                      className={cn(
                        'rounded-xl p-2.5 text-center',
                        table.status === 'occupied'
                          ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                          : 'bg-stone-50 dark:bg-stone-800 border border-default'
                      )}
                    >
                      {table.status === 'occupied' && (
                        <div className="flex justify-center mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 pulse-dot" />
                        </div>
                      )}
                      <p className="text-xs font-bold text-primary">{table.table_number}</p>
                      <p className="text-[10px] text-secondary capitalize">{table.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Popular dishes */}
          <div>
            <h2 className="font-display text-lg font-semibold text-primary mb-3">Popular Today</h2>
            <div className="bg-surface rounded-2xl p-4 shadow-card space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-8 rounded-lg" />
                ))
              ) : popularDishes.length === 0 ? (
                <p className="text-secondary text-sm text-center py-3">No data yet</p>
              ) : (
                popularDishes.map((dish, i) => {
                  const maxCount = popularDishes[0].count;
                  const percent = (dish.count / maxCount) * 100;
                  return (
                    <div key={dish.dish_name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-primary truncate flex-1 mr-2">{dish.dish_name}</span>
                        <span className="text-xs text-secondary tabular-nums">{dish.count} orders</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-stone-100 dark:bg-stone-700 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                          className="h-full rounded-full bg-amber-500"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
