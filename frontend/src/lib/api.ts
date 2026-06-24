// Tiny typed API client for the RPK Go backend.
// Base URL resolution:
//   1. EXPO_PUBLIC_API_URL when explicitly set (any environment), else
//   2. same-origin ("") — the app is served behind a reverse proxy that forwards
//      /api and /uploads to the backend (see docker-compose / nginx.conf).
//      For local dev, set EXPO_PUBLIC_API_URL to your backend's URL.
function resolveApiUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env !== undefined && env !== '') return env;
  return ''; // same origin
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
  is_featured?: boolean;
  rating: number;
  review_count: number;
  highlights: { label: string; value: string }[];
  nutrition: string;
  seller: string;
  created_at?: string;
  updated_at?: string;
};

export type Feedback = {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
};

export type News = {
  id: number;
  title: string;
  tag: string;
  body: string;
  image_url: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
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

export type Role = 'customer' | 'business' | 'admin' | 'import_partner' | 'export_partner';

// The landing route for a signed-in account, by role. One login page; the role
// decides which dashboard/home the user is sent to.
export function roleHome(role: Role): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'import_partner':
      return '/partner/import';
    case 'export_partner':
      return '/partner/export';
    default:
      return '/';
  }
}

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  created_at?: string;
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
  user_id?: number | null;
  company_name: string;
  business_type: string;
  country: string;
  contact_person: string;
  phone: string;
  email: string;
  product_interest: string;
  message: string;
  items?: { product_id: number; name: string; unit: string; qty: number }[];
  whatsapp?: string;
  monthly_capacity?: string;
  target_countries?: string;
  trade_license_url?: string;
  vat_certificate_url?: string;
  company_profile_url?: string;
  status: string;
  created_at: string;
};

export type Quotation = {
  id: number;
  rfq_id: number;
  price: number;
  currency: string;
  validity: string;
  notes: string;
  file_url: string;
  status: string; // sent / approved / rejected
  created_at: string;
};

export type RFQ = {
  id: number;
  user_id?: number | null;
  partner_name?: string;
  partner_email?: string;
  items?: { product_id: number; name: string; unit: string; qty: number }[];
  destination_country: string;
  message: string;
  status: string; // open / quoted / approved / rejected / closed
  created_at: string;
  quotations: Quotation[];
};

export type Shipment = {
  id: number;
  container_no: string;
  shipping_line: string;
  etd: string;
  eta: string;
  status: string; // preparing/in_transit/arrived/delivered
  notes: string;
  updated_at: string;
};

export type PartnerDocument = {
  id: number;
  label: string;
  file_url: string;
  created_at: string;
};

