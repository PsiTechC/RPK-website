import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable, Linking, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { api } from '../lib/api';
import { colors, radius, shadow, BRAND } from '../lib/theme';
import { useApp } from '../lib/store';
import { Footer } from '../components/Footer';
import { Button, Badge } from '../components/ui';
import { FadeInUp } from '../components/Motion';
import { PhoneField } from '../components/PhoneField';
import { RequirementBuilder, ReqItem } from '../components/RequirementBuilder';
import { parsePhone, Country } from '../lib/countries';
import { vEmail, vName, vPhoneLen, vRequired, isClean, sanitizeName } from '../lib/validate';

// Grocery-trade backdrop (pulses & grains) — different scene from the Contact page.
const BG = 'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?auto=format&fit=crop&w=1700&q=75';
const FROST = { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any;

const TYPES = [
  { key: 'import', label: 'Import', desc: 'Buy & import from RPK' },
  { key: 'export', label: 'Export', desc: 'Supply & export to RPK' },
  { key: 'both', label: 'Both', desc: 'Import and export' },
] as const;

// Minimal underline input (label above, icon on the right).
function UField({
  label, icon, value, onChangeText, placeholder, keyboardType, multiline, error, style,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'email-address' | 'phone-pad';
  multiline?: boolean;
  error?: string | null;
  style?: any;
}) {
  const [focused, setFocused] = useState(false);
  const accent = error ? colors.red : focused ? colors.orange : '#8a877f';
  return (
    <View style={[{ flex: 1, minWidth: 0 }, style]}>
      <Text style={[styles.uLabel, focused && { color: colors.orange }]}>{label}</Text>
      <View style={[styles.uWrap, focused && styles.uWrapFocus, { borderBottomColor: accent }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9b988f"
          keyboardType={keyboardType}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          autoCorrect={false}
          style={[styles.uInput, multiline && { minHeight: 46, textAlignVertical: 'top' }]}
        />
        <Ionicons name={icon} size={17} color={accent} />
      </View>
      {!!error && <Text style={styles.uErr}>{error}</Text>}
    </View>
  );
}

// One trade-document row: upload button + uploaded/empty state.
function DocUpload({ label, url, busy, onPick }: { label: string; url: string; busy: boolean; onPick: () => void }) {
  const done = !!url;
  return (
    <Pressable style={styles.docRow} onPress={onPick} disabled={busy}>
      <Ionicons name={done ? 'checkmark-circle' : 'cloud-upload-outline'} size={18} color={done ? colors.green : colors.orange} />
      <Text style={styles.docLabel} numberOfLines={1}>{label}</Text>
      <Text style={[styles.docAction, done && { color: colors.green }]}>
        {busy ? 'Uploading…' : done ? 'Uploaded · Replace' : 'Upload'}
      </Text>
    </Pressable>
  );
}

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
    whatsapp: '',
    monthly_capacity: '',
    target_countries: '',
  });
  // Uploaded trade-document URLs (set by the document picker).
  const [docs, setDocs] = useState({ trade_license_url: '', vat_certificate_url: '', company_profile_url: '' });

  const selectCountry = (c: Country) => {
    setCountryObj(c);
    setForm((f) => ({ ...f, country: c.name }));
  };
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<any>(null);

  const stacked = width < 980;
  const colStack = width < 620;

  const set = (k: keyof typeof form) => (t: string) => {
    setForm((f) => ({ ...f, [k]: t }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const [uploadingDoc, setUploadingDoc] = useState<keyof typeof docs | null>(null);

  // Pick a PDF/image trade document (web) and upload it; store the returned URL.
  function pickDoc(field: keyof typeof docs) {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      setError('');
      setUploadingDoc(field);
      try {
        const { url } = await api.uploadDocument(file);
        setDocs((d) => ({ ...d, [field]: url }));
      } catch (e: any) {
        setError(e.message || 'Upload failed.');
      } finally {
        setUploadingDoc(null);
      }
    };
    input.click();
  }

  function validate(): boolean {
    const e: Record<string, string | null> = {
      company_name: vRequired(form.company_name, 'Company name'),
      email: vEmail(form.email),
      phone: vPhoneLen(form.phone, country, true),
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
        { ...form, ...docs, product_interest: productInterest, items, phone: form.phone ? `${country.dial} ${form.phone}` : '' },
        token
      );
      setDone(res);
    } catch (e: any) {
      setError(e.message || 'Submission failed.');
    } finally {
      setBusy(false);
    }
  }

  const waUrl = `https://wa.me/${BRAND.phone.replace(/[^\d]/g, '')}`;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[styles.hero, { paddingVertical: stacked ? 24 : 30 }]}>
        <Image source={{ uri: BG }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <View style={styles.scrim} />

        <View style={[styles.row, stacked && { flexDirection: 'column', alignItems: 'stretch' }]}>
          {/* LEFT */}
          <FadeInUp delay={100} distance={26} style={[styles.left, stacked && { width: '100%' }]}>
            <View style={styles.kicker}>
              <Ionicons name="boat" size={15} color={colors.white} />
              <Text style={styles.kickerText}>IMPORT & EXPORT · REGISTRATION</Text>
            </View>
            <Text style={[styles.h1, { fontSize: stacked ? 40 : 56 }]}>Partner{'\n'}With RPK</Text>
            <Text style={styles.lead}>
              Register to trade food & groceries worldwide with {BRAND.legal} — bulk pricing, a dedicated
              application review, and full logistics support from Dubai.
            </Text>
            <View style={styles.featRow}>
              {['Bulk pricing', 'Logistics support', 'Dedicated review'].map((f) => (
                <View key={f} style={styles.featChip}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.orange} />
                  <Text style={styles.featText}>{f}</Text>
                </View>
              ))}
            </View>
          </FadeInUp>

          {/* RIGHT — registration form */}
          <FadeInUp delay={260} scaleFrom={0.97} style={[styles.cardWrap, stacked && { width: '100%', marginTop: 20 }]}>
            <View style={[styles.card, FROST]}>
              {done ? (
                <View style={{ alignItems: 'center', gap: 12, paddingVertical: 30 }}>
                  <Ionicons name="ribbon" size={56} color={colors.green} />
                  <Text style={styles.cardTitle}>Application Received</Text>
                  <Text style={styles.success}>
                    Thank you! Your registration for <Text style={{ fontWeight: '800' }}>{form.company_name}</Text> is now{' '}
                    <Text style={{ fontWeight: '800', color: colors.orange }}>pending review</Text>. Our team will contact
                    you at <Text style={{ fontWeight: '700' }}>{form.email}</Text>.
                  </Text>
                  {user && <Badge text="Track status in My Account" tone="navy" />}
                </View>
              ) : (
                <>
                  <Text style={styles.cardTitle}>Registration</Text>
                  <Text style={styles.cardSub}>Tell us about your business — we reply within hours.</Text>

                  <View style={{ marginTop: 10, gap: 10 }}>
                    <UField label="COMPANY NAME *" icon="business-outline" value={form.company_name} onChangeText={set('company_name')} placeholder="Your company L.L.C" error={errors.company_name} />

                    <View style={{ gap: 6 }}>
                      <Text style={styles.uLabel}>BUSINESS TYPE *</Text>
                      <View style={[styles.typeRow, colStack && { flexDirection: 'column' }]}>
                        {TYPES.map((t) => {
                          const on = form.business_type === t.key;
                          return (
                            <Pressable key={t.key} style={[styles.type, on && styles.typeActive]} onPress={() => setForm({ ...form, business_type: t.key })}>
                              <Text style={[styles.typeLabel, on && { color: colors.orangeDark }]}>{t.label}</Text>
                              <Text style={styles.typeDesc}>{t.desc}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={[styles.grid, colStack && { flexDirection: 'column' }]}>
                      <UField label="CONTACT PERSON" icon="person-outline" value={form.contact_person} onChangeText={(t) => set('contact_person')(sanitizeName(t))} placeholder="Full name" error={errors.contact_person} />
                      <UField label="EMAIL *" icon="mail-outline" value={form.email} onChangeText={set('email')} placeholder="you@company.com" keyboardType="email-address" error={errors.email} />
                    </View>

                    <PhoneField label={`Phone * & Country — ${country.name}`} country={country} onCountryChange={selectCountry} number={form.phone} onNumberChange={set('phone')} error={errors.phone} />

                    <View style={[styles.grid, colStack && { flexDirection: 'column' }]}>
                      <UField label="WHATSAPP" icon="logo-whatsapp" value={form.whatsapp} onChangeText={set('whatsapp')} placeholder="+971 5x xxx xxxx" keyboardType="phone-pad" />
                      <UField label="MONTHLY BUYING CAPACITY" icon="cube-outline" value={form.monthly_capacity} onChangeText={set('monthly_capacity')} placeholder="e.g. 2 containers / 5 tonnes" />
                    </View>

                    <UField label="TARGET COUNTRIES" icon="earth-outline" value={form.target_countries} onChangeText={set('target_countries')} placeholder="Countries you trade with…" />

                    <View style={{ gap: 6 }}>
                      <Text style={styles.uLabel}>BUSINESS DOCUMENTS (PDF / IMAGE)</Text>
                      <DocUpload label="Trade License" url={docs.trade_license_url} busy={uploadingDoc === 'trade_license_url'} onPick={() => pickDoc('trade_license_url')} />
                      <DocUpload label="VAT / Tax Certificate" url={docs.vat_certificate_url} busy={uploadingDoc === 'vat_certificate_url'} onPick={() => pickDoc('vat_certificate_url')} />
                      <DocUpload label="Company Profile" url={docs.company_profile_url} busy={uploadingDoc === 'company_profile_url'} onPick={() => pickDoc('company_profile_url')} />
                    </View>

                    <RequirementBuilder items={items} onChange={setItems} />

                    <View style={[styles.grid, colStack && { flexDirection: 'column' }]}>
                      <UField label="OTHER PRODUCTS / NOTES" icon="pricetag-outline" value={form.product_interest} onChangeText={(t) => setForm({ ...form, product_interest: t })} placeholder="Anything not listed above…" />
                      <UField label="MESSAGE" icon="chatbox-ellipses-outline" value={form.message} onChangeText={(t) => setForm({ ...form, message: t })} placeholder="Tell us about your business…" multiline />
                    </View>

                    {!!error && <Text style={styles.uErr}>{error}</Text>}

                    <View style={[styles.submitRow, colStack && { flexDirection: 'column' }]}>
                      <Button label={busy ? 'Submitting…' : 'Submit registration'} onPress={submit} disabled={busy} style={{ flex: colStack ? undefined : 1 }} />
                      <Pressable style={[styles.waBtn, colStack && { width: '100%' }]} onPress={() => Linking.openURL(waUrl)}>
                        <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
                        <Text style={styles.waBtnText}>WhatsApp</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </View>
          </FadeInUp>
        </View>
      </View>
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'relative', overflow: 'hidden', backgroundColor: colors.navyDark, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,12,26,0.72)' },
  row: { width: '100%', maxWidth: 1280, flexDirection: 'row', gap: 40, alignItems: 'center', zIndex: 2 },

  left: { flex: 1, paddingTop: 4 },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  kickerText: { color: colors.white, fontWeight: '800', fontSize: 11.5, letterSpacing: 1.2 },
  h1: { color: colors.white, fontWeight: '900', letterSpacing: -1, marginTop: 16 },
  lead: { color: '#E7E3DF', fontSize: 15.5, lineHeight: 25, maxWidth: 460, marginTop: 16 },
  featRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  featChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  featText: { color: colors.white, fontWeight: '700', fontSize: 12.5 },

  cardWrap: { width: 640 },
  card: {
    backgroundColor: 'rgba(247,240,229,0.90)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(226,140,60,0.35)',
    borderTopWidth: 4,
    borderTopColor: colors.orange,
    paddingHorizontal: 26,
    paddingVertical: 18,
    ...shadow.card,
  },
  cardTitle: { fontWeight: '900', fontSize: 21, color: colors.red },
  cardSub: { color: '#6b5e52', fontSize: 12.5, marginTop: 2 },
  grid: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },

  uLabel: { color: '#3a352e', fontWeight: '900', fontSize: 11.5, letterSpacing: 0.8, marginBottom: 3 },
  uWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1.5, borderBottomColor: '#b9b6ad', paddingVertical: 4, borderRadius: 4 },
  uWrapFocus: { backgroundColor: 'rgba(243,130,42,0.07)' },
  uInput: { flex: 1, fontSize: 14.5, color: '#1f1f1f', paddingVertical: 4, outlineStyle: 'none' as any },
  uErr: { color: colors.red, fontSize: 12, marginTop: 3 },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.6)' },
  docLabel: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 13 },
  docAction: { fontWeight: '800', color: colors.orange, fontSize: 12.5 },

  typeRow: { flexDirection: 'row', gap: 8 },
  type: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.6)' },
  typeActive: { borderColor: colors.orange, backgroundColor: colors.cream },
  typeLabel: { fontWeight: '800', color: colors.text, fontSize: 13.5 },
  typeDesc: { color: colors.muted, fontSize: 10.5, marginTop: 1 },

  submitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  waBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#25D366', paddingHorizontal: 20, paddingVertical: 14, borderRadius: radius.pill },
  waBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  success: { color: colors.text, textAlign: 'center', maxWidth: 440, lineHeight: 22, fontSize: 14.5 },
});
