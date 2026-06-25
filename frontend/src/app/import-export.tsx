import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable, Linking, TextInput, Platform, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { api } from '../lib/api';
import { colors, radius, shadow, BRAND } from '../lib/theme';
import { useApp } from '../lib/store';
import { Footer } from '../components/Footer';
import { Button, Badge, Container } from '../components/ui';
import { FadeInUp, Reveal, useHoverScale } from '../components/Motion';
import { PhoneField } from '../components/PhoneField';
import { RequirementBuilder, ReqItem } from '../components/RequirementBuilder';
import { useLocalSearchParams } from 'expo-router';
import { parsePhone, Country } from '../lib/countries';
import { vEmail, vName, vPhoneLen, vRequired, isClean, sanitizeName } from '../lib/validate';

type Ion = keyof typeof Ionicons.glyphMap;

// Editorial palette — shared with the About page so the two read as one family.
const P = {
  cream: '#F6F1E9',
  espresso: '#1E1813',
  red: '#E11D2A',
  gold: '#C19A4B',
  muted: '#57534E',
  band: '#EFE7D9',
};

// Right-hand hero videos (split layout) — cycle through both, repeating.
// Exclusive to this page (About uses different clips).
const HERO_VIDEOS = [
  require('../../assets/videos/about-who.mp4'),
  require('../../assets/videos/about-reach.mp4'),
];

const TYPES = [
  { key: 'import', label: 'Import', desc: 'Buy & import from RPK', icon: 'arrow-down-circle-outline' },
  { key: 'export', label: 'Export', desc: 'Supply & export to RPK', icon: 'arrow-up-circle-outline' },
  { key: 'both', label: 'Both', desc: 'Import and export', icon: 'swap-horizontal-outline' },
] as const;

const BENEFITS = [
  { t: 'Global trade network', d: 'Source and ship food & groceries across the GCC, Asia, Africa & beyond.', icon: 'earth-outline' },
  { t: 'Wholesale bulk pricing', d: 'Container and pallet rates built for importers and exporters.', icon: 'pricetags-outline' },
  { t: 'Verified & compliant', d: 'Full trade documentation, customs and quality compliance.', icon: 'shield-checkmark-outline' },
  { t: 'Dedicated partner team', d: 'A named account contact and full logistics support from Dubai.', icon: 'people-outline' },
] as const;

