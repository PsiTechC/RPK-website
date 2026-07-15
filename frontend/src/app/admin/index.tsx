import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Platform, Linking, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api, imageUri, Product, Order, Registration, Category, User, News, Founder, Feedback as FeedbackItem, RFQ, PartnerOrder } from '../../lib/api';
import { colors, radius, shadow } from '../../lib/theme';
import { useApp, money } from '../../lib/store';
import { fmtDate, fmtDateTime } from '../../lib/date';
import { Image as ExpoImage } from 'expo-image';
import { Container, SectionTitle, Button, Card, Badge, Field } from '../../components/ui';
import { ProductForm } from '../../components/admin/ProductForm';
import { ProductThumb } from '../../components/admin/ProductThumb';
import { Logo } from '../../components/Logo';
import { useToast } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Donut } from '../../components/Donut';
import { AreaChart } from '../../components/AreaChart';
import { OrderDetailModal } from '../../components/OrderDetailModal';

// Per-tab icons for the pill bar.
const TAB_ICONS: Record<Tab, keyof typeof Ionicons.glyphMap> = {
  dashboard: 'grid-outline',
  products: 'cube-outline',
  arrange: 'swap-vertical-outline',
  orders: 'receipt-outline',
  customers: 'people-outline',
  registrations: 'document-text-outline',
  inquiries: 'chatbubbles-outline',
  rfqs: 'document-text-outline',
  porders: 'cube-outline',
  feedback: 'star-outline',
  news: 'newspaper-outline',
  founders: 'people-circle-outline',
  archived: 'archive-outline',
};

// TODO: wire to API — last 7 days of paid revenue. Placeholder shape only.
const PLACEHOLDER_REVENUE_7D = [120, 240, 180, 360, 300, 520, 460];

type Tab = 'dashboard' | 'products' | 'arrange' | 'orders' | 'customers' | 'registrations' | 'inquiries' | 'rfqs' | 'porders' | 'feedback' | 'news' | 'founders' | 'archived';

const ALL_TABS: Tab[] = ['dashboard', 'products', 'arrange', 'orders', 'customers', 'registrations', 'inquiries', 'rfqs', 'porders', 'feedback', 'news', 'founders', 'archived'];
const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const statusTone: Record<string, any> = {
  pending: 'orange', confirmed: 'navy', processing: 'navy', shipped: 'navy',
  delivered: 'green', cancelled: 'red', approved: 'green', rejected: 'red', paid: 'green', unpaid: 'muted',
  new: 'orange', contacted: 'navy', closed: 'muted',
};
const REG_STATUSES = ['approved', 'pending', 'rejected'];
const INQ_STATUSES = ['new', 'contacted', 'closed'];
const toneColor: Record<string, string> = {
  orange: colors.orange, navy: colors.navy, green: colors.green, red: colors.red, muted: colors.muted,
};

// Full width on desktop; horizontal scroll on narrow screens so columns never squash.
function Tbl({ fits, children }: { fits: boolean; children: React.ReactNode }) {
  return fits ? <>{children}</> : <ScrollView horizontal showsHorizontalScrollIndicator={false}>{children}</ScrollView>;
}

const TAB_LABELS: Record<Tab, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  arrange: 'Arrange',
  orders: 'Orders',
  customers: 'Customers',
  registrations: 'Registrations',
  inquiries: 'Inquiries',
  rfqs: 'RFQ Requests',
  porders: 'Partner Orders',
  feedback: 'Feedback',
  news: 'News',
  founders: 'Founders',
  archived: 'Archived',
};

// Grouped sidebar navigation — each tab lives under a titled section (matches the
// dashboard IA: Overview / Catalogue / Commerce / Trade / Content).
const NAV_SECTIONS: { title: string; tabs: Tab[] }[] = [
  { title: 'OVERVIEW', tabs: ['dashboard'] },
  { title: 'CATALOGUE', tabs: ['products', 'arrange'] },
  { title: 'COMMERCE', tabs: ['orders', 'customers', 'registrations'] },
  { title: 'TRADE', tabs: ['inquiries', 'rfqs', 'porders'] },
  { title: 'CONTENT', tabs: ['feedback', 'news', 'founders', 'archived'] },
];

// Which admin-stats field supplies the small count badge next to a nav item.
const TAB_COUNT_KEY: Partial<Record<Tab, string>> = {
  products: 'total_products',
  orders: 'total_orders',
  customers: 'total_customers',
  registrations: 'total_registrations',
  rfqs: 'total_rfqs',
  porders: 'partner_orders',
};

export default function Admin() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { user, token, ready, logout } = useApp();
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const [tab, setTab] = useState<Tab>(() =>
    params.tab && ALL_TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'dashboard'
  );

  // Deep-link: switch tab when arriving via ?tab=… (e.g. from the navbar bell).
  useEffect(() => {
    if (params.tab && ALL_TABS.includes(params.tab as Tab)) setTab(params.tab as Tab);
  }, [params.tab]);

  // Sidebar count badges + the topbar profile dropdown (holds Log out).
  const [counts, setCounts] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  useEffect(() => {
    if (token) api.admin.stats(token).then(setCounts).catch(() => {});
  }, [token]);

  // Products controls live in the topbar, so their state is lifted here.
  const [prodSearch, setProdSearch] = useState('');
  const [prodView, setProdView] = useState<'list' | 'grid'>('list');
  const [prodAddNonce, setProdAddNonce] = useState(0);
  // Orders status filter (also lives in the topbar, on the right).
  const [orderStatus, setOrderStatus] = useState('all');

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
    <View style={styles.shell}>
      {/* Sidebar */}
      <View style={[styles.sidebar, { width: compact ? 64 : 232 }]}>
        <Pressable style={styles.brand} onPress={() => router.push('/')}>
          <Logo size={compact ? 26 : 30} />
        </Pressable>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 6 }} showsVerticalScrollIndicator={false}>
          {NAV_SECTIONS.map((section) => (
            <View key={section.title} style={styles.navSection}>
              {!compact && <Text style={styles.navSectionLabel}>{section.title}</Text>}
              {compact && <View style={styles.navSectionDivider} />}
              {section.tabs.map((t) => {
                const active = tab === t;
                const countKey = TAB_COUNT_KEY[t];
                const count = countKey && counts ? Number(counts[countKey] ?? 0) : undefined;
                return (
                  <Pressable key={t} style={({ hovered }: any) => [styles.navItem, compact && styles.navItemCompact, hovered && !active && styles.navItemHover, active && styles.navItemActive]} onPress={() => setTab(t)}>
                    {active && <View style={styles.navActiveBar} />}
                    <Ionicons name={TAB_ICONS[t]} size={20} color={active ? colors.red : colors.muted} />
                    {!compact && <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>{TAB_LABELS[t]}</Text>}
                    {!compact && count !== undefined && count > 0 && (
                      <Text style={[styles.navCount, active && styles.navCountActive]}>{count}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
        <View style={styles.sideFooter}>
          <Pressable style={({ hovered }: any) => [styles.navItem, compact && styles.navItemCompact, hovered && styles.navItemHover]} onPress={() => router.push('/')}>
            <Ionicons name="open-outline" size={20} color={colors.ink} />
            {!compact && <Text style={[styles.navLabel, { fontWeight: '900', color: colors.ink }]}>View site</Text>}
          </Pressable>
        </View>
      </View>

      {/* Main */}
      <View style={styles.main}>
        <View style={[styles.topbar, compact && styles.topbarCompact]}>
          <View style={{ flex: 1, minWidth: 130 }}>
            <Text style={styles.pageTitle} numberOfLines={1}>{TAB_LABELS[tab]}</Text>
            <Text style={styles.pageSub} numberOfLines={1}>RPK admin · manage your store</Text>
          </View>
          <View style={styles.topRight}>
            {tab === 'products' && (
              <>
                {!compact && (
                  <View style={styles.topSearch}>
                    <Ionicons name="search" size={17} color={colors.muted} />
                    <TextInput
                      value={prodSearch}
                      onChangeText={setProdSearch}
                      placeholder="Search products…"
                      placeholderTextColor={colors.muted}
                      style={styles.searchInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {prodSearch.length > 0 && (
                      <Pressable onPress={() => setProdSearch('')} hitSlop={8} accessibilityLabel="Clear search">
                        <Ionicons name="close-circle" size={17} color={colors.muted} />
                      </Pressable>
                    )}
                  </View>
                )}
                <View style={styles.viewToggle}>
                  <Pressable style={[styles.viewBtn, prodView === 'list' && styles.viewBtnActive]} onPress={() => setProdView('list')} accessibilityLabel="List view">
                    <Text style={[styles.viewIcon, prodView === 'list' && styles.viewIconActive]}>☰</Text>
                  </Pressable>
                  <Pressable style={[styles.viewBtn, prodView === 'grid' && styles.viewBtnActive]} onPress={() => setProdView('grid')} accessibilityLabel="Grid view">
                    <Text style={[styles.viewIcon, prodView === 'grid' && styles.viewIconActive]}>▦</Text>
                  </Pressable>
                </View>
                <Button label={compact ? '' : 'Add product'} icon="add" onPress={() => setProdAddNonce((n) => n + 1)} style={compact ? styles.addBtnCompact : undefined} />
              </>
            )}
            {tab === 'orders' && <StatusFilter value={orderStatus} onChange={setOrderStatus} />}
            <View style={styles.profileWrap}>
              <Pressable style={styles.adminAvatar} onPress={() => setProfileOpen((o) => !o)} accessibilityLabel="Account menu">
                <Text style={styles.adminAvatarText}>{user?.name?.[0]?.toUpperCase() || 'A'}</Text>
              </Pressable>
              {profileOpen && (
                <>
                  <Pressable style={styles.profileScrim} onPress={() => setProfileOpen(false)} />
                  <View style={styles.profileMenu}>
                    <View style={styles.profileHead}>
                      <View style={styles.profileHeadAvatar}><Text style={styles.adminAvatarText}>{user?.name?.[0]?.toUpperCase() || 'A'}</Text></View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.profileName} numberOfLines={1}>{user?.name || 'Admin'}</Text>
                        <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || ''}</Text>
                      </View>
                    </View>
                    <View style={styles.profileDivider} />
                    <Pressable style={({ hovered }: any) => [styles.profileItem, hovered && styles.profileItemHover]} onPress={() => { setProfileOpen(false); setPwOpen(true); }}>
                      <Ionicons name="key-outline" size={18} color={colors.muted} />
                      <Text style={styles.profileItemText}>Change password</Text>
                    </Pressable>
                    <Pressable style={({ hovered }: any) => [styles.profileItem, hovered && styles.profileItemHover]} onPress={() => { setProfileOpen(false); logout(); router.replace('/'); }}>
                      <Ionicons name="log-out-outline" size={18} color={colors.red} />
                      <Text style={[styles.profileItemText, { color: colors.red }]}>Log out</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: compact ? 16 : 28, paddingBottom: 64 }}>
          <View style={{ width: '100%', maxWidth: 1600, alignSelf: 'center' }}>
            {token && tab === 'dashboard' && <Dashboard token={token} onNavigate={setTab} />}
            {token && tab === 'products' && <Products token={token} search={prodSearch} onSearch={setProdSearch} view={prodView} addNonce={prodAddNonce} />}
            {token && tab === 'arrange' && <Arrange token={token} />}
            {token && tab === 'orders' && <Orders token={token} statusFilter={orderStatus} />}
            {token && tab === 'customers' && <Customers token={token} />}
            {token && tab === 'registrations' && <Registrations token={token} />}
            {token && tab === 'inquiries' && <Inquiries token={token} />}
            {token && tab === 'rfqs' && <RFQAdmin token={token} />}
            {token && tab === 'porders' && <PartnerOrdersAdmin token={token} />}
            {token && tab === 'feedback' && <FeedbackAdmin token={token} />}
            {token && tab === 'news' && <NewsAdmin token={token} />}
            {token && tab === 'founders' && <FoundersAdmin token={token} />}
            {token && tab === 'archived' && <Archived token={token} />}
          </View>
        </ScrollView>
      </View>

      {pwOpen && token && <ChangePasswordModal token={token} onClose={() => setPwOpen(false)} />}
    </View>
  );
}

// ---------- Change password modal ----------
function ChangePasswordModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  async function submit() {
    setErr('');
    if (!current) return setErr('Enter your current password.');
    if (next.length < 6) return setErr('New password must be at least 6 characters.');
    if (next !== confirm) return setErr('New passwords do not match.');
    if (next === current) return setErr('New password must be different from the current one.');
    setBusy(true);
    try {
      await api.changePassword(current, next, token);
      setDone(true);
    } catch (e: any) {
      setErr(e?.message || 'Could not change password.');
    } finally {
      setBusy(false);
    }
  }

  const content = (
    <View style={styles.pwOverlay}>
      <Pressable style={StyleSheet.absoluteFill as any} onPress={onClose} />
      <View style={styles.pwModal}>
        <View style={styles.pwHead}>
          <View style={styles.pwHeadIcon}><Ionicons name="key-outline" size={20} color={colors.red} /></View>
          <Text style={styles.pwTitle}>Change password</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close"><Ionicons name="close" size={22} color={colors.muted} /></Pressable>
        </View>

        {done ? (
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 18 }}>
            <Ionicons name="checkmark-circle" size={52} color={colors.green} />
            <Text style={styles.pwDone}>Password updated successfully.</Text>
            <Button label="Done" onPress={onClose} style={{ marginTop: 4 }} />
          </View>
        ) : (
          <View style={{ gap: 12, marginTop: 6 }}>
            <PwInput label="Current password" value={current} onChangeText={setCurrent} show={show} placeholder="Enter current password" />
            <PwInput label="New password" value={next} onChangeText={setNext} show={show} placeholder="At least 6 characters" />
            <PwInput label="Confirm new password" value={confirm} onChangeText={setConfirm} show={show} placeholder="Re-enter new password" />
            <Pressable style={styles.pwShowRow} onPress={() => setShow((s) => !s)}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.muted} />
              <Text style={styles.pwShowText}>{show ? 'Hide passwords' : 'Show passwords'}</Text>
            </Pressable>
            {!!err && <Text style={styles.pwErr}>{err}</Text>}
            <Button label={busy ? 'Updating…' : 'Update password'} onPress={submit} disabled={busy} style={{ marginTop: 2 }} />
          </View>
        )}
      </View>
    </View>
  );
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return require('react-dom').createPortal(content, document.body);
  }
  return content;
}

function PwInput({ label, value, onChangeText, show, placeholder }: { label: string; value: string; onChangeText: (t: string) => void; show: boolean; placeholder?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.pwLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.pwInput}
      />
    </View>
  );
}

