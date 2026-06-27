import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: string;
          avatar_url: string | null;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      categories: {
        Row: {
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
        };
      };
      dishes: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          short_description: string | null;
          price: number;
          discounted_price: number | null;
          type: 'veg' | 'non_veg' | 'egg';
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
        };
      };
      extras: {
        Row: {
          id: string;
          dish_id: string;
          name: string;
          price: number;
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      tables: {
        Row: {
          id: string;
          table_number: number;
          table_name: string | null;
          secret_token: string;
          qr_code_url: string | null;
          capacity: number;
          status: 'free' | 'occupied';
          current_session_id: string | null;
          location: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      table_sessions: {
        Row: {
          id: string;
          table_id: string;
          customer_id: string | null;
          anonymous_id: string | null;
          status: 'active' | 'closed';
          device_info: Record<string, unknown> | null;
          started_at: string;
          ended_at: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          session_id: string | null;
          table_id: string | null;
          customer_id: string | null;
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
          special_instructions: string | null;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          request_waiter: boolean;
          request_water: boolean;
          request_bill: boolean;
          payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded';
          payment_method: 'cash' | 'upi' | 'card' | 'online' | null;
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
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          dish_id: string | null;
          dish_name: string;
          dish_price: number;
          quantity: number;
          subtotal: number;
          special_instructions: string | null;
        };
      };
      order_item_extras: {
        Row: {
          id: string;
          order_item_id: string;
          extra_id: string | null;
          extra_name: string;
          extra_price: number;
          quantity: number;
        };
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          amount: number;
          method: 'cash' | 'upi' | 'card' | 'online';
          transaction_id: string | null;
          status: 'unpaid' | 'pending' | 'paid' | 'refunded';
          payment_details: Record<string, unknown> | null;
          paid_at: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          message: string;
          type: string;
          reference_type: string | null;
          reference_id: string | null;
          is_read: boolean;
          created_at: string;
        };
      };
      analytics: {
        Row: {
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
        };
      };
    };
  };
};
