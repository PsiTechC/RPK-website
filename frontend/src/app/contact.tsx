import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable, Linking, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../lib/api';
import { colors, radius, shadow, BRAND } from '../lib/theme';
import { Footer } from '../components/Footer';
import { Button, Badge, Container } from '../components/ui';
import { FadeInUp, Reveal } from '../components/Motion';
import { useToast } from '../components/Toast';
import { PhoneField } from '../components/PhoneField';
import { RequirementBuilder, ReqItem } from '../components/RequirementBuilder';
import { DEFAULT_COUNTRY } from '../lib/countries';
import { vName, vEmail, vPhoneLen, isClean, sanitizeName } from '../lib/validate';

// Grocery-product backdrop (spices & masala) — wholesale food trade, not vegetables.
const BG = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1700&q=75';
// Shelf / shipment-tracking illustration shown under the left hero copy.
const CONTACT_SHELF_IMG = require('../../assets/images/contact-shelf.png');
// The artwork's intrinsic size (865x498). The image box uses this ratio so the
// whole shelf shows at any width — no crop, no letterboxing.
const SHELF_ASPECT = 865 / 498;
// Sticky site header. Measured at 63px across every width; the hero subtracts it
// so the first screen ends exactly at the fold.
const HEADER_H = 63;
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
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ product?: string }>();
  const stacked = width < 980;
  // The card's own width, not the window's, decides whether its fields sit two
  // across: beside the copy the form is much narrower than the viewport, so a
  // window-based check kept two columns at ~226px each and the field icons
  // collided with their placeholders.
  const [cardW, setCardW] = useState(0);
  const fieldsStacked = stacked || (cardW > 0 && cardW < 520);
  // Size the shelf image from the space actually left under the copy. Yoga will
  // not derive height from aspectRatio once height comes from flex, so a purely
  // declarative box ends up off-ratio and `contain` letterboxes inside its own
  // border. Measuring the slot and sizing the image to fit keeps it exactly on
  // ratio: it fills the slot's height, unless the column is too narrow for that
  // (~1024), where width is the binding constraint.
  const [slot, setSlot] = useState({ w: 0, h: 0 });
  const imgH = slot.w > 0 && slot.h > 0 ? Math.min(slot.h, slot.w / SHELF_ASPECT) : 0;
  // Ultra-wide monitors: scale the hero up so it doesn't read as a small island
  // marooned in the middle of the screen.
  const wide = width >= 1800;
  // Fill the viewport under the header so the hero owns the first screen and the
  // feedback section starts below the fold. HEADER_H is measured, not the ~68 the
  // old estimate assumed — that overshot by 5px and let the feedback band peek in.
  const heroMinHeight = Math.max(680, height - HEADER_H);
  // The columns are sized independently of that, and centred in it. Tying them
  // to the hero would leave the form card with a huge empty band under its
  // fields on tall monitors; 660 keeps the panel snug while still giving the
  // shelf image real height. It's a floor, so a taller form (narrow widths,
  // where the fields stack) still grows the row rather than overflowing it.
  // Short viewports (~858 and below) can't afford the roomy padding: around 1024
  // the form is too narrow for two-across fields, so they stack into a ~700px
  // column and the full padding pushed the hero past the fold.
  const heroPadV = stacked ? 52 : height < 920 ? 36 : 64;
  const rowMinHeight = Math.min(heroMinHeight - heroPadV * 2, 660);

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
        {/* FIRST SCREEN — light hero with the quote form (no background image). */}
        <View style={[styles.hero, { minHeight: heroMinHeight, justifyContent: 'center', paddingVertical: heroPadV }]}>
        {/* minHeight (not flexGrow) gives both columns a sensible shared height
            that is decoupled from the hero: the form stretches to match it and
            the image takes the rest of the left column, while the hero itself
            still fills the screen around them. */}
        <View style={[styles.row, wide && { maxWidth: 1680 }, !stacked && { minHeight: rowMinHeight }, stacked && { flexDirection: 'column', alignItems: 'stretch' }]}>
          {/* LEFT — headline + copy */}
          {/* flexGrow 0 when stacked: `left`'s flex:1 is meant to share the ROW,
              but in a column it grows vertically and pushes the form down behind
              a band of empty space. */}
          <FadeInUp delay={100} distance={26} style={[styles.left, stacked && { width: '100%', flexGrow: 0, flexBasis: 'auto' }]}>
            <View style={styles.kicker}>
              <Ionicons name="earth" size={15} color={colors.red} />
              <Text style={styles.kickerText}>DUBAI · WORLDWIDE IMPORT & EXPORT</Text>
            </View>
            {/* 46 under 1180: the card holds 600 for its two-across fields, so the
                copy column is narrow there and 64 would not fit "Global Food". */}
            <Text style={[styles.h1, { fontSize: stacked ? 40 : width < 1180 ? 46 : wide ? 76 : 64 }]}>Global Food{'\n'}Trading</Text>
            <Text style={[styles.lead, wide && { fontSize: 19, lineHeight: 31 }]}>
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

            {/* Shelf / shipment-tracking illustration under the copy. Always the
                artwork's own aspect ratio, so the whole shelf shows uncropped.
                Beside the form the wrapper claims the height left under the copy
                and the image sizes to it, so its bottom lands level with the form
                and the hero stays one screen tall. The wrapper is invisible, so
                where the column is too narrow for the full height (~1024) the
                slack reads as plain whitespace rather than a gap boxed in by the
                image's own border. Stacked, it just spans the column. */}
            <View
              style={!stacked ? { flex: 1, minHeight: 120, width: '100%', marginTop: 26, position: 'relative' } : { width: '100%', marginTop: 26 }}
              onLayout={(e) => setSlot({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
            >
              {/* Absolute beside the form: in flow, the measured image inflates the
                  slot that measures it — slot grows, image grows, hero grows — and
                  the hero ends up overflowing short laptops. Out of flow, the slot
                  is sized purely by the space left over and the image fills it. */}
              <Image
                source={CONTACT_SHELF_IMG}
                style={[
                  styles.leftImage,
                  stacked
                    ? { width: '100%', aspectRatio: SHELF_ASPECT }
                    : { position: 'absolute', top: 0, left: 0, width: imgH * SHELF_ASPECT, height: imgH },
                ]}
                contentFit="contain"
              />
            </View>
          </FadeInUp>

          {/* RIGHT — wide, low-height form */}
          {/* maxWidth '100%' lifts cardWrap's 640 cap when stacked — capped, the
              card sat left-aligned with dead space beside it on tablets. */}
          {/* minWidth 0 when stacked: the 600 floor is a desktop concern and would
              overflow a phone. */}
          <FadeInUp delay={260} scaleFrom={0.97} style={[styles.cardWrap, wide && { maxWidth: 760 }, stacked && { width: '100%', minWidth: 0, maxWidth: '100%', flexGrow: 0, flexBasis: 'auto', marginTop: 20 }]}>
            {/* flex fills cardWrap's stretched height so the panel's bottom edge
                lines up with the image's, instead of floating at content height. */}
            <View style={[styles.card, FROST, !stacked && { flex: 1 }]} onLayout={(e) => setCardW(e.nativeEvent.layout.width)}>
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

                    <View style={[styles.grid, fieldsStacked && { flexDirection: 'column', alignItems: 'stretch' }]}>
                      <UField label="YOUR NAME *" icon="person-outline" value={form.name} onChangeText={(t) => set('name')(sanitizeName(t))} placeholder="Full name" error={errors.name} />
                      <UField label="EMAIL *" icon="mail-outline" value={form.email} onChangeText={set('email')} placeholder="you@email.com" keyboardType="email-address" error={errors.email} />
                    </View>

                    <PhoneField label="Phone *" country={country} onCountryChange={setCountry} number={form.phone} onNumberChange={set('phone')} error={errors.phone} />

                    <RequirementBuilder items={items} onChange={setItems} />

                    <View style={[styles.grid, fieldsStacked && { flexDirection: 'column', alignItems: 'stretch' }]}>
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
  const [cardHover, setCardHover] = useState(false);
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
      <Container style={{ zIndex: 2 }}>
        <Reveal>
          <Pressable
            onHoverIn={() => setCardHover(true)}
            onHoverOut={() => setCardHover(false)}
            style={[styles.fbCard, FROST, cardHover && styles.fbCardHover]}
          >
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
                    <Pressable
                      key={i}
                      onPress={() => setRating(i)}
                      onHoverIn={() => setHover(i)}
                      onHoverOut={() => setHover(0)}
                      hitSlop={4}
                      style={({ hovered }: any) => [styles.starBtn, (hovered || hover >= i) && styles.starBtnActive]}
                    >
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
          </Pressable>
        </Reveal>
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { position: 'relative', overflow: 'hidden', backgroundColor: colors.bg },
  hero: { position: 'relative', backgroundColor: colors.bg, paddingHorizontal: 18, alignItems: 'center' },
  // 1340 = left 660 + gap 40 + form 640, so the two columns come out even and
  // the copy sits next to the form instead of stranding a gap between them on
  // wide screens.
  row: { width: '100%', maxWidth: 1340, flexDirection: 'row', gap: 40, alignItems: 'stretch', zIndex: 2 },

  left: { flex: 1, minWidth: 0, paddingTop: 4 },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: colors.redSoft, borderWidth: 1, borderColor: 'rgba(217,36,25,0.22)', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  kickerText: { color: colors.red, fontWeight: '800', fontSize: 11.5, letterSpacing: 1.2 },
  h1: { color: colors.ink, fontWeight: '900', letterSpacing: -1, marginTop: 16 },
  // No maxWidth — the column (660 at full width) sets the measure, which keeps
  // the copy filling the space beside the form rather than trailing off at 440.
  lead: { color: colors.text, fontSize: 17, lineHeight: 28, marginTop: 16 },
  trustRow: { marginTop: 24, gap: 6 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trustScore: { color: colors.ink, fontWeight: '900', fontSize: 16, marginLeft: 8 },
  trustText: { color: colors.muted, fontSize: 13 },
  // Size is set per-layout (full-bleed when stacked, measured to fit its slot
  // beside the form), and the slot owns the top margin — so neither is fixed here.
  leftImage: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, ...shadow.card },

  // wide, low form
  // Flexes rather than a fixed 640 — at a fixed width it ate the row on mid-size
  // desktops (~980–1340) and crushed the copy column to ~264px. Now both columns
  // share the row evenly and the form only stops growing at 640.
  // minWidth 600 is the floor for two-across fields: below it they stack into a
  // ~770px column that will not fit a short laptop. An even split at ~1024 left
  // the card at 474 and did exactly that, so the copy column yields instead.
  cardWrap: { flex: 1, minWidth: 600, maxWidth: 640 },
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
  // SECOND SCREEN — its own clean light band, distinct from the dark hero.
  fbBand: { position: 'relative', backgroundColor: colors.soft, paddingVertical: 60, paddingHorizontal: 18, zIndex: 2 },
  fbCard: {
    alignSelf: 'center', width: '100%', maxWidth: 660, zIndex: 2,
    backgroundColor: colors.white,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    borderTopWidth: 4, borderTopColor: colors.orange,
    paddingHorizontal: 26, paddingVertical: 22, ...shadow.card,
    ...(Platform.OS === 'web'
      ? ({ transitionProperty: 'transform, box-shadow, border-color', transitionDuration: '220ms', transitionTimingFunction: 'ease-out', cursor: 'default' } as any)
      : null),
  },
  fbTitle: { fontWeight: '900', fontSize: 21, color: colors.red, textAlign: 'center' },
  fbSub: { color: '#6b5e52', fontSize: 13, textAlign: 'center', marginTop: 4 },
  // Whole card lifts on hover.
  fbCardHover: {
    ...(Platform.OS === 'web'
      ? ({ transform: [{ translateY: -4 }], boxShadow: '0 18px 40px rgba(42,38,34,0.16)' } as any)
      : { transform: [{ translateY: -4 }] }),
    borderColor: 'rgba(217,36,25,0.28)',
  },
  starsBig: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 12 },
  // Each star scales + lifts on hover with a smooth transition.
  starBtn: {
    ...(Platform.OS === 'web'
      ? ({ transitionProperty: 'transform', transitionDuration: '160ms', transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)' } as any)
      : null),
  },
  starBtnActive: { transform: [{ scale: 1.32 }, { translateY: -4 }] },
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
