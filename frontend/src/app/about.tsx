import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable, Platform, Linking, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { api, imageUri } from '../lib/api';
import { colors, shadow, BRAND } from '../lib/theme';
import { Footer } from '../components/Footer';
import { HeroVideo } from '../components/HeroVideo';
import { Container } from '../components/ui';
import { Reveal, FadeInUp, CountUp, useHoverScale } from '../components/Motion';

type Ion = keyof typeof Ionicons.glyphMap;

// On-brand palette (matches the rest of the site): cream surface, espresso ink,
// chili-red accent. No off-theme colours.
const CREAM = colors.cream;
const INK = colors.ink;
const RED = colors.red;
const MUTED = colors.muted;
const VISION_GRADIENT = 'linear-gradient(135deg, #E8231A 0%, #D92419 50%, #B8100C 100%)';
// Shared red card gradient — matches the Founders card header, applied to the
// Why RPK value cards and the Our Story timeline cards for a cohesive look.
const CARD_GRADIENT = 'linear-gradient(135deg, #E8231A 0%, #B8100C 100%)';
const MISSION_GRADIENT = 'linear-gradient(135deg, #FFFFFF 0%, #EEF1F6 100%)';

// Founder card shape used by the UI (the API's image_url is mapped to `photo`).
type FounderCardData = { name: string; role: string; photo: string; bio: string };

