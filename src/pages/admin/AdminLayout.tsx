import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  QrCode,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Coffee,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/lib/types';
import { formatTime, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { path: '/admin/menu', icon: UtensilsCrossed, label: 'Menu' },
  { path: '/admin/tables', icon: QrCode, label: 'Tables' },
  { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function AdminLayout() {
  const { admin, signOut } = useAuth();
  const { isDark, toggleDark } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const notif = payload.new as Notification;
          setNotifications((prev) => [notif, ...prev]);
          // Play notification sound
          try {
            const ctx = new AudioContext();
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.frequency.value = 880;
            oscillator.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.3);
          } catch {}
          toast(notif.message, { icon: '🔔' });
        }
      )
      .subscribe();

    // Listen for new orders
    const ordersChannel = supabase
      .channel('admin-new-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => {
          toast.success('New order received! 🍽️');
          setNewOrderCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="flex h-screen bg-app overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 220 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'hidden lg:flex flex-col bg-surface border-r border-default flex-shrink-0 relative z-30',
          'overflow-hidden'
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          navItems={navItems}
          admin={admin}
          newOrderCount={newOrderCount}
          onOrdersClick={() => setNewOrderCount(0)}
          onCollapse={() => setCollapsed((v) => !v)}
          onSignOut={handleSignOut}
        />
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -220 }}
            animate={{ x: 0 }}
            exit={{ x: -220 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-[220px] bg-surface border-r border-default z-50 flex flex-col lg:hidden"
          >
            <SidebarContent
              collapsed={false}
              navItems={navItems}
              admin={admin}
              newOrderCount={newOrderCount}
              onOrdersClick={() => setNewOrderCount(0)}
              onCollapse={() => setMobileOpen(false)}
              onSignOut={handleSignOut}
              isMobile
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 border-b border-default bg-surface flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden w-8 h-8 flex items-center justify-center text-secondary hover:text-primary"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block" />

          {/* Top bar right section */}
          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors relative"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-2xl shadow-lg-custom border border-default z-20 overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-4 border-b border-default">
                        <h3 className="font-semibold text-sm text-primary">Notifications</h3>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-accent hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-sm text-secondary text-center py-8">No notifications</p>
                        ) : (
                          notifications.slice(0, 10).map((notif) => (
                            <div
                              key={notif.id}
                              className={cn(
                                'px-4 py-3 border-b border-default last:border-0',
                                !notif.is_read && 'bg-amber-50 dark:bg-amber-900/10'
                              )}
                            >
                              <p className="text-sm font-medium text-primary">{notif.title}</p>
                              <p className="text-xs text-secondary mt-0.5">{notif.message}</p>
                              <p className="text-xs text-secondary mt-1">{formatTime(notif.created_at)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Admin info */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-semibold text-sm">
                {admin?.full_name?.charAt(0) || 'A'}
              </div>
              <span className="hidden sm:block text-sm font-medium text-primary max-w-[120px] truncate">
                {admin?.full_name}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  collapsed,
  navItems,
  admin,
  onCollapse,
  onSignOut,
  isMobile,
  newOrderCount = 0,
  onOrdersClick,
}: {
  collapsed: boolean;
  navItems: { path: string; icon: React.ElementType; label: string }[];
  admin: { full_name: string; email: string; role: string } | null;
  onCollapse: () => void;
  onSignOut: () => void;
  isMobile?: boolean;
  newOrderCount?: number;
  onOrdersClick?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-default h-14">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-amber-700 flex items-center justify-center flex-shrink-0">
            <Coffee className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-display font-semibold text-primary text-sm whitespace-nowrap overflow-hidden"
              >
                Cafe Admin
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={onCollapse}
          className="w-6 h-6 rounded-md flex items-center justify-center text-secondary hover:text-primary hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors flex-shrink-0"
        >
          {isMobile ? (
            <X className="w-4 h-4" />
          ) : collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const isOrders = item.path === '/admin/orders';
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={isOrders && onOrdersClick ? onOrdersClick : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative',
                  isActive
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    : 'text-secondary hover:text-primary hover:bg-stone-100 dark:hover:bg-stone-700'
                )
              }
            >
              <div className="relative flex-shrink-0">
                <item.icon className="w-4.5 h-4.5" />
                {isOrders && newOrderCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold leading-none"
                  >
                    {newOrderCount > 9 ? '9+' : newOrderCount}
                  </motion.span>
                )}
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* User & logout */}
      <div className="p-2 border-t border-default">
        <div className={cn('flex items-center gap-2.5 px-3 py-2 mb-1', collapsed && 'justify-center')}>
          <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-semibold text-xs flex-shrink-0">
            {admin?.full_name?.charAt(0) || 'A'}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden min-w-0"
              >
                <p className="text-xs font-semibold text-primary truncate">{admin?.full_name}</p>
                <p className="text-[10px] text-secondary capitalize truncate">{admin?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={onSignOut}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );
}
