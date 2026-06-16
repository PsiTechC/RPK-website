import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { Order } from '../lib/api';
import { colors, radius, shadow } from '../lib/theme';
import { money } from '../lib/store';
import { Button, Badge } from './ui';

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const statusTone: Record<string, any> = {
  pending: 'orange', confirmed: 'navy', processing: 'navy', shipped: 'navy',
  delivered: 'green', cancelled: 'red', approved: 'green', rejected: 'red', paid: 'green', unpaid: 'muted',
};

/**
 * Full order details in a centered modal. Used by the admin Orders tab and the
 * customer account page. `showPrices` hides amounts for shoppers; `onStatus`
 * (admin only) enables the status-change controls.
 */
export function OrderDetailModal({
  order,
  onClose,
  showPrices = true,
  onStatus,
}: {
  order: Order;
  onClose: () => void;
  showPrices?: boolean;
  onStatus?: (id: number, status: string) => void;
}) {
  const content = (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.head}>
          <Text style={styles.title}>Order {order.id}</Text>
          <Pressable onPress={onClose} hitSlop={10}><Text style={styles.close}>✕</Text></Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, gap: 16 }}>
          <View style={{ gap: 4 }}>
            <Text style={styles.section}>Customer</Text>
            <Text style={styles.strong}>{order.customer_name}</Text>
            <Text style={styles.meta}>{order.customer_email} · {order.customer_phone || 'no phone'}</Text>
            {!!order.shipping_address && <Text style={styles.meta}>Ship to: {order.shipping_address}</Text>}
            <Text style={styles.meta}>Placed {new Date(order.created_at).toLocaleString()}</Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.section}>Items</Text>
            <View style={styles.table}>
              <View style={[styles.tr, styles.thead]}>
                <Text style={[styles.th, { flex: 1 }]}>Product</Text>
                <Text style={[styles.th, styles.qty]}>Qty</Text>
                {showPrices && <Text style={[styles.th, styles.price]}>Unit</Text>}
                {showPrices && <Text style={[styles.th, styles.price]}>Total</Text>}
              </View>
              {(order.items || []).map((it) => (
                <View key={it.id} style={styles.tr}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.td, styles.tdStrong]} numberOfLines={2}>{it.product_name}</Text>
                    <Text style={styles.meta}>per {it.unit}</Text>
                  </View>
                  <Text style={[styles.td, styles.qty]}>{it.quantity}</Text>
                  {showPrices && <Text style={[styles.td, styles.price]}>{money(it.unit_price, order.currency)}</Text>}
                  {showPrices && <Text style={[styles.td, styles.tdStrong, styles.price]}>{money(it.line_total, order.currency)}</Text>}
                </View>
              ))}
              {showPrices && (
                <View style={[styles.tr, styles.tfoot]}>
                  <Text style={[styles.td, styles.tdStrong, { flex: 1 }]}>Subtotal</Text>
                  <Text style={[styles.td, styles.qty]} />
                  <Text style={[styles.td, styles.price]} />
                  <Text style={[styles.td, styles.tdStrong, styles.price]}>{money(order.subtotal, order.currency)}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={styles.section}>Status</Text>
            <Badge text={order.status} tone={statusTone[order.status] || 'muted'} />
            <Badge text={order.payment_status} tone={statusTone[order.payment_status] || 'muted'} />
            {!!order.payment_ref && <Text style={styles.meta}>Ref: {order.payment_ref}</Text>}
          </View>

          {onStatus && (
            <View style={{ gap: 6 }}>
              <Text style={styles.section}>Update status</Text>
              <View style={styles.statusPicker}>
                {ORDER_STATUSES.map((s) => (
                  <Pressable key={s} style={[styles.statusChip, order.status === s && styles.statusChipActive]} onPress={() => onStatus(order.id, s)}>
                    <Text style={[styles.statusChipText, order.status === s && { color: colors.white }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.foot}>
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

const styles = StyleSheet.create({
  overlay: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,28,66,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 },
  modal: { width: '100%', maxWidth: 600, maxHeight: '88vh' as any, backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', ...shadow.card },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.navy },
  title: { color: colors.white, fontWeight: '900', fontSize: 17 },
  close: { color: colors.white, fontSize: 18, fontWeight: '700' },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', padding: 14, borderTopWidth: 1, borderTopColor: colors.border },
  section: { fontWeight: '900', fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  strong: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  meta: { color: colors.muted, fontSize: 13 },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  thead: { backgroundColor: '#FAFAFB', borderTopWidth: 0 },
  tfoot: { backgroundColor: '#FAFAFB' },
  th: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { fontSize: 14, color: colors.text },
  tdStrong: { fontWeight: '800', color: colors.ink },
  qty: { width: 50, textAlign: 'right' },
  price: { width: 90, textAlign: 'right' },
  statusPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F1F2F5' },
  statusChipActive: { backgroundColor: colors.navy },
  statusChipText: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'capitalize' },
});
