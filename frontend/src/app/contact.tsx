import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable, Linking, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../lib/api';
import { colors, radius, shadow, BRAND } from '../lib/theme';
import { Footer } from '../components/Footer';
import { HeroVideo } from '../components/HeroVideo';
import { Button, Badge, Container } from '../components/ui';
import { FadeInUp, Reveal } from '../components/Motion';
import { useToast } from '../components/Toast';
import { PhoneField } from '../components/PhoneField';
import { RequirementBuilder, ReqItem } from '../components/RequirementBuilder';
import { DEFAULT_COUNTRY } from '../lib/countries';
import { vName, vEmail, vPhoneLen, isClean, sanitizeName } from '../lib/validate';

// Grocery-product backdrop (spices & masala) — wholesale food trade, not vegetables.
const BG = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1700&q=75';
const FROST = { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any;

// Minimal underline input (label above, icon on the right) — like the reference.
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

export default function Contact() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ product?: string }>();
  const stacked = width < 980;

  const [form, setForm] = useState({
    name: '', email: '', phone: '', product: params.product ? String(params.product) : '', message: '',
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
      email: vEmail(form.email),
      phone: vPhoneLen(form.phone, country, true),
    };
    setErrors(e);
    if (!isClean(e)) return;
    const summary = items.map((i) => `${i.name} ×${i.qty} ${i.unit}`).join(', ');
    const productField = [summary, form.product.trim()].filter(Boolean).join(' | ');

    setBusy(true);
    try {
      await api.createInquiry({ ...form, product: productField, phone: form.phone ? `${country.dial} ${form.phone}` : '', items });
      setDone(true);
    } catch {
      setError('Sorry, we could not send your inquiry right now. Please try again, or WhatsApp us.');
    } finally {
      setBusy(false);
    }
  }

  const waUrl = `https://wa.me/${BRAND.phone.replace(/[^\d]/g, '')}`;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.page}>
        {/* Rotating grocery hero background — same as the Home & About pages. */}
        <View style={[styles.hero, { paddingVertical: stacked ? 40 : 64 }]}>
        <View style={StyleSheet.absoluteFillObject as any}><HeroVideo showDots={false} /></View>
        <View pointerEvents="none" style={styles.heroBgOverlay} />
        <View style={[styles.row, stacked && { flexDirection: 'column', alignItems: 'stretch' }]}>
          {/* LEFT — headline + copy */}
          <FadeInUp delay={100} distance={26} style={[styles.left, stacked && { width: '100%' }]}>
            <View style={styles.kicker}>
              <Ionicons name="earth" size={15} color={colors.red} />
              <Text style={styles.kickerText}>DUBAI · WORLDWIDE IMPORT & EXPORT</Text>
            </View>
            <Text style={[styles.h1, { fontSize: stacked ? 40 : 58 }]}>Global Food{'\n'}Trading</Text>
            <Text style={styles.lead}>
              {BRAND.legal} — your trusted Dubai partner for premium groceries: rice, spices, pulses, oils & more,
              delivered to businesses across international markets.
            </Text>
            <View style={styles.trustRow}>
              <View style={styles.stars}>
                {[0, 1, 2, 3, 4].map((i) => <Ionicons key={i} name="star" size={14} color={colors.orange} />)}
                <Text style={styles.trustScore}>4.8</Text>
              </View>
              <Text style={styles.trustText}>Trusted by businesses across the GCC, Asia & beyond.</Text>
            </View>
          </FadeInUp>

          {/* RIGHT — wide, low-height form */}
          <FadeInUp delay={260} scaleFrom={0.97} style={[styles.cardWrap, stacked && { width: '100%', marginTop: 20 }]}>
            <View style={[styles.card, FROST]}>
              {done ? (
                <View style={{ alignItems: 'center', gap: 14, paddingVertical: 26 }}>
                  <Ionicons name="checkmark-circle" size={58} color={colors.green} />
                  <Text style={styles.cardTitle}>Inquiry Sent!</Text>
                  <Text style={styles.success}>
                    Thank you{form.name ? `, ${form.name.split(' ')[0]}` : ''}. Our team will reply shortly at{' '}
                    {form.email || form.phone}.
                  </Text>
                  <Badge text="You can also WhatsApp us for a faster reply" tone="navy" />
                </View>
              ) : (
                <>
                  <Text style={styles.cardTitle}>Request a Quote</Text>
                  <Text style={styles.cardSub}>Tell us what you need — we reply within hours.</Text>

                  <View style={{ marginTop: 14, gap: 14 }}>
                    {!!form.product && (
                      <View style={styles.productPill}><Text style={styles.productPillText}>Product: {form.product}</Text></View>
                    )}

                    <View style={[styles.grid, stacked && { flexDirection: 'column', alignItems: 'stretch' }]}>
                      <UField label="YOUR NAME *" icon="person-outline" value={form.name} onChangeText={(t) => set('name')(sanitizeName(t))} placeholder="Full name" error={errors.name} />
                      <UField label="EMAIL *" icon="mail-outline" value={form.email} onChangeText={set('email')} placeholder="you@email.com" keyboardType="email-address" error={errors.email} />
                    </View>

                    <PhoneField label="Phone *" country={country} onCountryChange={setCountry} number={form.phone} onNumberChange={set('phone')} error={errors.phone} />

                    <RequirementBuilder items={items} onChange={setItems} />

                    <View style={[styles.grid, stacked && { flexDirection: 'column', alignItems: 'stretch' }]}>
                      <UField label="OTHER PRODUCTS / NOTES" icon="pricetag-outline" value={form.product} onChangeText={set('product')} placeholder="Anything not listed above…" />
                      <UField label="MESSAGE" icon="chatbox-ellipses-outline" value={form.message} onChangeText={set('message')} placeholder="Quantity, delivery location…" multiline />
                    </View>

                    {!!error && <Text style={styles.uErr}>{error}</Text>}

                    <View style={[styles.submitRow, stacked && { flexDirection: 'column', alignItems: 'stretch' }]}>
                      <Button label={busy ? 'Sending…' : 'Send inquiry'} onPress={submit} disabled={busy} style={{ flex: stacked ? undefined : 1, width: stacked ? '100%' : undefined }} />
                      <Pressable style={[styles.waBtn, stacked && { width: '100%' }]} onPress={() => Linking.openURL(waUrl)}>
                        <View style={styles.waBadge}>
                          <Ionicons name="logo-whatsapp" size={18} color={colors.white} />
                        </View>
                        <Text style={styles.waBtnText}>WhatsApp</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.note}>We typically respond within a few hours during business days.</Text>
                  </View>
                </>
              )}
            </View>
          </FadeInUp>
        </View>
      </View>

        <FeedbackSection />
      </View>
      <Footer />
    </ScrollView>
  );
}

