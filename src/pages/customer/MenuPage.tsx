import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, Moon, Sun, X, ChevronRight, Clock, Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Category, Dish } from '@/lib/types';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatCurrency, cn } from '@/lib/utils';
import { STORAGE_KEYS } from '@/lib/constants';
import { DishTypeBadge } from '@/components/ui/Badge';
import { DishCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import DishDetailSheet from './DishDetailSheet';
import CartSheet from './CartSheet';
import OrderTrackingSheet from './OrderTrackingSheet';

export default function MenuPage() {
  const { totalItems, total } = useCart();
  const { isDark, toggleDark } = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [tableInfo, setTableInfo] = useState<{ tableNumber: number; tableName: string | null } | null>(null);

  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const info = localStorage.getItem(STORAGE_KEYS.TABLE_INFO);
    if (info) {
      const parsed = JSON.parse(info);
      setTableInfo(parsed);
    }
  }, []);

  useEffect(() => {
    fetchMenuData();
  }, []);

  async function fetchMenuData() {
    setLoading(true);
    try {
      const [catRes, dishRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('dishes')
          .select('*, extras(*), category:categories(name)')
          .eq('is_available', true)
          .eq('is_hidden', false)
          .order('sort_order', { ascending: true }),
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (dishRes.data) setDishes(dishRes.data as Dish[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredDishes = useCallback(() => {
    return dishes.filter((dish) => {
      const matchesCategory = activeCategory === 'all' || dish.category_id === activeCategory;
      const matchesSearch =
        !searchQuery ||
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dish.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dish.short_description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [dishes, activeCategory, searchQuery]);

  const filtered = filteredDishes();

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-app">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-app border-b border-default">
        <div className="px-4 pt-4 pb-3">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-display text-xl font-semibold text-primary leading-tight">
                {tableInfo?.tableName || `Table ${tableInfo?.tableNumber}`}
              </h1>
              <p className="text-secondary text-xs mt-0.5">Scan. Order. Enjoy.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTracking(true)}
                className="flex items-center gap-1.5 text-xs text-accent border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                Track
              </button>
              <button
                onClick={toggleDark}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-700 flex items-center justify-center text-secondary hover:text-primary transition-colors"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-primary text-sm outline-none focus:ring-2 focus:ring-amber-400/30 transition-all placeholder:text-secondary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div
          ref={categoryRef}
          className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide snap-x-mandatory"
        >
          <CategoryPill
            label="All"
            active={activeCategory === 'all'}
            onClick={() => scrollToCategory('all')}
          />
          {categories.map((cat) => (
            <CategoryPill
              key={cat.id}
              label={cat.name}
              active={activeCategory === cat.id}
              onClick={() => scrollToCategory(cat.id)}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-32">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <DishCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="w-7 h-7" />}
            title="No dishes found"
            description={searchQuery ? `No results for "${searchQuery}"` : 'No dishes available in this category.'}
            action={
              searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-accent text-sm underline"
                >
                  Clear search
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Popular section when no filter */}
            {activeCategory === 'all' && !searchQuery && (
              <div className="mb-6">
                <PopularSection dishes={dishes.filter((d) => d.is_popular)} onSelect={setSelectedDish} />
              </div>
            )}

            {/* Category sections or flat grid */}
            {activeCategory === 'all' && !searchQuery ? (
              categories.map((cat) => {
                const catDishes = filtered.filter((d) => d.category_id === cat.id);
                if (catDishes.length === 0) return null;
                return (
                  <CategorySection
                    key={cat.id}
                    category={cat}
                    dishes={catDishes}
                    onSelect={setSelectedDish}
                  />
                );
              })
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((dish, i) => (
                  <motion.div
                    key={dish.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <DishCard dish={dish} onSelect={() => setSelectedDish(dish)} />
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Cart FAB */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed bottom-6 left-4 right-4 z-40"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCart(true)}
              className="w-full bg-amber-700 dark:bg-amber-500 text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-lg"
              style={{ boxShadow: '0 8px 32px rgba(180, 83, 9, 0.35)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="font-semibold">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
                <ChevronRight className="w-4 h-4 opacity-70" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheets */}
      {selectedDish && (
        <DishDetailSheet
          dish={selectedDish}
          onClose={() => setSelectedDish(null)}
        />
      )}

      <CartSheet isOpen={showCart} onClose={() => setShowCart(false)} />
      <OrderTrackingSheet isOpen={showTracking} onClose={() => setShowTracking(false)} />
    </div>
  );
}

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium snap-start transition-all',
        active
          ? 'bg-amber-700 dark:bg-amber-500 text-white shadow-sm'
          : 'bg-stone-100 dark:bg-stone-800 text-secondary hover:text-primary'
      )}
    >
      {label}
    </button>
  );
}

function PopularSection({ dishes, onSelect }: { dishes: Dish[]; onSelect: (d: Dish) => void }) {
  if (dishes.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-amber-600" />
        <h2 className="font-display font-semibold text-primary">Popular Now</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {dishes.slice(0, 6).map((dish, i) => (
          <motion.div
            key={dish.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex-shrink-0 w-40"
          >
            <button onClick={() => onSelect(dish)} className="w-full text-left">
              <div className="relative rounded-xl overflow-hidden aspect-square bg-stone-100 dark:bg-stone-800 mb-2">
                {dish.image_url ? (
                  <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-secondary text-2xl">
                    <svg className="w-10 h-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-1.5 left-1.5">
                  <DishTypeBadge type={dish.type} />
                </div>
              </div>
              <p className="text-xs font-medium text-primary line-clamp-2 leading-snug">{dish.name}</p>
              <p className="text-xs font-semibold text-accent mt-0.5 tabular-nums">
                {formatCurrency(dish.discounted_price ?? dish.price)}
              </p>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CategorySection({
  category,
  dishes,
  onSelect,
}: {
  category: Category;
  dishes: Dish[];
  onSelect: (d: Dish) => void;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-primary">{category.name}</h2>
        <span className="text-xs text-secondary">{dishes.length} items</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {dishes.map((dish, i) => (
          <motion.div
            key={dish.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <DishCard dish={dish} onSelect={() => onSelect(dish)} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function DishCard({ dish, onSelect }: { dish: Dish; onSelect: () => void }) {
  const hasDiscount = dish.discounted_price !== null && dish.discounted_price < dish.price;

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className="w-full text-left bg-surface rounded-2xl overflow-hidden shadow-card hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-800">
        {dish.image_url ? (
          <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <DishTypeBadge type={dish.type} />
        </div>
        {dish.is_popular && (
          <div className="absolute top-2 right-2">
            <span className="bg-amber-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide">
              Popular
            </span>
          </div>
        )}
        {!dish.is_available && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-stone-800 text-xs font-semibold px-2 py-1 rounded-lg">
              Unavailable
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-primary line-clamp-2 leading-snug">{dish.name}</p>
        {dish.short_description && (
          <p className="text-xs text-secondary mt-0.5 line-clamp-1">{dish.short_description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-sm font-bold text-accent tabular-nums">
              {formatCurrency(dish.discounted_price ?? dish.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-secondary line-through ml-1 tabular-nums">
                {formatCurrency(dish.price)}
              </span>
            )}
          </div>
          {dish.preparation_time && (
            <span className="text-[10px] text-secondary flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {dish.preparation_time}m
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
