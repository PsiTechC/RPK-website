import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { api, imageUri } from '../lib/api';
import { colors, radius } from '../lib/theme';
import { useApp, money } from '../lib/store';
import { Footer } from '../components/Footer';
import { Container, SectionTitle, Button, Field, Card, Badge } from '../components/ui';
import { vEmail, vName, vPhone, vRequired, isClean } from '../lib/validate';

export default function Cart() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { cart, cartTotal, setQty, removeFromCart, clearCart, user, token } = useApp();

  const [form, setForm] = useState({
    customer_name: user?.name || '',
    customer_email: user?.email || '',
    customer_phone: user?.phone || '',
    shipping_address: '',
  });
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<any>(null);

  const stacked = width < 880;

  const set = (k: keyof typeof form) => (t: string) => {
    setForm((f) => ({ ...f, [k]: t }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  function validate(): boolean {
    const e: Record<string, string | null> = {
      customer_name: vName(form.customer_name, 'Full name'),
      customer_email: vEmail(form.customer_email),
      customer_phone: vPhone(form.customer_phone, true),
      shipping_address: vRequired(form.shipping_address, 'Shipping address'),
    };
    setErrors(e);
    return isClean(e);
  }

  async function checkout() {
    setError('');
    if (!user) {
      setError('Please log in or sign up to place your order.');
      return;
    }
    if (!validate()) return;
    setPlacing(true);
    try {
      const res = await api.createOrder(
        {
          ...form,
          items: cart.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
          pay: true, // MOCK payment
        },
        token
      );
      setDone(res);
      clearCart();
    } catch (e: any) {
      setError(e.message || 'Checkout failed.');
    } finally {
      setPlacing(false);
    }
  }

  if (done) {
    return (
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
        <Container style={{ marginTop: 40, maxWidth: 640 }}>
          <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 36 }}>
            <Text style={{ fontSize: 54 }}>✅</Text>
            <Text style={styles.successTitle}>Order Confirmed!</Text>
            <Text style={styles.successText}>
              Thank you for your order. Payment was processed via our mock gateway.
            </Text>
            <View style={styles.receipt}>
              <Row k="Order #" v={`#${done.order_id}`} />
              <Row k="Total paid" v={money(done.subtotal, done.currency)} />
              <Row k="Payment ref" v={done.payment_ref} />
              <Row k="Status" v={done.status} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Button label="Continue shopping" variant="primary" onPress={() => router.push('/products')} />
              {user && <Button label="My orders" variant="outline" onPress={() => router.push('/account')} />}
            </View>
          </Card>
        </Container>
        <Footer />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Container style={{ marginTop: 26 }}>
        <SectionTitle title="Your Cart" subtitle={`${cart.length} line item${cart.length === 1 ? '' : 's'}`} />

        {cart.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: 14, paddingVertical: 40 }}>
            <Text style={{ fontSize: 44 }}>🛒</Text>
            <Text style={{ color: colors.muted, fontSize: 16 }}>Your cart is empty.</Text>
            <Button label="Browse products" onPress={() => router.push('/products')} />
          </Card>
        ) : (
          <View style={[styles.layout, stacked && { flexDirection: 'column' }]}>
            {/* Items */}
            <View style={{ flex: 1, gap: 12 }}>
              {cart.map((l) => (
                <Card key={l.product.id} style={styles.line}>
                  <Image source={{ uri: imageUri(l.product.image_url) }} style={styles.lineImg} contentFit="cover" />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.lineName}>{l.product.name}</Text>
                    <Text style={styles.lineMeta}>
                      {money(l.product.price, l.product.currency)} / {l.product.unit}
                    </Text>
                    <View style={styles.stepper}>
                      <Pressable style={styles.stepBtn} onPress={() => setQty(l.product.id, l.qty - 1)}>
                        <Text style={styles.stepText}>−</Text>
                      </Pressable>
                      <Text style={styles.qtyVal}>{l.qty}</Text>
                      <Pressable style={styles.stepBtn} onPress={() => setQty(l.product.id, l.qty + 1)}>
                        <Text style={styles.stepText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <Text style={styles.lineTotal}>{money(l.product.price * l.qty, l.product.currency)}</Text>
                    <Pressable onPress={() => removeFromCart(l.product.id)}>
                      <Text style={styles.remove}>Remove</Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>

            {/* Checkout */}
            <Card style={[styles.checkout, stacked ? { width: '100%' } : { width: 360 }]}>
              <Text style={styles.checkoutTitle}>Checkout</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.sumK}>Subtotal</Text>
                <Text style={styles.sumV}>{money(cartTotal)}</Text>
              </View>
              <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
                <Text style={styles.totalK}>Total</Text>
                <Text style={styles.totalV}>{money(cartTotal)}</Text>
              </View>

              {user ? (
                <>
                  <View style={{ gap: 10, marginTop: 8 }}>
                    <Field label="Full name" value={form.customer_name} onChangeText={set('customer_name')} placeholder="Your name" error={errors.customer_name} />
                    <Field label="Email" value={form.customer_email} onChangeText={set('customer_email')} placeholder="you@email.com" keyboardType="email-address" error={errors.customer_email} />
                    <Field label="Phone" value={form.customer_phone} onChangeText={set('customer_phone')} placeholder="+971 …" keyboardType="phone-pad" error={errors.customer_phone} />
                    <Field label="Shipping address" value={form.shipping_address} onChangeText={set('shipping_address')} placeholder="Delivery address" multiline error={errors.shipping_address} />
                  </View>

                  <Badge text="Mock payment — no card needed" tone="muted" />
                  {!!error && <Text style={styles.error}>{error}</Text>}
                  <Button label={placing ? 'Processing…' : `Pay ${money(cartTotal)}`} onPress={checkout} disabled={placing} />
                </>
              ) : (
                <View style={styles.authGate}>
                  <Text style={{ fontSize: 30 }}>🔒</Text>
                  <Text style={styles.gateTitle}>Sign in to place your order</Text>
                  <Text style={styles.gateText}>
                    You need an account to confirm and track an order. Orders can't be placed without logging in.
                  </Text>
                  <Button label="Log in" variant="navy" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch' }} />
                  <Text style={styles.gateAlt}>User doesn't exist yet? Create one:</Text>
                  <Button label="Sign up" onPress={() => router.push('/login?mode=register')} style={{ alignSelf: 'stretch' }} />
                </View>
              )}
            </Card>
          </View>
        )}
      </Container>
      <Footer />
    </ScrollView>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.sumK}>{k}</Text>
      <Text style={[styles.sumV, { fontWeight: '800' }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flexDirection: 'row', gap: 22, alignItems: 'flex-start' },
  line: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 12 },
  lineImg: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.cream },
  lineName: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  lineMeta: { color: colors.muted, fontSize: 13 },
  lineTotal: { fontWeight: '900', color: colors.navy, fontSize: 16 },
  remove: { color: colors.red, fontWeight: '700', fontSize: 13 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 999, alignSelf: 'flex-start', marginTop: 4 },
  stepBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 20, fontWeight: '800', color: colors.navy },
  qtyVal: { width: 36, textAlign: 'center', fontWeight: '800', color: colors.ink },
  checkout: { gap: 12 },
  checkoutTitle: { fontWeight: '900', fontSize: 18, color: colors.ink },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumK: { color: colors.muted, fontSize: 14 },
  sumV: { color: colors.text, fontSize: 14, fontWeight: '600' },
  totalK: { color: colors.ink, fontWeight: '900', fontSize: 17 },
  totalV: { color: colors.orange, fontWeight: '900', fontSize: 19 },
  error: { color: colors.red, fontSize: 13 },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  authGate: { alignItems: 'center', gap: 10, marginTop: 8, paddingVertical: 8 },
  gateTitle: { fontWeight: '900', fontSize: 17, color: colors.ink, textAlign: 'center' },
  gateText: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  gateAlt: { color: colors.muted, fontSize: 12, marginTop: 2 },
  successTitle: { fontSize: 26, fontWeight: '900', color: colors.ink },
  successText: { color: colors.text, textAlign: 'center', maxWidth: 420, lineHeight: 22 },
  receipt: { backgroundColor: colors.offWhite, borderRadius: radius.md, padding: 16, gap: 8, width: '100%', maxWidth: 360, marginTop: 8 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