// ---------- Website feedback ----------
function FeedbackSection() {
  const { width } = useWindowDimensions();
  const stacked = width < 720;
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function send() {
    setErr('');
    if (rating < 1) return setErr('Please pick a star rating.');
    setBusy(true);
    try {
      await api.createFeedback({ rating, comment: comment.trim() });
      setDone(true);
      toast('Thanks for your feedback!', 'success');
    } catch {
      setErr('Could not send feedback right now. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.fbBand}>
      {/* Same rotating grocery background as the hero, so the page reads as one piece. */}
      <View style={StyleSheet.absoluteFillObject as any}><HeroVideo showDots={false} /></View>
      <View pointerEvents="none" style={styles.heroBgOverlay} />
      <Container style={{ zIndex: 2 }}>
        <Reveal>
          <View style={[styles.fbCard, FROST]}>
            <Text style={styles.fbTitle}>How was your experience?</Text>
            <Text style={styles.fbSub}>Your feedback helps us improve {BRAND.name}.</Text>

            {done ? (
              <View style={{ alignItems: 'center', gap: 10, paddingVertical: 18 }}>
                <Ionicons name="heart" size={44} color={colors.red} />
                <Text style={styles.fbThanks}>Thank you for your feedback!</Text>
              </View>
            ) : (
              <>
                <View style={styles.starsBig}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Pressable key={i} onPress={() => setRating(i)} onHoverIn={() => setHover(i)} onHoverOut={() => setHover(0)} hitSlop={4}>
                      <Ionicons name={(hover || rating) >= i ? 'star' : 'star-outline'} size={34} color={colors.orange} />
                    </Pressable>
                  ))}
                </View>

                <UField label="YOUR FEEDBACK" icon="chatbox-ellipses-outline" value={comment} onChangeText={setComment} placeholder="What did you like, what can we improve?" multiline style={{ marginTop: 6 }} />

                {!!err && <Text style={styles.uErr}>{err}</Text>}

                <View style={{ alignItems: 'center', marginTop: 18 }}>
                  <Button label={busy ? 'Sending…' : 'Submit feedback'} onPress={send} disabled={busy} />
                </View>
              </>
            )}
          </View>
        </Reveal>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { position: 'relative', overflow: 'hidden', backgroundColor: colors.white },
  hero: { position: 'relative', overflow: 'hidden', backgroundColor: '#140A09', paddingHorizontal: 18, alignItems: 'center' },
  // Dark scrim over the photo so the headline copy stays legible.
  heroBgOverlay: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(160deg, rgba(10,6,5,0.82) 0%, rgba(18,10,8,0.66) 100%)' } as any)
      : { backgroundColor: 'rgba(10,6,5,0.72)' }),
  },
  row: { width: '100%', maxWidth: 1280, flexDirection: 'row', gap: 40, alignItems: 'flex-start', zIndex: 2 },

  left: { flex: 1, paddingTop: 4 },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  kickerText: { color: '#fff', fontWeight: '800', fontSize: 11.5, letterSpacing: 1.2 },
  h1: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -1, marginTop: 16 },
  lead: { color: 'rgba(255,255,255,0.92)', fontSize: 15.5, lineHeight: 25, maxWidth: 440, marginTop: 16 },
  trustRow: { marginTop: 24, gap: 6 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trustScore: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, marginLeft: 8 },
  trustText: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },

  // wide, low form
  cardWrap: { width: 640 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 30,
    paddingVertical: 26,
    ...shadow.card,
  },
  cardTitle: { fontWeight: '900', fontSize: 22, color: colors.red },
  cardSub: { color: '#6b5e52', fontSize: 13, marginTop: 4 },
  grid: { flexDirection: 'row', gap: 22, alignItems: 'flex-start' },

  // underline field
  uLabel: { color: '#3a352e', fontWeight: '900', fontSize: 11.5, letterSpacing: 0.8, marginBottom: 3 },
  uWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1.5, borderBottomColor: '#b9b6ad', paddingVertical: 5, borderRadius: 4 },
  uWrapFocus: { backgroundColor: 'rgba(243,130,42,0.07)' },
  uInput: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1f1f1f', paddingVertical: 5, outlineStyle: 'none' as any },
  uErr: { color: colors.red, fontSize: 12, marginTop: 3 },

  // feedback band — same backdrop as the hero
  fbBand: { position: 'relative', overflow: 'hidden', backgroundColor: '#140A09', paddingVertical: 44, paddingHorizontal: 18, zIndex: 2 },
  fbCard: {
    alignSelf: 'center', width: '100%', maxWidth: 660, zIndex: 2,
    backgroundColor: 'rgba(247,240,229,0.90)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(226,140,60,0.35)',
    borderTopWidth: 4, borderTopColor: colors.orange,
    paddingHorizontal: 26, paddingVertical: 20, ...shadow.card,
  },
  fbTitle: { fontWeight: '900', fontSize: 21, color: colors.red, textAlign: 'center' },
  fbSub: { color: '#6b5e52', fontSize: 13, textAlign: 'center', marginTop: 4 },
  starsBig: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 12 },
  fbThanks: { fontWeight: '900', fontSize: 18, color: colors.ink },

  productPill: { alignSelf: 'flex-start', backgroundColor: colors.cream, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  productPillText: { color: colors.orangeDark, fontWeight: '800', fontSize: 13 },
  submitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  waBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#E7F8EE', borderWidth: 1, borderColor: 'rgba(37,211,102,0.45)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill },
  waBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  waBtnText: { color: '#0E7A38', fontWeight: '800', fontSize: 15 },
  note: { color: '#4a4a4a', fontSize: 12, textAlign: 'center' },
  success: { color: colors.text, textAlign: 'center', maxWidth: 420, lineHeight: 22, fontSize: 14.5 },

});
