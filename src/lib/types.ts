export type DishType = 'veg' | 'non_veg' | 'egg';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'online';
export type TableStatus = 'free' | 'occupied';
export type SessionStatus = 'active' | 'closed';

export interface Admin {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dish {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  discounted_price: number | null;
  type: DishType;
  image_url: string | null;
  is_popular: boolean;
  is_recommended: boolean;
  is_available: boolean;
  is_hidden: boolean;
  preparation_time: number | null;
  calories: number | null;
  spice_level: number | null;
  allergens: string[] | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  extras?: Extra[];
}

export interface Extra {
  id: string;
  dish_id: string;
  name: string;
  price: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: string;
  table_number: number;
  table_name: string | null;
  secret_token: string;
  qr_code_url: string | null;
  capacity: number;
  status: TableStatus;
  current_session_id: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TableSession {
  id: string;
  table_id: string;
  customer_id: string | null;
  anonymous_id: string | null;
  status: SessionStatus;
  device_info: Record<string, unknown> | null;
  started_at: string;
  ended_at: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  session_id: string | null;
  table_id: string | null;
  customer_id: string | null;
  status: OrderStatus;
  special_instructions: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  request_waiter: boolean;
  request_water: boolean;
  request_bill: boolean;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  prepared_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  order_items?: OrderItem[];
  table?: Table;
}

export interface OrderItem {
  id: string;
  order_id: string;
  dish_id: string | null;
  dish_name: string;
  dish_price: number;
  quantity: number;
  subtotal: number;
  special_instructions: string | null;
  order_item_extras?: OrderItemExtra[];
}

export interface OrderItemExtra {
  id: string;
  order_item_id: string;
  extra_id: string | null;
  extra_name: string;
  extra_price: number;
  quantity: number;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  transaction_id: string | null;
  status: PaymentStatus;
  payment_details: Record<string, unknown> | null;
  paid_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Analytics {
  id: string;
  date: string;
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  total_customers: number;
  popular_dish_id: string | null;
  popular_dish_orders: number | null;
  table_occupancy_rate: number | null;
  payment_methods: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Cart types
export interface CartExtra {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // local cart id
  dish: Dish;
  quantity: number;
  selectedExtras: CartExtra[];
  specialInstructions: string;
}

export interface CartState {
  items: CartItem[];
  sessionId: string | null;
  tableId: string | null;
  tableNumber: number | null;
}

// Today's analytics from RPC
export interface TodayAnalytics {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  total_customers: number;
  table_occupancy_rate: number;
}

export interface PopularDish {
  dish_id: string;
  dish_name: string;
  total_orders: number;
  total_revenue: number;
}
