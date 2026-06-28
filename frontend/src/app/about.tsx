import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable, Platform, Linking, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BRAND } from '../lib/theme';
import { Footer } from '../components/Footer';
import { Container } from '../components/ui';
import { Reveal, FadeInUp, CountUp, useHoverScale } from '../components/Motion';

type Ion = keyof typeof Ionicons.glyphMap;

// ── Editorial palette ─────────────────────────────────────────────────────────
const P = {
  cream: '#F6F1E9',
  espresso: '#1E1813',
  red: '#E11D2A',
  gold: '#C19A4B',
  muted: '#57534E',
  band: '#EFE7D9',
};

const STAT_COLORS = ['#E11D2A', '#1E1813', '#C19A4B', '#E11D2A'];

// Real grocery photography (Unsplash) — swap for RPK's own product shots later.
const IMG = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;
const PHOTOS = {
  spread: IMG('1504674900247-0877df9cc836', 1200), // plated food spread
  rice: IMG('1586201375761-83865001e31c'), // basmati rice
  spices: IMG('1596040033229-a9821ebd058d'), // spices
  nuts: IMG('1508061253366-f7da158b6d46'), // dry fruits & nuts
  oils: IMG('1474979266404-7eaacbcd87c5'), // oils
  pulses: IMG('1610725664285-7c57e6eeac3f', 1100), // pulses & lentils
  warehouse: IMG('1601000938259-9e92002320b2', 1000), // sacks / warehouse
};

