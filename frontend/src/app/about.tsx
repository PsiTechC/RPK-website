import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BRAND } from '../lib/theme';
import { Footer } from '../components/Footer';
import { Container } from '../components/ui';
import { Reveal, FadeInUp, CountUp, Float, Tilt, Marquee } from '../components/Motion';

type Ion = keyof typeof Ionicons.glyphMap;

// ── Editorial palette (used exactly as specced for this page) ──────────────────
const P = {
  cream: '#F6F1E9',
  espresso: '#1E1813',
  red: '#E11D2A',
  gold: '#C19A4B',
  muted: '#57534E', // stone-600
  band: '#EFE7D9',
};

// Each headline stat gets its own brand colour rather than a flat block of red.
const STAT_COLORS = ['#E11D2A', '#1E1813', '#C19A4B', '#E11D2A'];

// Unsplash placeholders — swap for real RPK photography.
const IMG = (id: string, w = 1100) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;
// TODO: replace image — wide hero (warm food spread)
const HERO_IMG = IMG('1504674900247-0877df9cc836', 1600);
// TODO: replace image — story collage (Dubai warehouse / sacks of grain)
const STORY_IMG_A = IMG('1601000938259-9e92002320b2', 800);
// TODO: replace image — story collage (spices / market)
const STORY_IMG_B = IMG('1596040033229-a9821ebd058d', 800);

const STATS = [
  { num: '100+', label: 'Grocery products' },
  { num: '500+', label: 'Business clients' },
  { num: '15+', label: 'Countries served' },
  { num: '10+', label: 'Years of trust' },
];

// Floating grocery tags that overhang the hero image (web parallax + perpetual bob).
const FLOATERS = [
  { emoji: '🌶️', label: 'Spices', pos: 'fchipTL' as const, dist: 12, dur: 3000, delay: 0 },
  { emoji: '🍚', label: 'Basmati', pos: 'fchipTR' as const, dist: 10, dur: 3600, delay: 300 },
  { emoji: '🥜', label: 'Dry Fruits', pos: 'fchipBL' as const, dist: 9, dur: 3300, delay: 600 },
  { emoji: '🫒', label: 'Oils & Ghee', pos: 'fchipBR' as const, dist: 12, dur: 3200, delay: 150 },
];

// Grocery ticker items for the scrolling band.
const MARQUEE = [
  { e: '🍚', t: 'Rice & Grains' }, { e: '🌶️', t: 'Spices & Masala' }, { e: '🫘', t: 'Pulses & Lentils' },
  { e: '🥜', t: 'Dry Fruits & Nuts' }, { e: '🫒', t: 'Cooking Oils & Ghee' }, { e: '🍯', t: 'Sweeteners & Honey' },
  { e: '🌾', t: 'Flour & Atta' }, { e: '🧂', t: 'Salt' }, { e: '🥤', t: 'Beverages' }, { e: '🥫', t: 'Sauces & Condiments' },
];

const STEPS = [
  { n: '01', title: 'Sourced with care', desc: 'We partner directly with trusted growers and mills for consistent, honest quality.' },
  { n: '02', title: 'Checked for quality', desc: 'Every consignment is inspected and graded before it leaves our Dubai warehouse.' },
  { n: '03', title: 'Traded worldwide', desc: 'Wholesale and retail supply, shipped reliably to markets across the globe.' },
];

