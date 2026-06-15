import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../lib/api';
import { colors, radius, BRAND } from '../lib/theme';
import { Footer } from '../components/Footer';
import { Container, SectionTitle, Button, Field, Card, Badge } from '../components/ui';
import { PhoneField } from '../components/PhoneField';
import { RequirementBuilder, ReqItem } from '../components/RequirementBuilder';
import { DEFAULT_COUNTRY } from '../lib/countries';
import { vName, vEmail, vPhone, isClean } from '../lib/validate';

const PHONE_RAW = BRAND.phone.replace(/[^\d+]/g, ''); // +971583072132
const WA = PHONE_RAW.replace('+', '');

const METHODS = [
  { icon: '📞', label: 'Call us', value: BRAND.phone, url: `tel:${PHONE_RAW}` },
  { icon: '💬', label: 'WhatsApp', value: BRAND.phone, url: `https://wa.me/${WA}` },
  { icon: '✉️', label: 'Email', value: BRAND.email, url: `mailto:${BRAND.email}` },
  { icon: '📍', label: 'Visit us', value: BRAND.address, url: '' },
];

export default function Contact() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ product?: string }>();
  const stacked = width < 900;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    product: params.product ? String(params.product) : '',
    message: '',
  });
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [items, setItems] = useState<ReqItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (t: string) => {
    setForm((f) => ({ ...f, [k]: t }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  async function submit() {
    setError('');
    const e: Record<string, string | null> = {
      name: vName(form.name, 'Your name'),
      email: form.email ? vEmail(form.email) : null,
      phone: form.phone ? vPhone(form.phone) : null,
    };
    setErrors(e);
    if (!isClean(e)) return;
    if (!form.email.trim() && !form.phone.trim()) {
      setError('Please provide an email or phone number so we can reach you.');
      return;
    }
    setBusy(true);
    try {
      const summary = items.map((i) => `${i.name} ×${i.qty} ${i.unit}`).join(', ');
      const productField = [summary, form.product.trim()].filter(Boolean).join(' | ');
      await api.createInquiry({
        ...form,
        product: productField,
        phone: form.phone ? `${country.dial} ${form.phone}` : '',
        items,
      });
      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Could not send your inquiry.');
    } finally {
      setBusy(false);
    }
  }

  function openWhatsApp() {
    const text = encodeURIComponent(
      `Hello RPK, I'd like to inquire${form.product ? ` about "${form.product}"` : ''}.`
    );
    Linking.openURL(`https://wa.me/${WA}?text=${text}`);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Container style={{ marginTop: 26 }}>
        <SectionTitle title="Contact & Inquiry" subtitle="Tell us what you need — our team replies fast" />

        <View style={[styles.layout, stacked && { flexDirection: 'column' }]}>
          {/* contact methods */}
          <View style={[{ gap: 12 }, stacked ? { width: '100%' } : { width: 340 }]}>
            {METHODS.map((m) => (
              <Pressable key={m.label} onPress={() => m.url && Linking.openURL(m.url)} disabled={!m.url}>
                <Card style={styles.method}>
                  <Text style={{ fontSize: 24 }}>{m.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.methodLabel}>{m.label}</Text>
                    <Text style={styles.methodValue}>{m.value}</Text>
                  </View>
                </Card>
              </Pressable>
            ))}
            <Button label="💬 Chat on WhatsApp" variant="navy" onPress={openWhatsApp} />
          </View>

          {/* inquiry form / success */}
          <View style={{ flex: 1 }}>
            {done ? (
              <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 44 }}>
                <Text style={{ fontSize: 50 }}>✅</Text>
                <Text style={styles.successTitle}>Inquiry Sent!</Text>
                <Text style={styles.successText}>
                  Thank you{form.name ? `, ${form.name.split(' ')[0]}` : ''}. Our team will get back to you
                  shortly at {form.email || form.phone}.
                </Text>
                <Badge text="You can also WhatsApp us for a faster reply" tone="navy" />
              </Card>
            ) : (
              <Card style={{ gap: 14 }}>
                <Text style={styles.formTitle}>Send an inquiry</Text>
                {!!form.product && (
                  <View style={styles.productPill}>
                    <Text style={styles.productPillText}>Product: {form.product}</Text>
                  </View>
                )}
                <Field label="Your name *" value={form.name} onChangeText={set('name')} placeholder="Full name" error={errors.name} />
                <Field label="Email" value={form.email} onChangeText={set('email')} placeholder="you@email.com" keyboardType="email-address" error={errors.email} />
                <PhoneField label="Phone" country={country} onCountryChange={setCountry} number={form.phone} onNumberChange={set('phone')} error={errors.phone} />
                <RequirementBuilder items={items} onChange={setItems} />
                <Field label="Other products / notes" value={form.product} onChangeText={set('product')} placeholder="Anything not listed above…" />
                <Field label="Message" value={form.message} onChangeText={(t) => setForm({ ...form, message: t })} placeholder="Quantity needed, delivery location, any questions…" multiline />
                {!!error && <Text style={styles.error}>{error}</Text>}
                <Button label={busy ? 'Sending…' : 'Send inquiry'} onPress={submit} disabled={busy} />
                <Text style={styles.note}>We typically respond within a few hours during business days.</Text>
              </Card>
            )}
          </View>
        </View>
      </Container>
      <View style={{ height: 56 }} />
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  layout: { flexDirection: 'row', gap: 22, alignItems: 'flex-start' },
  method: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  methodLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  methodValue: { color: colors.ink, fontSize: 15, fontWeight: '700', marginTop: 2 },
  formTitle: { fontWeight: '900', fontSize: 18, color: colors.ink },
  productPill: { alignSelf: 'flex-start', backgroundColor: colors.cream, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  productPillText: { color: colors.orangeDark, fontWeight: '800', fontSize: 13 },
  twoCol: { flexDirection: 'row', gap: 12 },
  error: { color: colors.red, fontSize: 13 },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  successTitle: { fontSize: 24, fontWeight: '900', color: colors.ink },
  successText: { color: colors.text, textAlign: 'center', maxWidth: 460, lineHeight: 22 },
});
