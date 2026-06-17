import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { colors, radius } from '../lib/theme';
import { useApp } from '../lib/store';
import { Footer } from '../components/Footer';
import { Container, SectionTitle, Button, Field, Card, Badge } from '../components/ui';
import { ContactPanel } from '../components/ContactPanel';
import { PhoneField } from '../components/PhoneField';
import { RequirementBuilder, ReqItem } from '../components/RequirementBuilder';
import { parsePhone, Country } from '../lib/countries';
import { vEmail, vName, vPhoneLen, vRequired, isClean, sanitizeName } from '../lib/validate';

const TYPES = [
  { key: 'import', label: 'Import', desc: 'I want to buy & import from RPK' },
  { key: 'export', label: 'Export', desc: 'I want to supply & export to RPK' },
  { key: 'both', label: 'Both', desc: 'Import and export' },
] as const;

export default function ImportExport() {
  const { width } = useWindowDimensions();
  const { token, user } = useApp();
  const initPhone = parsePhone(user?.phone);
  const [country, setCountryObj] = useState<Country>(initPhone.country);
  const [items, setItems] = useState<ReqItem[]>([]);
  const [form, setForm] = useState({
    company_name: '',
    business_type: 'import' as 'import' | 'export' | 'both',
    country: initPhone.country.name,
    contact_person: user?.name || '',
    phone: initPhone.local,
    email: user?.email || '',
    product_interest: '',
    message: '',
  });

  // Selecting the dial-code country also fills the registration's country.
  const selectCountry = (c: Country) => {
    setCountryObj(c);
    setForm((f) => ({ ...f, country: c.name }));
  };
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<any>(null);

  const stacked = width < 900;

  const set = (k: keyof typeof form) => (t: string) => {
    setForm((f) => ({ ...f, [k]: t }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  function validate(): boolean {
    const e: Record<string, string | null> = {
      company_name: vRequired(form.company_name, 'Company name'),
      email: vEmail(form.email),
      phone: vPhoneLen(form.phone, country, false),
      contact_person: form.contact_person.trim() ? vName(form.contact_person, 'Contact person') : null,
    };
    setErrors(e);
    return isClean(e);
  }

  async function submit() {
    setError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const summary = items.map((i) => `${i.name} ×${i.qty} ${i.unit}`).join(', ');
      const productInterest = [summary, form.product_interest.trim()].filter(Boolean).join(' | ');
      const res = await api.createRegistration(
        { ...form, product_interest: productInterest, items, phone: form.phone ? `${country.dial} ${form.phone}` : '' },
        token
      );
      setDone(res);
    } catch (e: any) {
      setError(e.message || 'Submission failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Container style={{ marginTop: 26 }}>
        <SectionTitle title="Import & Export Registration" subtitle="Partner with RPK to trade food & groceries worldwide" />

        <View style={[styles.layout, stacked && { flexDirection: 'column' }]}>
          {/* Contact side */}
          <View style={stacked ? { width: '100%' } : { width: 340 }}>
            <ContactPanel
              product={form.product_interest}
              heading="Partner with RPK"
              description="Trade worldwide with a trusted Dubai-based supplier — bulk pricing, dedicated application review, and full logistics support."
            />
          </View>

          {/* Form / success */}
          <View style={stacked ? { width: '100%' } : { flex: 1 }}>
            {done ? (
              <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
                <Ionicons name="ribbon" size={56} color={colors.green} />
                <Text style={styles.successTitle}>Application Received</Text>
                <Text style={styles.successText}>
                  Thank you! Your registration for <Text style={{ fontWeight: '800' }}>{form.company_name}</Text> is now{' '}
                  <Text style={{ fontWeight: '800', color: colors.orange }}>pending review</Text>. Our team will contact
                  you at <Text style={{ fontWeight: '700' }}>{form.email}</Text>.
                </Text>
                {user && <Badge text="Track status in My Account" tone="navy" />}
              </Card>
            ) : (
              <Card style={{ gap: 14 }}>
                <Field label="Company name *" value={form.company_name} onChangeText={set('company_name')} placeholder="Your company L.L.C" error={errors.company_name} />

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
                  <Field style={{ flex: 1 }} label="Contact person" value={form.contact_person} onChangeText={(t) => set('contact_person')(sanitizeName(t))} placeholder="Full name" error={errors.contact_person} />
                  <Field style={{ flex: 1 }} label="Email *" value={form.email} onChangeText={set('email')} placeholder="you@company.com" keyboardType="email-address" error={errors.email} />
                </View>
                <PhoneField label={`Phone & Country — ${country.name}`} country={country} onCountryChange={selectCountry} number={form.phone} onNumberChange={set('phone')} error={errors.phone} />
                <RequirementBuilder items={items} onChange={setItems} />
                <Field label="Other products / notes" value={form.product_interest} onChangeText={(t) => setForm({ ...form, product_interest: t })} placeholder="Anything not listed above…" />
                <Field label="Message" value={form.message} onChangeText={(t) => setForm({ ...form, message: t })} placeholder="Tell us about your business & requirements" multiline />

                {!!error && <Text style={styles.error}>{error}</Text>}
                <Button label={busy ? 'Submitting…' : 'Submit registration'} onPress={submit} disabled={busy} />
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