// Boxed input (label above, icon on the right) — unified with the phone field.
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
  const accent = error ? colors.red : focused ? colors.orange : colors.border;
  const iconColor = error ? colors.red : focused ? colors.orange : colors.muted;
  return (
    <View style={[{ flex: 1, minWidth: 0 }, style]}>
      <Text style={[styles.uLabel, focused && { color: colors.orange }]}>{label}</Text>
      <View style={[styles.uBox, { borderColor: accent }, focused && styles.uBoxFocus, multiline && { alignItems: 'flex-start' }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A9A49B"
          keyboardType={keyboardType}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          autoCorrect={false}
          style={[styles.uInput, multiline && { minHeight: 76, textAlignVertical: 'top', paddingTop: 12 }]}
        />
        <Ionicons name={icon} size={18} color={iconColor} style={multiline && { marginTop: 12 }} />
      </View>
      {!!error && <Text style={styles.uErr}>{error}</Text>}
    </View>
  );
}

// One trade-document row: upload button + uploaded/empty state.
function DocUpload({ label, url, busy, onPick }: { label: string; url: string; busy: boolean; onPick: () => void }) {
  const done = !!url;
  return (
    <Pressable style={[styles.docRow, done && styles.docRowDone]} onPress={onPick} disabled={busy}>
      <View style={[styles.docIcon, done && { backgroundColor: 'rgba(30,158,98,0.12)' }]}>
        <Ionicons name={done ? 'checkmark-circle' : 'cloud-upload-outline'} size={18} color={done ? colors.green : colors.orange} />
      </View>
      <Text style={styles.docLabel} numberOfLines={1}>{label}</Text>
      <Text style={[styles.docAction, done && { color: colors.green }]}>
        {busy ? 'Uploading…' : done ? 'Replace' : 'Upload'}
      </Text>
    </Pressable>
  );
}

// Small uppercase divider used to group the form into sections.
function SectionLabel({ text }: { text: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionText}>{text}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// Gold-bordered pill used in the hero (matches the About page).
function Chip({ icon, label }: { icon: Ion; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={15} color={P.gold} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

// Muted, cover-fit video that cycles through a list of clips and repeats.
// Each clip plays to the end, then the next loads; wraps back to the first.
function RotatingVideo({ sources, style }: { sources: any[]; style?: any }) {
  const idx = useRef(0);
  const player = useVideoPlayer(sources[0], (p) => {
    p.loop = sources.length <= 1; // single clip → loop; multiple → advance on end
    p.muted = true;
  });
  useEffect(() => {
    if (!player) return;
    player.muted = true;
    const play = () => { try { player.play(); } catch {} };
    play();
    const advance = () => {
      if (sources.length <= 1) return;
      idx.current = (idx.current + 1) % sources.length;
      try {
        player.replace(sources[idx.current]);
        player.muted = true;
        player.play();
      } catch {}
    };
    const subStatus = player.addListener('statusChange', (e: any) => {
      if (e?.status === 'readyToPlay') play();
    });
    const subEnd = player.addListener('playToEnd', advance);
    // Nudge the initial autoplay (web starts reliably once ready).
    const iv = setInterval(play, 700);
    const stop = setTimeout(() => clearInterval(iv), 4000);
    return () => { subStatus?.remove?.(); subEnd?.remove?.(); clearInterval(iv); clearTimeout(stop); };
  }, [player]);
  return (
    <View style={[style, { overflow: 'hidden' }]}>
      <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} />
    </View>
  );
}

const webBlur = (px: number) => (Platform.OS === 'web' ? ({ filter: `blur(${px}px)` } as any) : null);

// Dramatic scroll-reveal: slides in from the left or right with a scale + tilt.
function SlideReveal({ children, from, delay = 0, style }: { children: React.ReactNode; from: 'left' | 'right'; delay?: number; style?: any }) {
  const isWeb = Platform.OS === 'web';
  const [shown, setShown] = useState(!isWeb);
  const ref = useRef<any>(null);
  const v = useRef(new Animated.Value(isWeb ? 0 : 1)).current;
  useEffect(() => {
    if (!isWeb) return;
    const node = ref.current as unknown as Element | null;
    if (!node || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (shown) Animated.timing(v, { toValue: 1, duration: 540, delay, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start();
  }, [shown]);
  const sign = from === 'left' ? -1 : 1;
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [160 * sign, 0] });
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: [`${6 * sign}deg`, '0deg'] });
  return (
    <View ref={ref} style={style}>
      <Animated.View style={{ opacity: v, transform: [{ translateX }, { scale }, { rotate }] }}>{children}</Animated.View>
    </View>
  );
}

// Benefit card: slides in from left/right (first two left, last two right) and lifts on hover.
function BenefitCard({ b, index, sizeStyle }: { b: (typeof BENEFITS)[number]; index: number; sizeStyle: any }) {
  const hov = useHoverScale(1.05);
  const from = index < 2 ? 'left' : 'right';
  return (
    <SlideReveal from={from} delay={(index % 2) * 80} style={sizeStyle}>
      <Pressable onHoverIn={hov.onHoverIn} onHoverOut={hov.onHoverOut} style={{ width: '100%' }}>
        <Animated.View style={[styles.benefit, { transform: [{ scale: hov.scale }] }]}>
          <View style={styles.benefitIcon}>
            <Ionicons name={b.icon as any} size={24} color={P.gold} />
          </View>
          <Text style={styles.benefitTitle}>{b.t}</Text>
          <Text style={styles.benefitDesc}>{b.d}</Text>
        </Animated.View>
      </Pressable>
    </SlideReveal>
  );
}

export default function ImportExport() {
  const { width } = useWindowDimensions();
  const { token, user } = useApp();
  const initPhone = parsePhone(user?.phone);
  const [country, setCountryObj] = useState<Country>(initPhone.country);
  const [items, setItems] = useState<ReqItem[]>([]);
  const [showForm, setShowForm] = useState(false);
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

  const narrow = width < 760;
  const colStack = width < 620;
  const ctaHover = useHoverScale(1.02);

  // Gently floating rocket on the CTA — a lively, non-static touch.
  const floatY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const rocketFloat = floatY.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });

  // Scroll the page to the registration form using the ScrollView ref — the
  // reliable RN/Web method. We track the section's absolute Y via onLayout
  // (hero/body offset + the section's offset inside the body).
  const scrollRef = useRef<ScrollView>(null);
  const bodyY = useRef(0);
  const regY = useRef(0);

  function scrollToForm() {
    const run = () => {
      const y = Math.max(0, bodyY.current + regY.current - 80);
      scrollRef.current?.scrollTo({ y, animated: true });
      // Belt-and-suspenders for web in case the ref scroll no-ops.
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.getElementById('register-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    // Two frames so the just-revealed form is laid out before we scroll.
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => requestAnimationFrame(run));
    } else {
      setTimeout(run, 80);
    }
  }

  // Reveal the form, then scroll to it so the user is taken straight there.
  function openForm() {
    setShowForm(true);
    scrollToForm();
  }

  // Deep link: /import-export?register=1 opens the form on load and scrolls to it.
  const params = useLocalSearchParams<{ register?: string }>();
  useEffect(() => {
    if (params.register === '1' || params.register === 'true') {
      setShowForm(true);
      setTimeout(scrollToForm, 450);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.register]);

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
    <ScrollView ref={scrollRef} style={{ backgroundColor: P.cream }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* ───────── HERO (editorial, cream — matches the About page) ───────── */}
      <Container max={1180} style={{ paddingTop: colStack ? 36 : 64 }}>
        <FadeInUp delay={40}>
          <View style={styles.kickerRow}>
            <Text style={styles.kicker}>IMPORT & EXPORT · BECOME A PARTNER</Text>
            <View style={styles.kickerLine} />
          </View>
        </FadeInUp>

        <View style={[styles.heroTop, narrow && { flexDirection: 'column', gap: 20 }]}>
          <FadeInUp delay={120} style={{ flex: narrow ? undefined : 1.25 }}>
            <Text style={[styles.display, { fontSize: colStack ? 30 : narrow ? 38 : 46, lineHeight: (colStack ? 30 : narrow ? 38 : 46) * 1.06 }]}>
              Partner with <Text style={styles.displayAccent}>RPK</Text>{'\n'}worldwide.
            </Text>
          </FadeInUp>
          <FadeInUp delay={220} style={{ flex: narrow ? undefined : 1, gap: 18 }}>
            <Text style={styles.intro}>
              Trade food & groceries worldwide with <Text style={{ fontWeight: '800', color: P.espresso }}>{BRAND.legal}</Text>. Bulk
              pricing, a dedicated application review, and full logistics support — direct from Dubai.
            </Text>
            <View style={styles.chipRow}>
              <Chip icon="pricetags-outline" label="Bulk pricing" />
              <Chip icon="cube-outline" label="Logistics support" />
              <Chip icon="shield-checkmark-outline" label="Dedicated review" />
            </View>
            <View style={[styles.heroBtns, colStack && { flexDirection: 'column', alignSelf: 'stretch' }]}>
              <Pressable style={styles.btnRed} onPress={openForm}>
                <Text style={styles.btnRedText}>Start registration</Text>
                <Ionicons name="arrow-forward" size={18} color={P.cream} />
              </Pressable>
              <Pressable style={styles.btnWa} onPress={() => Linking.openURL(waUrl)}>
                <Ionicons name="logo-whatsapp" size={19} color={colors.white} />
                <Text style={styles.btnWaText}>Chat on WhatsApp</Text>
              </Pressable>
            </View>
          </FadeInUp>
        </View>

        <Reveal style={{ marginTop: colStack ? 26 : 40 }}>
          <View style={styles.heroMedia}>
            <RotatingVideo sources={HERO_VIDEOS} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={styles.heroMediaShade} />
            <View style={styles.heroMediaContent}>
              <Text style={styles.heroMediaQuote}>“Quality food, traded worldwide — direct from Dubai.”</Text>
              <View style={styles.heroPoints}>
                {['Bulk pricing', 'Logistics support', 'Dedicated review'].map((p) => (
                  <View key={p} style={styles.heroPoint}>
                    <Ionicons name="checkmark-circle" size={16} color={P.gold} />
                    <Text style={styles.heroPointText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Reveal>
      </Container>

      <View style={styles.body} onLayout={(e) => { bodyY.current = e.nativeEvent.layout.y; }}>
        {/* ───────── WHY PARTNER (benefits) ───────── */}
        <View style={styles.benefitsWrap}>
          <Reveal style={styles.benefitsHead}>
            <Text style={styles.blockKicker}>WHY RPK</Text>
            <Text style={styles.blockHeading}>Why partner with RPK</Text>
            <Text style={styles.blockSub}>
              Everything you need to import or export food & groceries at scale — sourced, documented and shipped from Dubai.
            </Text>
          </Reveal>
          <View style={styles.benefits}>
            {BENEFITS.map((b, i) => (
              <BenefitCard key={b.t} b={b} index={i} sizeStyle={colStack ? { width: '100%' } : narrow ? { width: '47%' } : { width: '23%' }} />
            ))}
          </View>
        </View>

        {/* ───────── REGISTER CTA / FORM (revealed on click) ───────── */}
        <View nativeID="register-form" onLayout={(e) => { regY.current = e.nativeEvent.layout.y; }} style={[styles.cardWrap, { scrollMarginTop: 86 } as any]}>
          {!showForm ? (
            <Reveal style={{ width: '100%' }}>
              <Pressable onHoverIn={ctaHover.onHoverIn} onHoverOut={ctaHover.onHoverOut} onPress={openForm} style={{ width: '100%' }}>
                <Animated.View style={[styles.ctaPanel, { transform: [{ scale: ctaHover.scale }] }]}>
                  <Animated.View style={[styles.ctaIcon, { transform: [{ translateY: rocketFloat }] }]}>
                    <Ionicons name="rocket-outline" size={26} color={colors.white} />
                  </Animated.View>
                  <Text style={styles.ctaTitle}>Ready to become a partner?</Text>
                  <Text style={styles.ctaSub}>Complete a short registration form — it takes a couple of minutes and we reply within hours.</Text>
                  <Button label="Start registration" icon="create-outline" onPress={openForm} style={{ marginTop: 6, paddingHorizontal: 26, backgroundColor: colors.white }} textStyle={{ color: colors.red }} />
                  <Text style={styles.ctaFine}>No obligation · Your details stay confidential</Text>
                </Animated.View>
              </Pressable>
            </Reveal>
          ) : (
            <FadeInUp delay={0} scaleFrom={0.98} style={{ width: '100%' }}>
              <View style={[styles.card, { paddingHorizontal: narrow ? 18 : 36 }]}>
                {done ? (
                  <View style={{ alignItems: 'center', gap: 14, paddingVertical: 34 }}>
                    <View style={styles.doneBadge}>
                      <Ionicons name="ribbon" size={42} color={colors.green} />
                    </View>
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
                    <View style={styles.cardHead}>
                      <View style={styles.cardHeadIcon}>
                        <Ionicons name="document-text-outline" size={22} color={colors.orange} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>Registration</Text>
                        <Text style={styles.cardSub}>Tell us about your business — we reply within hours.</Text>
                      </View>
                      <Pressable style={styles.closeBtn} onPress={() => setShowForm(false)} accessibilityLabel="Close form">
                        <Ionicons name="close" size={20} color={colors.muted} />
                      </Pressable>
                    </View>

                    <View style={{ gap: 16 }}>
                      <UField label="COMPANY NAME *" icon="business-outline" value={form.company_name} onChangeText={set('company_name')} placeholder="Your company L.L.C" error={errors.company_name} />

                      <View style={{ gap: 8 }}>
                        <Text style={styles.uLabel}>BUSINESS TYPE *</Text>
                        <View style={[styles.typeRow, colStack && { flexDirection: 'column' }]}>
                          {TYPES.map((t) => {
                            const on = form.business_type === t.key;
                            return (
                              <Pressable key={t.key} style={[styles.type, on && styles.typeActive]} onPress={() => setForm({ ...form, business_type: t.key })}>
                                <Ionicons name={t.icon as any} size={18} color={on ? colors.orange : colors.muted} />
                                <Text style={[styles.typeLabel, on && { color: colors.orangeDark }]}>{t.label}</Text>
                                <Text style={styles.typeDesc}>{t.desc}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>

                      <SectionLabel text="CONTACT" />

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

                      <SectionLabel text="DOCUMENTS" />

                      <View style={{ gap: 10 }}>
                        <Text style={styles.uHint}>Upload a PDF or image — optional but speeds up your review.</Text>
                        <DocUpload label="Trade License" url={docs.trade_license_url} busy={uploadingDoc === 'trade_license_url'} onPick={() => pickDoc('trade_license_url')} />
                        <DocUpload label="VAT / Tax Certificate" url={docs.vat_certificate_url} busy={uploadingDoc === 'vat_certificate_url'} onPick={() => pickDoc('vat_certificate_url')} />
                        <DocUpload label="Company Profile" url={docs.company_profile_url} busy={uploadingDoc === 'company_profile_url'} onPick={() => pickDoc('company_profile_url')} />
                      </View>

                      <SectionLabel text="REQUIREMENTS" />

                      <RequirementBuilder items={items} onChange={setItems} />

                      <View style={[styles.grid, colStack && { flexDirection: 'column' }]}>
                        <UField label="OTHER PRODUCTS / NOTES" icon="pricetag-outline" value={form.product_interest} onChangeText={(t) => setForm({ ...form, product_interest: t })} placeholder="Anything not listed above…" />
                        <UField label="MESSAGE" icon="chatbox-ellipses-outline" value={form.message} onChangeText={(t) => setForm({ ...form, message: t })} placeholder="Tell us about your business…" multiline />
                      </View>

                      {!!error && (
                        <View style={styles.errBanner}>
                          <Ionicons name="alert-circle" size={16} color={colors.red} />
                          <Text style={styles.errBannerText}>{error}</Text>
                        </View>
                      )}

                      <View style={[styles.submitRow, colStack && { flexDirection: 'column' }]}>
                        <Button label={busy ? 'Submitting…' : 'Submit registration'} onPress={submit} disabled={busy} style={{ flex: colStack ? undefined : 1 }} />
                        <Pressable style={[styles.waBtn, colStack && { width: '100%' }]} onPress={() => Linking.openURL(waUrl)}>
                          <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
                          <Text style={styles.waBtnText}>WhatsApp</Text>
                        </Pressable>
                      </View>

                      <Text style={styles.privacy}>
                        <Ionicons name="lock-closed" size={11} color={colors.muted} />  Your details are kept confidential and used only to process your application.
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </FadeInUp>
          )}
        </View>
      </View>

      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /* HERO — editorial (cream), matches the About page */
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kicker: { color: P.red, fontWeight: '800', fontSize: 12, letterSpacing: 2 },
  kickerLine: { height: 1.5, width: 56, backgroundColor: P.red, opacity: 0.6 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 40, marginTop: 24 },
  display: { color: P.espresso, fontWeight: '900', letterSpacing: -0.5 },
  displayAccent: { color: P.red, fontWeight: '900' },
  intro: { color: P.muted, fontSize: 16, lineHeight: 26 },
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: P.gold, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { color: P.espresso, fontWeight: '700', fontSize: 13.5 },
  heroBtns: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  btnRed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: P.red, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  btnRedText: { color: P.cream, fontWeight: '800', fontSize: 15 },
  btnWa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#25D366', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 999 },
  btnWaText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  heroMedia: { width: '100%', aspectRatio: 16 / 9, borderRadius: 32, overflow: 'hidden', backgroundColor: P.band },
  heroMediaShade: { ...StyleSheet.absoluteFillObject, ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, rgba(20,15,11,0) 30%, rgba(20,15,11,0.82) 100%)' } as any) : { backgroundColor: 'rgba(20,15,11,0.45)' }) },
  heroMediaContent: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 28, gap: 14 },
  heroMediaQuote: { color: '#FFFFFF', fontWeight: '800', fontSize: 20, maxWidth: 600 },
  heroPoints: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  heroPoint: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroPointText: { color: '#F2ECE9', fontWeight: '700', fontSize: 13 },

  /* BODY (sits fully below the hero on the cream band — no overlap) */
  body: { paddingHorizontal: 18, alignItems: 'center', marginTop: 36, zIndex: 5, paddingBottom: 56 },

  /* BENEFITS (clean cards on cream — matches the About page) */
  benefitsWrap: { width: '100%', maxWidth: 1100, marginTop: 24, marginBottom: 30, alignItems: 'center' },
  benefitsHead: { width: '100%', alignItems: 'center' },
  blockKicker: { color: P.red, fontWeight: '800', fontSize: 12, letterSpacing: 2, marginBottom: 8, textAlign: 'center' },
  blockHeading: { fontWeight: '900', fontSize: 28, color: P.espresso, letterSpacing: -0.4, textAlign: 'center' },
  blockSub: { color: P.muted, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 600, marginTop: 10, marginBottom: 26 },
  benefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'center', width: '100%' },
  benefit: { width: '100%', backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 22, minHeight: 178, ...shadow.card },
  benefitIcon: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(193,154,75,0.12)', borderWidth: 1, borderColor: 'rgba(193,154,75,0.5)', marginBottom: 14 },
  benefitTitle: { fontWeight: '800', color: P.espresso, fontSize: 15.5, marginBottom: 7, letterSpacing: -0.2 },
  benefitDesc: { color: P.muted, fontSize: 13, lineHeight: 19 },

  /* REGISTER CTA (dark espresso band — echoes the About Mission/Vision band) */
  cardWrap: { width: '100%', maxWidth: 880, alignItems: 'center' },
  ctaPanel: { width: '100%', alignItems: 'center', backgroundColor: P.espresso, borderRadius: 24, paddingHorizontal: 28, paddingVertical: 44, gap: 12, ...shadow.card },
  ctaIcon: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(193,154,75,0.14)', borderWidth: 1, borderColor: 'rgba(193,154,75,0.5)', marginBottom: 4 },
  ctaTitle: { fontWeight: '900', fontSize: 26, color: colors.white, letterSpacing: -0.3, textAlign: 'center' },
  ctaSub: { color: '#D6D3D1', fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 480 },
  ctaFine: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },

  /* FORM CARD */
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 4,
    borderTopColor: P.red,
    paddingVertical: 28,
    ...shadow.card,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 },
  cardHeadIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.redSoft },
  cardTitle: { fontWeight: '900', fontSize: 22, color: colors.ink, letterSpacing: -0.3 },
  cardSub: { color: colors.muted, fontSize: 13, marginTop: 3, lineHeight: 18 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.offWhite },
  grid: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },

  uLabel: { color: colors.ink, fontWeight: '800', fontSize: 11.5, letterSpacing: 0.6, marginBottom: 7 },
  uHint: { color: colors.muted, fontSize: 12.5, lineHeight: 17 },
  uBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 48 },
  uBoxFocus: { backgroundColor: '#FFFAF8' },
  uInput: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 12, outlineStyle: 'none' as any },
  uErr: { color: colors.red, fontSize: 12, marginTop: 5, fontWeight: '600' },

  section: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  sectionText: { color: colors.muted, fontWeight: '800', fontSize: 11, letterSpacing: 1.1 },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.line },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.offWhite },
  docRowDone: { borderColor: 'rgba(30,158,98,0.5)', backgroundColor: 'rgba(30,158,98,0.06)' },
  docIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.redSoft },
  docLabel: { flex: 1, fontWeight: '700', color: colors.ink, fontSize: 13.5 },
  docAction: { fontWeight: '800', color: colors.orange, fontSize: 12.5, letterSpacing: 0.3 },

  typeRow: { flexDirection: 'row', gap: 10 },
  type: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: colors.offWhite, gap: 3 },
  typeActive: { borderColor: colors.orange, backgroundColor: colors.redSoft },
  typeLabel: { fontWeight: '800', color: colors.ink, fontSize: 14, marginTop: 3 },
  typeDesc: { color: colors.muted, fontSize: 11, lineHeight: 14 },

  submitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  waBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#25D366', paddingHorizontal: 20, paddingVertical: 14, borderRadius: radius.pill },
  waBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  privacy: { color: colors.muted, fontSize: 11.5, textAlign: 'center', lineHeight: 17, marginTop: 2 },

  errBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.redSoft, borderWidth: 1, borderColor: 'rgba(217,36,25,0.25)', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  errBannerText: { color: colors.redDeep, fontSize: 13, fontWeight: '600', flex: 1 },

  doneBadge: { width: 76, height: 76, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30,158,98,0.12)' },
  success: { color: colors.text, textAlign: 'center', maxWidth: 440, lineHeight: 22, fontSize: 14.5 },
});
