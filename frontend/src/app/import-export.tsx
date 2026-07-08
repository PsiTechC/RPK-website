import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable, Linking, TextInput, Platform, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { Image } from 'expo-image';
import { colors, radius, shadow, BRAND } from '../lib/theme';
import { useApp } from '../lib/store';
import { Footer } from '../components/Footer';
import { Button, Badge } from '../components/ui';
import { FadeInUp, Reveal, useHoverScale } from '../components/Motion';
import { PhoneField } from '../components/PhoneField';
import { RequirementBuilder, ReqItem } from '../components/RequirementBuilder';
import { useLocalSearchParams } from 'expo-router';
import { parsePhone, Country } from '../lib/countries';
import { vEmail, vName, vPhoneLen, vRequired, isClean, sanitizeName } from '../lib/validate';


// Hero background — uploaded import/export artwork.
const IE_HOME_IMG = require('../../assets/images/importexporthome.png');

// Hero headline split into a white line + a tomato-red accent line (for the typewriter).
const HEAD_SEGMENTS = [
  { text: 'Global grocery trade,\n' },
  { text: 'from Dubai.', accent: true },
];

// Editorial palette — shared with the About page so the two read as one family.
const P = {
  cream: '#F6F1E9',
  espresso: '#1E1813',
  red: '#E11D2A',
  gold: '#C19A4B',
  muted: '#57534E',
  band: '#EFE7D9',
};


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

const HOW_STEPS = [
  { n: '01', t: 'Register', d: 'Fill out the short partner form with your business details and trade requirements — it takes under 3 minutes.', icon: 'create-outline' as const },
  { n: '02', t: 'Review', d: 'Our team reviews your application and connects you with the right suppliers or buyers within 24 hours.', icon: 'search-outline' as const },
  { n: '03', t: 'Connect', d: 'We introduce you to vetted partners, help negotiate terms, and align on pricing and logistics scope.', icon: 'people-circle-outline' as const },
  { n: '04', t: 'Ship', d: 'We manage all trade documentation, customs compliance, and end-to-end freight from our Dubai hub.', icon: 'boat-outline' as const },
] as const;

const FAQS = [
  { q: 'What documents do I need to start?', a: 'A trade license and company profile are helpful but not mandatory to register. You can upload documents after initial sign-up — they just speed up the review.' },
  { q: 'What is the minimum order quantity?', a: 'We work with businesses of all sizes. Minimums vary by category — typically 1 pallet (≈ 500 kg) for most lines, with full container rates for bulk orders.' },
  { q: 'Which countries do you ship to?', a: 'We serve 40+ countries across the GCC, South & Southeast Asia, East Africa, Europe and the Americas. Our Dubai hub gives direct access to major sea and air freight corridors.' },
  { q: 'How fast will I get a quote?', a: 'We aim to respond within 24 hours on business days. Complex multi-SKU RFQs may take up to 48 hours to price accurately.' },
  { q: 'Do you handle customs and documentation?', a: 'Yes — our team prepares all trade documents including certificates of origin, halal certificates, phytosanitary certificates and customs declarations.' },
  { q: 'Can I export my products through RPK?', a: "Absolutely. If you produce food or grocery goods, we can connect you with RPK's buyer network across the GCC and beyond. Select \"Export\" or \"Both\" in the registration form." },
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


// Premium gold "podium" card — metallic gradient, glowing icon, subtle top shine.
// Staggered vertically on wide screens to echo the render's raised-plinth layout.
function LuxCard({ b, index, narrow, colStack }: { b: (typeof BENEFITS)[number]; index: number; narrow: boolean; colStack: boolean }) {
  const hov = useHoverScale(1.035);
  const width = colStack ? '100%' : '47%';
  // Raise the 2nd & 4th cards for the staggered plinth effect (wide screens only).
  const raise = !narrow && index % 2 === 1 ? 34 : 0;
  return (
    <SlideReveal from="right" delay={index * 90} style={{ width, marginTop: raise }}>
      <Pressable onHoverIn={hov.onHoverIn} onHoverOut={hov.onHoverOut} style={{ width: '100%' }}>
        <Animated.View style={[styles.luxCard, { transform: [{ scale: hov.scale }] }]}>
          <View style={styles.luxIcon}>
            <Ionicons name={b.icon as any} size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.luxTitle}>{b.t}</Text>
          <Text style={styles.luxDesc}>{b.d}</Text>
        </Animated.View>
      </Pressable>
    </SlideReveal>
  );
}

