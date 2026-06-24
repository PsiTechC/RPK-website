import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api, imageUri, roleHome, Registration, RFQ, PartnerOrder } from '../lib/api';
import { useApp, money } from '../lib/store';
import { fmtDate } from '../lib/date';
import { colors, radius, shadow } from '../lib/theme';
import { Logo } from './Logo';
import { Badge, Button, Field } from './ui';
import { RequirementBuilder, ReqItem } from './RequirementBuilder';

type Kind = 'import' | 'export';

const rfqTone: Record<string, any> = { open: 'orange', quoted: 'navy', approved: 'green', rejected: 'red', closed: 'muted' };

// Shared shell for the Import / Export partner dashboards, styled to match the
// RPK storefront (charcoal hero, warm surfaces, chili-red accents). The Import
// dashboard runs the live RFQ → quotation flow (Phase 5); Export-side supply
// tools land in a later phase and stay marked "Soon".
export function PartnerDashboard({ kind }: { kind: Kind }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 860;
  const { user, token, ready, logout } = useApp();
  const expectedRole = kind === 'import' ? 'import_partner' : 'export_partner';
  const isImport = kind === 'import';

  const [regs, setRegs] = useState<Registration[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [showNew, setShowNew] = useState(false);
  // Profile menu (top-right corner) — holds the Profile link + Logout.
  const [menuOpen, setMenuOpen] = useState(false);
  // Which dataset the stat cards / quick-actions have filtered the dashboard to.
  // Each stat card maps to its own view so every card acts as a filter.
  const [view, setView] = useState<'rfqs' | 'approved' | 'orders' | 'payments' | 'shipments' | 'documents'>('rfqs');

  // Route guard: only the matching partner role may view this dashboard.
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== expectedRole) router.replace(roleHome(user.role) as any);
  }, [ready, user, expectedRole]);

  function reload() {
    if (!token) return;
    api.myRegistrations(token).then(setRegs).catch(() => {});
    if (isImport) {
      api.myRFQs(token).then(setRfqs).catch(() => {});
      api.myPartnerOrders(token).then(setOrders).catch(() => {});
    }
  }
  useEffect(reload, [token, isImport]);

  async function respond(qid: number, status: 'approved' | 'rejected') {
    if (!token) return;
    await api.respondQuotation(qid, status, token);
    reload();
  }

  const stats = useMemo(() => {
    const approvedQuotes = rfqs.reduce((n, r) => n + r.quotations.filter((q) => q.status === 'approved').length, 0);
    const unpaid = orders.filter((o) => o.payment_status !== 'paid').length;
    return { rfqs: rfqs.length, approvedQuotes, orders: orders.length, unpaid };
  }, [rfqs, orders]);

  if (!ready || !user || user.role !== expectedRole) {
    return (
      <View style={styles.loading}>
        <Text style={styles.muted}>Loading your dashboard…</Text>
      </View>
    );
  }

  const title = isImport ? 'Import Partner' : 'Export Partner';
  const cards = isImport
    ? [
        { label: 'Total RFQs', value: String(stats.rfqs), icon: 'document-text-outline' as const, view: 'rfqs' as const },
        { label: 'Approved Quotations', value: String(stats.approvedQuotes), icon: 'checkmark-done-outline' as const, view: 'approved' as const },
        { label: 'Orders', value: String(stats.orders), icon: 'receipt-outline' as const, view: 'orders' as const },
        { label: 'Pending Payments', value: String(stats.unpaid), icon: 'card-outline' as const, view: 'payments' as const },
      ]
    : [
        { label: 'Available Products', value: '0', icon: 'cube-outline' as const },
        { label: 'New Supply Requests', value: '0', icon: 'mail-unread-outline' as const },
        { label: 'Accepted Deals', value: '0', icon: 'checkmark-done-outline' as const },
        { label: 'Pending Payments', value: '—', icon: 'card-outline' as const },
      ];

  const menu = isImport
    ? [
        { label: 'Product Catalog', icon: 'grid-outline' as const, onPress: () => router.push('/products' as any) },
        { label: 'Request Quotation', icon: 'create-outline' as const, onPress: () => setShowNew(true) },
        { label: 'My Quotations', icon: 'pricetags-outline' as const, view: 'rfqs' as const },
        { label: 'My Orders', icon: 'receipt-outline' as const, view: 'orders' as const },
        { label: 'Shipment Tracking', icon: 'boat-outline' as const, view: 'shipments' as const },
        { label: 'Documents', icon: 'folder-outline' as const, view: 'documents' as const },
      ]
    : [
        { label: 'Product Catalog', icon: 'grid-outline' as const, onPress: () => router.push('/products' as any) },
        { label: 'Submit Products', icon: 'add-circle-outline' as const, soon: true },
        { label: 'Supply Requests', icon: 'mail-unread-outline' as const, soon: true },
        { label: 'Upload Invoice', icon: 'document-attach-outline' as const, soon: true },
        { label: 'Documents', icon: 'folder-outline' as const, soon: true },
      ];

  // Section heading shown above the table for the active filter.
  const viewTitle: Record<typeof view, string> = {
    rfqs: 'My quotation requests',
    approved: 'Approved quotations',
    orders: 'My orders',
    payments: 'Pending payments',
    shipments: 'Shipment tracking',
    documents: 'Documents',
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.offWhite }} contentContainerStyle={{ paddingBottom: 64 }}>
      {/* Top bar — matches the storefront header */}
      <View style={styles.topbar}>
        <Pressable onPress={() => router.push('/' as any)}><Logo /></Pressable>
        <View style={{ flex: 1 }} />
        <View style={styles.rolePill}>
          <Ionicons name={isImport ? 'download-outline' : 'cloud-upload-outline'} size={15} color={colors.red} />
          <Text style={styles.rolePillText}>{title}</Text>
        </View>
        <View style={styles.profileWrap}>
          <Pressable style={styles.profileBtn} onPress={() => setMenuOpen((v) => !v)}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{user.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <Text style={styles.profileBtnText}>Profile</Text>
            <Ionicons name={menuOpen ? 'chevron-up' : 'chevron-down'} size={15} color={colors.red} />
          </Pressable>
          {menuOpen && (
            <>
              <Pressable
                style={[styles.menuBackdrop, Platform.OS === 'web' ? ({ position: 'fixed' } as any) : null]}
                onPress={() => setMenuOpen(false)}
              />
              <View style={styles.profileMenu}>
                <Pressable style={styles.profileMenuItem} onPress={() => { setMenuOpen(false); router.push('/account' as any); }}>
                  <Ionicons name="person-outline" size={16} color={colors.navy} />
                  <Text style={styles.profileMenuText}>My Profile</Text>
                </Pressable>
                <View style={styles.profileMenuDivider} />
                <Pressable style={styles.profileMenuItem} onPress={() => { setMenuOpen(false); logout(); router.replace('/'); }}>
                  <Ionicons name="log-out-outline" size={16} color={colors.red} />
                  <Text style={[styles.profileMenuText, { color: colors.red }]}>Logout</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: compact ? 14 : 26 }}>
        {/* Branded welcome hero */}
        <View style={[styles.hero, compact && { flexDirection: 'column', alignItems: 'flex-start', gap: 14 }]}>
          <View style={styles.heroAccent} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.kicker}>
              <Ionicons name="ribbon-outline" size={14} color={colors.white} />
              <Text style={styles.kickerText}>{title.toUpperCase()} · RPK FOOD TRADING</Text>
            </View>
            <Text style={styles.h1}>Welcome, {user.name.split(' ')[0]} 👋</Text>
            <Text style={styles.heroSub}>
              {isImport
                ? 'Request bulk quotations, review pricing and track your trade with RPK — all in one place.'
                : 'Manage your supply offers and deals with RPK Food Trading.'}
            </Text>
          </View>
          {isImport && (
            <Pressable style={styles.heroCta} onPress={() => setShowNew(true)}>
              <Ionicons name="add-circle" size={18} color={colors.white} />
              <Text style={styles.heroCtaText}>Request a quotation</Text>
            </Pressable>
          )}
        </View>

        {/* Stat cards (overlap the hero slightly for a premium feel) */}
        <View style={[styles.cardRow, compact && { flexDirection: 'column' }]}>
          {cards.map((c: any) => {
            const active = c.view && c.view === view;
            return (
              <Pressable
                key={c.label}
                disabled={!c.view}
                onPress={() => c.view && setView(c.view)}
                style={({ hovered }: any) => [styles.statCard, active && styles.statActive, hovered && c.view && !active && { borderColor: colors.red }]}
              >
                <View style={styles.statIcon}>
                  <Ionicons name={c.icon} size={20} color={colors.red} />
                </View>
                <View>
                  <Text style={styles.statValue}>{c.value}</Text>
                  <Text style={styles.statLabel}>{c.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Quick actions</Text>
        <View style={styles.menuGrid}>
          {menu.map((m: any) => {
            const active = m.view && m.view === view;
            return (
              <Pressable
                key={m.label}
                style={({ hovered }: any) => [styles.menuItem, hovered && !m.soon && styles.menuHover, active && styles.menuActive, m.soon && { opacity: 0.55 }]}
                disabled={m.soon}
                onPress={() => (m.view ? setView(m.view) : m.onPress && m.onPress())}
              >
                <View style={[styles.menuIcon, active && { backgroundColor: colors.redSoft }]}>
                  <Ionicons name={m.icon} size={18} color={active ? colors.red : colors.navy} />
                </View>
                <Text style={[styles.menuLabel, active && { color: colors.redDeep }]}>{m.label}</Text>
                {m.soon && <Badge text="Soon" tone="muted" />}
              </Pressable>
            );
          })}
        </View>

        {/* Active filter rendered as a table (import partners). Every stat card
            and quick-action above selects one of these views. */}
        {isImport && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>{viewTitle[view]}</Text>
              {view === 'rfqs' && <Button label="+ New request" onPress={() => setShowNew(true)} />}
            </View>

            {view === 'rfqs' && (
              <DataTable
                compact={compact}
                emptyIcon="document-text-outline"
                emptyText="No quotation requests yet. Tap “+ New request” to ask for bulk pricing."
                rows={rfqs.map((r) => ({ ...r, _key: `rfq-${r.id}` }))}
                columns={[
                  { header: 'RFQ', flex: 0.8, render: (r) => <Text style={styles.tdStrong}>#{r.id}</Text> },
                  { header: 'Date', flex: 1.1, render: (r) => <Text style={styles.td}>{fmtDate(r.created_at)}</Text> },
                  { header: 'Items', flex: 2.4, render: (r) => <Text style={styles.td} numberOfLines={2}>{(r.items || []).map((it: any) => `${it.name} ×${it.qty} ${it.unit}`).join(', ') || '—'}</Text> },
                  { header: 'Destination', flex: 1.2, render: (r) => <Text style={styles.td} numberOfLines={1}>{r.destination_country || '—'}</Text> },
                  { header: 'Quotation', flex: 1.6, render: (r) => {
                      const q = r.quotations[r.quotations.length - 1];
                      if (!q) return <Text style={styles.awaiting}>Awaiting…</Text>;
                      return (
                        <View>
                          <Text style={styles.quotePrice}>{money(q.price, q.currency)}</Text>
                          {!!q.file_url && <Text style={styles.link} onPress={() => Platform.OS === 'web' && window.open(imageUri(q.file_url), '_blank')}>PDF ↗</Text>}
                        </View>
                      );
                    } },
                  { header: 'Status', flex: 1, render: (r) => <Badge text={r.status} tone={rfqTone[r.status] || 'muted'} /> },
                  { header: 'Action', flex: 1.9, align: 'right', render: (r) => {
                      const q = r.quotations.find((x: any) => x.status === 'sent');
                      if (!q) return <Text style={styles.td}>—</Text>;
                      return (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <Button label="Approve" onPress={() => respond(q.id, 'approved')} style={styles.smallBtn} />
                          <Button label="Reject" variant="outline" onPress={() => respond(q.id, 'rejected')} style={styles.smallBtn} />
                        </View>
                      );
                    } },
                ]}
              />
            )}

            {view === 'approved' && (
              <DataTable
                compact={compact}
                emptyIcon="checkmark-done-outline"
                emptyText="No approved quotations yet. Approve a quote under “My quotation requests”."
                rows={rfqs.flatMap((r) => r.quotations.filter((q) => q.status === 'approved').map((q) => ({ ...q, rfq: r, _key: `q-${q.id}` })))}
                columns={[
                  { header: 'RFQ', flex: 0.8, render: (q) => <Text style={styles.tdStrong}>#{q.rfq.id}</Text> },
                  { header: 'Items', flex: 2.4, render: (q) => <Text style={styles.td} numberOfLines={2}>{(q.rfq.items || []).map((it: any) => `${it.name} ×${it.qty} ${it.unit}`).join(', ') || '—'}</Text> },
                  { header: 'Price', flex: 1.2, render: (q) => <Text style={styles.quotePrice}>{money(q.price, q.currency)}</Text> },
                  { header: 'Validity', flex: 1.4, render: (q) => <Text style={styles.td} numberOfLines={1}>{q.validity || '—'}</Text> },
                  { header: 'Document', flex: 1.2, render: (q) => q.file_url ? <Text style={styles.link} onPress={() => Platform.OS === 'web' && window.open(imageUri(q.file_url), '_blank')}>PDF ↗</Text> : <Text style={styles.td}>—</Text> },
                  { header: 'Status', flex: 1, align: 'right', render: (q) => <Badge text={q.status} tone="green" /> },
                ]}
              />
            )}

            {view === 'orders' && (
              <DataTable
                compact={compact}
                emptyIcon="receipt-outline"
                emptyText="No orders yet. Approve a quotation and it becomes an order here."
                rows={orders.map((o) => ({ ...o, _key: `o-${o.id}` }))}
                columns={[
                  { header: 'Order', flex: 0.9, render: (o) => <Text style={styles.tdStrong}>#{o.id}</Text> },
                  { header: 'Date', flex: 1.1, render: (o) => <Text style={styles.td}>{fmtDate(o.created_at)}</Text> },
                  { header: 'Items', flex: 2.4, render: (o) => <Text style={styles.td} numberOfLines={2}>{(o.items || []).map((it: any) => `${it.name} ×${it.qty} ${it.unit}`).join(', ') || '—'}</Text> },
                  { header: 'Amount', flex: 1.2, render: (o) => <Text style={styles.orderAmount}>{money(o.amount, o.currency)}</Text> },
                  { header: 'Status', flex: 1.1, render: (o) => <Badge text={o.status} tone={o.status === 'delivered' ? 'green' : o.status === 'cancelled' ? 'red' : 'navy'} /> },
                  { header: 'Payment', flex: 1.1, align: 'right', render: (o) => <Badge text={o.payment_status} tone={o.payment_status === 'paid' ? 'green' : 'orange'} /> },
                ]}
              />
            )}

            {view === 'payments' && (
              <DataTable
                compact={compact}
                emptyIcon="card-outline"
                emptyText="No pending payments. All your orders are paid up."
                rows={orders.filter((o) => o.payment_status !== 'paid').map((o) => ({ ...o, _key: `pay-${o.id}` }))}
                columns={[
                  { header: 'Order', flex: 0.9, render: (o) => <Text style={styles.tdStrong}>#{o.id}</Text> },
                  { header: 'Date', flex: 1.1, render: (o) => <Text style={styles.td}>{fmtDate(o.created_at)}</Text> },
                  { header: 'Items', flex: 2.6, render: (o) => <Text style={styles.td} numberOfLines={2}>{(o.items || []).map((it: any) => `${it.name} ×${it.qty} ${it.unit}`).join(', ') || '—'}</Text> },
                  { header: 'Amount due', flex: 1.3, render: (o) => <Text style={styles.orderAmount}>{money(o.amount, o.currency)}</Text> },
                  { header: 'Payment', flex: 1.1, align: 'right', render: (o) => <Badge text={o.payment_status} tone="orange" /> },
                ]}
              />
            )}

            {view === 'shipments' && (
              <DataTable
                compact={compact}
                emptyIcon="boat-outline"
                emptyText="No shipments yet. They appear here once RPK dispatches your order."
                rows={orders.filter((o) => o.shipment).map((o) => ({ ...o, _key: `sh-${o.id}` }))}
                columns={[
                  { header: 'Order', flex: 0.9, render: (o) => <Text style={styles.tdStrong}>#{o.id}</Text> },
                  { header: 'Shipping line', flex: 1.8, render: (o) => <Text style={styles.td} numberOfLines={1}>{o.shipment.shipping_line || '—'}</Text> },
                  { header: 'Container', flex: 1.6, render: (o) => <Text style={styles.td} numberOfLines={1}>{o.shipment.container_no || '—'}</Text> },
                  { header: 'ETD', flex: 1.1, render: (o) => <Text style={styles.td}>{o.shipment.etd || '—'}</Text> },
                  { header: 'ETA', flex: 1.1, render: (o) => <Text style={styles.td}>{o.shipment.eta || '—'}</Text> },
                  { header: 'Status', flex: 1.3, align: 'right', render: (o) => <Badge text={(o.shipment.status || 'preparing').replace('_', ' ')} tone={o.shipment.status === 'delivered' || o.shipment.status === 'arrived' ? 'green' : 'navy'} /> },
                ]}
              />
            )}

            {view === 'documents' && (
              <DataTable
                compact={compact}
                emptyIcon="folder-outline"
                emptyText="No documents yet. Invoices & shipping papers from RPK will appear here."
                rows={orders.flatMap((o) => (o.documents || []).map((d) => ({ ...d, order: o, _key: `doc-${d.id}` })))}
                columns={[
                  { header: 'Order', flex: 0.9, render: (d) => <Text style={styles.tdStrong}>#{d.order.id}</Text> },
                  { header: 'Document', flex: 3, render: (d) => <Text style={styles.td} numberOfLines={1}>📄 {d.label || 'Document'}</Text> },
                  { header: 'Open', flex: 1.2, align: 'right', render: (d) => <Text style={styles.link} onPress={() => Platform.OS === 'web' && window.open(imageUri(d.file_url), '_blank')}>View ↗</Text> },
                ]}
              />
            )}
          </>
        )}

        {/* Applications — Export dashboard (Import partners track these via the Profile page) */}
        {!isImport && (
          <>
            <Text style={styles.section}>My applications</Text>
            {regs.length === 0 ? (
              <Text style={styles.muted}>No applications on record.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {regs.map((r) => (
                  <View key={r.id} style={styles.appRow}>
                    <Text style={styles.appCompany} numberOfLines={1}>{r.company_name}</Text>
                    <Text style={[styles.muted, { textTransform: 'capitalize' }]}>{r.business_type}</Text>
                    <Badge text={r.status} tone={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'orange'} />
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {showNew && <NewRFQModal token={token!} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); reload(); }} />}
    </ScrollView>
  );
}

// Modal: build a product requirement and submit it as an RFQ.
function NewRFQModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: () => void }) {
  const [items, setItems] = useState<ReqItem[]>([]);
  const [destination, setDestination] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (items.length === 0 && !message.trim()) { setError('Add at least one product or a message.'); return; }
    setBusy(true); setError('');
    try {
      await api.createRFQ({ items, destination_country: destination, message }, token);
      onCreated();
    } catch (e: any) {
      setError(e.message || 'Could not submit.');
    } finally {
      setBusy(false);
    }
  }

  const content = (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle}>Request a quotation</Text>
          <Pressable onPress={onClose} hitSlop={10}><Text style={styles.modalClose}>✕</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
          <RequirementBuilder items={items} onChange={setItems} />
          <Field label="Destination country" value={destination} onChangeText={setDestination} placeholder="Where should we ship?" />
          <Field label="Message (optional)" value={message} onChangeText={setMessage} placeholder="Any specifics — packaging, target price, timeline…" />
          {!!error && <Text style={styles.err}>{error}</Text>}
        </ScrollView>
        <View style={styles.modalFoot}>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button label={busy ? 'Submitting…' : 'Submit request'} onPress={submit} disabled={busy} />
        </View>
      </View>
    </View>
  );
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return require('react-dom').createPortal(content, document.body);
  }
  return content;
}

// Lightweight, reusable data table for the dashboard filters. Columns declare a
// flex weight and a render fn; falls back to a friendly empty state, and scrolls
// horizontally on narrow screens so columns never squash.
type Column = { header: string; flex: number; align?: 'right'; render: (row: any) => React.ReactNode };

function DataTable({ columns, rows, compact, emptyIcon, emptyText }: {
  columns: Column[];
  rows: any[];
  compact: boolean;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons name={emptyIcon} size={28} color={colors.muted} />
        <Text style={styles.muted}>{emptyText}</Text>
      </View>
    );
  }
  const table = (
    <View style={[styles.tableWrap, compact && { minWidth: 760 }]}>
      <View style={[styles.tRow, styles.tHead]}>
        {columns.map((c, i) => (
          <Text key={i} style={[styles.th, { flex: c.flex }, c.align === 'right' && styles.tRight]} numberOfLines={1}>{c.header}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={row._key ?? ri} style={[styles.tRow, ri % 2 === 1 && styles.tRowAlt]}>
          {columns.map((c, ci) => (
            <View key={ci} style={[styles.tCell, { flex: c.flex }, c.align === 'right' && { alignItems: 'flex-end' }]}>
              {c.render(row)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
  return compact ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{table}</ScrollView> : table;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.offWhite },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.redSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  rolePillText: { color: colors.redDeep, fontWeight: '800', fontSize: 12.5 },
  // Profile button + dropdown (top-right corner) — replaces the old inline Logout.
  profileWrap: { position: 'relative', zIndex: 100 },
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.pill, paddingLeft: 7, paddingRight: 12, paddingVertical: 6 },
  profileAvatar: { width: 26, height: 26, borderRadius: 999, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: colors.white, fontWeight: '900', fontSize: 12.5 },
  profileBtnText: { color: colors.red, fontWeight: '800', fontSize: 13 },
  menuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 },
  profileMenu: { position: 'absolute', top: '100%', right: 0, marginTop: 8, minWidth: 180, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 6, zIndex: 100, ...shadow.card },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  profileMenuText: { fontWeight: '800', color: colors.text, fontSize: 13.5 },
  profileMenuDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },

  // Hero
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.navyDark, borderRadius: radius.lg, paddingHorizontal: 26, paddingVertical: 26, marginTop: 22, overflow: 'hidden', ...shadow.card },
  heroAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: colors.red },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  kickerText: { color: colors.white, fontWeight: '800', fontSize: 10.5, letterSpacing: 1 },
  h1: { fontSize: 27, fontWeight: '900', color: colors.white, marginTop: 4 },
  heroSub: { color: '#D8D4CE', fontSize: 14, lineHeight: 21, maxWidth: 540 },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.red, paddingHorizontal: 18, paddingVertical: 13, borderRadius: radius.pill },
  heroCtaText: { color: colors.white, fontWeight: '800', fontSize: 14.5 },

  muted: { color: colors.muted, fontSize: 13.5 },
  section: { fontSize: 15.5, fontWeight: '900', color: colors.ink, marginTop: 24 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },

  // Stat cards
  cardRow: { flexDirection: 'row', gap: 14, marginTop: 16 },
  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 16, ...shadow.card },
  statIcon: { width: 42, height: 42, borderRadius: 999, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: colors.ink },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },

  // Quick actions
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 15, paddingVertical: 14, minWidth: 235, flexGrow: 1, ...shadow.soft },
  menuHover: { borderColor: colors.red, backgroundColor: colors.cream },
  menuActive: { borderColor: colors.red, backgroundColor: colors.redSoft },
  statActive: { borderColor: colors.red, borderWidth: 2 },
  menuIcon: { width: 34, height: 34, borderRadius: 999, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontWeight: '800', color: colors.text, fontSize: 14 },

  emptyCard: { alignItems: 'center', gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: 30, marginTop: 14 },

  // Data table (dashboard filters)
  tableWrap: { width: '100%', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden', marginTop: 14, ...shadow.soft },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border },
  tHead: { backgroundColor: colors.offWhite, borderTopWidth: 0 },
  tRowAlt: { backgroundColor: colors.cream },
  th: { fontWeight: '800', color: colors.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  tCell: { justifyContent: 'center' },
  td: { color: colors.text, fontSize: 13.5 },
  tdStrong: { fontWeight: '900', color: colors.ink, fontSize: 14 },
  tRight: { textAlign: 'right' },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 7 },

  appRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, marginTop: 12 },
  appCompany: { flex: 1, fontWeight: '800', color: colors.text, fontSize: 14 },

  // rfq
  rfqCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, gap: 8, marginTop: 12, ...shadow.soft },
  rfqHead: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rfqTitle: { fontWeight: '900', color: colors.ink, fontSize: 15 },
  rfqItems: { color: colors.text, fontSize: 13.5 },
  awaiting: { color: colors.muted, fontStyle: 'italic', fontSize: 13 },
  quote: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  quotePrice: { fontWeight: '900', color: colors.navy, fontSize: 16 },
  link: { color: colors.navy, fontWeight: '800', fontSize: 13, marginTop: 2 },
  orderCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, gap: 6, marginTop: 12, ...shadow.soft },
  orderAmount: { fontWeight: '900', color: colors.navy, fontSize: 16 },
  tracking: { backgroundColor: colors.offWhite, borderRadius: radius.md, padding: 11, gap: 4, marginTop: 6 },
  trackTitle: { fontWeight: '800', color: colors.text, fontSize: 13 },

  // modal
  overlay: { position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,12,10,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 },
  modal: { width: '100%', maxWidth: 560, maxHeight: '86%', backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontWeight: '900', fontSize: 17, color: colors.ink },
  modalClose: { fontSize: 18, color: colors.muted, fontWeight: '800' },
  modalFoot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colors.border },
  err: { color: colors.red, fontSize: 13 },
});
