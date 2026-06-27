import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Check, Clock, Flame } from 'lucide-react';
import { Dish, CartExtra } from '@/lib/types';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency, cn } from '@/lib/utils';
import { DishTypeBadge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SPICE_LABELS } from '@/lib/constants';
import toast from 'react-hot-toast';

interface DishDetailSheetProps {
  dish: Dish;
  onClose: () => void;
}

export default function DishDetailSheet({ dish, onClose }: DishDetailSheetProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<CartExtra[]>([]);
  const [instructions, setInstructions] = useState('');
  const [added, setAdded] = useState(false);

  const extras = dish.extras?.filter((e) => e.is_available) ?? [];
  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
  const basePrice = dish.discounted_price ?? dish.price;
  const itemTotal = (basePrice + extrasTotal) * quantity;

  const toggleExtra = (extra: { id: string; name: string; price: number }) => {
    setSelectedExtras((prev) => {
      const exists = prev.find((e) => e.id === extra.id);
      if (exists) return prev.filter((e) => e.id !== extra.id);
      return [...prev, { id: extra.id, name: extra.name, price: extra.price }];
    });
  };

  const handleAdd = () => {
    if (!dish.is_available) return;
    addItem(dish, quantity, selectedExtras, instructions);
    setAdded(true);
    toast.success(`${dish.name} added to cart`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <BottomSheet isOpen={true} onClose={onClose} fullHeight>
      {/* Image */}
      <div className="relative h-56 bg-stone-100 dark:bg-stone-800 flex-shrink-0">
        {dish.image_url ? (
          <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 gradient-to-top" />
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <DishTypeBadge type={dish.type} />
          {dish.is_popular && (
            <span className="bg-amber-500 text-white text-xs font-semibold px-2 py-0.5 rounded-md">Popular</span>
          )}
          {dish.is_recommended && (
            <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded-md">Chef's Pick</span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="px-5 py-4 space-y-4">
        {/* Name & price */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-primary leading-tight flex-1">{dish.name}</h2>
          <div className="text-right">
            <motion.p
              key={itemTotal}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="text-xl font-bold text-accent tabular-nums"
            >
              {formatCurrency(itemTotal)}
            </motion.p>
            {dish.discounted_price !== null && dish.discounted_price < dish.price && (
              <p className="text-sm text-secondary line-through tabular-nums">{formatCurrency(dish.price)}</p>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-sm text-secondary">
          {dish.preparation_time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {dish.preparation_time} min
            </span>
          )}
          {dish.calories && (
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              {dish.calories} kcal
            </span>
          )}
          {dish.spice_level && (
            <span className="text-red-500">{SPICE_LABELS[dish.spice_level]}</span>
          )}
        </div>

        {/* Description */}
        {dish.description && (
          <p className="text-secondary text-sm leading-relaxed">{dish.description}</p>
        )}

        {/* Allergens */}
        {dish.allergens && dish.allergens.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-secondary">Allergens:</span>
            <span className="text-primary">{dish.allergens.join(', ')}</span>
          </div>
        )}

        {/* Extras */}
        {extras.length > 0 && (
          <div>
            <h3 className="font-semibold text-primary text-sm mb-2.5">Add-ons</h3>
            <div className="space-y-2">
              {extras.map((extra) => {
                const isSelected = selectedExtras.some((e) => e.id === extra.id);
                return (
                  <motion.button
                    key={extra.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleExtra(extra)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-xl border transition-all',
                      isSelected
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-default bg-stone-50 dark:bg-stone-800'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                        isSelected ? 'bg-amber-600 border-amber-600' : 'border-stone-300 dark:border-stone-600'
                      )}>
                        <AnimatePresence>
                          {isSelected && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Check className="w-3 h-3 text-white" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <span className="text-sm text-primary">{extra.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-accent tabular-nums">+{formatCurrency(extra.price)}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Special instructions */}
        <div>
          <h3 className="font-semibold text-primary text-sm mb-2">Special Instructions</h3>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Any allergies or preferences? (optional)"
            rows={2}
            className="input-base resize-none text-sm"
          />
        </div>

        {/* Quantity + Add */}
        <div className="flex items-center gap-3 pt-2 pb-4">
          {/* Quantity stepper */}
          <div className="flex items-center gap-0 border border-default rounded-xl overflow-hidden">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center text-primary hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </motion.button>
            <motion.span
              key={quantity}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-10 text-center font-semibold text-primary tabular-nums"
            >
              {quantity}
            </motion.span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setQuantity((q) => q + 1)}
              className="w-10 h-10 flex items-center justify-center text-primary hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Add to cart */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAdd}
            disabled={!dish.is_available || added}
            className={cn(
              'flex-1 py-3 rounded-xl font-semibold text-sm transition-all',
              added
                ? 'bg-green-600 text-white'
                : dish.is_available
                ? 'bg-amber-700 dark:bg-amber-500 text-white hover:bg-amber-800'
                : 'bg-stone-200 text-stone-500 cursor-not-allowed'
            )}
          >
            <AnimatePresence mode="wait">
              {added ? (
                <motion.span
                  key="added"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Added to Cart
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {dish.is_available ? `Add to Cart - ${formatCurrency(itemTotal)}` : 'Unavailable'}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </BottomSheet>
  );
}
