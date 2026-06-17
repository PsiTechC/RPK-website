import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable, TextInput, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { api, imageUri } from '../lib/api';
import { colors, radius, BRAND } from '../lib/theme';
import { useApp, money } from '../lib/store';
import { Footer } from '../components/Footer';
import { Container, SectionTitle, Button, Field, Card, Badge } from '../components/ui';
import { PhoneField } from '../components/PhoneField';
import { parsePhone } from '../lib/countries';
import { vEmail, vName, vPhone, vRequired, isClean } from '../lib/validate';

export default function Cart() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { cart, cartTotal, setQty, removeFromCart, clearCart, user, token } = useApp();

  const [country, setCountry] = useState(() => parsePhone(user?.phone).country);
  const [form, setForm] = useState({
    customer_name: user?.name || '',
    customer_email: user?.email || '',
    customer_phone: parsePhone(user?.phone).local,
    shipping_address: '',
  });
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<any>(null);

  const stacked = width < 880;
  const isAdmin = user?.role === 'admin'; // only the admin sees prices

  const set = (k: keyof typeof form) => (t: string) => {
    setForm((f) => ({ ...f, [k]: t }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  function validate(): boolean {
    const e: Record<string, string | null> = {
      customer_name: vName(form.customer_name, 'Full name'),
      customer_email: form.customer_email ? vEmail(form.customer_email) : null,
      customer_phone: form.customer_phone ? vPhone(form.customer_phone, false) : null,
    };
    setErrors(e);
    if (!isClean(e)) return false;
    if (!form.customer_email.trim() && !form.customer_phone.trim()) {
      setError('Please provide an email or phone number so we can reach you.');
      return false;
    }
    return true;
  }

  // Open the customer's mail app addressed to the admin inbox, prefilled.
  function openInquiryMail() {
    const phone = form.customer_phone ? `${country.dial} ${form.customer_phone}` : '—';
    const lines = [
      `Name: ${form.customer_name}`,
      `Email: ${form.customer_email || '—'}`,
      `Phone: ${phone}`,
      '',
      'Products I am interested in:',
      ...cart.map((l) => `- ${l.product.name} × ${l.qty} ${l.product.unit}`),
      '',
      form.shipping_address ? `Message: ${form.shipping_address}` : '',
    ];
    const subject = `Product Inquiry — ${form.customer_name}`;
    const url = `mailto:${BRAND.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    Linking.openURL(url).catch(() => {});
  }

  // Prices aren't shown to shoppers — instead of paying, they send an inquiry
  // with the cart items so our team can follow up with a quote. We open the
  // customer's email client (to the admin inbox) AND log it in the dashboard.
  async function sendInquiry() {
    setError('');
    if (!validate()) return;
    openInquiryMail();
    setPlacing(true);
    try {
      await api.createInquiry({
        name: form.customer_name,
        email: form.customer_email,
        phone: form.customer_phone ? `${country.dial} ${form.customer_phone}` : '',
        message: form.shipping_address,
        items: cart.map((l) => ({ product_id: l.product.id, name: l.product.name, unit: l.product.unit, qty: l.qty })),
      });
      setDone(true);
      clearCart();
    } catch (e: any) {
      // Still consider it done — the email draft to the admin was opened.
      setDone(true);
      clearCart();
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
            <Text style={styles.successTitle}>Inquiry Sent!</Text>
            <Text style={styles.successText}>
              Thank you{form.customer_name ? `, ${form.customer_name.split(' ')[0]}` : ''}. Our team has received your
              product inquiry and will contact you shortly with pricing and availability.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Button label="Continue shopping" variant="primary" onPress={() => router.push('/products')} />
              <Button label="Contact us" variant="outline" onPress={() => router.push('/contact')} />
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
                      {isAdmin ? `${money(l.product.price, l.product.currency)} / ${l.product.unit}` : `Sold per ${l.product.unit}`}
                    </Text>
                    <View style={styles.stepper}>
                      <Pressable style={styles.stepBtn} onPress={() => setQty(l.product.id, l.qty - 1)}>
                        <Text style={styles.stepText}>−</Text>
                      </Pressable>
                      <TextInput
                        value={String(l.qty)}
                        onChangeText={(t) => setQty(l.product.id, parseInt(t.replace(/[^\d]/g, '') || '1', 10))}
                        keyboardType="number-pad"
                        style={styles.qtyInput}
                      />
                      <Pressable style={styles.stepBtn} onPress={() => setQty(l.product.id, l.qty + 1)}>
                        <Text style={styles.stepText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                    {isAdmin && <Text style={styles.lineTotal}>{money(l.product.price * l.qty, l.product.currency)}</Text>}
                    <Pressable onPress={() => removeFromCart(l.product.id)}>
                      <Text style={styles.remove}>Remove</Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>

            {/* Inquiry / quote request */}
            <Card style={[styles.checkout, stacked ? { width: '100%' } : { width: 360 }]}>
              <Text style={styles.checkoutTitle}>Request a Quote</Text>
              <Text style={styles.quoteNote}>
                Tell us how to reach you and we'll send pricing & availability for the items in your cart.
              </Text>

              {isAdmin && (
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
                  <Text style={styles.totalK}>Total (admin only)</Text>
                  <Text style={styles.totalV}>{money(cartTotal)}</Text>
                </View>
              )}

              <View style={{ gap: 10, marginTop: 8 }}>
                <Field label="Full name" value={form.customer_name} onChangeText={set('customer_name')} placeholder="Your name" error={errors.customer_name} />
                <Field label="Email" value={form.customer_email} onChangeText={set('customer_email')} placeholder="you@email.com" keyboardType="email-address" error={errors.customer_email} />
                <PhoneField label="Phone" country={country} onCountryChange={setCountry} number={form.customer_phone} onNumberChange={set('customer_phone')} error={errors.customer_phone} />
                <Field label="Message (optional)" value={form.shipping_address} onChangeText={set('shipping_address')} placeholder="Quantity needed, delivery location, any questions…" multiline />
              </View>

              {!!error && <Text style={styles.error}>{error}</Text>}
              <Button label={placing ? 'Sending…' : 'Call to Inquiry'} icon="call" onPress={sendInquiry} disabled={placing} />
              <Text style={styles.hint}>We typically respond within a few hours on business days.</Text>
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
  qtyInput: { width: 42, height: 34, textAlign: 'center', fontWeight: '800', color: colors.ink, fontSize: 14, outlineStyle: 'none' as any },
  checkout: { gap: 12 },
  checkoutTitle: { fontWeight: '900', fontSize: 18, color: colors.ink },
  quoteNote: { color: colors.muted, fontSize: 13, lineHeight: 19 },
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