// Founder portraits (Unsplash placeholders — used only until admin adds founders).
const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=500&q=75`;
const FOUNDERS: { name: string; role: string; photo: string; bio: string }[] = [
  { name: 'Managing Director', role: 'Founder & Strategy', photo: IMG('1500648767791-00dcc994a43e'), bio: 'Sets RPK’s direction — building trusted supplier relationships across the globe.' },
  { name: 'Head of Operations', role: 'Sourcing & Quality', photo: IMG('1573496359142-b8d87734a5a2'), bio: 'Oversees sourcing and grading so every consignment meets our standard.' },
  { name: 'Import / Export Lead', role: 'Logistics & Trade', photo: IMG('1507003211169-0a1dd7228f2d'), bio: 'Manages shipping and documentation for reliable delivery worldwide.' },
  { name: 'Client Relations', role: 'Sales & Support', photo: IMG('1494790108377-be9c29b29330'), bio: 'Looks after partners from first enquiry to repeat bulk orders.' },
];
const CARD_W = 280;
const CARD_H = 440;
const CLOSED_W = 116;

const TIMELINE = [
  { year: '2014', title: 'Founded in Dubai', desc: 'RPK For Food Trading begins sourcing and supplying quality groceries from Al Mankhool, Dubai.' },
  { year: '2016', title: 'First exports', desc: 'Expanded beyond the UAE — shipping rice, spices and pulses to neighbouring GCC markets.' },
  { year: '2019', title: 'A wider range', desc: 'Grew the catalogue to 100+ grocery and food lines across 11 categories.' },
  { year: '2022', title: 'Global reach', desc: 'Trusted supply to 15+ countries with reliable sea and air logistics.' },
  { year: 'Today', title: 'Wholesale & retail', desc: 'Serving businesses and retail markets worldwide with quality you can rely on.' },
];

// What we trade — the grocery categories RPK sources and ships. (The "Why RPK"
// value proposition lives on the Import/Export page, so it isn't repeated here.)
const TRADE: { icon: Ion; title: string; desc: string }[] = [
  { icon: 'nutrition-outline', title: 'Rice & Grains', desc: 'Basmati, sella and long-grain rice, sourced by the container.' },
  { icon: 'flame-outline', title: 'Spices & Masala', desc: 'Whole and ground spices, blends and authentic masalas.' },
  { icon: 'ellipse-outline', title: 'Pulses & Lentils', desc: 'Dal, chickpeas and beans — cleaned, graded and packed.' },
  { icon: 'water-outline', title: 'Cooking Oils & Ghee', desc: 'Sunflower and vegetable oils and pure cow ghee.' },
  { icon: 'leaf-outline', title: 'Dry Fruits & Nuts', desc: 'Almonds, cashews, raisins and premium dry fruits.' },
  { icon: 'cafe-outline', title: 'Beverages & Pantry', desc: 'Drinks, flour, sweeteners and everyday staples.' },
];

export default function About() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const narrow = width < 860;
  const tight = width < 600;
  // Hero fills the first screen (minus the ≈66px header); the stats sit inside it
  // as a bottom bar, so the whole hero + stats is one screen with nothing cut off.
  const heroH = Math.max(560, height - 66);
  const display = tight ? 32 : width < 980 ? 40 : 50;

  // Dynamic founder cards (admin-managed) + live counts (same source as the home page).
  const [founders, setFounders] = useState<FounderCardData[]>(FOUNDERS);
  const [counts, setCounts] = useState({ products: 0, countries: 0 });
  useEffect(() => {
    api.founders()
      .then((list) => {
        if (list && list.length) {
          setFounders(list.map((f) => ({ name: f.name, role: f.role, photo: imageUri(f.image_url) || '', bio: f.bio })));
        }
      })
      .catch(() => {});
    api.stats().then((s) => setCounts({ products: s.products, countries: s.countries })).catch(() => {});
  }, []);

  const STATS = [
    { num: `${counts.products || 100}+`, label: 'Grocery products' },
    { num: '500+', label: 'Business clients' },
    { num: `${Math.max(counts.countries, 15)}+`, label: 'Countries served' },
    { num: '10+', label: 'Years of trust' },
  ];

  return (
    <ScrollView style={{ backgroundColor: CREAM }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* ───────── 1 · HERO — full screen: content centred + stats bar at the bottom ───────── */}
      <View style={[styles.heroFull, { height: heroH, minHeight: undefined, justifyContent: 'flex-start' }]}>
        <View style={StyleSheet.absoluteFillObject as any}>
          <HeroVideo showDots={false} />
        </View>
        <View pointerEvents="none" style={styles.heroFullOverlay} />

        {/* centred content fills the space above the stats bar */}
        <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <FadeInUp delay={60} style={{ ...styles.heroContent, paddingTop: tight ? 16 : 24, paddingBottom: tight ? 16 : 24 }}>
            <View style={[styles.kickerRow, { justifyContent: 'center' }]}>
              <Text style={[styles.kicker, { color: 'rgba(255,255,255,0.7)' }]}>ABOUT RPK · DUBAI</Text>
              <View style={[styles.kickerLine, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
            </View>
            <Text style={[styles.display, { fontSize: display, lineHeight: display * 1.05, color: '#FFFFFF', textAlign: 'center' }]}>
              We trade <Text style={styles.displayAccent}>good food</Text>, worldwide.
            </Text>
            <Text style={[styles.intro, { color: 'rgba(255,255,255,0.72)', textAlign: 'center', maxWidth: 540 }]}>
              <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>{BRAND.legal}</Text> is a Dubai-based importer and
              exporter of premium groceries — basmati, spices, oils, pulses and more — supplying wholesale and
              retail markets with quality you can rely on.
            </Text>
            <View style={[styles.heroBtns, { justifyContent: 'center' }, tight && { flexDirection: 'column', alignSelf: 'stretch', alignItems: 'center' }]}>
              <Pressable style={({ hovered }: any) => [styles.btnRed, hovered && { opacity: 0.92 }]} onPress={() => router.push('/products')}>
                <Text style={styles.btnRedText}>Browse products</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </Pressable>
              <Pressable style={({ hovered }: any) => [styles.btnOutline, { borderColor: 'rgba(255,255,255,0.35)' }, hovered && { borderColor: 'rgba(255,255,255,0.65)' }]} onPress={() => router.push('/contact')}>
                <Text style={[styles.btnOutlineText, { color: '#FFFFFF' }]}>Contact us</Text>
              </Pressable>
            </View>
            <View style={[styles.heroBadge, { position: 'relative', left: 0, bottom: 0, marginTop: 8 }]}>
              <View style={styles.heroBadgeIcon}><Ionicons name="location" size={15} color={colors.white} /></View>
              <View>
                <Text style={styles.heroBadgeTop}>HEADQUARTERS</Text>
                <Text style={styles.heroBadgeMain}>Al Mankhool, Dubai — UAE</Text>
              </View>
            </View>
          </FadeInUp>
        </View>

        {/* stats bar pinned to the bottom of the hero */}
        <View style={styles.heroStats}>
          <View style={[styles.heroStatsInner, narrow && { flexWrap: 'wrap' }]}>
            {STATS.map((s, i) => (
              <View key={s.label} style={[styles.statItem, narrow ? { flexBasis: '50%', paddingVertical: 8 } : i > 0 && styles.statDividerLight]}>
                <CountUp value={s.num} duration={1600} style={[styles.statNum, { fontSize: tight ? 26 : 34, color: '#FFFFFF' }] as any} />
                <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.72)' }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ───────── 2.5 · OUR STORY (timeline) ───────── */}
      <Container max={1180} style={{ paddingVertical: tight ? 24 : 44 }}>
        <View style={[styles.timelineWrap, narrow && { flexDirection: 'column', gap: 36 }]}>
          <Reveal style={narrow ? undefined : { flex: 0.42, paddingRight: 52 }}>
            <Text style={styles.kicker}>OUR STORY</Text>
            <Text style={[styles.timelineHead, { fontSize: tight ? 26 : narrow ? 30 : 38, marginTop: 12 }]}>
              From a Dubai warehouse to{' '}
              <Text style={styles.displayAccent}>markets worldwide</Text>
            </Text>
          </Reveal>
          <View style={narrow ? undefined : { flex: 0.58 }}>
            {TIMELINE.map((item, i) => (
              <Reveal key={item.year} delay={i * 70}>
                <View style={styles.tlItem}>
                  <View style={styles.tlLeft}>
                    <View style={styles.tlDot} />
                    {i < TIMELINE.length - 1 && <View style={styles.tlLine} />}
                  </View>
                  <View style={styles.tlContent}>
                    <Text style={styles.tlYear}>{item.year}</Text>
                    <Text style={styles.tlTitle}>{item.title}</Text>
                    <Text style={styles.tlDesc}>{item.desc}</Text>
                  </View>
                </View>
              </Reveal>
            ))}
          </View>
        </View>
      </Container>

      {/* ───────── 3 · WHAT WE TRADE ───────── */}
      <Container max={1180} style={{ paddingTop: tight ? 20 : 44, paddingBottom: tight ? 20 : 40 }}>
        <Reveal style={{ alignItems: 'center', gap: 10, marginBottom: tight ? 16 : 26 }}>
          <Text style={styles.kicker}>WHAT WE TRADE</Text>
          <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 32, textAlign: 'center' }]}>
            A full pantry, <Text style={styles.displayAccent}>one trusted source</Text>
          </Text>
        </Reveal>
        <View style={[styles.valueGrid, narrow && { flexDirection: 'column' }]}>
          {TRADE.map((v, i) => (
            <ValueCard key={v.title} v={v} i={i} />
          ))}
        </View>
      </Container>

      {/* ───────── 4 · VISION / MISSION (diagonal split) ───────── */}
      <View style={{ paddingHorizontal: 18, paddingVertical: tight ? 32 : 52 }}>
        <VisionMission narrow={narrow} tight={tight} />
      </View>

      {/* ───────── 5 · FOUNDERS (horizontal scroll) ───────── */}
      <View style={{ paddingVertical: tight ? 40 : 64 }}>
        <Container max={1180}>
          <Reveal style={{ alignItems: 'center', gap: 12, marginBottom: tight ? 22 : 36 }}>
            <Text style={styles.kicker}>OUR FOUNDERS</Text>
            <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 32, textAlign: 'center' }]}>
              The people behind <Text style={styles.displayAccent}>RPK</Text>
            </Text>
          </Reveal>
        </Container>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.founderScroll, { paddingHorizontal: Math.max(18, (width - 1180) / 2) }]}
        >
          {founders.map((f, i) => (
            <FounderCard key={`${f.name}-${i}`} f={f} i={i} />
          ))}
        </ScrollView>
      </View>

      {/* ───────── 6 · CTA (brand gradient) ───────── */}
      <Container max={1000} style={{ paddingVertical: tight ? 44 : 72 }}>
        <Reveal>
          <View style={styles.cta}>
            <View pointerEvents="none" style={styles.ctaBlob} />
            <Text style={[styles.ctaHead, { fontSize: tight ? 26 : 34 }]}>
              Let’s grow your business together
            </Text>
            <Text style={styles.ctaSub}>Request a quote, explore the catalogue, or talk to our team about import & export.</Text>
            <View style={[styles.ctaBtns, tight && { flexDirection: 'column', alignSelf: 'stretch' }]}>
              <Pressable style={({ hovered }: any) => [styles.ctaPrimary, hovered && { opacity: 0.94 }]} onPress={() => router.push('/contact')}>
                <Ionicons name="chatbubbles-outline" size={18} color={RED} />
                <Text style={styles.ctaPrimaryText}>Request a quote</Text>
              </Pressable>
              <Pressable style={({ hovered }: any) => [styles.ctaGhost, hovered && { backgroundColor: 'rgba(255,255,255,0.16)' }]} onPress={() => Linking.openURL(`tel:${BRAND.phone.replace(/\s/g, '')}`)}>
                <Ionicons name="call-outline" size={17} color={colors.white} />
                <Text style={styles.ctaGhostText}>{BRAND.phone}</Text>
              </Pressable>
            </View>
          </View>
        </Reveal>
      </Container>

      <Footer />
    </ScrollView>
  );
}

// Expandable founder card (inspired by Rafaela Lucas' "collection cards"):
// gradient header fills on hover, the portrait turns from grey to colour, and
// the ✕ collapses the card into a vertical strip — click it to expand again.
function FounderCard({ f, i }: { f: FounderCardData; i: number }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [closed, setClosed] = useState(false);
  const g = useRef(new Animated.Value(0)).current; // gradient fill (hover OR closed)
  const lift = useRef(new Animated.Value(0)).current; // hover lift
  const wv = useRef(new Animated.Value(0)).current; // collapse width
  const colorOn = hovered || closed;

  useEffect(() => {
    Animated.timing(g, { toValue: colorOn ? 1 : 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    Animated.timing(lift, { toValue: hovered && !closed ? 1 : 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    Animated.timing(wv, { toValue: closed ? 1 : 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered, closed]);

  const width = wv.interpolate({ inputRange: [0, 1], outputRange: [CARD_W, CLOSED_W] });
  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const headerH = g.interpolate({ inputRange: [0, 1], outputRange: [190, CARD_H] });
  const headerRadius = g.interpolate({ inputRange: [0, 1], outputRange: [150, 6] });
  const grayscale = Platform.OS === 'web' ? ({ filter: colorOn ? 'grayscale(0%)' : 'grayscale(100%)', transition: 'filter 0.5s ease' } as any) : null;

  return (
    <Reveal delay={i * 80}>
      <Animated.View style={[styles.fcard, { width, height: CARD_H, transform: [{ translateY }] }]}>
        {/* gradient header (curved bottom at rest, fills the card on hover/closed) */}
        <Animated.View style={[styles.fheader, { height: headerH, borderBottomLeftRadius: headerRadius, borderBottomRightRadius: headerRadius }]} />

        <Pressable
          style={StyleSheet.absoluteFill as any}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          onPress={() => { if (closed) setClosed(false); }}
        >
          {closed ? (
            <View style={styles.fclosed}>
              <View style={styles.fcoverWrap}>
                <Image source={{ uri: f.photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
                <View style={styles.fcoverShade} />
              </View>
              <Text style={styles.fclosedName} numberOfLines={1}>{f.name}</Text>
              <View style={styles.farrow}><Ionicons name="expand-outline" size={15} color={colors.white} /></View>
            </View>
          ) : (
            <>
              <View style={styles.fbody}>
                <Text style={styles.fname} numberOfLines={1}>{f.name}</Text>
                <Text style={styles.ftitle}>{f.role}</Text>
                <Animated.View style={[styles.fpic, colorOn && styles.fpicOn]}>
                  <Image source={{ uri: f.photo }} style={[StyleSheet.absoluteFill, grayscale]} contentFit="cover" transition={300} />
                </Animated.View>
                <Text style={[styles.fdesc, colorOn && { color: colors.white }]}>{f.bio}</Text>
              </View>
              <View style={styles.factions}>
                <FBtn icon="logo-linkedin" label="Profile" />
                <FBtn icon="mail-outline" label="Contact" onPress={() => router.push('/contact')} />
              </View>
            </>
          )}
        </Pressable>
      </Animated.View>
    </Reveal>
  );
}

// One action button — shows its label, swaps to an icon on hover (like the ref).
function FBtn({ icon, label, onPress }: { icon: Ion; label: string; onPress?: () => void }) {
  const [h, setH] = useState(false);
  return (
    <Pressable
      style={({ hovered }: any) => [styles.fbtn, (hovered || h) && styles.fbtnHover]}
      onHoverIn={() => setH(true)}
      onHoverOut={() => setH(false)}
      onPress={(e) => { (e as any).stopPropagation?.(); onPress?.(); }}
    >
      {h ? <Ionicons name={icon} size={18} color={RED} /> : <Text style={styles.fbtnText}>{label}</Text>}
    </Pressable>
  );
}

function ValueCard({ v, i }: { v: { icon: Ion; title: string; desc: string }; i: number }) {
  const { scale, onHoverIn, onHoverOut } = useHoverScale(1.03);
  const [hovered, setHovered] = useState(false);
  return (
    <Reveal delay={i * 90} style={styles.valueCol}>
      <Pressable
        onHoverIn={() => { onHoverIn(); setHovered(true); }}
        onHoverOut={() => { onHoverOut(); setHovered(false); }}
        style={{ width: '100%' }}
      >
        <Animated.View style={[styles.valueCard, hovered && styles.valueCardHover, { transform: [{ scale }] }]}>
          <View style={[styles.valueIcon, hovered && styles.valueIconHover]}>
            <Ionicons name={v.icon} size={22} color={hovered ? colors.white : RED} />
          </View>
          <Text style={[styles.valueTitle, hovered && styles.valueTitleHover]}>{v.title}</Text>
          <Text style={[styles.valueDesc, hovered && styles.valueDescHover]}>{v.desc}</Text>
        </Animated.View>
      </Pressable>
    </Reveal>
  );
}

const VISION_BODY = 'To be the most trusted food trading house bridging producers and markets worldwide — known for integrity and the quality behind every shipment.';
const MISSION_BODY = 'To make quality food accessible — sourcing dependable groceries and delivering them with fairness, consistency and care, from Dubai.';

// Diagonal split panel (orange Vision / light Mission) inspired by the reference,
// recoloured to the RPK logo palette. The diagonal is two skewed panels with a
// white gap — reliable on RN-web. Stacks into two cards on small screens.
function VisionMission({ narrow, tight }: { narrow: boolean; tight: boolean }) {
  const diagonal = Platform.OS === 'web' && !narrow;

  if (!diagonal) {
    return (
      <View style={{ width: '100%', maxWidth: 1180, alignSelf: 'center', gap: 16 }}>
        <View style={[styles.vmCard, Platform.OS === 'web' ? ({ backgroundImage: VISION_GRADIENT } as any) : { backgroundColor: RED }]}>
          <Text style={styles.vmKickerLight}>OUR</Text>
          <Text style={styles.vmTitleLight}>VISION</Text>
          <Text style={styles.vmDescLight}>{VISION_BODY}</Text>
          <View style={styles.vmIconRowLight}><Ionicons name="eye" size={42} color="#fff" /></View>
        </View>
        <View style={[styles.vmCard, Platform.OS === 'web' ? ({ backgroundImage: MISSION_GRADIENT } as any) : { backgroundColor: '#EEF1F6' }, { borderWidth: 1, borderColor: '#E3E7EE' }]}>
          <View style={styles.vmIconRowDark}><MaterialCommunityIcons name="bullseye-arrow" size={44} color={INK} /></View>
          <Text style={styles.vmKickerDark}>OUR</Text>
          <Text style={styles.vmTitleDark}>MISSION</Text>
          <Text style={styles.vmDescDark}>{MISSION_BODY}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.vmWrap}>
      {/* two skewed fills with a white diagonal gap between them (the wrap is white) */}
      <View style={styles.vmMissionFill} />
      <View style={styles.vmVisionFill} />
      {/* Vision content (left) */}
      <View style={styles.vmVisionContent}>
        <Text style={styles.vmKickerLight}>OUR</Text>
        <Text style={styles.vmTitleLight}>VISION</Text>
        <Text style={styles.vmDescLight}>{VISION_BODY}</Text>
      </View>
      <View style={styles.vmEye}><Ionicons name="eye" size={52} color="#fff" /></View>
      {/* Mission content (right) */}
      <View style={styles.vmTarget}><MaterialCommunityIcons name="bullseye-arrow" size={56} color={INK} /></View>
      <View style={styles.vmMissionContent}>
        <Text style={styles.vmKickerDark}>OUR</Text>
        <Text style={styles.vmTitleDark}>MISSION</Text>
        <Text style={styles.vmDescDark}>{MISSION_BODY}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* HERO — full-width background image */
  heroFull: { width: '100%', minHeight: 560, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#10080A' },
  heroFullOverlay: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web'
      ? { backgroundImage: 'linear-gradient(160deg, rgba(10,6,5,0.82) 0%, rgba(18,10,8,0.72) 100%)' } as any
      : { backgroundColor: 'rgba(10,6,5,0.76)' }),
  },
  heroContent: { alignItems: 'center', paddingHorizontal: 24, maxWidth: 760, width: '100%', gap: 20 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 44 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kicker: { color: RED, fontWeight: '800', fontSize: 12, letterSpacing: 2 },
  kickerLine: { height: 1.5, width: 56, backgroundColor: RED, opacity: 0.6 },
  display: { color: INK, fontWeight: '900', letterSpacing: -0.5 },
  displayAccent: { color: RED, fontWeight: '900' },
  intro: { color: MUTED, fontSize: 16, lineHeight: 26 },
  heroBtns: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 2 },
  btnRed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: RED, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  btnRedText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1.5, borderColor: 'rgba(29,27,25,0.22)', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999 },
  btnOutlineText: { color: INK, fontWeight: '800', fontSize: 15 },
  heroImgWrap: { width: '100%', aspectRatio: 4 / 3, borderRadius: 26, overflow: 'hidden', backgroundColor: colors.soft },
  heroImgShade: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(180deg, rgba(20,15,11,0) 55%, rgba(20,15,11,0.55) 100%)' } as any)
      : { backgroundColor: 'rgba(20,15,11,0.18)' }),
  },
  heroBadge: { position: 'absolute', left: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, ...shadow.card },
  heroBadgeIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: RED },
  heroBadgeTop: { color: RED, fontWeight: '800', fontSize: 9.5, letterSpacing: 1 },
  heroBadgeMain: { color: INK, fontWeight: '800', fontSize: 13.5, marginTop: 1 },

  /* STATS — bar pinned to the bottom of the hero */
  heroStats: {
    width: '100%', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)',
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(180deg, rgba(10,6,5,0) 0%, rgba(10,6,5,0.5) 100%)' } as any)
      : { backgroundColor: 'rgba(10,6,5,0.45)' }),
  },
  heroStatsInner: { width: '100%', maxWidth: 1180, alignSelf: 'center', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 6 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  statDividerLight: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.15)' },
  statNum: { color: RED, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { color: MUTED, fontSize: 13.5, fontWeight: '600', textAlign: 'center' },

  /* OUR STORY — timeline */
  timelineWrap: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineHead: { color: INK, fontWeight: '900', letterSpacing: -0.5, lineHeight: 46 },
  tlItem: { flexDirection: 'row', gap: 18, marginBottom: 16 },
  tlLeft: { alignItems: 'center', width: 14 },
  tlDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: RED, marginTop: 20 },
  tlLine: { flex: 1, width: 2, backgroundColor: 'rgba(217,36,25,0.25)', marginTop: 6, minHeight: 26 },
  tlContent: {
    flex: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
    ...(Platform.OS === 'web' ? ({ backgroundImage: CARD_GRADIENT } as any) : { backgroundColor: RED }),
    shadowColor: '#7A0D08', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 12 },
  },
  tlYear: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 12.5, letterSpacing: 1 },
  tlTitle: { color: colors.white, fontWeight: '800', fontSize: 16, marginTop: 3, marginBottom: 5 },
  tlDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 22 },

  /* VALUES */
  sectionHead: { color: INK, fontWeight: '900', letterSpacing: -0.3 },
  valueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  valueCol: { flexGrow: 1, flexBasis: '30%', minWidth: 230 },
  valueCard: {
    borderRadius: 16, padding: 20, gap: 8, height: '100%',
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, ...shadow.card,
    ...(Platform.OS === 'web' ? ({ transition: 'box-shadow 0.35s ease, border-color 0.35s ease' } as any) : null),
  },
  valueCardHover: {
    borderColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ backgroundImage: CARD_GRADIENT } as any) : { backgroundColor: RED }),
    shadowColor: '#7A0D08', shadowOpacity: 0.22, shadowRadius: 22, shadowOffset: { width: 0, height: 14 },
  },
  valueIcon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 2,
    ...(Platform.OS === 'web' ? ({ transition: 'background-color 0.35s ease' } as any) : null),
  },
  valueIconHover: { backgroundColor: 'rgba(255,255,255,0.18)' },
  valueTitle: { color: INK, fontWeight: '900', fontSize: 17, letterSpacing: -0.2, ...(Platform.OS === 'web' ? ({ transition: 'color 0.35s ease' } as any) : null) },
  valueTitleHover: { color: colors.white },
  valueDesc: { color: MUTED, fontSize: 14, lineHeight: 21, ...(Platform.OS === 'web' ? ({ transition: 'color 0.35s ease' } as any) : null) },
  valueDescHover: { color: 'rgba(255,255,255,0.9)' },

  /* VISION / MISSION — diagonal split (two rounded panels, white gap) */
  vmWrap: {
    width: '100%', maxWidth: 1180, alignSelf: 'center', height: 460, borderRadius: 30, overflow: 'hidden', position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  vmVisionFill: {
    position: 'absolute', top: -130, bottom: -130, left: '-17%', width: '65%',
    transform: [{ skewX: '-15deg' }],
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: VISION_GRADIENT, boxShadow: '10px 0 34px rgba(20,14,8,0.20)' } as any)
      : { backgroundColor: RED }),
  },
  vmMissionFill: {
    position: 'absolute', top: -130, bottom: -130, right: '-17%', width: '65%',
    transform: [{ skewX: '-15deg' }],
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: MISSION_GRADIENT, boxShadow: '-10px 0 34px rgba(30,40,60,0.10)' } as any)
      : { backgroundColor: '#EEF1F6' }),
  },
  vmVisionContent: { position: 'absolute', top: 62, left: 60, maxWidth: 330, gap: 2 },
  vmEye: { position: 'absolute', bottom: 56, left: 72 },
  vmTarget: { position: 'absolute', top: 56, right: 70 },
  vmMissionContent: { position: 'absolute', right: 64, top: 196, width: 330, alignItems: 'flex-start', gap: 2 },
  vmKickerLight: { color: '#fff', fontWeight: '900', fontSize: 30, letterSpacing: 0.5, lineHeight: 34 },
  vmTitleLight: { color: '#fff', fontWeight: '900', fontSize: 42, letterSpacing: 0.5, lineHeight: 46, marginBottom: 12 },
  vmDescLight: { color: 'rgba(255,255,255,0.95)', fontSize: 15, lineHeight: 23, maxWidth: 320 },
  vmKickerDark: { color: '#141414', fontWeight: '900', fontSize: 30, letterSpacing: 0.5, lineHeight: 34 },
  vmTitleDark: { color: '#141414', fontWeight: '900', fontSize: 42, letterSpacing: 0.5, lineHeight: 46, marginBottom: 12 },
  vmDescDark: { color: '#3A3A3A', fontSize: 15, lineHeight: 23 },
  vmCard: { borderRadius: 22, padding: 26, overflow: 'hidden', minHeight: 190, justifyContent: 'center', gap: 2 },
  vmIconRowLight: { marginTop: 14 },
  vmIconRowDark: { marginBottom: 14 },
  /* FOUNDERS — expandable cards */
  founderScroll: { gap: 24, paddingVertical: 24, paddingBottom: 28, alignItems: 'center' },
  fcard: { backgroundColor: colors.white, borderRadius: 6, overflow: 'hidden', justifyContent: 'space-between', alignItems: 'center', ...shadow.card, shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 18 } },
  fheader: {
    position: 'absolute', top: 0, left: -50, right: -50,
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(to top, #B8100C 0%, #E8231A 100%)' } as any)
      : { backgroundColor: RED }),
  },
  fclose: { position: 'absolute', top: 10, right: 10, zIndex: 3, width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  fbody: { flex: 1, alignItems: 'center', paddingTop: 4, zIndex: 1 },
  fname: { color: colors.white, fontWeight: '700', fontSize: 23, letterSpacing: 0.3, paddingTop: 36, paddingHorizontal: 20, textAlign: 'center' },
  ftitle: { color: 'rgba(255,255,255,0.92)', fontSize: 13, letterSpacing: 0.6, paddingVertical: 8 },
  fpic: { width: 118, height: 118, borderRadius: 999, overflow: 'hidden', marginVertical: 18, backgroundColor: colors.soft, borderWidth: 0, ...(Platform.OS === 'web' ? ({ transition: 'box-shadow 0.5s ease' } as any) : null) },
  fpicOn: Platform.OS === 'web' ? ({ boxShadow: '0 0 0 8px rgba(255,255,255,0.35)' } as any) : { borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)' },
  fdesc: { color: '#6B6660', fontSize: 13.5, lineHeight: 22, textAlign: 'center', paddingHorizontal: 26, ...(Platform.OS === 'web' ? ({ transition: 'color 0.4s ease' } as any) : null) },
  factions: { width: '100%', flexDirection: 'row', backgroundColor: colors.white, zIndex: 1 },
  fbtn: { width: '50%', height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,36,25,0.08)' },
  fbtnHover: { backgroundColor: 'rgba(255,255,255,0.6)' },
  fbtnText: { color: RED, fontWeight: '600', fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase' },
  /* collapsed strip */
  fclosed: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fcoverWrap: { position: 'absolute', width: 360, height: 360, borderRadius: 999, overflow: 'hidden', top: -20 },
  fcoverShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  fclosedName: { position: 'absolute', width: CARD_H, top: CARD_H / 2 - 16, left: (CLOSED_W - CARD_H) / 2, textAlign: 'center', color: colors.white, fontWeight: '700', fontSize: 22, letterSpacing: 0.5, transform: [{ rotate: '-90deg' }], zIndex: 2 },
  farrow: { position: 'absolute', bottom: 14, alignSelf: 'center', width: 26, height: 26, alignItems: 'center', justifyContent: 'center', zIndex: 2 },

  /* CTA */
  cta: {
    width: '100%', alignItems: 'center', borderRadius: 28, overflow: 'hidden', paddingHorizontal: 28, paddingVertical: 48, gap: 12,
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(135deg, #E11D2A 0%, #D92419 50%, #B0110A 100%)' } as any)
      : { backgroundColor: RED }),
    shadowColor: '#7A0D08', shadowOpacity: 0.28, shadowRadius: 32, shadowOffset: { width: 0, height: 16 },
  },
  ctaBlob: { position: 'absolute', width: 300, height: 300, borderRadius: 999, backgroundColor: 'rgba(122,13,8,0.26)', top: -110, right: -70 },
  ctaHead: { color: colors.white, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3, lineHeight: 40 },
  ctaSub: { color: 'rgba(255,255,255,0.92)', fontSize: 15.5, lineHeight: 24, textAlign: 'center', maxWidth: 520, marginTop: 2 },
  ctaBtns: { flexDirection: 'row', gap: 14, marginTop: 12 },
  ctaPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: colors.white, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  ctaPrimaryText: { color: RED, fontWeight: '800', fontSize: 15 },
  ctaGhost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999 },
  ctaGhostText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
