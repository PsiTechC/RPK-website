import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { api, Product, Order, Registration, Category } from '../../lib/api';
import { colors, radius, shadow } from '../../lib/theme';
import { useApp, money } from '../../lib/store';
import { Container, SectionTitle, Button, Card, Badge } from '../../components/ui';
import { ProductForm } from '../../components/admin/ProductForm';
import { ProductThumb } from '../../components/admin/ProductThumb';
import { useToast } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';

type Tab = 'dashboard' | 'products' | 'arrange' | 'orders' | 'registrations' | 'inquiries' | 'archived';

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const statusTone: Record<string, any> = {
  pending: 'orange', confirmed: 'navy', processing: 'navy', shipped: 'navy',
  delivered: 'green', cancelled: 'red', approved: 'green', rejected: 'red', paid: 'green', unpaid: 'muted',
};

export default function Admin() {
  const router = useRouter();
  const { user, token, ready } = useApp();
  const [tab, setTab] = useState<Tab>('dashboard');

  if (ready && (!user || user.role !== 'admin')) {
    return (
      <Container style={{ marginTop: 60, maxWidth: 460 }}>
        <Card style={{ alignItems: 'center', gap: 14, paddingVertical: 40 }}>
          <Text style={{ fontSize: 44 }}>🚫</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>Admin access required</Text>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>Log in with an admin account to manage the store.</Text>
          <Button label="Go to login" onPress={() => router.push('/login')} />
        </Card>
      </Container>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      <Container style={{ marginTop: 22 }}>
        <SectionTitle title="Admin Dashboard" subtitle="Manage products, orders & registrations" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {(['dashboard', 'products', 'arrange', 'orders', 'registrations', 'inquiries', 'archived'] as Tab[]).map((t) => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ marginTop: 18 }}>
          {token && tab === 'dashboard' && <Dashboard token={token} />}
          {token && tab === 'products' && <Products token={token} />}
          {token && tab === 'arrange' && <Arrange token={token} />}
          {token && tab === 'orders' && <Orders token={token} />}
          {token && tab === 'registrations' && <Registrations token={token} />}
          {token && tab === 'inquiries' && <Inquiries token={token} />}
          {token && tab === 'archived' && <Archived token={token} />}
        </View>
      </Container>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// ---------- Dashboard ----------
function Dashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    api.admin.stats(token).then(setStats).catch(() => {});
  }, [token]);
  if (!stats) return <Text style={styles.muted}>Loading…</Text>;

  const cards = [
    { label: 'Revenue (paid)', value: money(stats.total_revenue), tone: colors.green },
    { label: 'Total Orders', value: stats.total_orders, tone: colors.navy },
    { label: 'Pending Orders', value: stats.pending_orders, tone: colors.orange },
    { label: 'Products', value: stats.total_products, tone: colors.navy },
    { label: 'Customers', value: stats.total_customers, tone: colors.navy },
    { label: 'Registrations', value: stats.total_registrations, tone: colors.orange },
    { label: 'Pending Reg.', value: stats.pending_registrations, tone: colors.red },
    { label: 'Categories', value: stats.total_categories, tone: colors.navy },
  ];

  const byStatus: Record<string, number> = stats.orders_by_status || {};
  const maxV = Math.max(1, ...Object.values(byStatus));

  return (
    <View style={{ gap: 20 }}>
      <View style={styles.cardGrid}>
        {cards.map((c) => (
          <Card key={c.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: c.tone }]}>{c.value}</Text>
            <Text style={styles.statLabel}>{c.label}</Text>
          </Card>
        ))}
      </View>

      <Card>
        <Text style={styles.h}>Orders by status</Text>
        <View style={{ gap: 8, marginTop: 10 }}>
          {Object.keys(byStatus).length === 0 ? (
            <Text style={styles.muted}>No orders yet.</Text>
          ) : (
            Object.entries(byStatus).map(([k, v]) => (
              <View key={k} style={styles.barRow}>
                <Text style={styles.barLabel}>{k}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(v / maxV) * 100}%` }]} />
                </View>
                <Text style={styles.barVal}>{v}</Text>
              </View>
            ))
          )}
        </View>
      </Card>
    </View>
  );
}

// ---------- Products ----------
type ProductView = 'list' | 'grid';

function Products({ token }: { token: string }) {
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined); // undefined=closed, null=new
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ProductView>('list');
  const [confirming, setConfirming] = useState<Product | null>(null); // product pending delete
  const toast = useToast();

  async function load() {
    setLoading(true);
    const [p, c] = await Promise.all([api.admin.allProducts(token), api.categories()]);
    setProducts(p);
    setCategories(c);
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [token]);

  async function confirmDelete() {
    const p = confirming;
    if (!p) return;
    setConfirming(null);
    try {
      await api.admin.deleteProduct(p.id, token);
      toast(`“${p.name}” archived — restore it from the Archived tab`, 'info');
      load();
    } catch {
      toast('Could not delete product', 'error');
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.toolbar}>
        <Text style={styles.h}>{products.length} products</Text>
        <View style={styles.toolbarRight}>
          <View style={styles.viewToggle}>
            <Pressable
              style={[styles.viewBtn, view === 'list' && styles.viewBtnActive]}
              onPress={() => setView('list')}
              accessibilityLabel="List view"
            >
              <Text style={[styles.viewIcon, view === 'list' && styles.viewIconActive]}>☰</Text>
            </Pressable>
            <Pressable
              style={[styles.viewBtn, view === 'grid' && styles.viewBtnActive]}
              onPress={() => setView('grid')}
              accessibilityLabel="Grid view"
            >
              <Text style={[styles.viewIcon, view === 'grid' && styles.viewIconActive]}>▦</Text>
            </Pressable>
          </View>
          <Button label="+ Add product" onPress={() => setEditing(null)} />
        </View>
      </View>

      {loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : view === 'list' ? (
        <ProductTable products={products} onEdit={setEditing} onDelete={setConfirming} />
      ) : (
        <ProductGrid products={products} width={width} onEdit={setEditing} onDelete={setConfirming} />
      )}

      {editing !== undefined && (
        <ProductForm
          token={token}
          product={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            load();
          }}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title="Delete this product?"
          message={`“${confirming.name}” will be moved to the Archived tab and hidden from the store. You can restore it anytime.`}
          confirmLabel="Delete product"
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(null)}
        />
      )}
    </View>
  );
}

// Tabular (list) view — an image column plus all the product fields.
function ProductTable({
  products,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  const { width } = useWindowDimensions();
  // On roomy screens the table fills the container (flex columns absorb the
  // extra width — no empty gap on the right). On small screens it keeps its
  // min width and scrolls horizontally so nothing gets squashed.
  const fits = width >= 820;

  const table = (
    <View style={[styles.table, fits ? styles.tableFull : styles.tableMin]}>
        <View style={[styles.tr, styles.thead]}>
          <Text style={[styles.th, styles.colImg]}>Image</Text>
          <Text style={[styles.th, styles.colName]}>Name</Text>
          <Text style={[styles.th, styles.colCat]}>Category</Text>
          <Text style={[styles.th, styles.colPrice]}>Price</Text>
          <Text style={[styles.th, styles.colUnit]}>Unit</Text>
          <Text style={[styles.th, styles.colStock]}>Stock</Text>
          <Text style={[styles.th, styles.colStatus]}>Status</Text>
          <Text style={[styles.th, styles.colActions]}>Actions</Text>
        </View>
        {products.map((p, i) => (
          <View key={p.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
            <View style={styles.colImg}><ProductThumb product={p} size={44} /></View>
            <Text style={[styles.td, styles.colName, styles.tdStrong]} numberOfLines={2}>{p.name}</Text>
            <Text style={[styles.td, styles.colCat]} numberOfLines={1}>{p.category_name || 'Uncategorised'}</Text>
            <Text style={[styles.td, styles.colPrice]}>{money(p.price, p.currency)}</Text>
            <Text style={[styles.td, styles.colUnit]}>{p.unit}</Text>
            <Text style={[styles.td, styles.colStock]}>{p.stock}</Text>
            <View style={styles.colStatus}>
              <Badge text={p.is_active ? 'active' : 'hidden'} tone={p.is_active ? 'green' : 'muted'} />
            </View>
            <View style={[styles.colActions, styles.actionCell]}>
              <Button label="Edit" variant="ghost" onPress={() => onEdit(p)} style={styles.smallBtn} />
              <Button label="Delete" variant="danger" onPress={() => onDelete(p)} style={styles.smallBtn} />
            </View>
          </View>
        ))}
    </View>
  );

  // Full width on desktop; horizontal scroll only when the screen is narrow.
  return fits ? table : <ScrollView horizontal showsHorizontalScrollIndicator={false}>{table}</ScrollView>;
}

// Grid view — image-forward cards.
function ProductGrid({
  products,
  width,
  onEdit,
  onDelete,
}: {
  products: Product[];
  width: number;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  const gap = 12;
  const cols = width < 620 ? 1 : width < 920 ? 2 : 3;
  const basis = cols === 1 ? '100%' : `calc(${100 / cols}% - ${(gap * (cols - 1)) / cols}px)`;
  return (
    <View style={styles.grid}>
      {products.map((p) => (
        <Card key={p.id} style={[styles.gridCard, { flexBasis: basis as any, maxWidth: basis as any }]}>
          <View style={styles.gridTop}>
            <ProductThumb product={p} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={2}>{p.name}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>{p.category_name || 'Uncategorised'}</Text>
            </View>
            {!p.is_active && <Badge text="hidden" tone="muted" />}
          </View>
          <Text style={styles.gridMeta}>{money(p.price, p.currency)} / {p.unit} · stock {p.stock}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Edit" variant="ghost" onPress={() => onEdit(p)} style={[styles.smallBtn, { flex: 1 }]} />
            <Button label="Delete" variant="danger" onPress={() => onDelete(p)} style={[styles.smallBtn, { flex: 1 }]} />
          </View>
        </Card>
      ))}
    </View>
  );
}

// ---------- Archived (soft-deleted) products ----------
function Archived({ token }: { token: string }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState<Product | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      setItems(await api.admin.archivedProducts(token));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [token]);

  async function restore(p: Product) {
    try {
      await api.admin.restoreProduct(p.id, token);
      toast(`“${p.name}” restored`, 'success');
      load();
    } catch {
      toast('Could not restore product', 'error');
    }
  }
  async function purge() {
    const p = purging;
    if (!p) return;
    setPurging(null);
    try {
      await api.admin.purgeProduct(p.id, token);
      toast(`“${p.name}” permanently deleted`, 'info');
      load();
    } catch {
      toast('Could not delete product', 'error');
    }
  }

  if (loading) return <Text style={styles.muted}>Loading…</Text>;

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.h}>{items.length} archived product{items.length === 1 ? '' : 's'}</Text>
      {items.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 36 }}>
          <Text style={{ fontSize: 40 }}>🗃️</Text>
          <Text style={styles.muted}>No archived products. Deleted products appear here and can be restored.</Text>
        </Card>
      ) : (
        items.map((p) => (
          <Card key={p.id} style={styles.archRow}>
            <ProductThumb product={p} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{p.name}</Text>
              <Text style={styles.rowMeta}>{p.category_name || 'Uncategorised'} · {money(p.price, p.currency)} / {p.unit}</Text>
            </View>
            <Button label="↩ Restore" variant="navy" onPress={() => restore(p)} style={styles.smallBtn} />
            <Button label="Delete forever" variant="danger" onPress={() => setPurging(p)} style={styles.smallBtn} />
          </Card>
        ))
      )}

      {purging && (
        <ConfirmDialog
          title="Permanently delete?"
          message={`“${purging.name}” will be deleted forever. This cannot be undone.`}
          confirmLabel="Delete forever"
          onConfirm={purge}
          onCancel={() => setPurging(null)}
        />
      )}
    </View>
  );
}

// ---------- Orders ----------
function Orders({ token }: { token: string }) {
  const { width } = useWindowDimensions();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setOrders(await api.admin.orders(token));
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [token]);

  async function setStatus(id: number, status: string) {
    await api.admin.updateOrder(id, { status }, token);
    load();
  }

  if (loading) return <Text style={styles.muted}>Loading…</Text>;
  if (orders.length === 0) return <Text style={styles.muted}>No orders yet.</Text>;

  return (
    <View style={{ gap: 12 }}>
      {orders.map((o) => (
        <Card key={o.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <View>
              <Text style={styles.rowTitle}>Order #{o.id} · {o.customer_name}</Text>
              <Text style={styles.rowMeta}>{o.customer_email} · {o.customer_phone || 'no phone'}</Text>
              <Text style={styles.rowMeta}>{new Date(o.created_at).toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={styles.orderTotal}>{money(o.subtotal, o.currency)}</Text>
              <Badge text={o.payment_status} tone={statusTone[o.payment_status] || 'muted'} />
            </View>
          </View>
          <View style={styles.statusPicker}>
            {ORDER_STATUSES.map((s) => (
              <Pressable key={s} style={[styles.statusChip, o.status === s && styles.statusChipActive]} onPress={() => setStatus(o.id, s)}>
                <Text style={[styles.statusChipText, o.status === s && { color: colors.white }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ))}
    </View>
  );
}

// ---------- Registrations ----------
function Registrations({ token }: { token: string }) {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setRegs(await api.admin.registrations(token));
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [token]);

  async function setStatus(id: number, status: string) {
    await api.admin.updateRegistration(id, { status }, token);
    load();
  }

  if (loading) return <Text style={styles.muted}>Loading…</Text>;
  if (regs.length === 0) return <Text style={styles.muted}>No registrations yet.</Text>;

  return (
    <View style={{ gap: 12 }}>
      {regs.map((r) => (
        <Card key={r.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={styles.rowTitle}>{r.company_name}</Text>
              <Text style={styles.rowMeta}>{r.business_type} · {r.country || '—'} · {r.contact_person || '—'}</Text>
              <Text style={styles.rowMeta}>{r.email} · {r.phone || 'no phone'}</Text>
              {Array.isArray(r.items) && r.items.length > 0 && (
                <View style={{ marginTop: 4, gap: 2 }}>
                  <Text style={[styles.rowMeta, { fontWeight: '800' }]}>Requirement:</Text>
                  {r.items.map((it: any, idx: number) => (
                    <Text key={idx} style={styles.rowMeta}>• {it.name} — {it.qty} {it.unit}</Text>
                  ))}
                </View>
              )}
              {!!r.product_interest && <Text style={styles.rowMeta}>Interest: {r.product_interest}</Text>}
              {!!r.message && <Text style={styles.message}>“{r.message}”</Text>}
            </View>
            <Badge text={r.status} tone={statusTone[r.status] || 'muted'} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Approve" variant="navy" onPress={() => setStatus(r.id, 'approved')} style={{ paddingVertical: 8, paddingHorizontal: 16 }} />
            <Button label="Reject" variant="danger" onPress={() => setStatus(r.id, 'rejected')} style={{ paddingVertical: 8, paddingHorizontal: 16 }} />
            <Button label="Pending" variant="ghost" onPress={() => setStatus(r.id, 'pending')} style={{ paddingVertical: 8, paddingHorizontal: 16 }} />
          </View>
        </Card>
      ))}
    </View>
  );
}

function Inquiries({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setItems(await api.admin.inquiries(token));
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [token]);

  async function setStatus(id: number, status: string) {
    await api.admin.updateInquiry(id, { status }, token);
    load();
  }

  if (loading) return <Text style={styles.muted}>Loading…</Text>;
  if (items.length === 0) return <Text style={styles.muted}>No inquiries yet.</Text>;

  return (
    <View style={{ gap: 12 }}>
      {items.map((q) => (
        <Card key={q.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={styles.rowTitle}>{q.name}</Text>
              <Text style={styles.rowMeta}>{q.email || 'no email'} · {q.phone || 'no phone'}</Text>
              {Array.isArray(q.items) && q.items.length > 0 && (
                <View style={{ marginTop: 4, gap: 2 }}>
                  <Text style={[styles.rowMeta, { fontWeight: '800' }]}>Requirement:</Text>
                  {q.items.map((it: any, idx: number) => (
                    <Text key={idx} style={styles.rowMeta}>• {it.name} — {it.qty} {it.unit}</Text>
                  ))}
                </View>
              )}
              {!!q.product && <Text style={styles.rowMeta}>Product: {q.product}</Text>}
              {!!q.message && <Text style={styles.message}>“{q.message}”</Text>}
              <Text style={styles.rowMeta}>{new Date(q.created_at).toLocaleString()}</Text>
            </View>
            <Badge text={q.status} tone={statusTone[q.status] || 'muted'} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Mark contacted" variant="navy" onPress={() => setStatus(q.id, 'contacted')} style={{ paddingVertical: 8, paddingHorizontal: 16 }} />
            <Button label="Close" variant="ghost" onPress={() => setStatus(q.id, 'closed')} style={{ paddingVertical: 8, paddingHorizontal: 16 }} />
            <Button label="New" variant="ghost" onPress={() => setStatus(q.id, 'new')} style={{ paddingVertical: 8, paddingHorizontal: 16 }} />
          </View>
        </Card>
      ))}
    </View>
  );
}

// Arrange — admin controls the display order of categories and of products
// within each category (↑ / ↓). Saved instantly to the server.
function Arrange({ token }: { token: string }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<string>('');
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function load() {
    setLoading(true);
    const [c, p] = await Promise.all([api.categories(), api.admin.allProducts(token)]);
    setCats(c);
    setProducts(p);
    setActiveCat((a) => a || (c[0]?.name ?? ''));
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    setRows(products.filter((p) => p.category_name === activeCat));
  }, [activeCat, products]);

  async function moveCat(i: number, dir: number) {
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    const arr = [...cats];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setCats(arr);
    try {
      await api.admin.reorderCategories(arr.map((c) => c.id), token);
      toast('Category order saved', 'success');
    } catch {
      toast('Could not save order', 'error');
    }
  }

  async function moveProduct(i: number, dir: number) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const arr = [...rows];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setRows(arr);
    try {
      await api.admin.reorderProducts(arr.map((p) => p.id), token);
      toast('Product order saved', 'success');
    } catch {
      toast('Could not save order', 'error');
    }
  }

  if (loading) return <Text style={styles.muted}>Loading…</Text>;

  return (
    <View style={{ gap: 24 }}>
      {/* Category order */}
      <View style={{ gap: 10 }}>
        <Text style={styles.h}>Category order (how they appear on the site)</Text>
        {cats.map((c, i) => (
          <Card key={c.id} style={styles.arrRow}>
            <Text style={styles.arrPos}>{i + 1}</Text>
            <Text style={styles.arrName}>{c.name}</Text>
            <View style={styles.arrBtns}>
              <Pressable style={[styles.arrBtn, i === 0 && styles.arrBtnOff]} disabled={i === 0} onPress={() => moveCat(i, -1)}><Text style={styles.arrBtnText}>↑</Text></Pressable>
              <Pressable style={[styles.arrBtn, i === cats.length - 1 && styles.arrBtnOff]} disabled={i === cats.length - 1} onPress={() => moveCat(i, 1)}><Text style={styles.arrBtnText}>↓</Text></Pressable>
            </View>
          </Card>
        ))}
      </View>

      {/* Product order within a category */}
      <View style={{ gap: 10 }}>
        <Text style={styles.h}>Product order within a category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {cats.map((c) => (
            <Pressable key={c.id} style={[styles.tab, activeCat === c.name && styles.tabActive]} onPress={() => setActiveCat(c.name)}>
              <Text style={[styles.tabText, activeCat === c.name && styles.tabTextActive]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {rows.length === 0 ? (
          <Text style={styles.muted}>No products in this category.</Text>
        ) : (
          rows.map((p, i) => (
            <Card key={p.id} style={styles.arrRow}>
              <Text style={styles.arrPos}>{i + 1}</Text>
              <Text style={styles.arrName} numberOfLines={1}>{p.name}</Text>
              <View style={styles.arrBtns}>
                <Pressable style={[styles.arrBtn, i === 0 && styles.arrBtnOff]} disabled={i === 0} onPress={() => moveProduct(i, -1)}><Text style={styles.arrBtnText}>↑</Text></Pressable>
                <Pressable style={[styles.arrBtn, i === rows.length - 1 && styles.arrBtnOff]} disabled={i === rows.length - 1} onPress={() => moveProduct(i, 1)}><Text style={styles.arrBtnText}>↓</Text></Pressable>
              </View>
            </Card>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { gap: 8 },
  arrRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  arrPos: { width: 26, color: colors.muted, fontWeight: '900', fontSize: 14 },
  arrName: { flex: 1, color: colors.ink, fontWeight: '700', fontSize: 14 },
  arrBtns: { flexDirection: 'row', gap: 6 },
  arrBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.offWhite },
  arrBtnOff: { opacity: 0.35 },
  arrBtnText: { fontSize: 18, fontWeight: '900', color: colors.navy },
  tab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: '#F1F2F5' },
  tabActive: { backgroundColor: colors.orange },
  tabText: { fontWeight: '800', color: colors.muted, textTransform: 'capitalize' },
  tabTextActive: { color: colors.white },
  muted: { color: colors.muted, fontSize: 14 },
  h: { fontWeight: '900', fontSize: 16, color: colors.ink },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { minWidth: 150, flexGrow: 1, flexBasis: 150, gap: 4 },
  statValue: { fontSize: 26, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 13 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 90, color: colors.text, fontSize: 13, textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 14, backgroundColor: '#EEF0F3', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.orange, borderRadius: 999 },
  barVal: { width: 30, textAlign: 'right', fontWeight: '800', color: colors.navy },
  adminRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, flexWrap: 'wrap' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewToggle: { flexDirection: 'row', backgroundColor: '#F1F2F5', borderRadius: radius.pill, padding: 3 },
  viewBtn: { width: 38, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  viewBtnActive: { backgroundColor: colors.white, ...shadow.soft },
  viewIcon: { fontSize: 16, color: colors.muted, fontWeight: '900' },
  viewIconActive: { color: colors.orange },
  // table
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.white },
  tableFull: { width: '100%' },
  tableMin: { minWidth: 760 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  thead: { backgroundColor: '#FAFAFB', borderTopWidth: 0 },
  trAlt: { backgroundColor: '#FCFCFD' },
  th: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { fontSize: 14, color: colors.text },
  tdStrong: { fontWeight: '800', color: colors.ink },
  colImg: { width: 52 },
  colName: { flex: 2.2, minWidth: 150 },
  colCat: { flex: 1.5, minWidth: 110, color: colors.muted },
  colPrice: { width: 96 },
  colUnit: { width: 60 },
  colStock: { width: 60 },
  colStatus: { width: 84 },
  colActions: { width: 150 },
  actionCell: { flexDirection: 'row', gap: 8 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  // grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { gap: 10, padding: 14, flexGrow: 1 },
  gridTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  gridMeta: { color: colors.muted, fontSize: 13 },
  archRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, flexWrap: 'wrap' },
  rowTitle: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  rowMeta: { color: colors.muted, fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  orderTotal: { fontWeight: '900', color: colors.navy, fontSize: 17 },
  statusPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F1F2F5' },
  statusChipActive: { backgroundColor: colors.navy },
  statusChipText: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'capitalize' },
  message: { color: colors.text, fontStyle: 'italic', fontSize: 13, marginTop: 4 },
});