const STATS = [
  { num: '100+', label: 'Grocery products' },
  { num: '500+', label: 'Business clients' },
  { num: '15+', label: 'Countries served' },
  { num: '10+', label: 'Years of trust' },
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

  // Bento tile heights by breakpoint (left & right columns stay equal height).
  const big = narrow ? 210 : 300;
  const small = narrow ? 132 : 180;

  return (
    <ScrollView style={{ backgroundColor: P.cream }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* ───────── 1 · HERO TEXT ───────── */}
      <Container max={1180} style={{ paddingTop: tight ? 40 : 72 }}>
        <FadeInUp delay={40}>
          <View style={styles.kickerRow}>
            <Text style={styles.kicker}>DUBAI · WORLDWIDE FOOD TRADE</Text>
            <View style={styles.kickerLine} />
          </View>
        </FadeInUp>

        <View style={[styles.heroTop, narrow && { flexDirection: 'column', gap: 22 }]}>
          <FadeInUp delay={120} style={{ flex: narrow ? undefined : 1.25 }}>
            <Text style={[styles.display, { fontSize: display, lineHeight: display * 1.04 }]}>
              We trade{'\n'}
              <Text style={styles.displayItalic}>good food</Text>{'\n'}
              worldwide.
            </Text>
          </FadeInUp>

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
      </Container>

      {/* ───────── 2 · BENTO PHOTO MOSAIC ───────── */}
      <Container max={1180} style={{ paddingTop: tight ? 26 : 40 }}>
        <Reveal>
          <View style={[styles.bento, narrow && { flexDirection: 'column' }]}>
            {/* Left column */}
            <View style={[styles.bentoCol, !narrow && { flex: 1.35 }]}>
              <PhotoTile uri={PHOTOS.spread} style={{ height: big }}>
                <View style={styles.spreadOverlay}>
                  <Text style={[styles.spreadQuote, { fontSize: tight ? 16 : 20 }]}>“Quality food, traded worldwide from Dubai.”</Text>
                  <View style={styles.ratingRow}>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[0, 1, 2, 3, 4].map((i) => <Ionicons key={i} name="star" size={16} color={P.gold} />)}
                    </View>
                    <Text style={styles.ratingNum}>4.8</Text>
                  </View>
                </View>
              </PhotoTile>
              <View style={styles.bentoRow}>
                <PhotoTile uri={PHOTOS.rice} tag="Basmati Rice" style={{ flex: 1, height: small }} />
                <PhotoTile uri={PHOTOS.spices} tag="Spices & Masala" style={{ flex: 1, height: small }} />
              </View>
            </View>

            {/* Right column */}
            <View style={styles.bentoCol}>
              <View style={styles.bentoRow}>
                <PhotoTile uri={PHOTOS.nuts} tag="Dry Fruits" style={{ flex: 1, height: small }} />
                <PhotoTile uri={PHOTOS.oils} tag="Oils & Ghee" style={{ flex: 1, height: small }} />
              </View>
              <PhotoTile uri={PHOTOS.pulses} tag="Pulses & Lentils" style={{ height: big }} />
            </View>
          </View>
        </Reveal>
      </Container>

      {/* ───────── 3 · STATS ───────── */}
      <Container max={1180} style={{ paddingVertical: tight ? 44 : 72 }}>
        <Reveal>
          <View style={[styles.statsRow, narrow && { flexWrap: 'wrap' }]}>
            {STATS.map((s, i) => (
              <View
                key={s.label}
                style={[styles.statItem, narrow ? { flexGrow: 0, flexBasis: '50%', paddingVertical: 16 } : i > 0 && styles.statDivider]}
              >
                <CountUp value={s.num} duration={1800} style={[styles.statNum, { fontSize: tight ? 32 : 40, color: STAT_COLORS[i % STAT_COLORS.length] }] as any} />
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Reveal>
      </Container>

      {/* ───────── 4 · OUR STORY ───────── */}
      <Container max={1180} style={{ paddingBottom: tight ? 48 : 88 }}>
        <View style={[styles.storyRow, narrow && { flexDirection: 'column', gap: 36 }]}>
          {/* LEFT — grocery photo with corner badge */}
          <Reveal style={{ flex: narrow ? undefined : 1 }}>
            <View style={[styles.storyImgWrap, { height: tight ? 320 : 440 }]}>
              <PhotoTile uri={PHOTOS.warehouse} style={StyleSheet.absoluteFill as any} />
              <View style={styles.storyBadge}>
                <Ionicons name="sparkles" size={18} color={P.cream} />
                <Text style={styles.storyBadgeText}>SINCE{'\n'}DAY ONE</Text>
              </View>
            </View>
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

      {/* ───────── 5 · MISSION & VISION ───────── */}
      <View style={styles.darkBand}>
        <Container max={1180} style={{ paddingVertical: tight ? 48 : 80 }}>
          <View style={[styles.mvRow, narrow && { flexDirection: 'column', gap: 36 }]}>
            <MV icon="leaf-outline" title="Our Mission" body="To make quality food accessible — sourcing dependable groceries and delivering them with fairness, consistency and care, from Dubai to every market we serve." />
            <View style={narrow ? styles.mvDividerH : styles.mvDividerV} />
            <MV icon="boat-outline" title="Our Vision" body="To be the most trusted food trading house bridging producers and markets worldwide — known for integrity, reliability and the quality behind every shipment." />
          </View>
        </Container>
      </View>

      {/* ───────── 6 · CTA ───────── */}
      <Container max={900} style={{ paddingVertical: tight ? 56 : 96, alignItems: 'center' }}>
        <Reveal style={{ alignItems: 'center' }}>
          <Text style={[styles.ctaHead, { fontSize: tight ? 26 : 34, lineHeight: (tight ? 26 : 34) * 1.1 }]}>
            Let’s grow your business <Text style={styles.displayItalic}>together</Text>
          </Text>
          <Text style={styles.ctaSub}>Request a quote, explore the catalogue, or talk to our team about import & export.</Text>
          <View style={[styles.ctaBtns, tight && { flexDirection: 'column', alignSelf: 'stretch' }]}>
            <Pressable style={({ hovered }: any) => [styles.btnRed, hovered && { opacity: 0.92 }]} onPress={() => router.push('/contact')}>
              <Text style={styles.btnRedText}>Request a Quote</Text>
              <Ionicons name="arrow-forward" size={18} color={P.cream} />
            </Pressable>
            <Pressable style={({ hovered }: any) => [styles.btnOutline, hovered && { borderColor: P.espresso }]} onPress={() => Linking.openURL(`tel:${BRAND.phone.replace(/\s/g, '')}`)}>
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
// A grocery photo tile with a soft hover zoom + optional white pill label.
function PhotoTile({ uri, tag, style, children }: { uri: string; tag?: string; style?: any; children?: React.ReactNode }) {
  const { scale, onHoverIn, onHoverOut } = useHoverScale(1.06);
  return (
    <Pressable style={[styles.tile, style]} onHoverIn={onHoverIn} onHoverOut={onHoverOut}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      </Animated.View>
      <View style={styles.tileShade} />
      {children}
      {tag ? (
        <View style={styles.tileTag}>
          <View style={styles.tileDot} />
          <Text style={styles.tileTagText}>{tag}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Chip({ icon, label }: { icon: Ion; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={15} color={P.gold} />
      <Text style={styles.chipText}>{label}</Text>
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

  /* BENTO */
  bento: { flexDirection: 'row', gap: 16 },
  bentoCol: { flex: 1, gap: 16 },
  bentoRow: { flexDirection: 'row', gap: 16 },
  tile: { borderRadius: 20, overflow: 'hidden', backgroundColor: P.band, justifyContent: 'flex-end' },
  tileShade: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(180deg, rgba(20,15,11,0) 45%, rgba(20,15,11,0.62) 100%)' } as any)
      : { backgroundColor: 'rgba(20,15,11,0.22)' }),
  },
  tileTag: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  tileDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: P.red },
  tileTagText: { color: P.espresso, fontWeight: '800', fontSize: 12.5 },
  spreadOverlay: { padding: 20, gap: 12 },
  spreadQuote: { color: '#FFFFFF', fontWeight: '800', maxWidth: 460 },
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
  storyImgWrap: { position: 'relative', width: '100%', borderRadius: 24, overflow: 'hidden', backgroundColor: P.band },
  storyBadge: {
    position: 'absolute', top: 18, left: 18, backgroundColor: P.red, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  storyBadgeText: { color: P.cream, fontWeight: '900', fontSize: 11, letterSpacing: 1, lineHeight: 14 },
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
  mvBody: { color: '#D6D3D1', fontSize: 15, lineHeight: 24 },

  /* CTA */
  ctaHead: { color: P.espresso, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },
  ctaSub: { color: P.muted, fontSize: 16, lineHeight: 25, textAlign: 'center', maxWidth: 540, marginTop: 16 },
  ctaBtns: { flexDirection: 'row', gap: 14, marginTop: 30 },
  btnRed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: P.red, paddingHorizontal: 26, paddingVertical: 15, borderRadius: 999 },
  btnRedText: { color: P.cream, fontWeight: '800', fontSize: 15 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1.5, borderColor: P.gold, paddingHorizontal: 26, paddingVertical: 15, borderRadius: 999 },
  btnOutlineText: { color: P.espresso, fontWeight: '800', fontSize: 15 },
});
