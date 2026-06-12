import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, Product, User } from './api';

// Web-first persistence: use localStorage when available, fall back to memory.
const mem: Record<string, string> = {};
const storage = {
  get(k: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(k);
    } catch {}
    return mem[k] ?? null;
  },
  set(k: string, v: string) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(k, v);
        return;
      }
    } catch {}
    mem[k] = v;
  },
  del(k: string) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(k);
        return;
      }
    } catch {}
    delete mem[k];
  },
};

export type CartLine = { product: Product; qty: number };

type AppState = {
  user: User | null;
  token: string | null;
  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: { name: string; email: string; password: string; phone?: string; role?: string }) => Promise<void>;
  logout: () => void;
  addToCart: (p: Product, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // hydrate
  useEffect(() => {
    const t = storage.get('rpk_token');
    const c = storage.get('rpk_cart');
    if (c) {
      try {
        setCart(JSON.parse(c));
      } catch {}
    }
    if (t) {
      setToken(t);
      api
        .me(t)
        .then(setUser)
        .catch(() => {
          storage.del('rpk_token');
          setToken(null);
        })
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  // persist cart
  useEffect(() => {
    storage.set('rpk_cart', JSON.stringify(cart));
  }, [cart]);

  function applyAuth(t: string, u: User) {
    storage.set('rpk_token', t);
    setToken(t);
    setUser(u);
  }

  const value = useMemo<AppState>(() => {
    const cartCount = cart.reduce((n, l) => n + l.qty, 0);
    const cartTotal = cart.reduce((n, l) => n + l.qty * l.product.price, 0);
    return {
      user,
      token,
      cart,
      cartCount,
      cartTotal,
      ready,
      async login(email, password) {
        const r = await api.login({ email, password });
        applyAuth(r.token, r.user);
      },
      async register(body) {
        const r = await api.register(body);
        applyAuth(r.token, r.user);
      },
      logout() {
        storage.del('rpk_token');
        setToken(null);
        setUser(null);
      },
      addToCart(p, qty = 1) {
        setCart((prev) => {
          const found = prev.find((l) => l.product.id === p.id);
          if (found) return prev.map((l) => (l.product.id === p.id ? { ...l, qty: l.qty + qty } : l));
          return [...prev, { product: p, qty }];
        });
      },
      setQty(productId, qty) {
        setCart((prev) =>
          prev
            .map((l) => (l.product.id === productId ? { ...l, qty } : l))
            .filter((l) => l.qty > 0)
        );
      },
      removeFromCart(productId) {
        setCart((prev) => prev.filter((l) => l.product.id !== productId));
      },
      clearCart() {
        setCart([]);
      },
    };
  }, [user, token, cart, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}

export function money(n: number, currency = 'AED') {
  return `${currency} ${Number(n).toFixed(2)}`;
}
