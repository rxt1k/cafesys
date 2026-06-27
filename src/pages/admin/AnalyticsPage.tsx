import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ShoppingBag, Users, Printer } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { formatCurrency, cn } from '@/lib/utils';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import { useReactToPrint } from 'react-to-print';

interface DailyData {
  date: string;
  revenue: number;
  orders: number;
}

interface PaymentMethodData {
  name: string;
  value: number;
  color: string;
}

const PAYMENT_COLORS: Record<string, string> = {
  cash: '#B45309',
  upi: '#7C3AED',
  card: '#2563EB',
  online: '#16A34A',
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(7);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalCustomers: 0,
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentMethodData[]>([]);
  const [popularDishes, setPopularDishes] = useState<{ name: string; orders: number; revenue: number }[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);
      startDate.setHours(0, 0, 0, 0);

      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(dish_name, quantity, subtotal)')
        .gte('created_at', startDate.toISOString())
        .neq('status', 'cancelled');

      if (!orders) { setLoading(false); return; }

      // Summary stats
      const totalRevenue = orders.reduce((s, o) => s + o.total_amount, 0);
      const totalOrders = orders.length;
      const uniqueSessions = new Set(orders.map((o) => o.session_id)).size;

      setStats({
        totalRevenue,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        totalCustomers: uniqueSessions,
      });

      // Daily data
      const dailyMap: Record<string, { revenue: number; orders: number }> = {};
      for (let i = dateRange - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dailyMap[key] = { revenue: 0, orders: 0 };
      }
      orders.forEach((o) => {
        const key = o.created_at.split('T')[0];
        if (dailyMap[key]) {
          dailyMap[key].revenue += o.total_amount;
          dailyMap[key].orders += 1;
        }
      });
      setDailyData(
        Object.entries(dailyMap).map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          ...data,
        }))
      );

      // Payment methods
      const payMap: Record<string, number> = {};
      orders.forEach((o) => {
        if (o.payment_method) {
          payMap[o.payment_method] = (payMap[o.payment_method] || 0) + o.total_amount;
        }
      });
      setPaymentData(
        Object.entries(payMap).map(([name, value]) => ({
          name: name.toUpperCase(),
          value,
          color: PAYMENT_COLORS[name] || '#78716C',
        }))
      );

      // Popular dishes
      const dishMap: Record<string, { orders: number; revenue: number }> = {};
      orders.forEach((o) => {
        o.order_items?.forEach((item: { dish_name: string; quantity: number; subtotal: number }) => {
          if (!dishMap[item.dish_name]) dishMap[item.dish_name] = { orders: 0, revenue: 0 };
          dishMap[item.dish_name].orders += item.quantity;
          dishMap[item.dish_name].revenue += item.subtotal;
        });
      });
      setPopularDishes(
        Object.entries(dishMap)
          .sort((a, b) => b[1].orders - a[1].orders)
          .slice(0, 10)
          .map(([name, data]) => ({ name, ...data }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Avg Order Value', value: formatCurrency(stats.avgOrderValue), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Unique Sessions', value: stats.totalCustomers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-primary">Analytics</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  dateRange === d ? 'bg-white dark:bg-stone-700 text-primary shadow-sm' : 'text-secondary hover:text-primary'
                )}
              >
                {d}d
              </button>
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handlePrint()}
            className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary border border-default rounded-xl px-3 py-2 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-surface rounded-2xl p-5 shadow-card">
          <h2 className="font-display font-semibold text-primary mb-4">Revenue Over Time</h2>
          {loading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B45309" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#B45309" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716C' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716C' }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(v: unknown) => [formatCurrency(Number(v)), 'Revenue']}
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#B45309" fill="url(#revenueGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment methods */}
        <div className="bg-surface rounded-2xl p-5 shadow-card">
          <h2 className="font-display font-semibold text-primary mb-4">Payment Methods</h2>
          {loading || paymentData.length === 0 ? (
            paymentData.length === 0 && !loading ? (
              <p className="text-secondary text-sm text-center py-8">No payment data</p>
            ) : (
              <div className="skeleton h-40 rounded-xl" />
            )
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {paymentData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: unknown) => [formatCurrency(Number(v))]}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {paymentData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-primary">{d.name}</span>
                    </div>
                    <span className="text-secondary tabular-nums">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Orders chart */}
      <div className="bg-surface rounded-2xl p-5 shadow-card mb-6">
        <h2 className="font-display font-semibold text-primary mb-4">Orders Per Day</h2>
        {loading ? (
          <div className="skeleton h-48 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716C' }} />
              <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="orders" fill="#B45309" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Popular dishes */}
      <div className="bg-surface rounded-2xl p-5 shadow-card">
        <h2 className="font-display font-semibold text-primary mb-4">Popular Dishes</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-8 rounded-lg" />)}
          </div>
        ) : popularDishes.length === 0 ? (
          <p className="text-secondary text-sm text-center py-4">No data for this period</p>
        ) : (
          <div className="space-y-3">
            {popularDishes.map((dish, i) => {
              const maxOrders = popularDishes[0].orders;
              return (
                <div key={dish.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="text-sm text-primary font-medium">{dish.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-secondary">
                      <span>{dish.orders} orders</span>
                      <span className="tabular-nums font-medium">{formatCurrency(dish.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 dark:bg-stone-700 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(dish.orders / maxOrders) * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className="h-full rounded-full bg-amber-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Printable Report */}
      <div className="hidden">
        <div ref={printRef} className="p-8 bg-white text-black font-sans">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Sales Report</h1>
            <p className="text-gray-500 mt-1">Last {dateRange} days - Generated on {new Date().toLocaleDateString('en-IN')}</p>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-gray-500 text-sm mt-1">Total Revenue</p>
            </div>
            <div className="border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
              <p className="text-gray-500 text-sm mt-1">Total Orders</p>
            </div>
            <div className="border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</p>
              <p className="text-gray-500 text-sm mt-1">Avg Order Value</p>
            </div>
            <div className="border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{stats.totalCustomers}</p>
              <p className="text-gray-500 text-sm mt-1">Unique Sessions</p>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4">Daily Breakdown</h2>
          <table className="w-full border-collapse mb-8">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 text-gray-600">Date</th>
                <th className="text-right py-2 text-gray-600">Orders</th>
                <th className="text-right py-2 text-gray-600">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map((d) => (
                <tr key={d.date} className="border-b border-gray-100">
                  <td className="py-2">{d.date}</td>
                  <td className="py-2 text-right">{d.orders}</td>
                  <td className="py-2 text-right">{formatCurrency(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="text-xl font-bold mb-4">Top Dishes</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 text-gray-600">#</th>
                <th className="text-left py-2 text-gray-600">Dish</th>
                <th className="text-right py-2 text-gray-600">Orders</th>
                <th className="text-right py-2 text-gray-600">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {popularDishes.map((d, i) => (
                <tr key={d.name} className="border-b border-gray-100">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">{d.name}</td>
                  <td className="py-2 text-right">{d.orders}</td>
                  <td className="py-2 text-right">{formatCurrency(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