export type PartnerOrder = {
  id: number;
  user_id?: number | null;
  rfq_id?: number | null;
  quotation_id?: number | null;
  partner_name?: string;
  partner_email?: string;
  items?: { product_id: number; name: string; unit: string; qty: number }[];
  amount: number;
  currency: string;
  status: string; // confirmed/processing/shipped/delivered/cancelled
  payment_status: string; // unpaid/paid
  created_at: string;
  updated_at: string;
  shipment?: Shipment | null;
  documents?: PartnerDocument[];
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
  products: (q?: { category?: string; q?: string; featured?: boolean }) => {
    const params = new URLSearchParams();
    if (q?.category) params.set('category', q.category);
    if (q?.q) params.set('q', q.q);
    if (q?.featured) params.set('featured', '1');
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
  forgotPassword: (email: string) => request<{ status: string }>('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    request<{ status: string }>('/api/auth/reset-password', { method: 'POST', body: { token, password } }),

  createOrder: (body: any, token?: string | null) =>
    request<any>('/api/orders', { method: 'POST', body, token }),
  myOrders: (token: string) => request<Order[]>('/api/my/orders', { token }),
  myOrder: (id: number, token: string) => request<Order>(`/api/my/orders/${id}`, { token }),

  createRegistration: (body: any, token?: string | null) =>
    request<any>('/api/registrations', { method: 'POST', body, token }),
  myRegistrations: (token: string) => request<Registration[]>('/api/my/registrations', { token }),

  // Partner RFQ / quotation flow (Phase 5)
  createRFQ: (body: { items: any[]; destination_country?: string; message?: string }, token: string) =>
    request<{ id: number; status: string }>('/api/rfqs', { method: 'POST', body, token }),
  myRFQs: (token: string) => request<RFQ[]>('/api/my/rfqs', { token }),
  respondQuotation: (id: number, status: 'approved' | 'rejected', token: string) =>
    request<any>(`/api/my/quotations/${id}`, { method: 'PATCH', body: { status }, token }),
  myPartnerOrders: (token: string) => request<PartnerOrder[]>('/api/my/partner-orders', { token }),

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

  createFeedback: (body: { rating: number; comment?: string }) =>
    request<any>('/api/feedback', { method: 'POST', body }),

  // Upload a partner trade document (PDF or image). Public + rate-limited —
  // applicants aren't logged in yet. Returns a server-relative URL.
  uploadDocument: async (file: any): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_URL}/api/uploads/document`, { method: 'POST', body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `Upload failed (${res.status})`);
    return data;
  },

  news: () => request<News[]>('/api/news'),

  // admin
  admin: {
    stats: (token: string) => request<any>('/api/admin/stats', { token }),
    customers: (token: string) => request<User[]>('/api/admin/customers', { token }),
    allProducts: (token: string) => request<Product[]>('/api/products?all=1', { token }),
    createProduct: (body: any, token: string) => request<any>('/api/admin/products', { method: 'POST', body, token }),
    updateProduct: (id: number, body: any, token: string) =>
      request<any>(`/api/admin/products/${id}`, { method: 'PUT', body, token }),
    setFeatured: (id: number, featured: boolean, token: string) =>
      request<any>(`/api/admin/products/${id}/featured`, { method: 'PATCH', body: { featured }, token }),
    news: (token: string) => request<News[]>('/api/admin/news', { token }),
    createNews: (body: any, token: string) => request<any>('/api/admin/news', { method: 'POST', body, token }),
    updateNews: (id: number, body: any, token: string) => request<any>(`/api/admin/news/${id}`, { method: 'PUT', body, token }),
    deleteNews: (id: number, token: string) => request<any>(`/api/admin/news/${id}`, { method: 'DELETE', token }),
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
    getOrder: (id: number, token: string) => request<Order>(`/api/admin/orders/${id}`, { token }),
    updateOrder: (id: number, body: any, token: string) =>
      request<any>(`/api/admin/orders/${id}`, { method: 'PATCH', body, token }),
    registrations: (token: string) => request<Registration[]>('/api/admin/registrations', { token }),
    updateRegistration: (id: number, body: any, token: string) =>
      request<any>(`/api/admin/registrations/${id}`, { method: 'PATCH', body, token }),
    createCategory: (body: { name: string }, token: string) => request<Category>('/api/admin/categories', { method: 'POST', body, token }),
    deleteCategory: (id: number, token: string) => request<any>(`/api/admin/categories/${id}`, { method: 'DELETE', token }),
    reorderCategories: (ids: number[], token: string) => request<any>('/api/admin/categories/reorder', { method: 'PATCH', body: { ids }, token }),
    reorderProducts: (ids: number[], token: string) => request<any>('/api/admin/products/reorder', { method: 'PATCH', body: { ids }, token }),
    deleteReview: (id: number, token: string) => request<any>(`/api/admin/reviews/${id}`, { method: 'DELETE', token }),
    inquiries: (token: string) => request<any[]>('/api/admin/inquiries', { token }),
    updateInquiry: (id: number, body: any, token: string) =>
      request<any>(`/api/admin/inquiries/${id}`, { method: 'PATCH', body, token }),
    feedback: (token: string) => request<Feedback[]>('/api/admin/feedback', { token }),
    rfqs: (token: string) => request<RFQ[]>('/api/admin/rfqs', { token }),
    createQuotation: (rfqId: number, body: { price: number; currency?: string; validity?: string; notes?: string; file_url?: string }, token: string) =>
      request<{ id: number }>(`/api/admin/rfqs/${rfqId}/quotations`, { method: 'POST', body, token }),
    partnerOrders: (token: string) => request<PartnerOrder[]>('/api/admin/partner-orders', { token }),
    updatePartnerOrder: (id: number, body: { status?: string; payment_status?: string }, token: string) =>
      request<any>(`/api/admin/partner-orders/${id}`, { method: 'PATCH', body, token }),
    upsertShipment: (orderId: number, body: { container_no?: string; shipping_line?: string; etd?: string; eta?: string; status?: string; notes?: string }, token: string) =>
      request<any>(`/api/admin/partner-orders/${orderId}/shipment`, { method: 'PUT', body, token }),
    addOrderDocument: (orderId: number, body: { label?: string; file_url: string }, token: string) =>
      request<any>(`/api/admin/partner-orders/${orderId}/documents`, { method: 'POST', body, token }),
    deleteOrderDocument: (id: number, token: string) =>
      request<any>(`/api/admin/partner-documents/${id}`, { method: 'DELETE', token }),
  },
};