export default function About() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const narrow = width < 860;
  const tight = width < 600;

  const display = tight ? 28 : width < 980 ? 38 : 46;

  return (
    <ScrollView style={{ backgroundColor: P.cream }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* ───────── 1 · HERO ───────── */}
      <Container max={1180} style={{ paddingTop: tight ? 40 : 72 }}>
        <FadeInUp delay={40}>
          <View style={styles.kickerRow}>
            <Text style={styles.kicker}>DUBAI · WORLDWIDE FOOD TRADE</Text>
            <View style={styles.kickerLine} />
          </View>
        </FadeInUp>

        <View style={[styles.heroTop, narrow && { flexDirection: 'column', gap: 22 }]}>
          {/* LEFT — display headline */}
          <FadeInUp delay={120} style={{ flex: narrow ? undefined : 1.25 }}>
            <Text style={[styles.display, { fontSize: display, lineHeight: display * 1.04 }]}>
              We trade{'\n'}
              <Text style={styles.displayItalic}>good food</Text>{'\n'}
              worldwide.
            </Text>
          </FadeInUp>

          {/* RIGHT — intro + chips */}
          <FadeInUp delay={220} style={{ flex: narrow ? undefined : 1, gap: 18 }}>
            <Text style={styles.intro}>
              <Text style={{ fontWeight: '800', color: P.espresso }}>{BRAND.legal}</Text> is a Dubai-based
              importer and exporter of premium groceries — from aromatic basmati and spices to oils, pulses
              and beverages — supplying wholesale and retail markets with quality you can rely on.
            </Text>
            <View style={styles.chipRow}>
              <Chip icon="location-outline" label="Al Mankhool, Dubai" />
              <Chip icon="globe-outline" label="15+ countries" />
            </View>
          </FadeInUp>
        </View>

        {/* Full-width hero image — 3D tilt on hover, with floating grocery tags */}
        <Reveal style={{ marginTop: tight ? 28 : 56 }}>
          <View style={styles.heroStage}>
            <Tilt max={7} style={{ width: '100%' }}>
              <View style={[styles.heroImgWrap, { height: tight ? 280 : width < 980 ? 380 : 460 }]}>
                <Image source={{ uri: HERO_IMG }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
                <View style={styles.heroImgShade} />
                <View style={styles.heroImgContent}>
                  <Text style={[styles.heroQuote, { fontSize: tight ? 18 : 22 }]}>
                    “Quality food, traded worldwide from Dubai.”
                  </Text>
                  <View style={styles.ratingRow}>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Ionicons key={i} name="star" size={18} color={P.gold} />
                      ))}
                    </View>
                    <Text style={styles.ratingNum}>4.8</Text>
                  </View>
                </View>
              </View>
            </Tilt>

            {!narrow && FLOATERS.map((f) => (
              <Float key={f.label} style={[styles.fchip, styles[f.pos]]} distance={f.dist} duration={f.dur} delay={f.delay}>
                <GChip emoji={f.emoji} label={f.label} />
              </Float>
            ))}
          </View>
        </Reveal>
      </Container>

      {/* ───────── GROCERY TICKER ───────── */}
      <View style={styles.marqueeBand}>
        <Marquee gap={26} pxPerSec={48}>
          {MARQUEE.map((m, i) => (
            <View key={i} style={styles.mqItem}>
              <Text style={styles.mqEmoji}>{m.e}</Text>
              <Text style={styles.mqText}>{m.t}</Text>
              <Text style={styles.mqDot}>✦</Text>
            </View>
          ))}
        </Marquee>
      </View>

      {/* ───────── 2 · EDITORIAL STATS ───────── */}
      <Container max={1180} style={{ paddingVertical: tight ? 44 : 72 }}>
        <Reveal>
          <View style={[styles.statsRow, narrow && { flexWrap: 'wrap' }]}>
            {STATS.map((s, i) => (
              <View
                key={s.label}
                style={[
                  styles.statItem,
                  narrow ? { flexGrow: 0, flexBasis: '50%', paddingVertical: 16 } : i > 0 && styles.statDivider,
                ]}
              >
                <CountUp value={s.num} duration={1800} style={[styles.statNum, { fontSize: tight ? 32 : 40, color: STAT_COLORS[i % STAT_COLORS.length] }] as any} />
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Reveal>
      </Container>

      {/* ───────── 3 · OUR STORY ───────── */}
      <Container max={1180} style={{ paddingBottom: tight ? 48 : 88 }}>
        <View style={[styles.storyRow, narrow && { flexDirection: 'column', gap: 40 }]}>
          {/* LEFT — tilted collage with 3D parallax + floating badge */}
          <Reveal style={{ flex: narrow ? undefined : 1 }}>
            <Tilt max={8}>
              <View style={[styles.collage, { height: tight ? 360 : 460 }]}>
                {/* TODO: replace image */}
                <Image source={{ uri: STORY_IMG_A }} style={[styles.collageImg, styles.collageA]} contentFit="cover" transition={300} />
                {/* TODO: replace image */}
                <Image source={{ uri: STORY_IMG_B }} style={[styles.collageImg, styles.collageB]} contentFit="cover" transition={300} />
                <Float style={styles.badge} distance={8} duration={2800}>
                  <Ionicons name="sparkles" size={20} color={P.cream} />
                  <Text style={styles.badgeText}>SINCE{'\n'}DAY ONE</Text>
                </Float>
              </View>
            </Tilt>
          </Reveal>

          {/* RIGHT — story steps */}
          <Reveal style={{ flex: narrow ? undefined : 1, gap: 18 }}>
            <Text style={styles.sectionKicker}>OUR STORY</Text>
            <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 30, lineHeight: (tight ? 24 : 30) * 1.12 }]}>
              From a Dubai warehouse to <Text style={styles.displayItalic}>markets worldwide</Text>
            </Text>
            <View style={{ gap: 14, marginTop: 6 }}>
              {STEPS.map((s) => (
                <View key={s.n} style={styles.step}>
                  <Text style={styles.stepNum}>{s.n}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>{s.title}</Text>
                    <Text style={styles.stepDesc}>{s.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Reveal>
        </View>
      </Container>

      {/* ───────── 4 · MISSION & VISION (dark band) ───────── */}
      <View style={styles.darkBand}>
        <Container max={1180} style={{ paddingVertical: tight ? 48 : 80 }}>
          <View style={[styles.mvRow, narrow && { flexDirection: 'column', gap: 36 }]}>
            <MV
              icon="leaf-outline"
              title="Our Mission"
              body="To make quality food accessible — sourcing dependable groceries and delivering them with fairness, consistency and care, from Dubai to every market we serve."
            />
            <View style={narrow ? styles.mvDividerH : styles.mvDividerV} />
            <MV
              icon="boat-outline"
              title="Our Vision"
              body="To be the most trusted food trading house bridging producers and markets worldwide — known for integrity, reliability and the quality behind every shipment."
            />
          </View>
        </Container>
      </View>

      {/* ───────── 5 · CTA ───────── */}
      <Container max={900} style={{ paddingVertical: tight ? 56 : 96, alignItems: 'center' }}>
        <Reveal style={{ alignItems: 'center' }}>
          <Text style={[styles.ctaHead, { fontSize: tight ? 26 : 34, lineHeight: (tight ? 26 : 34) * 1.1 }]}>
            Let’s grow your business <Text style={styles.displayItalic}>together</Text>
          </Text>
          <Text style={styles.ctaSub}>
            Request a quote, explore the catalogue, or talk to our team about import & export.
          </Text>
          <View style={[styles.ctaBtns, tight && { flexDirection: 'column', alignSelf: 'stretch' }]}>
            <Pressable
              style={({ hovered }: any) => [styles.btnRed, hovered && { opacity: 0.92 }]}
              onPress={() => router.push('/contact')}
            >
              <Text style={styles.btnRedText}>Request a Quote</Text>
              <Ionicons name="arrow-forward" size={18} color={P.cream} />
            </Pressable>
            <Pressable
              style={({ hovered }: any) => [styles.btnOutline, hovered && { borderColor: P.espresso }]}
              onPress={() => Linking.openURL(`tel:${BRAND.phone.replace(/\s/g, '')}`)}
            >
              <Ionicons name="call-outline" size={17} color={P.espresso} />
              <Text style={styles.btnOutlineText}>+971 58 307 2132</Text>
            </Pressable>
          </View>
        </Reveal>
      </Container>

      <Footer />
    </ScrollView>
  );
}

// ── pieces ─────────────────────────────────────────────────────────────────────
function Chip({ icon, label }: { icon: Ion; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={15} color={P.gold} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function GChip({ emoji, label }: { emoji: string; label: string }) {
  return (
    <View style={styles.gchip}>
      <Text style={styles.gchipEmoji}>{emoji}</Text>
      <Text style={styles.gchipLabel}>{label}</Text>
    </View>
  );
}

function MV({ icon, title, body }: { icon: Ion; title: string; body: string }) {
  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={styles.mvIcon}>
        <Ionicons name={icon} size={24} color={P.gold} />
      </View>
      <Text style={styles.mvTitle}>{title}</Text>
      <Text style={styles.mvBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /* HERO */
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kicker: { color: P.red, fontWeight: '800', fontSize: 12, letterSpacing: 2 },
  kickerLine: { height: 1.5, width: 56, backgroundColor: P.red, opacity: 0.6 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 40, marginTop: 26 },
  display: { color: P.espresso, fontWeight: '900', letterSpacing: -0.5 },
  displayItalic: { color: P.red, fontWeight: '900' },
  intro: { color: P.muted, fontSize: 16, lineHeight: 26 },
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: P.gold, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { color: P.espresso, fontWeight: '700', fontSize: 13.5 },

  heroStage: { position: 'relative', width: '100%' },
  heroImgWrap: { width: '100%', borderRadius: 32, overflow: 'hidden', backgroundColor: P.band },

  /* floating grocery tags */
  fchip: { position: 'absolute', zIndex: 6 },
  fchipTL: { top: -22, left: -16 },
  fchipTR: { top: -18, right: -10 },
  fchipBL: { bottom: 30, left: -22 },
  fchipBR: { bottom: -20, right: 24 },
  gchip: {
    flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#FFFFFF',
    paddingLeft: 10, paddingRight: 16, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: '#EFE3CF',
    shadowColor: '#1E1813', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 7,
  },
  gchipEmoji: { fontSize: 20 },
  gchipLabel: { color: P.espresso, fontWeight: '800', fontSize: 13.5 },

  /* grocery ticker */
  marqueeBand: { backgroundColor: P.espresso, paddingVertical: 16 },
  mqItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mqEmoji: { fontSize: 18 },
  mqText: { color: '#F6F1E9', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  mqDot: { color: P.gold, fontSize: 13, marginLeft: 2 },
  heroImgShade: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(180deg, rgba(20,15,11,0) 35%, rgba(20,15,11,0.82) 100%)' } as any)
      : { backgroundColor: 'rgba(20,15,11,0.42)' }),
  },
  heroImgContent: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 28, gap: 14 },
  heroQuote: { color: '#FFFFFF', fontWeight: '800', maxWidth: 560 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingNum: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  /* STATS */
  statsRow: { flexDirection: 'row', alignItems: 'stretch' },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 6 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: P.gold },
  statNum: { color: P.red, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { color: P.muted, fontSize: 13.5, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },

  /* STORY */
  storyRow: { flexDirection: 'row', alignItems: 'center', gap: 56 },
  collage: { position: 'relative', width: '100%' },
  collageImg: { position: 'absolute', width: '74%', height: '78%', borderRadius: 20, borderWidth: 6, borderColor: P.cream, ...{ shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 6 } },
  collageA: { top: 0, left: 0, transform: [{ rotate: '-4deg' }] },
  collageB: { bottom: 0, right: 0, transform: [{ rotate: '4deg' }] },
  badge: {
    position: 'absolute', top: '50%', left: '50%', width: 104, height: 104, borderRadius: 999,
    marginLeft: -52, marginTop: -52, backgroundColor: P.red, alignItems: 'center', justifyContent: 'center', gap: 4, zIndex: 5,
    borderWidth: 4, borderColor: P.cream,
    ...{ shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  },
  badgeText: { color: P.cream, fontWeight: '900', fontSize: 11, letterSpacing: 1, textAlign: 'center', lineHeight: 14 },

  sectionKicker: { color: P.red, fontWeight: '800', fontSize: 12, letterSpacing: 2 },
  sectionHead: { color: P.espresso, fontWeight: '900', letterSpacing: -0.3 },
  step: { flexDirection: 'row', gap: 16, borderLeftWidth: 2, borderLeftColor: P.gold, paddingLeft: 16, paddingVertical: 4 },
  stepNum: { color: P.gold, fontWeight: '900', fontSize: 22, width: 40 },
  stepTitle: { color: P.espresso, fontWeight: '800', fontSize: 16 },
  stepDesc: { color: P.muted, fontSize: 14, lineHeight: 21, marginTop: 3 },

  /* MISSION & VISION */
  darkBand: { backgroundColor: P.espresso },
  mvRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 56 },
  mvDividerV: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.12)' },
  mvDividerH: { height: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.12)' },
  mvIcon: { width: 54, height: 54, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(193,154,75,0.5)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(193,154,75,0.08)' },
  mvTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 22 },
  mvBody: { color: '#D6D3D1', fontSize: 15, lineHeight: 24 }, // stone-300

  /* CTA */
  ctaHead: { color: P.espresso, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },
  ctaSub: { color: P.muted, fontSize: 16, lineHeight: 25, textAlign: 'center', maxWidth: 540, marginTop: 16 },
  ctaBtns: { flexDirection: 'row', gap: 14, marginTop: 30 },
  btnRed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: P.red, paddingHorizontal: 26, paddingVertical: 15, borderRadius: 999 },
  btnRedText: { color: P.cream, fontWeight: '800', fontSize: 15 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1.5, borderColor: P.gold, paddingHorizontal: 26, paddingVertical: 15, borderRadius: 999 },
  btnOutlineText: { color: P.espresso, fontWeight: '800', fontSize: 15 },
});
