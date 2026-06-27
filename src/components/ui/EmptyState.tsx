import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-secondary mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-secondary text-sm max-w-xs leading-relaxed mb-6">{description}</p>
      )}
      {action}
    </motion.div>
  );
}
