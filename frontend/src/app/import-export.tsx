import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { api } from '../lib/api';
import { colors, radius } from '../lib/theme';
import { useApp } from '../lib/store';
import { Footer } from '../components/Footer';
import { Container, SectionTitle, Button, Field, Card, Badge } from '../components/ui';

const TYPES = [
  { key: 'import', label: 'Import', desc: 'I want to buy & import from RPK' },
  { key: 'export', label: 'Export', desc: 'I want to supply & export to RPK' },
  { key: 'both', label: 'Both', desc: 'Import and export' },
] as const;

export default function ImportExport() {
  const { width } = useWindowDimensions();
  const { token, user } = useApp();
  const [form, setForm] = useState({
    company_name: '',
    business_type: 'import' as 'import' | 'export' | 'both',
    country: '',
    contact_person: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    product_interest: '',
    message: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<any>(null);

  const stacked = width < 900;

  async function submit() {
    setError('');
    if (!form.company_name || !form.email) {
      setError('Company name and email are required.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.createRegistration(form, token);
      setDone(res);
    } catch (e: any) {
      setError(e.message || 'Submission failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      <Container style={{ marginTop: 26 }}>
        <SectionTitle title="Import & Export Registration" subtitle="Partner with RPK to trade food & groceries worldwide" />

        <View style={[styles.layout, stacked && { flexDirection: 'column' }]}>
          {/* Info side */}
          <View style={[{ gap: 14 }, stacked ? { width: '100%' } : { width: 340 }]}>
            <Card style={{ gap: 12, backgroundColor: colors.cream, borderColor: colors.border }}>
              <Text style={styles.infoTitle}>Why register?</Text>
              {[
                ['🌍', 'Trade across borders with a trusted Dubai-based supplier'],
                ['📦', 'Access bulk & wholesale pricing on our full catalogue'],
                ['🤝', 'Dedicated review of every import/export application'],
                ['🚢', 'Logistics support for international shipments'],
              ].map(([i, t]) => (
                <View key={t} style={styles.benefit}>
                  <Text style={{ fontSize: 18 }}>{i}</Text>
                  <Text style={styles.benefitText}>{t}</Text>
                </View>
              ))}
            </Card>
            <Card style={{ gap: 6 }}>
              <Text style={styles.infoTitle}>How it works</Text>
              <Text style={styles.step}>1. Submit this form</Text>
              <Text style={styles.step}>2. Our team reviews your application</Text>
              <Text style={styles.step}>3. We approve and contact you to start trading</Text>
            </Card>
          </View>

          {/* Form / success */}
          <View style={{ flex: 1 }}>
            {done ? (
              <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
                <Text style={{ fontSize: 50 }}>🎉</Text>
                <Text style={styles.successTitle}>Application Received</Text>
                <Text style={styles.successText}>
                  Thank you! Your registration is <Text style={{ fontWeight: '800' }}>#{done.id}</Text> and is now{' '}
                  <Text style={{ fontWeight: '800', color: colors.orange }}>pending review</Text>. Our team will contact
                  you at <Text style={{ fontWeight: '700' }}>{form.email}</Text>.
                </Text>
                {user && <Badge text="Track status in My Account" tone="navy" />}
              </Card>
            ) : (
              <Card style={{ gap: 14 }}>
                <Field label="Company name *" value={form.company_name} onChangeText={(t) => setForm({ ...form, company_name: t })} placeholder="Your company L.L.C" />

                <View style={{ gap: 6 }}>
                  <Text style={styles.label}>Business type *</Text>
                  <View style={[styles.typeRow, stacked && { flexDirection: 'column' }]}>
                    {TYPES.map((t) => (
                      <Pressable
                        key={t.key}
                        style={[styles.type, form.business_type === t.key && styles.typeActive]}
                        onPress={() => setForm({ ...form, business_type: t.key })}
                      >
                        <Text style={[styles.typeLabel, form.business_type === t.key && { color: colors.navy }]}>{t.label}</Text>
                        <Text style={styles.typeDesc}>{t.desc}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={[styles.twoCol, stacked && { flexDirection: 'column' }]}>
                  <Field style={{ flex: 1 }} label="Country" value={form.country} onChangeText={(t) => setForm({ ...form, country: t })} placeholder="e.g. India" />
                  <Field style={{ flex: 1 }} label="Contact person" value={form.contact_person} onChangeText={(t) => setForm({ ...form, contact_person: t })} placeholder="Full name" />
                </View>
                <View style={[styles.twoCol, stacked && { flexDirection: 'column' }]}>
                  <Field style={{ flex: 1 }} label="Email *" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} placeholder="you@company.com" keyboardType="email-address" />
                  <Field style={{ flex: 1 }} label="Phone" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} placeholder="+…" />
                </View>
                <Field label="Products of interest" value={form.product_interest} onChangeText={(t) => setForm({ ...form, product_interest: t })} placeholder="e.g. Basmati rice, spices, oils" />
                <Field label="Message" value={form.message} onChangeText={(t) => setForm({ ...form, message: t })} placeholder="Tell us about your business & requirements" multiline />

                {!!error && <Text style={styles.error}>{error}</Text>}
                <Button label={busy ? 'Submitting…' : 'Submit registration'} onPress={submit} disabled={busy} />
              </Card>
            )}
          </View>
        </View>
      </Container>
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  layout: { flexDirection: 'row', gap: 22, alignItems: 'flex-start' },
  infoTitle: { fontWeight: '900', fontSize: 16, color: colors.ink },
  benefit: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  benefitText: { color: colors.text, fontSize: 13, flex: 1, lineHeight: 19 },
  step: { color: colors.text, fontSize: 13 },
  label: { color: colors.text, fontWeight: '700', fontSize: 13 },
  typeRow: { flexDirection: 'row', gap: 10 },
  type: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  typeActive: { borderColor: colors.orange, backgroundColor: colors.cream },
  typeLabel: { fontWeight: '800', color: colors.text },
  typeDesc: { color: colors.muted, fontSize: 11, marginTop: 2 },
  twoCol: { flexDirection: 'row', gap: 12 },
  error: { color: colors.red, fontSize: 13 },
  successTitle: { fontSize: 24, fontWeight: '900', color: colors.ink },
  successText: { color: colors.text, textAlign: 'center', maxWidth: 460, lineHeight: 22 },
});
