import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api, Order } from '../lib/api';
import { colors, radius } from '../lib/theme';
import { useApp, money } from '../lib/store';
import { Footer } from '../components/Footer';
import { Container, SectionTitle, Button, Card, Badge } from '../components/ui';
import { OrderDetailModal } from '../components/OrderDetailModal';

const statusTone: Record<string, any> = {
  pending: 'orange', confirmed: 'navy', processing: 'navy', shipped: 'navy',
  delivered: 'green', cancelled: 'red', approved: 'green', rejected: 'red',
  paid: 'green', unpaid: 'muted',
};

// Full width on desktop; horizontal scroll on narrow screens so columns never squash.
function Tbl({ fits, children }: { fits: boolean; children: React.ReactNode }) {
  return fits ? <>{children}</> : <ScrollView horizontal showsHorizontalScrollIndicator={false}>{children}</ScrollView>;
}

export default function Account() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const fits = width >= 720; // below this, tables scroll horizontally
  const { user, token, ready, logout } = useApp();
  const isAdmin = user?.role === 'admin'; // only the admin sees amounts
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Order | null>(null);

  async function viewOrder(id: number) {
    if (!token) return;
    try {
      setDetail(await api.myOrder(id, token));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!token) return;
    api.myOrders(token)
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (ready && !user) {
    return (
      <Container style={{ marginTop: 60, maxWidth: 460 }}>
        <Card style={{ alignItems: 'center', gap: 14, paddingVertical: 40 }}>
          <Text style={{ fontSize: 44 }}>🔐</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>Please log in</Text>
          <Button label="Go to login" onPress={() => router.push('/login')} />
        </Card>
      </Container>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Container style={{ marginTop: 26 }}>
        <Card style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Badge text={user?.role || 'customer'} tone="orange" />
          </View>
          <Button label="Logout" variant="ghost" onPress={() => { logout(); router.replace('/'); }} />
        </Card>

        <View style={{ height: 26 }} />
        <SectionTitle title="My Orders" subtitle={`${orders.length} order${orders.length === 1 ? '' : 's'}`} />
        {loading ? (
          <ActivityIndicator color={colors.orange} />
        ) : orders.length === 0 ? (
          <Text style={styles.empty}>No orders yet.</Text>
        ) : (
          <Tbl fits={fits}>
            <View style={[styles.table, fits ? styles.tableFull : styles.tableMin]}>
              <View style={[styles.tr, styles.thead]}>
                <Text style={[styles.th, styles.cOrder]}>Order</Text>
                <Text style={[styles.th, styles.cDate]}>Placed</Text>
                <Text style={[styles.th, styles.cShip]}>Ship to</Text>
                {isAdmin && <Text style={[styles.th, styles.cAmt]}>Amount</Text>}
                <Text style={[styles.th, styles.cStatus]}>Status</Text>
                <Text style={[styles.th, styles.cStatus]}>Payment</Text>
                <Text style={[styles.th, styles.cView]}>View</Text>
              </View>
              {orders.map((o, i) => (
                <View key={o.id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                  <Text style={[styles.td, styles.tdStrong, styles.cOrder]}>{o.id}</Text>
                  <Text style={[styles.td, styles.cDate]}>{new Date(o.created_at).toLocaleDateString()}</Text>
                  <Text style={[styles.td, styles.cShip]} numberOfLines={1}>{o.shipping_address || '—'}</Text>
                  {isAdmin && <Text style={[styles.td, styles.cAmt]}>{money(o.subtotal, o.currency)}</Text>}
                  <View style={styles.cStatus}><Badge text={o.status} tone={statusTone[o.status] || 'muted'} /></View>
                  <View style={styles.cStatus}><Badge text={o.payment_status} tone={statusTone[o.payment_status] || 'muted'} /></View>
                  <View style={styles.cView}>
                    <Pressable style={styles.eyeBtn} onPress={() => viewOrder(o.id)} accessibilityLabel={`View order ${o.id}`}>
                      <Ionicons name="eye-outline" size={18} color={colors.navy} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </Tbl>
        )}

        {detail && <OrderDetailModal order={detail} onClose={() => setDetail(null)} showPrices={isAdmin} />}

      </Container>
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: 999, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '900', fontSize: 24 },
  name: { fontSize: 20, fontWeight: '900', color: colors.ink },
  email: { color: colors.muted, marginBottom: 6 },
  empty: { color: colors.muted, fontSize: 14 },
  // table
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.white },
  tableFull: { width: '100%' },
  tableMin: { minWidth: 820 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  thead: { backgroundColor: '#FAFAFB', borderTopWidth: 0 },
  trAlt: { backgroundColor: '#FCFCFD' },
  th: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { fontSize: 14, color: colors.text },
  tdStrong: { fontWeight: '800', color: colors.ink },
  // order columns
  cOrder: { width: 70 },
  cDate: { width: 110 },
  cShip: { flex: 1, minWidth: 160 },
  cAmt: { width: 130 },
  cStatus: { width: 118 },
  // registration columns
  cApp: { width: 70 },
  cCompany: { flex: 1, minWidth: 150 },
  cType: { width: 110, textTransform: 'capitalize' },
  cCountry: { width: 130 },
  cView: { width: 56, alignItems: 'center' },
  eyeBtn: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.offWhite },
});
