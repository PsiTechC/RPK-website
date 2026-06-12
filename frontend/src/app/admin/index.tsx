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

type Tab = 'dashboard' | 'products' | 'orders' | 'registrations';

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
          {(['dashboard', 'products', 'orders', 'registrations'] as Tab[]).map((t) => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ marginTop: 18 }}>
          {token && tab === 'dashboard' && <Dashboard token={token} />}
          {token && tab === 'products' && <Products token={token} />}
          {token && tab === 'orders' && <Orders token={token} />}
          {token && tab === 'registrations' && <Registrations token={token} />}
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

  async function remove(id: number) {
    const name = products.find((p) => p.id === id)?.name;
    try {
      await api.admin.deleteProduct(id, token);
      toast(name ? `“${name}” deleted` : 'Product deleted', 'info');
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
        <ProductTable products={products} onEdit={setEditing} onDelete={remove} />
      ) : (
        <ProductGrid products={products} width={width} onEdit={setEditing} onDelete={remove} />
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
  onDelete: (id: number) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
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
              <Button label="Delete" variant="danger" onPress={() => onDelete(p.id)} style={styles.smallBtn} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
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
  onDelete: (id: number) => void;
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
            <Button label="Delete" variant="danger" onPress={() => onDelete(p.id)} style={[styles.smallBtn, { flex: 1 }]} />
          </View>
        </Card>
      ))}
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

const styles = StyleSheet.create({
  tabs: { gap: 8 },
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
  table: { minWidth: 760, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.white },
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
  rowTitle: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  rowMeta: { color: colors.muted, fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  orderTotal: { fontWeight: '900', color: colors.navy, fontSize: 17 },
  statusPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F1F2F5' },
  statusChipActive: { backgroundColor: colors.navy },
  statusChipText: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'capitalize' },
  message: { color: colors.text, fontStyle: 'italic', fontSize: 13, marginTop: 4 },
});