// ---------- Dashboard ----------
type StatCardDef = {
  label: string;
  value: any;
  tone: string;
  icon: keyof typeof Ionicons.glyphMap;
  to?: Tab; // tab to open when the card is clicked
  subtitle?: string; // small muted line under the label
  emphasize?: boolean; // green ring (Revenue)
};

function Dashboard({ token, onNavigate }: { token: string; onNavigate: (t: Tab) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<Order[]>([]);
  useEffect(() => {
    api.admin.stats(token).then(setStats).catch(() => {});
    api.admin.orders(token).then((o) => setRecent(o.slice(0, 5))).catch(() => {});
  }, [token]);
  if (!stats) return <Text style={styles.muted}>Loading…</Text>;

  // Primary KPIs — the four headline numbers, shown large at the top.
  // Brand red icons (matches the red-forward site); numbers render charcoal.
  // Revenue keeps green (money) via `emphasize`.
  const heroCards: StatCardDef[] = [
    { label: 'Revenue (paid)', value: money(stats.total_revenue), tone: colors.red, icon: 'cash-outline', to: 'orders', subtitle: 'Paid orders total', emphasize: true },
    { label: 'Total Orders', value: stats.total_orders, tone: colors.red, icon: 'receipt-outline', to: 'orders', subtitle: 'All orders' },
    { label: 'Customers', value: stats.total_customers, tone: colors.red, icon: 'people-outline', to: 'customers', subtitle: 'Registered users' },
    { label: 'Products', value: stats.total_products, tone: colors.red, icon: 'cube-outline', to: 'products', subtitle: 'In catalogue' },
  ];

  // Secondary metrics — informational counts, shown small below the charts.
  const secondaryCards: StatCardDef[] = [
    { label: 'Registrations', value: stats.total_registrations, tone: colors.red, icon: 'document-text-outline', to: 'registrations', subtitle: 'Import / export' },
    { label: 'Partners', value: stats.total_partners, tone: colors.red, icon: 'briefcase-outline', to: 'registrations', subtitle: 'Active partners' },
    { label: 'RFQ Requests', value: stats.total_rfqs, tone: colors.red, icon: 'create-outline', to: 'rfqs', subtitle: 'All quotes' },
    { label: 'Partner Orders', value: stats.partner_orders, tone: colors.red, icon: 'cube-outline', to: 'porders', subtitle: 'All partner orders' },
    { label: 'Categories', value: stats.total_categories, tone: colors.red, icon: 'pricetags-outline', to: 'arrange', subtitle: 'Product groups' },
  ];

  const byStatus: Record<string, number> = stats.orders_by_status || {};
  const statusEntries = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);
  const totalOrders = statusEntries.reduce((sum, [, v]) => sum + v, 0);
  const segs = statusEntries.map(([k, v]) => ({ k, v, color: toneColor[statusTone[k]] || colors.orange }));

  const activeProducts = Number(stats.active_products || 0);
  const totalProducts = Number(stats.total_products || 0);
  const pendingReg = Number(stats.pending_registrations || 0);
  const pendingOrders = Number(stats.pending_orders || 0);
  const deliveredOrders = Number(byStatus.delivered || 0);
  const cancelledOrders = Number(byStatus.cancelled || 0);

  // Actionable items — surfaced in a highlighted band so daily to-dos aren't
  // lost among the vanity metrics. Each is clickable through to its tab.
  const attention: AttnItem[] = [
    { label: 'Pending orders', value: pendingOrders, icon: 'time-outline', to: 'orders' },
    { label: 'Pending registrations', value: pendingReg, icon: 'document-text-outline', to: 'registrations' },
    { label: 'Open RFQs', value: Number(stats.open_rfqs || 0), icon: 'create-outline', to: 'rfqs' },
    { label: 'Unpaid partner orders', value: Number(stats.partner_orders_unpaid || 0), icon: 'cube-outline', to: 'porders' },
  ];
  const attentionTotal = attention.reduce((s, a) => s + a.value, 0);

  // Revenue sparkline (placeholder series — see PLACEHOLDER_REVENUE_7D / TODO above).
  const rev7d = PLACEHOLDER_REVENUE_7D;

  return (
    <View style={{ gap: 20 }}>
      {/* Primary KPIs */}
      <View style={styles.heroGrid}>
        {heroCards.map((c) => (
          <StatCard key={c.label} card={c} onNavigate={onNavigate} />
        ))}
      </View>

      {/* Needs attention — actionable counts */}
      <NeedsAttention items={attention} total={attentionTotal} onNavigate={onNavigate} />

      <View style={styles.dashRow}>
        {/* Orders by status — pie chart + legend */}
        <Card style={styles.dashCard}>
          <Text style={styles.h}>Orders by status</Text>
          {totalOrders === 0 ? (
            <Text style={[styles.muted, { marginTop: 10 }]}>No orders yet.</Text>
          ) : (
            <View style={styles.pieRow}>
              <View style={styles.pieWrap}>
                <Donut slices={segs.map((s) => ({ value: s.v, color: s.color }))} size={168} thickness={26} />
                <View style={styles.pieHole} pointerEvents="none">
                  <Text style={styles.pieTotal}>{totalOrders}</Text>
                  <Text style={styles.pieTotalL}>orders</Text>
                </View>
              </View>
              <View style={styles.legend}>
                {segs.map((s) => (
                  <View key={s.k} style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: s.color }]} />
                    <Text style={styles.legendLabel} numberOfLines={1}>{s.k}</Text>
                    <Text style={styles.legendVal}>{s.v} · {Math.round((s.v / totalOrders) * 100)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Revenue — all-time total + a sparkline of recent activity */}
        <Card style={styles.dashCard}>
          <Text style={styles.h}>Revenue</Text>
          <Text style={[styles.statValue, { color: colors.red, fontSize: 24, marginTop: 4 }]}>{money(stats.total_revenue)}</Text>
          <Text style={styles.statLabel}>Paid revenue · all time</Text>
          <View style={{ marginTop: 14 }}>
            <AreaChart data={rev7d} height={92} color={colors.red} />
          </View>
        </Card>

        {/* Fulfilment breakdown — ratios that aren't in the attention band above */}
        <Card style={styles.dashCard}>
          <Text style={styles.h}>At a glance</Text>
          <View style={{ gap: 14, marginTop: 12 }}>
            <MiniBar label="Active products" value={activeProducts} total={totalProducts} color={colors.red} suffix={`${activeProducts}/${totalProducts}`} />
            <MiniBar label="Delivered orders" value={deliveredOrders} total={totalOrders} color={colors.red} suffix={`${deliveredOrders}/${totalOrders}`} />
            <MiniBar label="Cancelled orders" value={cancelledOrders} total={totalOrders} color={colors.red} suffix={`${cancelledOrders}/${totalOrders}`} />
          </View>
        </Card>
      </View>

      {/* Secondary metrics — smaller informational counts */}
      <View style={styles.secGrid}>
        {secondaryCards.map((c) => (
          <StatCard key={c.label} card={c} onNavigate={onNavigate} compact />
        ))}
      </View>

      {/* Recent orders */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={styles.recentHead}>
          <Text style={styles.h}>Recent orders</Text>
          <Pressable onPress={() => onNavigate('orders')}>
            <Text style={styles.viewAll}>View all →</Text>
          </Pressable>
        </View>
        {recent.length === 0 ? (
          <Text style={[styles.muted, { padding: 18 }]}>No orders yet.</Text>
        ) : (
          <View>
            <View style={[styles.tr, styles.thead]}>
              <Text style={[styles.th, styles.rOrder]}>Order</Text>
              <Text style={[styles.th, styles.rCust]}>Customer</Text>
              <Text style={[styles.th, styles.rShip]}>Ship to</Text>
              <Text style={[styles.th, styles.rDate]}>Placed</Text>
              <Text style={[styles.th, styles.rTotal]}>Total (AED)</Text>
              <Text style={[styles.th, styles.rStatus]}>Status</Text>
            </View>
            {recent.map((o, i) => (
              <View key={o.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                <Text style={[styles.td, styles.tdStrong, styles.rOrder]}>{o.id}</Text>
                <Text style={[styles.td, styles.rCust]} numberOfLines={1}>{o.customer_name}</Text>
                <Text style={[styles.td, styles.rShip]} numberOfLines={1}>{o.shipping_address || '—'}</Text>
                <Text style={[styles.td, styles.rDate]}>{fmtDate(o.created_at)}</Text>
                <Text style={[styles.td, styles.tdStrong, styles.rTotal]}>{money(o.subtotal, o.currency)}</Text>
                <View style={styles.rStatus}><Badge text={o.status} tone={statusTone[o.status] || 'muted'} /></View>
              </View>
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}

// A labelled progress bar for the dashboard "At a glance" panel.
function MiniBar({ label, value, total, color, suffix }: { label: string; value: number; total: number; color: string; suffix: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.miniLabel}>{label}</Text>
        <Text style={styles.miniVal}>{suffix}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// A single dashboard stat. Clickable (with hover lift) when it has a `to` tab;
// otherwise a plain informational card. `compact` renders the smaller secondary
// variant (smaller icon/number, no subtitle).
function StatCard({ card, onNavigate, compact }: { card: StatCardDef; onNavigate: (t: Tab) => void; compact?: boolean }) {
  const [hover, setHover] = useState(false);
  const clickable = !!card.to;

  const body = (
    <>
      <View style={[styles.statIcon, compact && styles.statIconSm, { backgroundColor: card.tone + '1A' }]}>
        <Ionicons name={card.icon} size={compact ? 15 : 18} color={card.tone} />
      </View>
      {/* Value stays charcoal for readability; only the emphasized card (Revenue)
          uses its tone (green) so money reads positive. */}
      <Text style={[styles.statValue, compact && styles.statValueSm, { color: card.emphasize ? card.tone : colors.ink }]}>{card.value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{card.label}</Text>
      {!compact && !!card.subtitle && <Text style={styles.statHint} numberOfLines={1}>{card.subtitle}</Text>}
    </>
  );

  const base = [styles.statCard, compact && styles.statCardSm, card.emphasize && styles.statCardRing];
  if (!clickable) return <View style={base}>{body}</View>;

  return (
    <Pressable
      onPress={() => onNavigate(card.to!)}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={({ pressed }) => [
        ...base,
        styles.statCardClickable,
        hover && { borderColor: card.tone, ...shadow.card, transform: [{ translateY: -2 }] },
        pressed && { opacity: 0.92 },
      ]}
    >
      {body}
    </Pressable>
  );
}

// ---------- Needs attention band ----------
type AttnItem = { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; to: Tab };

// Highlighted strip of actionable counts. Items with a non-zero count read as
// urgent (red); zero counts stay calm. When everything is zero, shows an
// "all caught up" state instead of a wall of zeros.
function NeedsAttention({ items, total, onNavigate }: { items: AttnItem[]; total: number; onNavigate: (t: Tab) => void }) {
  return (
    <Card style={styles.attnCard}>
      <View style={styles.attnHead}>
        <View style={[styles.attnHeadIcon, total > 0 ? styles.attnHeadIconActive : styles.attnHeadIconCalm]}>
          <Ionicons name={total > 0 ? 'alert' : 'checkmark'} size={14} color={total > 0 ? colors.red : colors.green} />
        </View>
        <Text style={styles.h}>Needs attention</Text>
        {total > 0 ? (
          <View style={styles.attnCountPill}><Text style={styles.attnCountText}>{total}</Text></View>
        ) : (
          <Text style={styles.attnAllClear}>All caught up 🎉</Text>
        )}
      </View>
      <View style={styles.attnRow}>
        {items.map((it) => {
          const urgent = it.value > 0;
          return (
            <Pressable
              key={it.label}
              onPress={() => onNavigate(it.to)}
              style={({ hovered }: any) => [styles.attnItem, urgent && styles.attnItemUrgent, hovered && styles.attnItemHover]}
            >
              <View style={[styles.attnItemIcon, { backgroundColor: (urgent ? colors.red : colors.muted) + '18' }]}>
                <Ionicons name={it.icon} size={16} color={urgent ? colors.red : colors.muted} />
              </View>
              <Text style={[styles.attnValue, { color: urgent ? colors.red : colors.ink }]}>{it.value}</Text>
              <Text style={styles.attnLabel} numberOfLines={2}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

// ---------- Products ----------
type ProductView = 'list' | 'grid';

function Products({ token, search, onSearch, view, addNonce }: { token: string; search: string; onSearch: (t: string) => void; view: ProductView; addNonce: number }) {
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined); // undefined=closed, null=new
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<Product | null>(null); // product pending delete
  const [selectedCat, setSelectedCat] = useState<string>('all'); // category sidebar filter
  const toast = useToast();
  // Below this the fixed category rail would starve the table of width, so the
  // categories collapse to chips above it and the table gets the whole row.
  const stacked = width < 1100;

  // "+ Add product" lives in the topbar; opening it bumps addNonce.
  useEffect(() => {
    if (addNonce > 0) setEditing(null);
  }, [addNonce]);

  const q = search.trim().toLowerCase();
  const filtered = products.filter((p) => {
    const inCat = selectedCat === 'all' || p.category_name === selectedCat;
    const inSearch = !q || p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q);
    return inCat && inSearch;
  });

  // Product count per category for the sidebar badges.
  const countFor = (name: string) => products.filter((p) => p.category_name === name).length;

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

  // Toggle whether a product appears in the home-page "Featured" section.
  // The home shows up to 10, so cap the selection at 10.
  async function toggleFeatured(p: Product) {
    const next = !p.is_featured;
    if (next && products.filter((x) => x.is_featured).length >= 10) {
      toast('You can feature up to 10 products on the home page', 'info');
      return;
    }
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_featured: next } : x)));
    try {
      await api.admin.setFeatured(p.id, next, token);
      toast(next ? `“${p.name}” added to Featured` : `“${p.name}” removed from Featured`, 'success');
    } catch {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_featured: !next } : x))); // revert
      toast('Could not update featured', 'error');
    }
  }

  const catList = (
    <>
      <CatItem label="All products" active={selectedCat === 'all'} stacked={stacked} onPress={() => setSelectedCat('all')} />
      {categories.map((c) => (
        <CatItem key={c.id} label={c.name} active={selectedCat === c.name} stacked={stacked} onPress={() => setSelectedCat(c.name)} />
      ))}
    </>
  );

  return (
    <View style={{ gap: 12 }}>
      {/* alignItems:'flex-start' (from prodLayout) keeps the sticky category rail
          from stretching in the row layout, but once stacked it would shrink-wrap
          the children to their content width — letting the table's intrinsic
          width win over the screen. Stretch them instead. */}
      <View style={[styles.prodLayout, stacked && { flexDirection: 'column', alignItems: 'stretch' }]}>
        {/* Category sidebar — filters the product list */}
        {stacked ? (
          <View style={styles.catChipRow}>{catList}</View>
        ) : (
          <View style={[styles.catSidebar, Platform.OS === 'web' && styles.catSticky]}>
            <Text style={styles.catSideTitle}>Categories</Text>
            {catList}
          </View>
        )}

        {/* Main content (search / view / add live in the topbar on desktop) */}
        {/* minWidth 0 lets this column shrink past the table's intrinsic width —
            without it the table's min-width pushes the row wider than the page
            and the whole admin scrolls sideways instead of the table alone. */}
        <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
          {/* Mobile-only search (topbar is too narrow on phones) */}
          {stacked && (
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                value={search}
                onChangeText={onSearch}
                placeholder="Search products…"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <Pressable onPress={() => onSearch('')} hitSlop={8} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              )}
            </View>
          )}
          {loading ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : filtered.length === 0 ? (
            <Text style={styles.muted}>{q ? `No products match “${search}”.` : 'No products in this category.'}</Text>
          ) : view === 'list' ? (
            <ProductTable products={filtered} onEdit={setEditing} onDelete={setConfirming} onToggleFeatured={toggleFeatured} />
          ) : (
            <ProductGrid products={filtered} width={width} onEdit={setEditing} onDelete={setConfirming} onToggleFeatured={toggleFeatured} />
          )}
        </View>
      </View>

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

// One row in the Products category sidebar (or a chip on narrow screens).
function CatItem({ label, active, stacked, onPress }: { label: string; active: boolean; stacked: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[stacked ? styles.catChip : styles.catRow, active && (stacked ? styles.catChipActive : styles.catRowActive)]}>
      <Text style={[styles.catText, active && styles.catTextActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

// Product table columns, widest-first render order. `prio` drives responsive
// behaviour: 0 never drops, higher numbers drop first as the table narrows.
// Dates go first (recoverable in the edit form), then unit/stock, then status
// and category — so Name, Price and Actions survive down to the narrowest
// desktop. `w` is a fixed width; `min` marks a flex column and its floor.
const TABLE_COLS: { key: string; label: string; w?: number; min?: number; prio: number }[] = [
  { key: 'sr', label: 'Sr No', w: 52, prio: 0 },
  { key: 'img', label: 'Image', w: 52, prio: 1 },
  { key: 'name', label: 'Name', min: 150, prio: 0 },
  { key: 'cat', label: 'Category', min: 110, prio: 4 },
  { key: 'price', label: 'Price', w: 96, prio: 0 },
  { key: 'unit', label: 'Unit', w: 60, prio: 6 },
  { key: 'stock', label: 'Stock', w: 60, prio: 5 },
  { key: 'status', label: 'Status', w: 84, prio: 3 },
  { key: 'created', label: 'Added', w: 100, prio: 7 },
  { key: 'updated', label: 'Updated', w: 100, prio: 8 },
  { key: 'actions', label: 'Actions', w: 186, prio: 0 },
];

// Narrowest width these columns render at without squashing — cells at their
// fixed/min width, plus the row's horizontal padding and inter-cell gaps
// (must track `tr` in the stylesheet).
function colsWidth(keys: string[]): number {
  const list = TABLE_COLS.filter((c) => keys.includes(c.key));
  const cells = list.reduce((sum, c) => sum + (c.w ?? c.min ?? 0), 0);
  return cells + 12 * 2 + 10 * Math.max(0, list.length - 1);
}

// The most columns that fit in `avail`, dropping lowest-priority first.
function fitColumns(avail: number): string[] {
  let keys = TABLE_COLS.map((c) => c.key);
  while (colsWidth(keys) > avail) {
    const droppable = TABLE_COLS.filter((c) => c.prio > 0 && keys.includes(c.key));
    if (!droppable.length) break; // only essentials left — scroll from here
    const drop = droppable.reduce((a, b) => (b.prio > a.prio ? b : a));
    keys = keys.filter((k) => k !== drop.key);
  }
  return keys;
}

// Tabular (list) view — an image column plus all the product fields.
function ProductTable({
  products,
  onEdit,
  onDelete,
  onToggleFeatured,
}: {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onToggleFeatured: (p: Product) => void;
}) {
  // Decide layout from the ACTUAL available width (the content area, already
  // minus the nav + category panels) — not the window — so the table never
  // overflows on laptops where the side panels eat most of the width. Columns
  // drop by priority as space runs out; on roomy widths the flex columns absorb
  // the extra. Only once the essentials alone won't fit does it scroll.
  const [containerW, setContainerW] = useState(0);
  const cols = useMemo(() => fitColumns(containerW || Infinity), [containerW]);
  const has = (k: string) => cols.includes(k);
  const minW = colsWidth(cols);
  const fits = containerW >= minW;

  const table = (
    <View style={[styles.table, fits ? styles.tableFull : { minWidth: minW }, fits && styles.tableStickyWrap]}>
        <View style={[styles.tr, styles.thead, fits && styles.theadSticky]}>
          {has('sr') && <Text style={[styles.th, styles.colSr]}>Sr No</Text>}
          {has('img') && <Text style={[styles.th, styles.colImg]}>Image</Text>}
          {has('name') && <Text style={[styles.th, styles.colName]}>Name</Text>}
          {has('cat') && <Text style={[styles.th, styles.colCat]}>Category</Text>}
          {has('price') && <Text style={[styles.th, styles.colPrice]}>Price</Text>}
          {has('unit') && <Text style={[styles.th, styles.colUnit]}>Unit</Text>}
          {has('stock') && <Text style={[styles.th, styles.colStock]}>Stock</Text>}
          {has('status') && <Text style={[styles.th, styles.colStatus]}>Status</Text>}
          {has('created') && <Text style={[styles.th, styles.colDate]}>Added</Text>}
          {has('updated') && <Text style={[styles.th, styles.colDate]}>Updated</Text>}
          {has('actions') && <Text style={[styles.th, styles.colActions]}>Actions</Text>}
        </View>
        {products.map((p, i) => (
          <View key={p.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
            {has('sr') && <Text style={[styles.td, styles.tdStrong, styles.colSr]}>{i + 1}</Text>}
            {has('img') && <View style={styles.colImg}><ProductThumb product={p} size={44} /></View>}
            {has('name') && (
              <View style={styles.colName}>
                <Text style={[styles.td, styles.tdStrong]} numberOfLines={2}>{p.name}</Text>
                {/* Category folds into the name cell once its own column drops */}
                {!has('cat') && (
                  <Text style={styles.subTd} numberOfLines={1}>{p.category_name || 'Uncategorised'}</Text>
                )}
              </View>
            )}
            {has('cat') && <Text style={[styles.td, styles.colCat]} numberOfLines={1}>{p.category_name || 'Uncategorised'}</Text>}
            {has('price') && <Text style={[styles.td, styles.colPrice]}>{money(p.price, p.currency)}</Text>}
            {has('unit') && <Text style={[styles.td, styles.colUnit]}>{p.unit}</Text>}
            {has('stock') && <Text style={[styles.td, styles.colStock]}>{p.stock}</Text>}
            {has('status') && (
              <View style={styles.colStatus}>
                <Badge text={p.is_active ? 'active' : 'hidden'} tone={p.is_active ? 'green' : 'muted'} />
              </View>
            )}
            {has('created') && <Text style={[styles.td, styles.colDate]}>{fmtDate(p.created_at)}</Text>}
            {has('updated') && <Text style={[styles.td, styles.colDate]}>{fmtDate(p.updated_at)}</Text>}
            {has('actions') && (
              <View style={[styles.colActions, styles.actionCell]}>
                <Pressable
                  onPress={() => onToggleFeatured(p)}
                  hitSlop={6}
                  style={styles.starBtn}
                  accessibilityLabel={p.is_featured ? 'Remove from featured' : 'Add to featured'}
                >
                  <Ionicons name={p.is_featured ? 'star' : 'star-outline'} size={20} color={p.is_featured ? colors.orange : colors.muted} />
                </Pressable>
                <Button label="Edit" variant="ghost" onPress={() => onEdit(p)} style={styles.smallBtn} />
                <Button label="Delete" variant="danger" onPress={() => onDelete(p)} style={styles.smallBtn} />
              </View>
            )}
          </View>
        ))}
    </View>
  );

  // Full width when the container is roomy; horizontal scroll only when even
  // the essential columns are too wide for the space. width:100% pins the
  // wrapper to the container (so onLayout measures the space we actually have,
  // not the table's own width), and clipping while scrolling keeps the overflow
  // inside the table instead of widening the page. No clip when it fits — the
  // sticky header needs to escape the wrapper.
  return (
    <View style={[{ width: '100%' }, !fits && { overflow: 'hidden' }]} onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}>
      {fits ? table : <ScrollView horizontal showsHorizontalScrollIndicator={false}>{table}</ScrollView>}
    </View>
  );
}

// Grid view — image-forward cards.
function ProductGrid({
  products,
  width,
  onEdit,
  onDelete,
  onToggleFeatured,
}: {
  products: Product[];
  width: number;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onToggleFeatured: (p: Product) => void;
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
            <Pressable onPress={() => onToggleFeatured(p)} hitSlop={6} style={styles.starBtn} accessibilityLabel={p.is_featured ? 'Remove from featured' : 'Add to featured'}>
              <Ionicons name={p.is_featured ? 'star' : 'star-outline'} size={20} color={p.is_featured ? colors.orange : colors.muted} />
            </Pressable>
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
      toast(`“${p.name}” deleted`, 'info');
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
            <Button label="Delete" variant="danger" onPress={() => setPurging(p)} style={styles.smallBtn} />
          </Card>
        ))
      )}

      {purging && (
        <ConfirmDialog
          title="Delete this product?"
          message={`“${purging.name}” will be deleted. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={purge}
          onCancel={() => setPurging(null)}
        />
      )}
    </View>
  );
}

// ---------- Orders ----------
type OrderSortKey = 'id' | 'customer_name' | 'customer_email' | 'customer_phone' | 'shipping_address' | 'created_at' | 'status';

// Clickable column header: toggles asc/desc and shows the active direction arrow.
function SortHeader({ label, col, sortKey, sortDir, onSort, style }: {
  label: string;
  col: OrderSortKey;
  sortKey: OrderSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (k: OrderSortKey) => void;
  style?: any;
}) {
  const active = sortKey === col;
  return (
    <Pressable style={[styles.sortHead, style]} onPress={() => onSort(col)} accessibilityLabel={`Sort by ${label}`}>
      <Text style={[styles.th, active && styles.thActive]} numberOfLines={1}>{label}</Text>
      <Ionicons
        name={active ? (sortDir === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'}
        size={12}
        color={active ? colors.navy : colors.muted}
      />
    </Pressable>
  );
}

// Topbar status filter — a pill that opens the six statuses + "All".
function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const options = ['all', ...ORDER_STATUSES];
  return (
    <View style={{ position: 'relative', zIndex: open ? 200 : 1 }}>
      <Pressable style={styles.filterBtn} onPress={() => setOpen((o) => !o)}>
        <Ionicons name="funnel-outline" size={14} color={colors.navy} />
        <Text style={styles.filterBtnText}>{value === 'all' ? 'All statuses' : value}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
      </Pressable>
      {open && (
        <>
          <Pressable style={styles.filterScrim} onPress={() => setOpen(false)} />
          <View style={styles.filterMenu}>
            {options.map((opt) => {
              const active = opt === value;
              return (
                <Pressable key={opt} style={[styles.filterItem, active && styles.filterItemActive]} onPress={() => { onChange(opt); setOpen(false); }}>
                  <Text style={[styles.filterItemText, active && { color: colors.navy, fontWeight: '900' }]}>
                    {opt === 'all' ? 'All statuses' : opt}
                  </Text>
                  {active && <Ionicons name="checkmark" size={15} color={colors.navy} />}
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

function Orders({ token, statusFilter = 'all' }: { token: string; statusFilter?: string }) {
  const { width } = useWindowDimensions();
  const fits = width >= 1024; // fill width on desktop; scroll on narrow screens
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Order | null>(null);
  const [sortKey, setSortKey] = useState<OrderSortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function onSort(k: OrderSortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir(k === 'created_at' || k === 'id' ? 'desc' : 'asc');
    }
  }

  const sorted = useMemo(() => {
    const val = (o: Order): number | string => {
      switch (sortKey) {
        case 'id':
          return o.id;
        case 'created_at':
          return new Date(o.created_at).getTime();
        default:
          return String((o as any)[sortKey] ?? '').toLowerCase();
      }
    };
    const list = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);
    return [...list].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, sortKey, sortDir, statusFilter]);

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
    setDetail((d) => (d && d.id === id ? { ...d, status } : d));
    load();
  }

  async function view(id: number) {
    try {
      setDetail(await api.admin.getOrder(id, token));
    } catch {
      /* ignore */
    }
  }

  if (loading) return <Text style={styles.muted}>Loading…</Text>;
  if (orders.length === 0) return <Text style={styles.muted}>No orders yet.</Text>;

  return (
    <View style={{ gap: 12 }}>
      <Tbl fits={fits}>
        <View style={[styles.table, fits ? styles.tableFull : styles.ordersTable]}>
          <View style={[styles.tr, styles.thead]}>
            <SortHeader label="Order" col="id" sortKey={sortKey} sortDir={sortDir} onSort={onSort} style={styles.oOrder} />
            <SortHeader label="Customer" col="customer_name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} style={styles.oName} />
            <SortHeader label="Email" col="customer_email" sortKey={sortKey} sortDir={sortDir} onSort={onSort} style={styles.oEmail} />
            <SortHeader label="Phone" col="customer_phone" sortKey={sortKey} sortDir={sortDir} onSort={onSort} style={styles.oPhone} />
            <SortHeader label="Ship to" col="shipping_address" sortKey={sortKey} sortDir={sortDir} onSort={onSort} style={styles.oShip} />
            <SortHeader label="Placed" col="created_at" sortKey={sortKey} sortDir={sortDir} onSort={onSort} style={styles.oDate} />
            <SortHeader label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} style={styles.oStatus} />
            <Text style={[styles.th, styles.oView]}>View</Text>
          </View>
          {sorted.map((o, i) => (
            <Pressable key={o.id} style={({ hovered }: any) => [styles.tr, i % 2 === 1 && styles.trAlt, hovered && styles.trHover]} onPress={() => view(o.id)}>
              <Text style={[styles.td, styles.tdStrong, styles.oOrder]}>{o.id}</Text>
              <Text style={[styles.td, styles.oName]} numberOfLines={1}>{o.customer_name}</Text>
              <Text style={[styles.td, styles.oEmail]} numberOfLines={1}>{o.customer_email}</Text>
              <Text style={[styles.td, styles.oPhone]} numberOfLines={1}>{o.customer_phone || '—'}</Text>
              <Text style={[styles.td, styles.oShip]} numberOfLines={1}>{o.shipping_address || '—'}</Text>
              <Text style={[styles.td, styles.oDate]}>{fmtDate(o.created_at)}</Text>
              <View style={styles.oStatus}><Badge text={o.status} tone={statusTone[o.status] || 'muted'} /></View>
              <View style={styles.oView}>
                <View style={styles.eyeBtn}>
                  <Ionicons name="eye-outline" size={18} color={colors.navy} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </Tbl>
      {sorted.length === 0 && <Text style={styles.muted}>No orders with status “{statusFilter}”.</Text>}

      {detail && <OrderDetailModal order={detail} onClose={() => setDetail(null)} onStatus={setStatus} />}
    </View>
  );
}

// ---------- Customers ----------
function Customers({ token }: { token: string }) {
  const { width } = useWindowDimensions();
  const fits = width >= 760;
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<User | null>(null);

  useEffect(() => {
    api.admin.customers(token).then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q)
      )
    : items;

  if (loading) return <Text style={styles.muted}>Loading…</Text>;

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.h}>
        {q ? `${filtered.length} of ${items.length} customers` : `${items.length} customer${items.length === 1 ? '' : 's'}`}
      </Text>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search customers by name, email or phone…"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.muted}>{items.length === 0 ? 'No customers yet.' : `No customers match “${query}”.`}</Text>
      ) : (
        <Tbl fits={fits}>
          <View style={[styles.table, !fits && styles.cuTableMin]}>
            <View style={[styles.tr, styles.thead]}>
              <Text style={[styles.th, styles.cuName]}>Name</Text>
              <Text style={[styles.th, styles.cuEmail]}>Email</Text>
              <Text style={[styles.th, styles.cuPhone]}>Phone</Text>
              <Text style={[styles.th, styles.cuRole]}>Type</Text>
              <Text style={[styles.th, styles.cuJoined]}>Joined</Text>
            </View>
            {filtered.map((u, i) => (
              <Pressable key={u.id} style={({ hovered }: any) => [styles.tr, i % 2 === 1 && styles.trAlt, hovered && styles.trHover]} onPress={() => setDetail(u)}>
                <Text style={[styles.td, styles.tdStrong, styles.cuName]} numberOfLines={1}>{u.name}</Text>
                <Text style={[styles.td, styles.cuEmail]} numberOfLines={1}>{u.email}</Text>
                <Text style={[styles.td, styles.cuPhone]} numberOfLines={1}>{u.phone || '—'}</Text>
                <View style={styles.cuRole}>
                  <Badge text={u.role} tone={u.role === 'business' ? 'navy' : 'muted'} />
                </View>
                <Text style={[styles.td, styles.cuJoined]}>{fmtDate(u.created_at)}</Text>
              </Pressable>
            ))}
          </View>
        </Tbl>
      )}

      {detail && <CustomerDetailModal user={detail} onClose={() => setDetail(null)} />}
    </View>
  );
}

// Full customer info, opened by clicking a row.
function CustomerDetailModal({ user, onClose }: { user: User; onClose: () => void }) {
  const content = (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.modalHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle} numberOfLines={1}>{user.name}</Text>
            <Text style={styles.modalSub}>Customer · #{user.id}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}><Text style={styles.modalClose}>✕</Text></Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, gap: 18 }}>
          <View style={{ gap: 8 }}>
            <Text style={styles.odSection}>Account</Text>
            <View style={styles.infoCard}>
              <InfoRow label="Name" value={user.name} first />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Phone" value={user.phone || '—'} />
              <InfoRow label="Type" value={user.role} />
              <InfoRow label="Joined" value={fmtDateTime(user.created_at)} />
            </View>
          </View>
        </ScrollView>
        <View style={styles.modalFoot}>
          <Button label="Close" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </View>
  );
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return require('react-dom').createPortal(content, document.body);
  }
  return content;
}

// ---------- Registrations ----------
function regReqSummary(r: Registration): string {
  if (Array.isArray(r.items) && r.items.length > 0) {
    return r.items.map((it: any) => `${it.name} ×${it.qty}`).join(', ');
  }
  return r.product_interest || '—';
}

function Registrations({ token }: { token: string }) {
  const { width } = useWindowDimensions();
  const fits = width >= 1024;
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Registration | null>(null);

  async function load() {
    setLoading(true);
    setRegs(await api.admin.registrations(token));
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [token]);

  async function setStatus(id: number, status: string, partnerRole?: 'import_partner' | 'export_partner') {
    await api.admin.updateRegistration(id, { status, partner_role: partnerRole }, token);
    setDetail((d) => (d && d.id === id ? { ...d, status } : d));
    load();
  }

  if (loading) return <Text style={styles.muted}>Loading…</Text>;
  if (regs.length === 0) return <Text style={styles.muted}>No registrations yet.</Text>;

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.h}>{regs.length} registration{regs.length === 1 ? '' : 's'}</Text>
      <Tbl fits={fits}>
        <View style={[styles.table, fits ? styles.tableFull : styles.regTable]}>
          <View style={[styles.tr, styles.thead]}>
            <Text style={[styles.th, styles.gCompany]}>Company</Text>
            <Text style={[styles.th, styles.gType]}>Type</Text>
            <Text style={[styles.th, styles.gCountry]}>Country</Text>
            <Text style={[styles.th, styles.gContact]}>Contact</Text>
            <Text style={[styles.th, styles.gReq]}>Requirement</Text>
            <Text style={[styles.th, styles.gStatus]}>Status</Text>
            <Text style={[styles.th, styles.gView]}>View</Text>
          </View>
          {regs.map((r, i) => (
            <Pressable key={r.id} style={({ hovered }: any) => [styles.tr, i % 2 === 1 && styles.trAlt, hovered && styles.trHover]} onPress={() => setDetail(r)}>
              <Text style={[styles.td, styles.tdStrong, styles.gCompany]} numberOfLines={1}>{r.company_name}</Text>
              <Text style={[styles.td, styles.gType]}>{r.business_type}</Text>
              <Text style={[styles.td, styles.gCountry]} numberOfLines={1}>{r.country || '—'}</Text>
              <Text style={[styles.td, styles.gContact]} numberOfLines={1}>{r.contact_person || r.email || '—'}</Text>
              <Text style={[styles.td, styles.gReq]} numberOfLines={1}>{regReqSummary(r)}</Text>
              <View style={styles.gStatus}><Badge text={r.status} tone={statusTone[r.status] || 'muted'} /></View>
              <View style={styles.gView}>
                <View style={styles.eyeBtn}>
                  <Ionicons name="eye-outline" size={18} color={colors.navy} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </Tbl>

      {detail && <RegistrationDetailModal reg={detail} onClose={() => setDetail(null)} onStatus={setStatus} />}
    </View>
  );
}

// Full registration details + approve/reject/pending controls.
// A label/value pair row inside a bordered info card.
function InfoRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={[styles.infoRow, first && { borderTopWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable>{value}</Text>
    </View>
  );
}

// A row of selectable status chips; the active one is highlighted in its tone.
function StatusPicker({ statuses, current, onPick }: { statuses: string[]; current: string; onPick: (s: string) => void }) {
  return (
    <View style={styles.statusPicker}>
      {statuses.map((s) => {
        const active = current === s;
        const tc = toneColor[statusTone[s]] || colors.navy;
        return (
          <Pressable key={s} style={[styles.statusChip, active && { backgroundColor: tc, borderColor: tc }]} onPress={() => onPick(s)}>
            <Text style={[styles.statusChipText, active && { color: colors.white }]}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function RegistrationDetailModal({ reg: r, onClose, onStatus }: { reg: Registration; onClose: () => void; onStatus: (id: number, s: string, partnerRole?: 'import_partner' | 'export_partner') => void }) {
  const docs = [
    { label: 'Trade License', url: r.trade_license_url },
    { label: 'VAT / Tax Certificate', url: r.vat_certificate_url },
    { label: 'Company Profile', url: r.company_profile_url },
  ].filter((d) => !!d.url);
  const content = (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.modalHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle} numberOfLines={1}>{r.company_name}</Text>
            <Text style={styles.modalSub}>Import / Export registration · #{r.id}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}><Text style={styles.modalClose}>✕</Text></Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, gap: 18 }}>
          <View style={{ gap: 8 }}>
            <Text style={styles.odSection}>Applicant</Text>
            <View style={styles.infoCard}>
              <InfoRow label="Business" value={r.business_type || '—'} first />
              <InfoRow label="Country" value={r.country || '—'} />
              <InfoRow label="Contact" value={r.contact_person || '—'} />
              <InfoRow label="Email" value={r.email || '—'} />
              <InfoRow label="Phone" value={r.phone || '—'} />
              {!!r.whatsapp && <InfoRow label="WhatsApp" value={r.whatsapp} />}
              {!!r.monthly_capacity && <InfoRow label="Monthly capacity" value={r.monthly_capacity} />}
              {!!r.target_countries && <InfoRow label="Target countries" value={r.target_countries} />}
            </View>
          </View>

          {docs.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={styles.odSection}>Documents</Text>
              <View style={styles.infoCard}>
                {docs.map((d, idx) => (
                  <Pressable key={d.label} style={[styles.infoRow, idx === 0 && { borderTopWidth: 0 }]} onPress={() => Linking.openURL(imageUri(d.url) as string)}>
                    <Text style={styles.infoLabel}>{d.label}</Text>
                    <Text style={[styles.infoValue, { color: colors.navy, fontWeight: '800' }]}>View ↗</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {Array.isArray(r.items) && r.items.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={styles.odSection}>Requirement</Text>
              <View style={styles.infoCard}>
                {r.items.map((it: any, idx: number) => (
                  <View key={idx} style={[styles.reqRow, idx === 0 && { borderTopWidth: 0 }]}>
                    <Text style={styles.reqName} numberOfLines={2}>{it.name}</Text>
                    <Text style={styles.reqQty}>{it.qty} {it.unit}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!!r.product_interest && (
            <View style={{ gap: 8 }}>
              <Text style={styles.odSection}>Interest</Text>
              <Text style={styles.odBody}>{r.product_interest}</Text>
            </View>
          )}

          {!!r.message && (
            <View style={{ gap: 8 }}>
              <Text style={styles.odSection}>Message</Text>
              <View style={styles.quoteCard}>
                <Text style={styles.quoteText}>{r.message}</Text>
              </View>
            </View>
          )}

          <View style={{ gap: 8 }}>
            <Text style={styles.odSection}>Status</Text>
            <StatusPicker statuses={REG_STATUSES} current={r.status} onPick={(s) => onStatus(r.id, s)} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.odSection}>Approve & grant partner access</Text>
            <Text style={styles.muted}>Approves the application and gives the applicant's account a partner login & dashboard.</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <Button label="Approve as Import Partner" onPress={() => onStatus(r.id, 'approved', 'import_partner')} style={{ flex: 1, minWidth: 200 }} />
              <Button label="Approve as Export Partner" variant="outline" onPress={() => onStatus(r.id, 'approved', 'export_partner')} style={{ flex: 1, minWidth: 200 }} />
            </View>
            {!r.user_id && (
              <Text style={[styles.muted, { color: colors.orange }]}>
                Note: this application has no linked user account, so no login can be granted. Ask the applicant to register first.
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.modalFoot}>
          <Button label="Close" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return require('react-dom').createPortal(content, document.body);
  }
  return content;
}

function inquiryReqSummary(q: any): string {
  if (Array.isArray(q.items) && q.items.length > 0) {
    return q.items.map((it: any) => `${it.name} ×${it.qty}`).join(', ');
  }
  return q.product || '—';
}

function Inquiries({ token }: { token: string }) {
  const { width } = useWindowDimensions();
  const fits = width >= 1024;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);

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
    setDetail((d: any) => (d && d.id === id ? { ...d, status } : d));
    load();
  }

  if (loading) return <Text style={styles.muted}>Loading…</Text>;
  if (items.length === 0) return <Text style={styles.muted}>No inquiries yet.</Text>;

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.h}>{items.length} inquir{items.length === 1 ? 'y' : 'ies'}</Text>
      <Tbl fits={fits}>
        <View style={[styles.table, fits ? styles.tableFull : styles.inqTable]}>
          <View style={[styles.tr, styles.thead]}>
            <Text style={[styles.th, styles.qName]}>Name</Text>
            <Text style={[styles.th, styles.qEmail]}>Email</Text>
            <Text style={[styles.th, styles.qPhone]}>Phone</Text>
            <Text style={[styles.th, styles.qReq]}>Requirement</Text>
            <Text style={[styles.th, styles.qDate]}>Date</Text>
            <Text style={[styles.th, styles.qStatus]}>Status</Text>
            <Text style={[styles.th, styles.qView]}>View</Text>
          </View>
          {items.map((q, i) => (
            <Pressable key={q.id} style={({ hovered }: any) => [styles.tr, i % 2 === 1 && styles.trAlt, hovered && styles.trHover]} onPress={() => setDetail(q)}>
              <Text style={[styles.td, styles.tdStrong, styles.qName]} numberOfLines={1}>{q.name}</Text>
              <Text style={[styles.td, styles.qEmail]} numberOfLines={1}>{q.email || '—'}</Text>
              <Text style={[styles.td, styles.qPhone]} numberOfLines={1}>{q.phone || '—'}</Text>
              <Text style={[styles.td, styles.qReq]} numberOfLines={1}>{inquiryReqSummary(q)}</Text>
              <Text style={[styles.td, styles.qDate]}>{fmtDate(q.created_at)}</Text>
              <View style={styles.qStatus}><Badge text={q.status} tone={statusTone[q.status] || 'muted'} /></View>
              <View style={styles.qView}>
                <View style={styles.eyeBtn}>
                  <Ionicons name="eye-outline" size={18} color={colors.navy} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </Tbl>

      {detail && <InquiryDetailModal inquiry={detail} onClose={() => setDetail(null)} onStatus={setStatus} />}
    </View>
  );
}

// Full inquiry details + status controls, opened from the table's view icon.
function InquiryDetailModal({ inquiry: q, onClose, onStatus }: { inquiry: any; onClose: () => void; onStatus: (id: number, s: string) => void }) {
  const content = (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.modalHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle} numberOfLines={1}>{q.name}</Text>
            <Text style={styles.modalSub}>Inquiry · #{q.id} · {fmtDate(q.created_at)}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}><Text style={styles.modalClose}>✕</Text></Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, gap: 18 }}>
          <View style={{ gap: 8 }}>
            <Text style={styles.odSection}>Contact</Text>
            <View style={styles.infoCard}>
              <InfoRow label="Email" value={q.email || '—'} first />
              <InfoRow label="Phone" value={q.phone || '—'} />
              <InfoRow label="Received" value={fmtDateTime(q.created_at)} />
            </View>
          </View>

          {Array.isArray(q.items) && q.items.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={styles.odSection}>Requirement</Text>
              <View style={styles.infoCard}>
                {q.items.map((it: any, idx: number) => (
                  <View key={idx} style={[styles.reqRow, idx === 0 && { borderTopWidth: 0 }]}>
                    <Text style={styles.reqName} numberOfLines={2}>{it.name}</Text>
                    <Text style={styles.reqQty}>{it.qty} {it.unit}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!!q.product && (
            <View style={{ gap: 8 }}>
              <Text style={styles.odSection}>Product</Text>
              <Text style={styles.odBody}>{q.product}</Text>
            </View>
          )}

          {!!q.message && (
            <View style={{ gap: 8 }}>
              <Text style={styles.odSection}>Message</Text>
              <View style={styles.quoteCard}>
                <Text style={styles.quoteText}>{q.message}</Text>
              </View>
            </View>
          )}

          <View style={{ gap: 8 }}>
            <Text style={styles.odSection}>Status</Text>
            <StatusPicker statuses={INQ_STATUSES} current={q.status} onPick={(s) => onStatus(q.id, s)} />
          </View>
        </ScrollView>

        <View style={styles.modalFoot}>
          <Button label="Close" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return require('react-dom').createPortal(content, document.body);
  }
  return content;
}

const rfqTone: Record<string, any> = { open: 'orange', quoted: 'navy', approved: 'green', rejected: 'red', closed: 'muted' };

function rfqItemsSummary(r: RFQ): string {
  if (Array.isArray(r.items) && r.items.length > 0) return r.items.map((it: any) => `${it.name} ×${it.qty}`).join(', ');
  return r.message || '—';
}

// Admin "RFQ Requests": list partner quotation requests and reply with a price.
function RFQAdmin({ token }: { token: string }) {
  const { width } = useWindowDimensions();
  const fits = width >= 1024;
  const [items, setItems] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<RFQ | null>(null);

  async function load() {
    setLoading(true);
    setItems(await api.admin.rfqs(token));
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [token]);

  if (loading) return <Text style={styles.muted}>Loading…</Text>;
  if (items.length === 0) return <Text style={styles.muted}>No quotation requests yet.</Text>;

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.h}>{items.length} request{items.length === 1 ? '' : 's'}</Text>
      <Tbl fits={fits}>
        <View style={[styles.table, fits ? styles.tableFull : styles.inqTable]}>
          <View style={[styles.tr, styles.thead]}>
            <Text style={[styles.th, { width: 70 }]}>RFQ</Text>
            <Text style={[styles.th, { flex: 1 }]}>Partner</Text>
            <Text style={[styles.th, { flex: 1.4 }]}>Requirement</Text>
            <Text style={[styles.th, { width: 110 }]}>Destination</Text>
            <Text style={[styles.th, { width: 90 }]}>Quotes</Text>
            <Text style={[styles.th, { width: 110 }]}>Status</Text>
            <Text style={[styles.th, { width: 56 }]}>View</Text>
          </View>
          {items.map((r, i) => (
            <Pressable key={r.id} style={({ hovered }: any) => [styles.tr, i % 2 === 1 && styles.trAlt, hovered && styles.trHover]} onPress={() => setDetail(r)}>
              <Text style={[styles.td, styles.tdStrong, { width: 70 }]}>#{r.id}</Text>
              <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>{r.partner_name || r.partner_email || '—'}</Text>
              <Text style={[styles.td, { flex: 1.4 }]} numberOfLines={1}>{rfqItemsSummary(r)}</Text>
              <Text style={[styles.td, { width: 110 }]} numberOfLines={1}>{r.destination_country || '—'}</Text>
              <Text style={[styles.td, { width: 90 }]}>{r.quotations.length}</Text>
              <View style={{ width: 110 }}><Badge text={r.status} tone={rfqTone[r.status] || 'muted'} /></View>
              <View style={{ width: 56, alignItems: 'center' }}>
                <View style={styles.eyeBtn}><Ionicons name="eye-outline" size={18} color={colors.navy} /></View>
              </View>
            </Pressable>
          ))}
        </View>
      </Tbl>

      {detail && <RFQDetailModal rfq={detail} token={token} onClose={() => setDetail(null)} onChanged={load} />}
    </View>
  );
}

function RFQDetailModal({ rfq: r, token, onClose, onChanged }: { rfq: RFQ; token: string; onClose: () => void; onChanged: () => void }) {
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [validity, setValidity] = useState('Valid 30 days');
  const [notes, setNotes] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function pickFile() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      setError(''); setUploading(true);
      try {
        const { url } = await api.uploadDocument(file);
        setFileUrl(url);
      } catch (e: any) { setError(e.message || 'Upload failed'); }
      finally { setUploading(false); }
    };
    input.click();
  }

  async function send() {
    const p = parseFloat(price);
    if (!(p > 0)) { setError('Enter a price.'); return; }
    setBusy(true); setError('');
    try {
      await api.admin.createQuotation(r.id, { price: p, currency, validity, notes, file_url: fileUrl }, token);
      onChanged();
      onClose();
    } catch (e: any) { setError(e.message || 'Could not send quotation'); }
    finally { setBusy(false); }
  }

  const content = (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.modalHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle} numberOfLines={1}>RFQ #{r.id} · {r.partner_name || r.partner_email}</Text>
            <Text style={styles.modalSub}>{fmtDate(r.created_at)}{r.destination_country ? ` · to ${r.destination_country}` : ''}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}><Text style={styles.modalClose}>✕</Text></Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, gap: 18 }}>
          {Array.isArray(r.items) && r.items.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={styles.odSection}>Requirement</Text>
              <View style={styles.infoCard}>
                {r.items.map((it: any, idx: number) => (
                  <View key={idx} style={[styles.reqRow, idx === 0 && { borderTopWidth: 0 }]}>
                    <Text style={styles.reqName} numberOfLines={2}>{it.name}</Text>
                    <Text style={styles.reqQty}>{it.qty} {it.unit}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!!r.message && (
            <View style={{ gap: 8 }}>
              <Text style={styles.odSection}>Message</Text>
              <View style={styles.quoteCard}><Text style={styles.quoteText}>{r.message}</Text></View>
            </View>
          )}

          <View style={{ gap: 8 }}>
            <Text style={styles.odSection}>Quotations ({r.quotations.length})</Text>
            {r.quotations.length === 0 ? (
              <Text style={styles.muted}>None sent yet.</Text>
            ) : (
              <View style={styles.infoCard}>
                {r.quotations.map((q, idx) => (
                  <View key={q.id} style={[styles.reqRow, idx === 0 && { borderTopWidth: 0 }]}>
                    <Text style={styles.reqName}>{money(q.price, q.currency)} · {q.validity || '—'}</Text>
                    <Badge text={q.status} tone={q.status === 'approved' ? 'green' : q.status === 'rejected' ? 'red' : 'navy'} />
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.odSection}>Send a quotation</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field label="Price" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" style={{ flex: 1 }} />
              <Field label="Currency" value={currency} onChangeText={setCurrency} placeholder="AED" style={{ width: 110 }} />
            </View>
            <Field label="Validity" value={validity} onChangeText={setValidity} placeholder="Valid 30 days" />
            <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Terms, incoterms, lead time…" />
            <Pressable style={styles.uploadBtn} onPress={pickFile} disabled={uploading}>
              <Ionicons name={fileUrl ? 'checkmark-circle' : 'cloud-upload-outline'} size={18} color={fileUrl ? colors.green : colors.navy} />
              <Text style={styles.uploadText}>{uploading ? 'Uploading…' : fileUrl ? 'Quotation PDF attached · Replace' : 'Attach quotation PDF (optional)'}</Text>
            </Pressable>
            {!!error && <Text style={styles.err}>{error}</Text>}
          </View>
        </ScrollView>

        <View style={styles.modalFoot}>
          <Button label="Close" variant="ghost" onPress={onClose} />
          <Button label={busy ? 'Sending…' : 'Send quotation'} onPress={send} disabled={busy} />
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return require('react-dom').createPortal(content, document.body);
  }
  return content;
}

const PORDER_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAY_STATUSES = ['unpaid', 'paid'];

// Admin "Partner Orders": orders created when partners approve a quotation.
function PartnerOrdersAdmin({ token }: { token: string }) {
  const { width } = useWindowDimensions();
  const fits = width >= 1024;
  const [items, setItems] = useState<PartnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PartnerOrder | null>(null);

  async function load() {
    setLoading(true);
    setItems(await api.admin.partnerOrders(token));
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [token]);

  async function update(id: number, body: { status?: string; payment_status?: string }) {
    await api.admin.updatePartnerOrder(id, body, token);
    setDetail((d) => (d && d.id === id ? { ...d, ...body } : d));
    load();
  }

  // Reload the list and re-sync the open detail (used after shipment/doc edits).
  async function refresh() {
    const list = await api.admin.partnerOrders(token);
    setItems(list);
    setDetail((d) => (d ? list.find((x) => x.id === d.id) || null : null));
  }

  if (loading) return <Text style={styles.muted}>Loading…</Text>;
  if (items.length === 0) return <Text style={styles.muted}>No partner orders yet.</Text>;

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.h}>{items.length} order{items.length === 1 ? '' : 's'}</Text>
      <Tbl fits={fits}>
        <View style={[styles.table, fits ? styles.tableFull : styles.inqTable]}>
          <View style={[styles.tr, styles.thead]}>
            <Text style={[styles.th, { width: 70 }]}>Order</Text>
            <Text style={[styles.th, { flex: 1 }]}>Partner</Text>
            <Text style={[styles.th, { flex: 1.4 }]}>Items</Text>
            <Text style={[styles.th, { width: 110 }]}>Amount</Text>
            <Text style={[styles.th, { width: 110 }]}>Status</Text>
            <Text style={[styles.th, { width: 90 }]}>Payment</Text>
            <Text style={[styles.th, { width: 56 }]}>View</Text>
          </View>
          {items.map((o, i) => (
            <Pressable key={o.id} style={({ hovered }: any) => [styles.tr, i % 2 === 1 && styles.trAlt, hovered && styles.trHover]} onPress={() => setDetail(o)}>
              <Text style={[styles.td, styles.tdStrong, { width: 70 }]}>#{o.id}</Text>
              <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>{o.partner_name || o.partner_email || '—'}</Text>
              <Text style={[styles.td, { flex: 1.4 }]} numberOfLines={1}>{Array.isArray(o.items) ? o.items.map((it: any) => `${it.name} ×${it.qty}`).join(', ') : '—'}</Text>
              <Text style={[styles.td, { width: 110 }]}>{money(o.amount, o.currency)}</Text>
              <View style={{ width: 110 }}><Badge text={o.status} tone={statusTone[o.status] || 'navy'} /></View>
              <View style={{ width: 90 }}><Badge text={o.payment_status} tone={statusTone[o.payment_status] || 'muted'} /></View>
              <View style={{ width: 56, alignItems: 'center' }}>
                <View style={styles.eyeBtn}><Ionicons name="eye-outline" size={18} color={colors.navy} /></View>
              </View>
            </Pressable>
          ))}
        </View>
      </Tbl>

      {detail && (
        <PartnerOrderModal order={detail} token={token} onClose={() => setDetail(null)} onStatus={(s) => update(detail.id, { status: s })} onPay={(p) => update(detail.id, { payment_status: p })} onChanged={refresh} />
      )}
    </View>
  );
}

const SHIPMENT_STATUSES = ['preparing', 'in_transit', 'arrived', 'delivered'];

function PartnerOrderModal({ order: o, token, onClose, onStatus, onPay, onChanged }: { order: PartnerOrder; token: string; onClose: () => void; onStatus: (s: string) => void; onPay: (p: string) => void; onChanged: () => void }) {
  const sh = o.shipment;
  const [ship, setShip] = useState({
    container_no: sh?.container_no || '', shipping_line: sh?.shipping_line || '',
    etd: sh?.etd || '', eta: sh?.eta || '', status: sh?.status || 'preparing', notes: sh?.notes || '',
  });
  const [savingShip, setSavingShip] = useState(false);
  const [docLabel, setDocLabel] = useState('');
  const [docBusy, setDocBusy] = useState(false);
  const setS = (k: keyof typeof ship) => (v: string) => setShip((s) => ({ ...s, [k]: v }));

  async function saveShipment() {
    setSavingShip(true);
    try { await api.admin.upsertShipment(o.id, ship, token); onChanged(); } catch {} finally { setSavingShip(false); }
  }

  function addDocument() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      setDocBusy(true);
      try {
        const { url } = await api.uploadDocument(file);
        await api.admin.addOrderDocument(o.id, { label: docLabel || 'Document', file_url: url }, token);
        setDocLabel('');
        onChanged();
      } catch {} finally { setDocBusy(false); }
    };
    input.click();
  }

  async function delDocument(id: number) {
    await api.admin.deleteOrderDocument(id, token);
    onChanged();
  }

  const content = (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.modalHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle} numberOfLines={1}>Order #{o.id} · {o.partner_name || o.partner_email}</Text>
            <Text style={styles.modalSub}>{fmtDate(o.created_at)} · {money(o.amount, o.currency)}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}><Text style={styles.modalClose}>✕</Text></Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, gap: 18 }}>
          {Array.isArray(o.items) && o.items.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={styles.odSection}>Items</Text>
              <View style={styles.infoCard}>
                {o.items.map((it: any, idx: number) => (
                  <View key={idx} style={[styles.reqRow, idx === 0 && { borderTopWidth: 0 }]}>
                    <Text style={styles.reqName} numberOfLines={2}>{it.name}</Text>
                    <Text style={styles.reqQty}>{it.qty} {it.unit}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ gap: 8 }}>
            <Text style={styles.odSection}>Order status</Text>
            <StatusPicker statuses={PORDER_STATUSES} current={o.status} onPick={onStatus} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.odSection}>Payment</Text>
            <StatusPicker statuses={PAY_STATUSES} current={o.payment_status} onPick={onPay} />
          </View>

          {/* Phase 7 — Shipment tracking */}
          <View style={{ gap: 8 }}>
            <Text style={styles.odSection}>Shipment</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field label="Container no." value={ship.container_no} onChangeText={setS('container_no')} placeholder="MSKU1234567" style={{ flex: 1 }} />
              <Field label="Shipping line" value={ship.shipping_line} onChangeText={setS('shipping_line')} placeholder="Maersk" style={{ flex: 1 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field label="ETD" value={ship.etd} onChangeText={setS('etd')} placeholder="2026-07-01" style={{ flex: 1 }} />
              <Field label="ETA" value={ship.eta} onChangeText={setS('eta')} placeholder="2026-07-20" style={{ flex: 1 }} />
            </View>
            <Field label="Notes" value={ship.notes} onChangeText={setS('notes')} placeholder="Port, remarks…" />
            <StatusPicker statuses={SHIPMENT_STATUSES} current={ship.status} onPick={setS('status')} />
            <Button label={savingShip ? 'Saving…' : sh ? 'Update shipment' : 'Add shipment'} onPress={saveShipment} disabled={savingShip} />
          </View>

          {/* Phase 8 — Documents */}
          <View style={{ gap: 8 }}>
            <Text style={styles.odSection}>Documents</Text>
            {(o.documents || []).length === 0 ? (
              <Text style={styles.muted}>No documents attached.</Text>
            ) : (
              <View style={styles.infoCard}>
                {(o.documents || []).map((d, idx) => (
                  <View key={d.id} style={[styles.reqRow, idx === 0 && { borderTopWidth: 0 }]}>
                    <Text style={styles.reqName} onPress={() => Linking.openURL(imageUri(d.file_url) as string)}>{d.label || 'Document'} ↗</Text>
                    <Pressable onPress={() => delDocument(d.id)}><Ionicons name="trash-outline" size={18} color={colors.red} /></Pressable>
                  </View>
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <Field label="Label" value={docLabel} onChangeText={setDocLabel} placeholder="Invoice / Packing list / B/L" style={{ flex: 1 }} />
              <Button label={docBusy ? 'Uploading…' : 'Upload'} onPress={addDocument} disabled={docBusy} />
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFoot}>
          <Button label="Close" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return require('react-dom').createPortal(content, document.body);
  }
  return content;
}

// Inline 5-star display for a feedback rating.
function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= rating ? 'star' : 'star-outline'}
          size={16}
          color={n <= rating ? colors.orange : colors.muted}
        />
      ))}
    </View>
  );
}

// Website star-rating + comment feedback submitted from the Contact page.
function FeedbackAdmin({ token }: { token: string }) {
  const { width } = useWindowDimensions();
  const fits = width >= 1024;
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.feedback(token).then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const avg = useMemo(
    () => (items.length ? (items.reduce((s, f) => s + f.rating, 0) / items.length).toFixed(1) : '0.0'),
    [items]
  );

  if (loading) return <Text style={styles.muted}>Loading…</Text>;
  if (items.length === 0) return <Text style={styles.muted}>No feedback yet.</Text>;

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.h}>
        {items.length} feedback {items.length === 1 ? 'entry' : 'entries'} · avg {avg}★
      </Text>
      <Tbl fits={fits}>
        <View style={[styles.table, fits ? styles.tableFull : styles.inqTable]}>
          <View style={[styles.tr, styles.thead]}>
            <Text style={[styles.th, { width: 120 }]}>Rating</Text>
            <Text style={[styles.th, { flex: 1 }]}>Comment</Text>
            <Text style={[styles.th, { width: 140 }]}>Date</Text>
          </View>
          {items.map((f, i) => (
            <View key={f.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
              <View style={{ width: 120, justifyContent: 'center' }}><Stars rating={f.rating} /></View>
              <Text style={[styles.td, { flex: 1 }]}>{f.comment || '—'}</Text>
              <Text style={[styles.td, { width: 140 }]}>{fmtDate(f.created_at)}</Text>
            </View>
          ))}
        </View>
      </Tbl>
    </View>
  );
}

// Editable position number — type a new position and commit on blur/enter.
function PosInput({ pos, onCommit }: { pos: number; onCommit: (n: number) => void }) {
  const [val, setVal] = useState(String(pos));
  useEffect(() => {
    setVal(String(pos));
  }, [pos]);
  const commit = () => {
    const n = parseInt(val, 10);
    if (!Number.isNaN(n) && n !== pos) onCommit(n);
    else setVal(String(pos));
  };
  return (
    <TextInput
      value={val}
      onChangeText={(t) => setVal(t.replace(/\D/g, ''))}
      onBlur={commit}
      onSubmitEditing={commit}
      keyboardType="number-pad"
      selectTextOnFocus
      style={styles.posInput}
      accessibilityLabel="Position"
    />
  );
}

// Arrange — admin sets the display order of categories and of products within a
// category by typing a position number; the rest re-sequence automatically.
function Arrange({ token }: { token: string }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<string>('');
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingCat, setRemovingCat] = useState<Category | null>(null);
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

  // Move a category to a typed position (1-based); the rest re-sequence around it.
  async function setCatPosition(fromIndex: number, toPos: number) {
    let target = toPos - 1;
    if (Number.isNaN(target)) return;
    target = Math.max(0, Math.min(cats.length - 1, target));
    if (target === fromIndex) return;
    const arr = [...cats];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(target, 0, moved);
    setCats(arr);
    try {
      await api.admin.reorderCategories(arr.map((c) => c.id), token);
      toast('Category order saved', 'success');
    } catch {
      toast('Could not save order', 'error');
    }
  }

  async function setProductPosition(fromIndex: number, toPos: number) {
    let target = toPos - 1;
    if (Number.isNaN(target)) return;
    target = Math.max(0, Math.min(rows.length - 1, target));
    if (target === fromIndex) return;
    const arr = [...rows];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(target, 0, moved);
    setRows(arr);
    try {
      await api.admin.reorderProducts(arr.map((p) => p.id), token);
      toast('Product order saved', 'success');
    } catch {
      toast('Could not save order', 'error');
    }
  }

  const catProductCount = (name: string) => products.filter((p) => p.category_name === name).length;

  async function deleteCategory() {
    const c = removingCat;
    if (!c) return;
    setRemovingCat(null);
    try {
      await api.admin.deleteCategory(c.id, token);
      toast(`Category “${c.name}” removed`, 'info');
      if (activeCat === c.name) setActiveCat('');
      load();
    } catch {
      toast('Could not remove category', 'error');
    }
  }

  if (loading) return <Text style={styles.muted}>Loading…</Text>;

  return (
    <View style={{ gap: 24 }}>
      {/* Category order */}
      <View style={{ gap: 10 }}>
        <Text style={styles.h}>Category order (how they appear on the site)</Text>
        <Text style={styles.arrHint}>Type a position number to move a category — the others re-sequence automatically.</Text>
        {cats.map((c, i) => (
          <Card key={c.id} style={styles.arrRow}>
            <PosInput pos={i + 1} onCommit={(n) => setCatPosition(i, n)} />
            <Text style={styles.arrName}>{c.name}</Text>
            <View style={styles.arrBtns}>
              <Pressable style={[styles.arrBtn, styles.arrDelBtn]} onPress={() => setRemovingCat(c)} accessibilityLabel={`Remove ${c.name}`}>
                <Ionicons name="trash-outline" size={17} color={colors.red} />
              </Pressable>
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
              <PosInput pos={i + 1} onCommit={(n) => setProductPosition(i, n)} />
              <Text style={styles.arrName} numberOfLines={1}>{p.name}</Text>
            </Card>
          ))
        )}
      </View>

      {removingCat && (
        <ConfirmDialog
          title={`Remove “${removingCat.name}”?`}
          message={
            catProductCount(removingCat.name) > 0
              ? `This category has ${catProductCount(removingCat.name)} product(s). They won't be deleted — they'll become "Uncategorised". This cannot be undone.`
              : 'This category will be removed. This cannot be undone.'
          }
          confirmLabel="Remove category"
          onConfirm={deleteCategory}
          onCancel={() => setRemovingCat(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ---- admin shell / sidebar ----
  shell: { flex: 1, flexDirection: 'row', backgroundColor: colors.soft },
  sidebar: { backgroundColor: colors.white, borderRightWidth: 1, borderRightColor: colors.border, paddingTop: 14 },
  brand: { paddingHorizontal: 16, paddingBottom: 14, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.line, alignItems: 'flex-start' },
  navSection: { marginBottom: 6 },
  navSectionLabel: { color: colors.ink, fontWeight: '900', fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 5 },
  navSectionDivider: { height: 1, backgroundColor: colors.line, marginHorizontal: 12, marginVertical: 6 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, position: 'relative' },
  navItemCompact: { justifyContent: 'center', marginHorizontal: 8, paddingHorizontal: 0 },
  navItemActive: { backgroundColor: colors.redSoft },
  navItemHover: { backgroundColor: 'rgba(217,36,25,0.06)', ...(Platform.OS === 'web' ? ({ transition: 'background-color 0.18s ease' } as any) : null) },
  navActiveBar: { position: 'absolute', left: -10, top: 8, bottom: 8, width: 3, borderRadius: 3, backgroundColor: colors.red },
  navLabel: { color: colors.muted, fontWeight: '700', fontSize: 14, flex: 1 },
  navLabelActive: { color: colors.red },
  navCount: { color: colors.muted, fontWeight: '800', fontSize: 12, opacity: 0.8 },
  navCountActive: { color: colors.red },
  sideFooter: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 8, gap: 2 },

  // Topbar profile dropdown (holds View site + Log out)
  profileWrap: { position: 'relative', flexShrink: 0 },
  profileScrim: Platform.OS === 'web'
    ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 } as any)
    : { position: 'absolute', top: -1000, left: -1000, right: -1000, height: 3000, zIndex: 40 },
  profileMenu: {
    position: 'absolute', top: 50, right: 0, width: 240, backgroundColor: colors.white,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, zIndex: 50, ...shadow.card,
  },
  profileHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10 },
  profileHeadAvatar: { width: 38, height: 38, borderRadius: 999, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  profileName: { color: colors.ink, fontWeight: '900', fontSize: 14 },
  profileEmail: { color: colors.muted, fontSize: 12 },
  profileDivider: { height: 1, backgroundColor: colors.line, marginBottom: 6 },
  profileItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 6, borderRadius: 8 },
  profileItemHover: { backgroundColor: colors.offWhite },
  profileItemText: { color: colors.text, fontWeight: '700', fontSize: 14 },

  // Change-password modal
  pwOverlay: { ...StyleSheet.absoluteFillObject, ...(Platform.OS === 'web' ? ({ position: 'fixed' } as any) : null), alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(15,12,10,0.55)', zIndex: 1000 },
  pwModal: { width: '100%', maxWidth: 420, backgroundColor: colors.white, borderRadius: radius.lg, padding: 22, ...shadow.card },
  pwHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pwHeadIcon: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  pwTitle: { flex: 1, color: colors.ink, fontWeight: '900', fontSize: 18 },
  pwLabel: { color: colors.ink, fontWeight: '800', fontSize: 12, letterSpacing: 0.4 },
  pwInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.ink, backgroundColor: colors.white, outlineStyle: 'none' as any },
  pwShowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 2 },
  pwShowText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  pwErr: { color: colors.red, fontSize: 13, fontWeight: '600' },
  pwDone: { color: colors.ink, fontWeight: '800', fontSize: 15, textAlign: 'center' },
  main: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 28, paddingVertical: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 30 },
  topbarCompact: { paddingHorizontal: 14, flexWrap: 'wrap', rowGap: 10 },
  addBtnCompact: { paddingHorizontal: 12, gap: 0 },
  pageTitle: { fontSize: 20, fontWeight: '900', color: colors.ink },
  pageSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  // minWidth 0 lets this actually shrink — without it the search box's width
  // pins the row open and the profile avatar spills off the right edge on the
  // ~900–1100px band, where the topbar has not gone compact yet.
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, minWidth: 0 },
  topSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 240, flexShrink: 1, minWidth: 132, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.white },
  adminAvatar: { width: 38, height: 38, borderRadius: 999, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  adminAvatarText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  tabs: { gap: 8 },
  arrRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  arrPos: { width: 26, color: colors.muted, fontWeight: '900', fontSize: 14 },
  arrHint: { color: colors.muted, fontSize: 12, marginBottom: 2 },
  posInput: { width: 46, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.offWhite, textAlign: 'center', fontWeight: '900', fontSize: 15, color: colors.navy, outlineStyle: 'none' as any },
  arrName: { flex: 1, color: colors.ink, fontWeight: '700', fontSize: 14 },
  arrBtns: { flexDirection: 'row', gap: 6 },
  arrBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.offWhite },
  arrDelBtn: { borderColor: '#F3C8C5', backgroundColor: '#FFF5F4' },
  arrBtnOff: { opacity: 0.35 },
  arrBtnText: { fontSize: 18, fontWeight: '900', color: colors.navy },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#F1F2F5' },
  tabActive: { backgroundColor: colors.orange },
  tabText: { fontWeight: '800', color: colors.muted, textTransform: 'capitalize' },
  tabTextActive: { color: colors.white },
  muted: { color: colors.muted, fontSize: 14 },
  h: { fontWeight: '900', fontSize: 16, color: colors.ink },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  // Hero KPIs — four large cards across the top.
  heroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  // Secondary metrics — a tighter row of smaller cards.
  secGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    minWidth: 150,
    maxWidth: 360,
    flexGrow: 1,
    flexBasis: 150,
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadow.soft,
  },
  statCardSm: { padding: 13, gap: 3, minWidth: 132, flexBasis: 140, maxWidth: 400 },
  statValueSm: { fontSize: 20 },
  statIconSm: { width: 30, height: 30 },
  statCardClickable: { cursor: 'pointer' as any },
  // Needs-attention band
  attnCard: { gap: 12 },
  attnHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  attnHeadIcon: { width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  attnHeadIconActive: { backgroundColor: '#FDECEC' },
  attnHeadIconCalm: { backgroundColor: '#E7F7EE' },
  attnCountPill: { backgroundColor: colors.red, borderRadius: 999, minWidth: 22, height: 22, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  attnCountText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  attnAllClear: { color: colors.green, fontWeight: '800', fontSize: 13 },
  attnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  attnItem: { flexDirection: 'row', alignItems: 'center', gap: 10, flexGrow: 1, flexBasis: 180, minWidth: 158, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: colors.white, cursor: 'pointer' as any },
  attnItemUrgent: { borderColor: '#F6C9C6', backgroundColor: '#FEF6F5' },
  attnItemHover: { ...shadow.card, transform: [{ translateY: -1 }] },
  attnItemIcon: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  attnValue: { fontSize: 19, fontWeight: '900' },
  attnLabel: { flex: 1, color: colors.muted, fontSize: 12.5, fontWeight: '700', lineHeight: 16 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statIcon: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 26, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  statHint: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  tableHead: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
  tfoot: { backgroundColor: '#FAFAFB' },
  colNum: { width: 90, textAlign: 'right' },
  // orders-by-status columns
  cStatusCol: { width: 140 },
  cBar: { flex: 1, justifyContent: 'center' },
  cNum: { width: 90, textAlign: 'right' },
  barTrack: { height: 8, backgroundColor: '#EEF0F3', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  // customers table columns
  cuTableMin: { minWidth: 720 },
  cuName: { width: 160 },
  cuEmail: { flex: 1, minWidth: 180 },
  cuPhone: { width: 150 },
  cuRole: { width: 100 },
  cuJoined: { width: 110 },
  // notifications
  notifRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  bellBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, ...shadow.soft },
  bellText: { fontWeight: '800', color: colors.ink, fontSize: 13 },
  bellBadge: { minWidth: 20, paddingHorizontal: 6, height: 20, borderRadius: 999, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  bellBadgeText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  notifHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
  notifItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.border },
  notifIcon: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontWeight: '800', color: colors.ink, fontSize: 14 },
  notifSub: { color: colors.muted, fontSize: 12, marginTop: 1, textTransform: 'capitalize' },
  notifTime: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  // header / tabs / title
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 },
  updated: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 6 },
  tabBar: { backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, padding: 6, marginTop: 4, ...shadow.soft },
  // stat card extras
  statSub: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  statCardRing: { borderColor: colors.red, borderWidth: 1.5, backgroundColor: colors.redSoft },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  trendUp: { backgroundColor: '#E7F7EE' },
  trendDown: { backgroundColor: '#FDECEC' },
  trendText: { fontSize: 11, fontWeight: '800' },
  // dashboard pie + panels
  cardHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dashRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'stretch' },
  dashCard: { flex: 1, minWidth: 260 },
  // recent orders
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
  viewAll: { color: colors.red, fontWeight: '800', fontSize: 13 },
  rOrder: { width: 64 },
  rCust: { flex: 1, minWidth: 130 },
  rShip: { flex: 1, minWidth: 140 },
  rDate: { width: 100 },
  rTotal: { width: 120, textAlign: 'right' },
  rStatus: { width: 120, alignItems: 'flex-start' },
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 12, flexWrap: 'wrap' },
  pieWrap: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center' },
  pieHole: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pieTotal: { fontSize: 26, fontWeight: '900', color: colors.ink },
  pieTotalL: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  legend: { flex: 1, minWidth: 160, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 999 },
  legendLabel: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  legendVal: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  miniLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  miniVal: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  // orders table columns
  // registrations table columns
  regTable: { minWidth: 1000 },
  gCompany: { width: 170 },
  gType: { width: 90, textTransform: 'capitalize' },
  gCountry: { width: 150 },
  gContact: { flex: 1, minWidth: 150 },
  gReq: { flex: 1.2, minWidth: 180 },
  gStatus: { width: 110 },
  gView: { width: 56, alignItems: 'center' },
  // inquiries table columns
  inqTable: { minWidth: 980 },
  qName: { width: 150 },
  qEmail: { flex: 1, minWidth: 180 },
  qPhone: { width: 150 },
  qReq: { flex: 1.2, minWidth: 200 },
  qDate: { width: 100 },
  qStatus: { width: 110 },
  qView: { width: 56, alignItems: 'center' },
  ordersTable: { minWidth: 1060 },
  oOrder: { width: 76 },
  oName: { width: 150 },
  oEmail: { flex: 1, minWidth: 190 },
  oPhone: { width: 140 },
  oShip: { flex: 1, minWidth: 180 },
  oDate: { width: 100 },
  oStatus: { width: 110 },
  oView: { width: 56, alignItems: 'center' },
  eyeBtn: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.offWhite },
  // order detail modal
  overlay: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,28,66,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 },
  modal: { width: '100%', maxWidth: 600, maxHeight: '88vh' as any, backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', ...shadow.card },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  modalSub: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft },
  modalClose: { color: colors.muted, fontSize: 16, fontWeight: '800' },
  modalFoot: { flexDirection: 'row', justifyContent: 'flex-end', padding: 14, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.soft },
  odSection: { fontWeight: '900', fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  odStrong: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  odMeta: { color: colors.muted, fontSize: 13 },
  odBody: { color: colors.text, fontSize: 14, lineHeight: 21 },
  infoCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.line },
  infoLabel: { width: 96, color: colors.muted, fontWeight: '700', fontSize: 13 },
  infoValue: { flex: 1, color: colors.ink, fontWeight: '600', fontSize: 14 },
  reqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.line },
  reqName: { flex: 1, color: colors.ink, fontWeight: '600', fontSize: 14 },
  reqQty: { color: colors.orangeDark, fontWeight: '800', fontSize: 13 },
  quoteCard: { backgroundColor: colors.soft, borderRadius: radius.md, borderLeftWidth: 3, borderLeftColor: colors.orange, paddingHorizontal: 14, paddingVertical: 12 },
  quoteText: { color: colors.text, fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  err: { color: colors.red, fontSize: 13 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: colors.white },
  uploadText: { fontWeight: '700', color: colors.text, fontSize: 13 },
  statusPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border },
  statusChipText: { fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  odQty: { width: 50, textAlign: 'right' },
  odPrice: { width: 90, textAlign: 'right' },
  adminRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, flexWrap: 'wrap' },
  // products category sidebar
  prodLayout: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  prodHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  catSidebar: { width: 200, flexShrink: 0, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 8, gap: 4 },
  // Keep the category list in view while the product list scrolls (web).
  // Full viewport height (minus the topbar) so the rail reads as a full-height
  // panel beside the long product table rather than stopping halfway down the
  // page; scrolls on its own if the category list ever outgrows the screen.
  catSticky: { position: 'sticky' as any, top: 16, height: 'calc(100vh - 110px)' as any, overflowY: 'auto' as any },
  catSideTitle: { fontWeight: '900', fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10, paddingVertical: 9, borderRadius: radius.sm },
  catRowActive: { backgroundColor: colors.orange },
  sortHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  thActive: { color: colors.navy, fontWeight: '900' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, backgroundColor: colors.white },
  filterBtnText: { color: colors.ink, fontWeight: '800', fontSize: 13, textTransform: 'capitalize' },
  filterScrim: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 150 },
  filterMenu: { position: 'absolute' as any, top: 46, right: 0, width: 180, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 6, zIndex: 200, ...shadow.card },
  filterItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 9 },
  filterItemActive: { backgroundColor: colors.cream },
  filterItemText: { color: colors.text, fontWeight: '700', fontSize: 13, textTransform: 'capitalize' },
  catChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F1F2F5' },
  catChipActive: { backgroundColor: colors.orange },
  catText: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 13 },
  catTextActive: { color: colors.white },
  catCount: { minWidth: 24, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: '#EEF0F3', alignItems: 'center' },
  catCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  catCountText: { fontSize: 11, fontWeight: '800', color: colors.muted },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.white },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: colors.text, outlineStyle: 'none' as any },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewToggle: { flexDirection: 'row', backgroundColor: '#F1F2F5', borderRadius: radius.pill, padding: 3 },
  viewBtn: { width: 38, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  viewBtnActive: { backgroundColor: colors.white, ...shadow.soft },
  viewIcon: { fontSize: 16, color: colors.muted, fontWeight: '900' },
  viewIconActive: { color: colors.orange },
  // table
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.white },
  tableFull: { width: '100%' },
  // sticky header (web): overflow must be visible on the table so the header
  // can pin to the page scroll instead of being clipped by the rounded corners.
  tableStickyWrap: { overflow: 'visible' as any },
  theadSticky: { position: 'sticky' as any, top: 0, zIndex: 5, backgroundColor: '#FAFAFB', borderBottomWidth: 1, borderBottomColor: colors.border },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  thead: { backgroundColor: '#FAFAFB', borderTopWidth: 0 },
  trAlt: { backgroundColor: '#FCFCFD' },
  trHover: { backgroundColor: colors.cream },
  th: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { fontSize: 14, color: colors.text },
  tdStrong: { fontWeight: '800', color: colors.ink },
  // Secondary line inside the name cell (holds category once that column drops).
  subTd: { fontSize: 12, color: colors.muted, marginTop: 2 },
  colSr: { width: 52 },
  colImg: { width: 52 },
  colName: { flex: 2.2, minWidth: 150 },
  colCat: { flex: 1.5, minWidth: 110, color: colors.muted },
  colPrice: { width: 96 },
  colUnit: { width: 60 },
  colStock: { width: 60 },
  colStatus: { width: 84 },
  colDate: { width: 100, color: colors.muted },
  colActions: { width: 186, flexShrink: 0 },
  actionCell: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  starBtn: { paddingHorizontal: 6, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  founderThumb: { width: 56, height: 56, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border },
  founderPreview: { width: 92, height: 92, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  // grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { gap: 10, padding: 14, flexGrow: 1 },
  gridTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  gridMeta: { color: colors.muted, fontSize: 13 },
  archRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, flexWrap: 'wrap' },
  rowTitle: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  rowMeta: { color: colors.muted, fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  orderTotal: { fontWeight: '900', color: colors.navy, fontSize: 17 },
});

// ---------- News (admin-managed) ----------
function NewsAdmin({ token }: { token: string }) {
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<News | null | undefined>(undefined); // undefined=list, null=new
  const [confirming, setConfirming] = useState<News | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try { setItems(await api.admin.news(token)); } catch {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [token]);

  async function del() {
    const n = confirming;
    if (!n) return;
    setConfirming(null);
    try { await api.admin.deleteNews(n.id, token); toast('Article deleted', 'info'); load(); }
    catch { toast('Could not delete article', 'error'); }
  }

  if (editing !== undefined) {
    return <NewsForm token={token} article={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />;
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Button label="+ New article" icon="add" onPress={() => setEditing(null)} />
      </View>
      {loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : items.length === 0 ? (
        <Text style={styles.muted}>No news yet. Click “New article” to publish your first update.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {items.map((n) => (
            <Card key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {!!n.tag && <Badge text={n.tag} tone="orange" />}
                  <Badge text={n.is_published ? 'published' : 'draft'} tone={n.is_published ? 'green' : 'muted'} />
                  <Text style={styles.rowMeta}>{fmtDate(n.created_at)}</Text>
                </View>
                <Text style={styles.rowTitle} numberOfLines={1}>{n.title}</Text>
                <Text style={[styles.rowMeta, { textTransform: 'none' }]} numberOfLines={2}>{n.body}</Text>
              </View>
              <Button label="Edit" variant="ghost" onPress={() => setEditing(n)} style={styles.smallBtn} />
              <Button label="Delete" variant="danger" onPress={() => setConfirming(n)} style={styles.smallBtn} />
            </Card>
          ))}
        </View>
      )}
      {confirming && (
        <ConfirmDialog
          title="Delete this article?"
          message={`“${confirming.title}” will be permanently removed.`}
          confirmLabel="Delete"
          onConfirm={del}
          onCancel={() => setConfirming(null)}
        />
      )}
    </View>
  );
}

function NewsForm({ token, article, onClose, onSaved }: { token: string; article: News | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: article?.title || '',
    tag: article?.tag || '',
    body: article?.body || '',
    image_url: article?.image_url || '',
    is_published: article?.is_published ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const set = (k: 'title' | 'tag' | 'body' | 'image_url') => (t: string) => setForm((f) => ({ ...f, [k]: t }));

  async function save() {
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setBusy(true);
    try {
      if (article) await api.admin.updateNews(article.id, form, token);
      else await api.admin.createNews(form, token);
      toast('Article saved', 'success');
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Could not save article');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 14, maxWidth: 720 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.h}>{article ? 'Edit article' : 'New article'}</Text>
        <Button label="← Back" variant="ghost" onPress={onClose} style={styles.smallBtn} />
      </View>
      <Field label="Title *" value={form.title} onChangeText={set('title')} placeholder="Headline" />
      <Field label="Tag" value={form.tag} onChangeText={set('tag')} placeholder="e.g. Exports, Quality, Company" />
      <Field label="Image URL" value={form.image_url} onChangeText={set('image_url')} placeholder="https://… (optional)" />
      <Field label="Body" value={form.body} onChangeText={set('body')} placeholder="Write the article…" multiline />
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => setForm((f) => ({ ...f, is_published: !f.is_published }))}>
        <Ionicons name={form.is_published ? 'checkbox' : 'square-outline'} size={22} color={form.is_published ? colors.green : colors.muted} />
        <Text style={styles.rowTitle}>Published (visible on the website)</Text>
      </Pressable>
      {!!error && <Text style={{ color: colors.red, fontSize: 13 }}>{error}</Text>}
      <Button label={busy ? 'Saving…' : article ? 'Save changes' : 'Publish article'} onPress={save} disabled={busy} />
    </View>
  );
}

// ─── Founders (About-page team cards) ────────────────────────────────────────
function FoundersAdmin({ token }: { token: string }) {
  const [items, setItems] = useState<Founder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Founder | null | undefined>(undefined); // undefined=list, null=new
  const [confirming, setConfirming] = useState<Founder | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try { setItems(await api.founders()); } catch {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [token]);

  async function del() {
    const f = confirming;
    if (!f) return;
    setConfirming(null);
    try { await api.admin.deleteFounder(f.id, token); toast('Founder removed', 'info'); load(); }
    catch { toast('Could not remove founder', 'error'); }
  }

  if (editing !== undefined) {
    return <FoundersForm token={token} founder={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />;
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.muted}>Cards shown in the About page “Our Founders” row. Lower order numbers appear first.</Text>
        <Button label="+ New founder" icon="add" onPress={() => setEditing(null)} />
      </View>
      {loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : items.length === 0 ? (
        <Text style={styles.muted}>No founders yet. Click “New founder” to add the first card.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {items.map((f) => (
            <Card key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.founderThumb}>
                {!!f.image_url && <ExpoImage source={{ uri: imageUri(f.image_url) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{f.name}</Text>
                  <Badge text={`#${f.sort_order}`} tone="muted" />
                </View>
                <Text style={[styles.rowMeta, { textTransform: 'none' }]}>{f.role}</Text>
                <Text style={[styles.rowMeta, { textTransform: 'none' }]} numberOfLines={2}>{f.bio}</Text>
              </View>
              <Button label="Edit" variant="ghost" onPress={() => setEditing(f)} style={styles.smallBtn} />
              <Button label="Delete" variant="danger" onPress={() => setConfirming(f)} style={styles.smallBtn} />
            </Card>
          ))}
        </View>
      )}
      {confirming && (
        <ConfirmDialog
          title="Remove this founder?"
          message={`“${confirming.name}” will be permanently removed from the About page.`}
          confirmLabel="Delete"
          onConfirm={del}
          onCancel={() => setConfirming(null)}
        />
      )}
    </View>
  );
}

function FoundersForm({ token, founder, onClose, onSaved }: { token: string; founder: Founder | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: founder?.name || '',
    role: founder?.role || '',
    bio: founder?.bio || '',
    image_url: founder?.image_url || '',
    sort_order: String(founder?.sort_order ?? 0),
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const set = (k: 'name' | 'role' | 'bio' | 'image_url') => (t: string) => setForm((f) => ({ ...f, [k]: t }));

  function pickFile() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      setError('');
      setUploading(true);
      try { const { url } = await api.admin.uploadImage(file, token); setForm((f) => ({ ...f, image_url: url })); }
      catch (e: any) { setError(e.message || 'Upload failed.'); }
      finally { setUploading(false); }
    };
    input.click();
  }

  async function save() {
    setError('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setBusy(true);
    const body = { ...form, sort_order: parseInt(form.sort_order, 10) || 0 };
    try {
      if (founder) await api.admin.updateFounder(founder.id, body, token);
      else await api.admin.createFounder(body, token);
      toast('Founder saved', 'success');
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Could not save founder');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 14, maxWidth: 720 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.h}>{founder ? 'Edit founder' : 'New founder'}</Text>
        <Button label="← Back" variant="ghost" onPress={onClose} style={styles.smallBtn} />
      </View>

      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <View style={styles.founderPreview}>
          {form.image_url
            ? <ExpoImage source={{ uri: imageUri(form.image_url) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            : <Text style={styles.muted}>No{'\n'}photo</Text>}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Button label={uploading ? 'Uploading…' : '⬆ Choose photo'} variant="navy" onPress={pickFile} disabled={uploading} style={{ paddingVertical: 9 }} />
          {!!form.image_url && <Button label="Remove photo" variant="ghost" onPress={() => setForm((f) => ({ ...f, image_url: '' }))} style={{ paddingVertical: 9 }} />}
        </View>
      </View>

      <Field label="Name *" value={form.name} onChangeText={set('name')} placeholder="e.g. Managing Director" />
      <Field label="Role / Title" value={form.role} onChangeText={set('role')} placeholder="e.g. Founder & Strategy" />
      <Field label="…or paste a photo URL" value={form.image_url} onChangeText={set('image_url')} placeholder="https://…" />
      <Field label="Short bio" value={form.bio} onChangeText={set('bio')} placeholder="One or two lines about this person…" multiline />
      <Field label="Display order" value={form.sort_order} onChangeText={(t) => setForm((f) => ({ ...f, sort_order: t.replace(/\D/g, '') }))} placeholder="0" keyboardType="number-pad" />

      {!!error && <Text style={{ color: colors.red, fontSize: 13 }}>{error}</Text>}
      <Button label={busy ? 'Saving…' : founder ? 'Save changes' : 'Add founder'} onPress={save} disabled={busy} />
    </View>
  );
}