// Continuous typewriter — types the headline letter by letter, holds, deletes, repeats.
// Keeps per-segment colours (white line + tomato-red accent) and a blinking cursor.
function Typewriter({ segments, textStyle, accentStyle, sizeStyle, speed = 62, hold = 1600 }: {
  segments: { text: string; accent?: boolean }[];
  textStyle: any; accentStyle: any; sizeStyle: any; speed?: number; hold?: number;
}) {
  const full = segments.reduce((n, s) => n + s.text.length, 0);
  const [count, setCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let t: any;
    if (!deleting) {
      if (count < full) t = setTimeout(() => setCount((c) => c + 1), speed);
      else t = setTimeout(() => setDeleting(true), hold);
    } else {
      if (count > 0) t = setTimeout(() => setCount((c) => c - 1), speed * 0.45);
      else t = setTimeout(() => setDeleting(false), 450);
    }
    return () => clearTimeout(t);
  }, [count, deleting, full, speed, hold]);

  let rem = count;
  const pieces = segments.map((s, i) => {
    const shown = Math.max(0, Math.min(s.text.length, rem));
    rem -= s.text.length;
    return <Text key={i} style={s.accent ? accentStyle : undefined}>{s.text.slice(0, shown)}</Text>;
  });

  return (
    <Text style={[textStyle, sizeStyle]}>
      {pieces}
    </Text>
  );
}

// "How it works" step card — premium red-gradient card matching the Why-RPK LuxCards.
// Equal heights (fills the stretched row), fades in, lifts + glows on hover.
function HowCard({ s, index, narrow, colStack }: { s: (typeof HOW_STEPS)[number]; index: number; narrow: boolean; colStack: boolean }) {
  const [hovered, setHovered] = useState(false);
  const hov = useHoverScale(1.05);
  return (
    <FadeInUp delay={index * 90} style={colStack ? { width: '100%' } : narrow ? { width: '47%' } : { flex: 1, minWidth: 210 }}>
      <Pressable
        onHoverIn={() => { setHovered(true); hov.onHoverIn(); }}
        onHoverOut={() => { setHovered(false); hov.onHoverOut(); }}
        style={{ width: '100%', height: '100%' }}
      >
        <Animated.View style={[styles.howCard, hovered && styles.howCardHover, { transform: [{ scale: hov.scale }] }]}>
          <View style={[styles.howIcon, hovered && styles.howIconHover]}>
            <Ionicons name={s.icon as any} size={22} color={hovered ? '#FFFFFF' : P.red} />
          </View>
          <Text style={[styles.howTitle, hovered && { color: '#FFFFFF' }]}>{s.t}</Text>
          <Text style={[styles.howDesc, hovered && { color: 'rgba(255,255,255,0.85)' }]}>{s.d}</Text>
        </Animated.View>
      </Pressable>
    </FadeInUp>
  );
}

// FAQ accordion row — numbered badge, rotating red chevron, hover lift, fade-in answer.
function FaqItem({ f, index, open, onToggle }: { f: { q: string; a: string }; index: number; open: boolean; onToggle: () => void }) {
  const [hovered, setHovered] = useState(false);
  const rot = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(rot, { toValue: open ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [open]);
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const num = String(index + 1).padStart(2, '0');
  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onToggle}
      style={[styles.faqRow, hovered && !open && styles.faqRowHover, open && styles.faqRowOpen]}
    >
      <View style={styles.faqQ}>
        <View style={[styles.faqNum, open && styles.faqNumOpen]}>
          <Text style={[styles.faqNumTxt, open && { color: '#fff' }]}>{num}</Text>
        </View>
        <Text style={[styles.faqQText, open && { color: P.red }]}>{f.q}</Text>
        <Animated.View style={[styles.faqChev, open && styles.faqChevOpen, { transform: [{ rotate }] }]}>
          <Ionicons name="chevron-down" size={16} color={open ? '#fff' : P.red} />
        </Animated.View>
      </View>
      {open && (
        <FadeInUp duration={340} style={styles.faqAWrap}>
          <Text style={styles.faqA}>{f.a}</Text>
        </FadeInUp>
      )}
    </Pressable>
  );
}

