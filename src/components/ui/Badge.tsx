import { cn } from '@/lib/utils';
import { DishType } from '@/lib/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'veg' | 'non_veg' | 'egg' | 'popular' | 'recommended' | 'status' | 'default';
  className?: string;
  color?: string;
}

export function Badge({ children, variant = 'default', className, color }: BadgeProps) {
  const variants = {
    veg: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400',
    non_veg: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400',
    egg: 'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400',
    popular: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    recommended: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    status: '',
    default: 'bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium uppercase tracking-wide',
        variants[variant],
        className
      )}
      style={color ? { backgroundColor: `${color}15`, color, borderColor: `${color}30` } : undefined}
    >
      {children}
    </span>
  );
}

export function DishTypeBadge({ type }: { type: DishType }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-5 h-5 rounded border-2 flex-shrink-0',
        type === 'veg' ? 'border-green-600' : type === 'egg' ? 'border-yellow-500' : 'border-red-600'
      )}
    >
      <span
        className={cn(
          'w-2.5 h-2.5 rounded-full',
          type === 'veg' ? 'bg-green-600' : type === 'egg' ? 'bg-yellow-500' : 'bg-red-600'
        )}
      />
    </span>
  );
}
