export type UserRole = 'customer' | 'restaurant' | 'delivery';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
}

export type OrderStatus =
  | 'Order Placed'
  | 'Preparing'
  | 'Ready for Pickup'
  | 'Out for Delivery'
  | 'Delivered';

export interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  address: string;
  cuisine: string;
  rating: number;
  prep_time_minutes: number;
  pickup_time_minutes: number;
  travel_time_minutes: number;
  image: string;
  tagline: string;
}

export interface FoodItem {
  item_id: string;
  restaurant_id: string;
  item_name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  availability: number;
}

export interface OrderItem {
  order_item_id: string;
  order_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price: number;
  description?: string;
  image?: string;
}

export interface OrderStatusHistory {
  history_id: string;
  order_id: string;
  status: OrderStatus;
  updated_by: string;
  timestamp: string;
  notes?: string;
}

export interface Order {
  order_id: string;
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_address: string;
  delivery_partner_id?: string;
  delivery_partner_name?: string;
  delivery_partner_phone?: string;
  total_amount: number;
  current_status: OrderStatus;
  estimated_delivery_time: string;
  eta_minutes: number;
  prep_time_minutes?: number;
  pickup_time_minutes?: number;
  travel_time_minutes?: number;
  delivery_address: string;
  customer_phone: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  itemCount?: number;
  history?: OrderStatusHistory[];
}

export interface CartItem {
  item: FoodItem;
  quantity: number;
}

export interface AnalyticsStats {
  totalOrders: number;
  placed: number;
  preparing: number;
  ready: number;
  outForDelivery: number;
  delivered: number;
  activeOrders: number;
  totalRevenue: number;
}
