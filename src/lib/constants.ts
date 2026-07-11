export const TAX_RATE = 0.05; // 5% GST

export const ORDER_STATUS_STEPS = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'completed',
] as const;

export const ESTIMATED_TIMES: Record<string, number> = {
  pending: 5,
  confirmed: 15,
  preparing: 10,
  ready: 5,
  served: 0,
  completed: 0,
};

export const SPICE_LABELS: Record<number, string> = {
  1: 'Mild',
  2: 'Medium',
  3: 'Spicy',
  4: 'Very Spicy',
  5: 'Extremely Spicy',
};

export const STORAGE_KEYS = {
  ANONYMOUS_ID: 'cafe_anonymous_id',
  CART: 'cafe_cart',
  DARK_MODE: 'cafe_dark_mode',
  SESSION_ID: 'cafe_session_id',
  TABLE_INFO: 'cafe_table_info',
};

export const COLORS = {
  background: '#FAFAF7',
  surface: '#FFFFFF',
  textPrimary: '#1C1917',
  textSecondary: '#78716C',
  accent: '#B45309',
  accentDark: '#F59E0B',
  success: '#65A30D',
  border: '#E7E5E4',
  darkBackground: '#0C0A09',
  darkSurface: '#292524',
  darkTextPrimary: '#F5F5F4',
};

export const ANIMATION = {
  spring: { type: 'spring', stiffness: 300, damping: 30 },
  springFast: { type: 'spring', stiffness: 400, damping: 35 },
  springSlow: { type: 'spring', stiffness: 200, damping: 25 },
};
