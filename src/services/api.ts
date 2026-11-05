import { Order, Restaurant, FoodItem, User, AnalyticsStats, OrderStatus } from '../types';

const TOKEN_KEY = 'food_tracker_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) errorMsg = errorData.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  async register(data: { name: string; email: string; password: string; role?: string; phone?: string; address?: string }): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async getCurrentUser(): Promise<{ user: User } | null> {
    const token = getStoredToken();
    if (!token) return null;
    try {
      return await request<{ user: User }>('/api/auth/me');
    } catch {
      setStoredToken(null);
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
  },

  async getDemoAccounts() {
    return request<any>('/api/demo/accounts');
  },

  // Restaurants & Items
  async getRestaurants(): Promise<Restaurant[]> {
    return request<Restaurant[]>('/api/restaurants');
  },

  async getFoodItems(restaurantId?: string): Promise<FoodItem[]> {
    const query = restaurantId ? `?restaurant_id=${encodeURIComponent(restaurantId)}` : '';
    return request<FoodItem[]>(`/api/food-items${query}`);
  },

  // Orders
  async getOrders(params?: {
    customer_id?: string;
    restaurant_id?: string;
    delivery_partner_id?: string;
    status?: string;
    search?: string;
  }): Promise<Order[]> {
    const query = new URLSearchParams();
    if (params?.customer_id) query.set('customer_id', params.customer_id);
    if (params?.restaurant_id) query.set('restaurant_id', params.restaurant_id);
    if (params?.delivery_partner_id) query.set('delivery_partner_id', params.delivery_partner_id);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<Order[]>(`/api/orders${queryString}`);
  },

  async getOrderById(id: string): Promise<Order> {
    return request<Order>(`/api/orders/${encodeURIComponent(id)}`);
  },

  async createOrder(data: {
    customer_id: string;
    restaurant_id: string;
    items: { itemId: string; quantity: number }[];
    delivery_address: string;
    customer_phone: string;
    notes?: string;
  }): Promise<{ order_id: string; total_amount: number; current_status: OrderStatus; eta_minutes: number; estimated_delivery_time: string }> {
    return request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateOrderStatus(
    orderId: string,
    data: {
      status: OrderStatus;
      updater_name?: string;
      updater_role?: string;
      driver_id?: string;
      notes?: string;
    }
  ): Promise<{ order_id: string; status: OrderStatus; eta_minutes: number; estimated_delivery_time: string }> {
    return request(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsStats> {
    return request<AnalyticsStats>('/api/analytics');
  },

  // Reset Demo Data
  async resetDemoData(): Promise<void> {
    await request('/api/demo/reset', { method: 'POST' });
  },

  // Real-Time EventSource Subscriber
  subscribeToOrderUpdates(onEvent: (event: { type: string; data?: any }) => void): () => void {
    let evtSource: EventSource | null = null;
    try {
      evtSource = new EventSource('/api/orders/stream');
      evtSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          onEvent(parsed);
        } catch {
          // ignore
        }
      };
    } catch (err) {
      console.warn('SSE connection failed, falling back to interval polling:', err);
    }

    return () => {
      if (evtSource) {
        evtSource.close();
      }
    };
  },
};