export default function ImportExport() {
  const { width, height } = useWindowDimensions();
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const narrow = width < 760;
  const colStack = width < 620;
  const tight = width < 600;
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
  const benY = useRef(0);

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

  // "How it works" jumps to the "Why partner with RPK" benefits block.
  function scrollToBenefits() {
    const run = () => {
      const y = Math.max(0, bodyY.current + benY.current - 80);
      scrollRef.current?.scrollTo({ y, animated: true });
    };
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(run);
    else run();
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
      {/* ───────── HERO — dark section (fills the viewport) ───────── */}
      <View style={[styles.darkHero, { minHeight: Math.max(560, height), justifyContent: 'flex-start', paddingTop: tight ? 28 : 44 }]}>
        {/* Full-width background artwork */}
        <Image source={IE_HOME_IMG} style={StyleSheet.absoluteFillObject as any} contentFit="cover" />
        {/* Dark overlay for text legibility */}
        <View pointerEvents="none" style={styles.dhOverlay} />

        {/* Warm gold glow behind the heading (the "network of light" feel) */}
        <View pointerEvents="none" style={styles.dhGoldGlow} />

        <FadeInUp delay={0} style={{ ...styles.dhCenter, paddingHorizontal: tight ? 20 : 40 }}>
          {/* Badge pill */}
          <View style={styles.dhPill}>
            <Ionicons name="globe-outline" size={12} color={P.gold} />
            <Text style={styles.dhPillText}>IMPORT & EXPORT · DUBAI FOOD TRADE</Text>
          </View>

          {/* Heading — continuous letter-by-letter typewriter */}
          <View style={{ width: '100%', alignItems: 'center', minHeight: (tight ? 34 : narrow ? 52 : 70) * 1.06 * 2 }}>
            <Typewriter
              segments={HEAD_SEGMENTS}
              textStyle={styles.dhHeading}
              accentStyle={styles.dhAccent}
              sizeStyle={{ fontSize: tight ? 34 : narrow ? 52 : 70, lineHeight: (tight ? 34 : narrow ? 52 : 70) * 1.06 }}
            />
          </View>

          {/* Subtext */}
          <Text style={[styles.dhSub, { fontSize: tight ? 14 : 16, lineHeight: tight ? 22 : 26, width: '100%', maxWidth: 620, marginTop: tight ? 8 : 16 }]}>
            Connect with verified global grocery suppliers for spices, grains, fresh produce, and
            packaged goods — backed by bulk pricing, full trade documentation, and end-to-end
            logistics support from Dubai.
          </Text>
        </FadeInUp>

        {/* CTA buttons */}
        <FadeInUp delay={320} style={{ alignItems: 'center', paddingTop: tight ? 44 : 72, paddingBottom: 8, paddingHorizontal: tight ? 20 : 40 }}>
          <View style={[styles.dhBtns, tight && { flexDirection: 'column', alignSelf: 'stretch', alignItems: 'stretch' }]}>
            <Pressable style={({ hovered }: any) => [styles.dhBtnRed, { paddingHorizontal: 36, paddingVertical: 15 }, hovered && { opacity: 0.88 }]} onPress={openForm}>
              <Text style={[styles.dhBtnRedTxt, { fontSize: 15 }]}>Begin Registration</Text>
              <Ionicons name="arrow-forward" size={17} color="#fff" />
            </Pressable>
            <Pressable style={({ hovered }: any) => [styles.dhBtnGhost, hovered && { borderColor: 'rgba(255,255,255,0.65)' }]} onPress={scrollToBenefits}>
              <Text style={styles.dhBtnGhostTxt}>How it works</Text>
            </Pressable>
          </View>
        </FadeInUp>

        {/* Scroll cue */}
        <View pointerEvents="none" style={styles.dhScrollCue}>
          <Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.55)" />
        </View>
      </View>

      <View style={[styles.body, tight && { paddingHorizontal: 12 }]} onLayout={(e) => { bodyY.current = e.nativeEvent.layout.y; }}>
        {/* ───────── WHY PARTNER — luxury gold layout ───────── */}
        <View style={[styles.whyLux, tight && styles.whyLuxTight]} onLayout={(e) => { benY.current = e.nativeEvent.layout.y; }}>
          {/* warm ambient glows evoking the Dubai-interior render */}
          <View pointerEvents="none" style={styles.whyGlowGold} />
          <View pointerEvents="none" style={styles.whyGlowRed} />

          <View style={[styles.whyInner, narrow && { flexDirection: 'column', gap: 32 }]}>
            {/* Left — heading */}
            <Reveal style={narrow ? { width: '100%' } : { flex: 0.42, paddingRight: 24 }}>
              <View style={styles.kickerRow}>
                <Text style={styles.kicker}>WHY RPK</Text>
                <View style={styles.kickerLine} />
              </View>
              <Text style={[styles.whyHead, { fontSize: tight ? 30 : narrow ? 38 : 46, lineHeight: (tight ? 30 : narrow ? 38 : 46) * 1.08 }]}>
                Why partner with <Text style={styles.displayAccent}>RPK</Text>
              </Text>
              <Text style={styles.whySub}>
                Everything you need to import or export food & groceries at scale — sourced, documented and shipped from Dubai.
              </Text>
              <Pressable style={({ hovered }: any) => [styles.whyCta, hovered && { opacity: 0.9 }]} onPress={openForm}>
                <Text style={styles.whyCtaTxt}>Become a partner</Text>
                <Ionicons name="arrow-forward" size={17} color="#fff" />
              </Pressable>
            </Reveal>

            {/* Right — staggered gold cards */}
            <View style={[styles.whyCards, narrow && { width: '100%' }]}>
              {BENEFITS.map((b, i) => (
                <LuxCard key={b.t} b={b} index={i} narrow={narrow} colStack={colStack} />
              ))}
            </View>
          </View>
        </View>

        {/* ───────── HOW IT WORKS — luxury panel (matches Why RPK) ───────── */}
        <View style={[styles.whyLux, tight && styles.whyLuxTight]}>
          <View pointerEvents="none" style={styles.whyGlowGold} />
          <View pointerEvents="none" style={styles.whyGlowRed} />
          <Reveal style={styles.benefitsHead}>
            <Text style={styles.blockKicker}>THE PROCESS</Text>
            <Text style={styles.blockHeading}>How it works</Text>
            <Text style={styles.blockSub}>From first contact to delivered cargo — four straightforward steps.</Text>
          </Reveal>
          <View style={styles.howSteps}>
            {HOW_STEPS.map((s, i) => (
              <HowCard key={s.n} s={s} index={i} narrow={narrow} colStack={colStack} />
            ))}
          </View>
        </View>

        {/* ───────── REGISTER CTA / FORM (revealed on click) ───────── */}
        <View nativeID="register-form" onLayout={(e) => { regY.current = e.nativeEvent.layout.y; }} style={[styles.cardWrap, { scrollMarginTop: 86 } as any]}>
          {!showForm ? (
            <Reveal style={{ width: '100%' }}>
              <Pressable onHoverIn={ctaHover.onHoverIn} onHoverOut={ctaHover.onHoverOut} onPress={openForm} style={{ width: '100%' }}>
                <Animated.View style={[styles.ctaPanel, { transform: [{ scale: ctaHover.scale }] }]}>
                  {/* Soft brand-light accents for depth */}
                  <View pointerEvents="none" style={styles.ctaBlob1} />
                  <View pointerEvents="none" style={styles.ctaBlob2} />
                  <Animated.View style={[styles.ctaIcon, { transform: [{ translateY: rocketFloat }] }]}>
                    <Ionicons name="rocket" size={26} color={colors.white} />
                  </Animated.View>
                  <Text style={styles.ctaTitle}>Ready to become a partner?</Text>
                  <Text style={styles.ctaSub}>Complete a short registration form — it takes a couple of minutes and we reply within hours.</Text>
                  <Button label="Start registration" icon="create-outline" onPress={openForm} style={{ marginTop: 8, paddingHorizontal: 28, backgroundColor: colors.white, ...(Platform.OS === 'web' ? ({ boxShadow: '0 10px 24px rgba(0,0,0,0.18)' } as any) : null) }} textStyle={{ color: colors.red }} />
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

                      <View style={[styles.grid, colStack && { flexDirection: 'column', alignItems: 'stretch' }]}>
                        <UField label="CONTACT PERSON" icon="person-outline" value={form.contact_person} onChangeText={(t) => set('contact_person')(sanitizeName(t))} placeholder="Full name" error={errors.contact_person} />
                        <UField label="EMAIL *" icon="mail-outline" value={form.email} onChangeText={set('email')} placeholder="you@company.com" keyboardType="email-address" error={errors.email} />
                      </View>

                      <PhoneField label={`Phone * & Country — ${country.name}`} country={country} onCountryChange={selectCountry} number={form.phone} onNumberChange={set('phone')} error={errors.phone} />

                      <View style={[styles.grid, colStack && { flexDirection: 'column', alignItems: 'stretch' }]}>
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

                      <View style={[styles.grid, colStack && { flexDirection: 'column', alignItems: 'stretch' }]}>
                        <UField label="OTHER PRODUCTS / NOTES" icon="pricetag-outline" value={form.product_interest} onChangeText={(t) => setForm({ ...form, product_interest: t })} placeholder="Anything not listed above…" />
                        <UField label="MESSAGE" icon="chatbox-ellipses-outline" value={form.message} onChangeText={(t) => setForm({ ...form, message: t })} placeholder="Tell us about your business…" multiline />
                      </View>

                      {!!error && (
                        <View style={styles.errBanner}>
                          <Ionicons name="alert-circle" size={16} color={colors.red} />
                          <Text style={styles.errBannerText}>{error}</Text>
                        </View>
                      )}

                      <View style={[styles.submitRow, colStack && { flexDirection: 'column', alignItems: 'stretch' }]}>
                        <Button label={busy ? 'Submitting…' : 'Submit registration'} onPress={submit} disabled={busy} style={{ flex: colStack ? undefined : 1, width: colStack ? '100%' : undefined }} />
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

        {/* ───────── FAQ ───────── */}
        <View style={styles.faqWrap}>
          <Reveal style={styles.benefitsHead}>
            <Text style={styles.blockKicker}>COMMON QUESTIONS</Text>
            <Text style={styles.blockHeading}>Frequently asked</Text>
            <Text style={styles.blockSub}>Everything you need to know before registering as an import or export partner.</Text>
          </Reveal>
          <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
            {FAQS.map((f, i) => (
              <FaqItem key={i} f={f} index={i} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
            ))}
          </View>
        </View>
      </View>

      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /* HERO — dark section with spice/grain side imagery & gold accents */
  darkHero: {
    width: '100%', overflow: 'hidden', alignItems: 'center',
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'radial-gradient(120% 90% at 50% 40%, #1C0F0C 0%, #140A09 55%, #0C0605 100%)' } as any)
      : { backgroundColor: '#140A09' }),
  },
  dhOverlay: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web'
      ? { backgroundImage: 'linear-gradient(180deg,rgba(10,6,5,0.68) 0%,rgba(10,6,5,0.58) 50%,rgba(10,6,5,0.44) 100%)' } as any
      : { backgroundColor: 'rgba(10,6,5,0.6)' }),
  },
  // Maroon edge blooms echoing the reference's burgundy corners.
  dhBlob1: { position: 'absolute', width: 620, height: 620, borderRadius: 999, backgroundColor: 'rgba(120,18,14,0.30)', top: -260, left: -180 },
  dhBlob2: { position: 'absolute', width: 520, height: 520, borderRadius: 999, backgroundColor: 'rgba(120,18,14,0.26)', top: -120, right: -180 },
  // Side image panels (spices left / grains right) with an inner fade to dark.
  dhSide: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  dhSideFadeL: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(to right, rgba(20,10,9,0.35) 0%, rgba(20,10,9,0.5) 45%, rgba(20,10,9,1) 100%)' } as any)
      : { backgroundColor: 'rgba(20,10,9,0.55)' }),
  },
  dhSideFadeR: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(to left, rgba(20,10,9,0.35) 0%, rgba(20,10,9,0.5) 45%, rgba(20,10,9,1) 100%)' } as any)
      : { backgroundColor: 'rgba(20,10,9,0.55)' }),
  },
  // Soft red glow behind the headline (keeps the accent reading as clean brand red).
  dhGoldGlow: {
    position: 'absolute', width: 720, height: 420, alignSelf: 'center', top: '22%', borderRadius: 999,
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'radial-gradient(closest-side, rgba(225,29,42,0.16) 0%, rgba(225,29,42,0) 100%)' } as any)
      : { backgroundColor: 'transparent' }),
  },
  dhScrollCue: { position: 'absolute', bottom: 22, alignSelf: 'center', alignItems: 'center' },
  dhCenter: { width: '100%', maxWidth: 860, alignItems: 'center', gap: 20, alignSelf: 'center', zIndex: 2 },
  dhPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(224,164,72,0.35)', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  dhPillText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  dhHeading: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -1, textAlign: 'center' },
  dhAccent: { color: P.red, fontWeight: '900' },
  dhSub: {
    color: 'rgba(255,255,255,0.94)', fontWeight: '600', lineHeight: 26, textAlign: 'center', maxWidth: 580,
    ...(Platform.OS === 'web' ? ({ textShadow: '0 2px 10px rgba(0,0,0,0.55)' } as any) : { textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } }),
  },
  dhStats: { flexDirection: 'row', alignItems: 'center', gap: 28, flexWrap: 'wrap', justifyContent: 'center' },
  dhStat: { alignItems: 'center', gap: 3 },
  dhStatN: { color: '#FFFFFF', fontWeight: '900', fontSize: 22, letterSpacing: -0.5 },
  dhStatL: { color: 'rgba(255,255,255,0.45)', fontWeight: '800', fontSize: 9.5, letterSpacing: 1.2 },
  dhStatDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },
  dhBtns: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' },
  dhBtnRed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: P.red, paddingHorizontal: 26, paddingVertical: 14, borderRadius: 999 },
  dhBtnRedTxt: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  dhBtnGhost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999 },
  dhBtnGhostTxt: { color: 'rgba(255,255,255,0.88)', fontWeight: '800', fontSize: 15 },
  dhSubBrand: { color: 'rgba(255,255,255,0.9)', fontWeight: '800' },

  /* HERO — editorial (cream), matches the About page */
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kicker: { color: P.red, fontWeight: '800', fontSize: 12, letterSpacing: 2 },
  kickerLine: { height: 1.5, width: 56, backgroundColor: P.red, opacity: 0.6 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 40, marginTop: 24 },
  heroSplit: { flexDirection: 'row', alignItems: 'center', gap: 44, marginTop: 26 },
  display: { color: P.espresso, fontWeight: '900', letterSpacing: -0.5 },
  displayAccent: { color: P.red, fontWeight: '900' },
  intro: { color: P.muted, fontSize: 16, lineHeight: 26 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: 'rgba(30,24,19,0.22)', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999, backgroundColor: 'transparent' },
  btnOutlineText: { color: P.espresso, fontWeight: '800', fontSize: 15 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 6, flexWrap: 'wrap' },
  stat: { gap: 3 },
  statNum: { color: P.espresso, fontWeight: '900', fontSize: 27, letterSpacing: -0.5 },
  statLabel: { color: P.muted, fontWeight: '800', fontSize: 10.5, letterSpacing: 1.1 },
  statDiv: { width: 1, height: 36, backgroundColor: 'rgba(30,24,19,0.14)' },
  heroImageWrap: { width: '100%', aspectRatio: 5 / 6, borderRadius: 28, overflow: 'hidden', backgroundColor: P.band },
  heroImgShade: { ...StyleSheet.absoluteFillObject, ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, rgba(20,15,11,0) 52%, rgba(20,15,11,0.6) 100%)' } as any) : { backgroundColor: 'rgba(20,15,11,0.2)' }) },
  featuredCard: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, ...shadow.card },
  featuredIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: P.red },
  featuredKicker: { color: P.red, fontWeight: '800', fontSize: 10, letterSpacing: 1 },
  featuredTitle: { color: P.espresso, fontWeight: '800', fontSize: 14, marginTop: 2 },
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

  /* WHY RPK — luxury gold layout */
  whyLux: {
    width: '100%', maxWidth: 1160, marginTop: 24, marginBottom: 36, borderRadius: 30, overflow: 'hidden',
    paddingHorizontal: 34, paddingVertical: 44, position: 'relative',
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(135deg, #FBF6EC 0%, #F3E8D2 55%, #EADBBB 100%)' } as any)
      : { backgroundColor: '#F3E8D2' }),
    borderWidth: 1, borderColor: 'rgba(193,154,75,0.35)',
    ...shadow.card, shadowColor: '#B8923F', shadowOpacity: 0.18, shadowRadius: 34, shadowOffset: { width: 0, height: 18 },
  },
  // Tighter padding + radius so the panel breathes on phones (avoids the squeezed column).
  whyLuxTight: { paddingHorizontal: 16, paddingVertical: 30, borderRadius: 22 },
  whyGlowGold: { position: 'absolute', width: 460, height: 460, borderRadius: 999, backgroundColor: 'rgba(193,154,75,0.22)', top: -180, right: -120 },
  whyGlowRed: { position: 'absolute', width: 360, height: 360, borderRadius: 999, backgroundColor: 'rgba(225,29,42,0.08)', bottom: -160, left: -100 },
  whyInner: { flexDirection: 'row', alignItems: 'center', gap: 40, width: '100%' },
  whyHead: { color: P.espresso, fontWeight: '900', letterSpacing: -0.6, marginTop: 12 },
  whySub: { color: '#6E6455', fontSize: 15, lineHeight: 24, marginTop: 14, fontStyle: 'italic', maxWidth: 380 },
  whyCta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 9, backgroundColor: P.red, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999, marginTop: 22 },
  whyCtaTxt: { color: '#fff', fontWeight: '800', fontSize: 14.5 },
  whyCards: { flex: 0.58, flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'space-between' },
  luxCard: {
    width: '100%', borderRadius: 20, padding: 20, minHeight: 172, overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(155deg, #D92419 0%, #C11B10 55%, #9E0F08 100%)' } as any)
      : { backgroundColor: '#D92419' }),
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#6E0C07', shadowOpacity: 0.30, shadowRadius: 22, shadowOffset: { width: 0, height: 14 },
  },
  luxIcon: {
    width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
  },
  luxTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: -0.2, marginBottom: 7 },
  luxDesc: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19.5 },
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
  ctaPanel: {
    width: '100%', alignItems: 'center', borderRadius: 28, overflow: 'hidden',
    paddingHorizontal: 28, paddingVertical: 50, gap: 12,
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(135deg, #D92419 0%, #C11B10 50%, #9E0F08 100%)' } as any)
      : { backgroundColor: colors.red }),
    shadowColor: '#6E0C07', shadowOpacity: 0.28, shadowRadius: 32, shadowOffset: { width: 0, height: 16 },
  },
  // Deeper-red light-blooms for depth (no pinkish white overlay).
  ctaBlob1: { position: 'absolute', width: 300, height: 300, borderRadius: 999, backgroundColor: 'rgba(110,12,7,0.30)', top: -100, right: -70 },
  ctaBlob2: { position: 'absolute', width: 240, height: 240, borderRadius: 999, backgroundColor: 'rgba(110,12,7,0.24)', bottom: -90, left: -60 },
  ctaIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)', marginBottom: 4 },
  ctaTitle: { fontWeight: '900', fontSize: 27, color: colors.white, letterSpacing: -0.3, textAlign: 'center' },
  ctaSub: { color: 'rgba(255,255,255,0.92)', fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 480 },
  ctaFine: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },

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

  /* HOW IT WORKS — red-gradient cards (match Why RPK LuxCards) */
  howSteps: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', width: '100%', marginTop: 4 },
  howCard: {
    width: '100%', height: '100%', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 22, gap: 10, minHeight: 200, overflow: 'hidden',
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, ...shadow.card,
    ...(Platform.OS === 'web' ? ({ transition: 'box-shadow 0.3s ease, border-color 0.3s ease' } as any) : null),
  },
  howCardHover: {
    borderColor: 'rgba(255,255,255,0.18)',
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(155deg, #D92419 0%, #C11B10 55%, #9E0F08 100%)', boxShadow: '0 24px 46px rgba(110,12,7,0.42)' } as any)
      : { backgroundColor: '#D92419' }),
  },
  howIcon: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.redSoft, borderWidth: 1, borderColor: 'rgba(217,36,25,0.18)',
    ...(Platform.OS === 'web' ? ({ transition: 'all 0.3s ease' } as any) : null),
  },
  howIconHover: {
    backgroundColor: 'rgba(0,0,0,0.16)', borderColor: 'rgba(255,255,255,0.3)',
  },
  howTitle: { fontWeight: '800', color: P.espresso, fontSize: 16, letterSpacing: -0.2 },
  howDesc: { color: P.muted, fontSize: 13, lineHeight: 19.5 },

  /* FAQ */
  faqWrap: { width: '100%', maxWidth: 800, marginTop: 52, marginBottom: 16, alignItems: 'center' },
  faqRow: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 18, paddingVertical: 17, ...shadow.soft,
    ...(Platform.OS === 'web' ? ({ transition: 'border-color 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease' } as any) : null),
  },
  faqRowHover: {
    borderColor: 'rgba(217,36,25,0.35)',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 26px rgba(217,36,25,0.12)' } as any) : null),
  },
  faqRowOpen: {
    borderColor: 'rgba(217,36,25,0.45)', backgroundColor: '#FFF9F8',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 16px 34px rgba(217,36,25,0.16)' } as any) : null),
  },
  faqQ: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  faqNum: {
    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.redSoft, borderWidth: 1, borderColor: 'rgba(217,36,25,0.16)',
    ...(Platform.OS === 'web' ? ({ transition: 'all 0.25s ease' } as any) : null),
  },
  faqNumOpen: {
    borderColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(150deg, #E11D2A 0%, #B0110A 100%)' } as any)
      : { backgroundColor: P.red }),
  },
  faqNumTxt: { color: P.red, fontWeight: '900', fontSize: 12.5, letterSpacing: 0.3 },
  faqQText: { fontWeight: '800', color: P.espresso, fontSize: 15, flex: 1, letterSpacing: -0.2 },
  faqChev: {
    width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.redSoft,
    ...(Platform.OS === 'web' ? ({ transition: 'background-color 0.25s ease' } as any) : null),
  },
  faqChevOpen: {
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(150deg, #E11D2A 0%, #B0110A 100%)' } as any)
      : { backgroundColor: P.red }),
  },
  faqAWrap: { paddingLeft: 48, paddingRight: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(217,36,25,0.12)' },
  faqA: { color: P.muted, fontSize: 13.5, lineHeight: 22 },
});
