import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api, Order, Registration } from '../lib/api';
import { colors, radius } from '../lib/theme';
import { useApp, money } from '../lib/store';
import { Footer } from '../components/Footer';
import { Container, SectionTitle, Button, Card, Badge } from '../components/ui';

const statusTone: Record<string, any> = {
  pending: 'orange', confirmed: 'navy', processing: 'navy', shipped: 'navy',
  delivered: 'green', cancelled: 'red', approved: 'green', rejected: 'red',
  paid: 'green', unpaid: 'muted',
};

export default function Account() {
  const router = useRouter();
  const { user, token, ready, logout } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.myOrders(token), api.myRegistrations(token)])
      .then(([o, r]) => {
        setOrders(o);
        setRegs(r);
      })
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
          <View style={{ gap: 10 }}>
            {orders.map((o) => (
              <Card key={o.id} style={styles.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Order #{o.id}</Text>
                  <Text style={styles.rowMeta}>{new Date(o.created_at).toLocaleDateString()} · {money(o.subtotal, o.currency)}</Text>
                </View>
                <View style={{ gap: 6, alignItems: 'flex-end' }}>
                  <Badge text={o.status} tone={statusTone[o.status] || 'muted'} />
                  <Badge text={o.payment_status} tone={statusTone[o.payment_status] || 'muted'} />
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 26 }} />
        <SectionTitle
          title="My Import/Export Registrations"
          subtitle={`${regs.length} application${regs.length === 1 ? '' : 's'}`}
          action={<Button label="New registration" variant="outline" onPress={() => router.push('/import-export')} />}
        />
        {regs.length === 0 ? (
          <Text style={styles.empty}>No registrations yet.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {regs.map((r) => (
              <Card key={r.id} style={styles.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.company_name}</Text>
                  <Text style={styles.rowMeta}>{r.business_type} · {r.country || '—'} · #{r.id}</Text>
                </View>
                <Badge text={r.status} tone={statusTone[r.status] || 'muted'} />
              </Card>
            ))}
          </View>
        )}
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
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowTitle: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  rowMeta: { color: colors.muted, fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  empty: { color: colors.muted, fontSize: 14 },
});
