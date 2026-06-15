// Tiny typed API client for the RPK Go backend.
// Base URL resolution:
//   1. EXPO_PUBLIC_API_URL when explicitly set (any environment), else
//   2. same-origin ("") in a production browser (served behind a reverse proxy
//      that forwards /api and /uploads to the backend — see docker-compose), else
//   3. http://localhost:8090 for local development.
function resolveApiUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env !== undefined && env !== '') return env;
  if (typeof window !== 'undefined' && window.location && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
    return ''; // same origin
  }
  return 'http://localhost:8090';
}
export const API_URL = resolveApiUrl();

// Resolve a stored image_url for display. Absolute URLs (http/https/data) are
// used as-is; server-relative upload paths ("/uploads/…") are prefixed with the
// API origin so they load from the backend, not the web app.
export function imageUri(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return url;
}

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: number;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  category_id: number | null;
  category_name?: string;
  unit: string;
  price: number;
  currency: string;
  image_url: string;
  description: string;
  stock: number;
  is_active: boolean;
  rating: number;
  review_count: number;
  highlights: { label: string; value: string }[];
  nutrition: string;
  seller: string;
};

export type Review = {
  id: number;
  product_id: number;
  user_id: number | null;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'business' | 'admin';
};

export type OrderItem = {
  id: number;
  product_name: string;
  unit: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Order = {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  status: string;
  subtotal: number;
  currency: string;
  payment_status: string;
  payment_ref: string;
  created_at: string;
  items?: OrderItem[];
};

export type Registration = {
  id: number;
  company_name: string;
  business_type: string;
  country: string;
  contact_person: string;
  phone: string;
  email: string;
  product_interest: string;
  message: string;
  status: string;
  created_at: string;
};

async function request<T>(
  path: string,
  opts: { method?: string; body?: any; token?: string | null } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = text ? safeJSON(text) : null;
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

function safeJSON(t: string) {
  try {
    return JSON.parse(t);
  } catch {
    return { raw: t };
  }
}

export const api = {
  // public
  stats: () => request<{ products: number; categories: number; countries: number }>('/api/stats'),
  categories: () => request<Category[]>('/api/categories'),
  products: (q?: { category?: string; q?: string }) => {
    const params = new URLSearchParams();
    if (q?.category) params.set('category', q.category);
    if (q?.q) params.set('q', q.q);
    const qs = params.toString();
    return request<Product[]>(`/api/products${qs ? `?${qs}` : ''}`);
  },
  product: (id: number | string) => request<Product>(`/api/products/${id}`),
  reviews: (id: number | string) => request<Review[]>(`/api/products/${id}/reviews`),
  createReview: (id: number | string, body: { rating: number; comment: string }, token: string) =>
    request<Review>(`/api/products/${id}/reviews`, { method: 'POST', body, token }),

  register: (body: any) => request<{ token: string; user: User }>('/api/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body }),
  me: (token: string) => request<User>('/api/auth/me', { token }),

  createOrder: (body: any, token?: string | null) =>
    request<any>('/api/orders', { method: 'POST', body, token }),
  myOrders: (token: string) => request<Order[]>('/api/my/orders', { token }),

  createRegistration: (body: any, token?: string | null) =>
    request<any>('/api/registrations', { method: 'POST', body, token }),
  myRegistrations: (token: string) => request<Registration[]>('/api/my/registrations', { token }),

  chat: (messages: { role: string; content: string }[]) =>
    request<{ reply: string }>('/api/chat', { method: 'POST', body: { messages } }),

  createInquiry: (body: {
    name: string;
    email?: string;
    phone?: string;
    product?: string;
    message?: string;
    items?: { product_id: number; name: string; unit: string; qty: number }[];
  }) => request<any>('/api/inquiries', { method: 'POST', body }),

  // admin
  admin: {
    stats: (token: string) => request<any>('/api/admin/stats', { token }),
    allProducts: (token: string) => request<Product[]>('/api/products?all=1', { token }),
    createProduct: (body: any, token: string) => request<any>('/api/admin/products', { method: 'POST', body, token }),
    updateProduct: (id: number, body: any, token: string) =>
      request<any>(`/api/admin/products/${id}`, { method: 'PUT', body, token }),
    deleteProduct: (id: number, token: string) => // soft-delete → archive
      request<any>(`/api/admin/products/${id}`, { method: 'DELETE', token }),
    archivedProducts: (token: string) => request<Product[]>('/api/admin/products/archived', { token }),
    restoreProduct: (id: number, token: string) =>
      request<any>(`/api/admin/products/${id}/restore`, { method: 'PATCH', token }),
    purgeProduct: (id: number, token: string) =>
      request<any>(`/api/admin/products/${id}/purge`, { method: 'DELETE', token }),
    // Upload an image file (web File/Blob) and get back a server-relative URL.
    uploadImage: async (file: any, token: string): Promise<{ url: string }> => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/api/admin/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || `Upload failed (${res.status})`);
      return data;
    },
    orders: (token: string) => request<Order[]>('/api/admin/orders', { token }),
    updateOrder: (id: number, body: any, token: string) =>
      request<any>(`/api/admin/orders/${id}`, { method: 'PATCH', body, token }),
    registrations: (token: string) => request<Registration[]>('/api/admin/registrations', { token }),
    updateRegistration: (id: number, body: any, token: string) =>
      request<any>(`/api/admin/registrations/${id}`, { method: 'PATCH', body, token }),
    deleteReview: (id: number, token: string) => request<any>(`/api/admin/reviews/${id}`, { method: 'DELETE', token }),
    inquiries: (token: string) => request<any[]>('/api/admin/inquiries', { token }),
    updateInquiry: (id: number, body: any, token: string) =>
      request<any>(`/api/admin/inquiries/${id}`, { method: 'PATCH', body, token }),
  },
};
