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
  shelf: IMG('1583258292688-d0213dc5a3a8', 1100), // grocery store shelves
  port: IMG('1494412574643-ff11b0a5c1c3', 1300), // container port (import/export)
  truck: IMG('1601584115197-04ecc0da31d7', 1000), // cargo truck / logistics
};

// Company facts (verified, see BRAND).
const FACTS: { icon: Ion; label: string; value: string }[] = [
  { icon: 'business-outline', label: 'Legal entity', value: 'RPK For Food Trading Co. L.L.C' },
  { icon: 'location-outline', label: 'Headquarters', value: 'Al Mankhool, Dubai — UAE' },
  { icon: 'cube-outline', label: 'Product range', value: '100+ grocery & food lines' },
  { icon: 'earth-outline', label: 'Markets served', value: '15+ countries worldwide' },
  { icon: 'swap-horizontal-outline', label: 'Trade model', value: 'Import · Export · Wholesale & Retail' },
  { icon: 'shield-checkmark-outline', label: 'Quality', value: 'Inspected & graded consignments' },
];

// How import / export works — 5-step process.
const PROCESS: { n: string; icon: Ion; title: string; desc: string }[] = [
  { n: '01', icon: 'chatbubbles-outline', title: 'Enquiry & requirements', desc: 'Tell us the product, grade, quantity and destination. Our team replies fast with the right options.' },
  { n: '02', icon: 'pricetags-outline', title: 'Sourcing & quotation', desc: 'We source from trusted growers and mills and send a clear, competitive quotation.' },
  { n: '03', icon: 'document-text-outline', title: 'Quality check & documents', desc: 'Every consignment is inspected and graded; export paperwork and certificates are prepared.' },
  { n: '04', icon: 'boat-outline', title: 'Shipping & logistics', desc: 'Sea or air freight arranged from Dubai, with tracking and reliable timelines.' },
  { n: '05', icon: 'checkmark-done-outline', title: 'Delivery & support', desc: 'Goods delivered to your market — with ongoing support for repeat and bulk orders.' },
];

// TODO: replace with real team members & photos.
const TEAM: { name: string; role: string; photo: string }[] = [
  { name: 'Managing Director', role: 'Founder & Strategy', photo: IMG('1500648767791-00dcc994a43e', 500) },
  { name: 'Head of Operations', role: 'Sourcing & Quality', photo: IMG('1573496359142-b8d87734a5a2', 500) },
  { name: 'Import / Export Manager', role: 'Logistics & Trade', photo: IMG('1507003211169-0a1dd7228f2d', 500) },
  { name: 'Client Relations', role: 'Sales & Support', photo: IMG('1494790108377-be9c29b29330', 500) },
];

const STATS = [
  { num: '100+', label: 'Grocery products' },
  { num: '500+', label: 'Business clients' },
  { num: '15+', label: 'Countries served' },
  { num: '10+', label: 'Years of trust' },
];

// Milestone timeline (editorial — adjust years/copy to the real history).
const MILESTONES: { year: string; title: string; desc: string }[] = [
  { year: '2014', title: 'Founded in Dubai', desc: 'RPK For Food Trading begins sourcing and supplying quality groceries from Al Mankhool, Dubai.' },
  { year: '2016', title: 'First exports', desc: 'Expanded beyond the UAE — shipping rice, spices and pulses to neighbouring GCC markets.' },
  { year: '2019', title: 'A wider range', desc: 'Grew the catalogue to 100+ grocery and food lines across 11 categories.' },
  { year: '2022', title: 'Global reach', desc: 'Trusted supply to 15+ countries with reliable sea and air logistics.' },
  { year: 'Today', title: 'Wholesale & retail', desc: 'Serving businesses and retail markets worldwide with quality you can rely on.' },
];

// Regions we trade with.
const MARKETS: { icon: Ion; region: string; note: string }[] = [
  { icon: 'business-outline', region: 'GCC & Middle East', note: 'UAE, KSA, Oman, Qatar, Bahrain, Kuwait' },
  { icon: 'restaurant-outline', region: 'Indian Subcontinent', note: 'India, Pakistan, Sri Lanka' },
  { icon: 'leaf-outline', region: 'Africa', note: 'East & West African markets' },
  { icon: 'globe-outline', region: 'Europe', note: 'Selected EU importers' },
  { icon: 'navigate-outline', region: 'Asia Pacific', note: 'Southeast Asian markets' },
  { icon: 'earth-outline', region: 'Worldwide', note: 'Project & bulk orders on request' },
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

      {/* ───────── COMPANY DETAILS ───────── */}
      <Container max={1180} style={{ paddingBottom: tight ? 44 : 80 }}>
        <View style={[styles.coRow, narrow && { flexDirection: 'column', gap: 28 }]}>
          <Reveal style={{ flex: narrow ? undefined : 1 }}>
            <View style={[styles.coImgWrap, { height: tight ? 280 : 420 }]}>
              <PhotoTile uri={PHOTOS.shelf} style={StyleSheet.absoluteFill as any} tag="Wholesale & Retail" />
            </View>
          </Reveal>
          <Reveal style={{ flex: narrow ? undefined : 1.05, gap: 16 }}>
            <Text style={styles.sectionKicker}>WHO WE ARE</Text>
            <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 30, lineHeight: (tight ? 24 : 30) * 1.12 }]}>
              A Dubai trading house built on <Text style={styles.displayItalic}>trust</Text>
            </Text>
            <Text style={styles.intro}>
              We bring dependable groceries from source to shelf — combining careful sourcing, honest pricing
              and reliable logistics so businesses everywhere can stock quality food with confidence.
            </Text>
            <View style={styles.factGrid}>
              {FACTS.map((f) => (
                <FactCard key={f.label} icon={f.icon} label={f.label} value={f.value} half={!narrow} />
              ))}
            </View>
          </Reveal>
        </View>
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

          {/* RIGHT — milestone timeline */}
          <View style={{ flex: narrow ? undefined : 1, gap: 18 }}>
            <Reveal style={{ gap: 8 }}>
              <Text style={styles.sectionKicker}>OUR STORY</Text>
              <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 30, lineHeight: (tight ? 24 : 30) * 1.12 }]}>
                From a Dubai warehouse to <Text style={styles.displayItalic}>markets worldwide</Text>
              </Text>
            </Reveal>
            <View style={{ marginTop: 4 }}>
              {MILESTONES.map((m, i) => (
                <Reveal key={m.year} delay={i * 80}>
                  <View style={styles.tlRow}>
                    <View style={styles.tlRail}>
                      <View style={styles.tlDot} />
                      {i < MILESTONES.length - 1 && <View style={styles.tlLine} />}
                    </View>
                    <View style={styles.tlBody}>
                      <Text style={styles.tlYear}>{m.year}</Text>
                      <Text style={styles.tlTitle}>{m.title}</Text>
                      <Text style={styles.tlDesc}>{m.desc}</Text>
                    </View>
                  </View>
                </Reveal>
              ))}
            </View>
          </View>
        </View>
      </Container>

      {/* ───────── HOW IMPORT / EXPORT WORKS ───────── */}
      <View style={styles.processBand}>
        <Container max={1180} style={{ paddingVertical: tight ? 48 : 84 }}>
          <Reveal style={{ alignItems: 'center', gap: 10, marginBottom: tight ? 28 : 44 }}>
            <Text style={styles.sectionKicker}>HOW IMPORT & EXPORT WORKS</Text>
            <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 32, textAlign: 'center' }]}>
              From your enquiry to <Text style={styles.displayItalic}>delivered worldwide</Text>
            </Text>
            <Text style={[styles.intro, { textAlign: 'center', maxWidth: 620 }]}>
              A simple, transparent process — managed end to end by our Dubai team.
            </Text>
          </Reveal>

          <View style={[styles.procRow, narrow && { flexDirection: 'column', gap: 28 }]}>
            {/* Feature image */}
            <Reveal style={{ flex: narrow ? undefined : 1 }}>
              <View style={[styles.procImgWrap, { height: tight ? 300 : 460 }]}>
                <PhotoTile uri={PHOTOS.port} style={StyleSheet.absoluteFill as any}>
                  <View style={styles.procImgOverlay}>
                    <Ionicons name="boat" size={22} color={P.cream} />
                    <Text style={styles.procImgText}>Shipped from Dubai by sea & air</Text>
                  </View>
                </PhotoTile>
              </View>
            </Reveal>

            {/* Steps timeline */}
            <View style={{ flex: narrow ? undefined : 1.05, gap: 14 }}>
              {PROCESS.map((s, i) => (
                <Reveal key={s.n} delay={i * 70}>
                  <View style={styles.pstep}>
                    <View style={styles.pstepIcon}><Ionicons name={s.icon} size={19} color={P.cream} /></View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.pstepHead}>
                        <Text style={styles.pstepN}>{s.n}</Text>
                        <Text style={styles.pstepTitle}>{s.title}</Text>
                      </View>
                      <Text style={styles.pstepDesc}>{s.desc}</Text>
                    </View>
                  </View>
                </Reveal>
              ))}
            </View>
          </View>
        </Container>
      </View>

      {/* ───────── MEET THE TEAM ───────── */}
      <Container max={1180} style={{ paddingVertical: tight ? 48 : 84 }}>
        <Reveal style={{ alignItems: 'center', gap: 10, marginBottom: tight ? 26 : 40 }}>
          <Text style={styles.sectionKicker}>MEET THE TEAM</Text>
          <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 32, textAlign: 'center' }]}>
            The people behind <Text style={styles.displayItalic}>every shipment</Text>
          </Text>
        </Reveal>
        <View style={styles.teamGrid}>
          {TEAM.map((m, i) => (
            <TeamCard key={m.name} m={m} i={i} width={narrow ? (tight ? '100%' : '47%') : 248} />
          ))}
        </View>
      </Container>

      {/* ───────── VISION · PURPOSE · FOUNDER QUOTE ───────── */}
      <View style={styles.darkBand}>
        <Container max={1180} style={{ paddingVertical: tight ? 52 : 84 }}>
          <View style={[styles.mvRow, narrow && { flexDirection: 'column', gap: 36 }]}>
            <MV icon="flag-outline" title="Our Vision" body="To be the most trusted food trading house bridging producers and markets worldwide — known for integrity, reliability and the quality behind every shipment." />
            <View style={narrow ? styles.mvDividerH : styles.mvDividerV} />
            <MV icon="sparkles-outline" title="Our Purpose" body="To make quality food accessible — sourcing dependable groceries and delivering them with fairness, consistency and care, from Dubai to every market we serve." />
          </View>

          <Reveal style={styles.quoteWrap}>
            <Ionicons name="chatbox-ellipses-outline" size={28} color={P.gold} />
            <Text style={[styles.quoteText, { fontSize: tight ? 19 : 26, lineHeight: (tight ? 19 : 26) * 1.35 }]}>
              “Quality, trust and consistency — that’s what we put into every shipment.”
            </Text>
            <Text style={styles.quoteAttr}>— Founder, RPK For Food Trading Co. L.L.C</Text>
          </Reveal>
        </Container>
      </View>

      {/* ───────── MARKETS WE SERVE ───────── */}
      <Container max={1180} style={{ paddingVertical: tight ? 48 : 84 }}>
        <Reveal style={{ alignItems: 'center', gap: 10, marginBottom: tight ? 26 : 40 }}>
          <Text style={styles.sectionKicker}>GLOBAL REACH</Text>
          <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 32, textAlign: 'center' }]}>
            Markets we <Text style={styles.displayItalic}>serve</Text>
          </Text>
          <Text style={[styles.intro, { textAlign: 'center', maxWidth: 620 }]}>
            From our Dubai base we supply businesses across the globe — reliably and at the right price.
          </Text>
        </Reveal>
        <View style={styles.marketGrid}>
          {MARKETS.map((m, i) => (
            <RegionCard key={m.region} icon={m.icon} region={m.region} note={m.note} i={i} width={narrow ? (tight ? '100%' : '47%') : '31%'} />
          ))}
        </View>
      </Container>

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

function FactCard({ icon, label, value, half }: { icon: Ion; label: string; value: string; half?: boolean }) {
  const { scale, onHoverIn, onHoverOut } = useHoverScale(1.03);
  return (
    <Pressable onHoverIn={onHoverIn} onHoverOut={onHoverOut} style={[styles.factCol, half && { width: '48%' }]}>
      <Animated.View style={[styles.factCard, { transform: [{ scale }] }]}>
        <View style={styles.factIcon}><Ionicons name={icon} size={18} color={P.red} /></View>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue}>{value}</Text>
      </Animated.View>
    </Pressable>
  );
}

function TeamCard({ m, i, width }: { m: { name: string; role: string; photo: string }; i: number; width: number | string }) {
  const { scale, onHoverIn, onHoverOut } = useHoverScale(1.04);
  return (
    <Reveal delay={i * 90} style={{ width: width as any }}>
      <Pressable onHoverIn={onHoverIn} onHoverOut={onHoverOut}>
        <Animated.View style={[styles.teamCard, { transform: [{ scale }] }]}>
          <View style={styles.teamPhoto}>
            <Image source={{ uri: m.photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          </View>
          <Text style={styles.teamName}>{m.name}</Text>
          <Text style={styles.teamRole}>{m.role}</Text>
        </Animated.View>
      </Pressable>
    </Reveal>
  );
}

function RegionCard({ icon, region, note, i, width }: { icon: Ion; region: string; note: string; i: number; width: number | string }) {
  const { scale, onHoverIn, onHoverOut } = useHoverScale(1.03);
  return (
    <Reveal delay={i * 70} style={{ width: width as any }}>
      <Pressable onHoverIn={onHoverIn} onHoverOut={onHoverOut}>
        <Animated.View style={[styles.regionCard, { transform: [{ scale }] }]}>
          <View style={styles.regionIcon}><Ionicons name={icon} size={20} color={P.red} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.regionTitle}>{region}</Text>
            <Text style={styles.regionNote}>{note}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Reveal>
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

  /* COMPANY DETAILS */
  coRow: { flexDirection: 'row', alignItems: 'center', gap: 48 },
  coImgWrap: { width: '100%', borderRadius: 24, overflow: 'hidden', backgroundColor: P.band },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14, marginTop: 8 },
  factCol: { width: '100%' },
  factCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#ECE3D4', padding: 16, gap: 8, height: '100%' },
  factIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FBEAE8', alignItems: 'center', justifyContent: 'center' },
  factLabel: { color: P.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  factValue: { color: P.espresso, fontSize: 14.5, fontWeight: '800', lineHeight: 20 },

  /* PROCESS */
  processBand: { backgroundColor: P.band },
  procRow: { flexDirection: 'row', alignItems: 'stretch', gap: 48 },
  procImgWrap: { width: '100%', borderRadius: 24, overflow: 'hidden', backgroundColor: '#E3D8C6' },
  procImgOverlay: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  procImgText: { color: P.cream, fontWeight: '800', fontSize: 15 },
  pstep: { flexDirection: 'row', gap: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#ECE3D4', padding: 16 },
  pstepIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: P.red, alignItems: 'center', justifyContent: 'center' },
  pstepHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  pstepN: { color: P.gold, fontWeight: '900', fontSize: 15 },
  pstepTitle: { color: P.espresso, fontWeight: '800', fontSize: 16, flexShrink: 1 },
  pstepDesc: { color: P.muted, fontSize: 13.5, lineHeight: 20 },

  /* TEAM */
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'center' },
  teamCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#ECE3D4', padding: 14, alignItems: 'center', gap: 4 },
  teamPhoto: { width: '100%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: P.band, marginBottom: 10 },
  teamName: { color: P.espresso, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  teamRole: { color: P.red, fontWeight: '700', fontSize: 13, textAlign: 'center' },

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

  /* TIMELINE */
  tlRow: { flexDirection: 'row', gap: 16 },
  tlRail: { width: 18, alignItems: 'center' },
  tlDot: { width: 16, height: 16, borderRadius: 999, backgroundColor: P.red, borderWidth: 3, borderColor: P.cream, marginTop: 4, shadowColor: P.red, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  tlLine: { width: 2, flex: 1, backgroundColor: '#E2D6C2', marginTop: 4 },
  tlBody: { flex: 1, paddingBottom: 22 },
  tlYear: { color: P.gold, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  tlTitle: { color: P.espresso, fontWeight: '800', fontSize: 16, marginTop: 2 },
  tlDesc: { color: P.muted, fontSize: 14, lineHeight: 21, marginTop: 3 },

  /* QUOTE */
  quoteWrap: { alignItems: 'center', gap: 12, marginTop: 44, paddingTop: 40, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  quoteText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center', maxWidth: 760, letterSpacing: -0.2 },
  quoteAttr: { color: P.gold, fontWeight: '700', fontSize: 14 },

  /* MARKETS */
  marketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  regionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#ECE3D4', padding: 16 },
  regionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FBEAE8', alignItems: 'center', justifyContent: 'center' },
  regionTitle: { color: P.espresso, fontWeight: '900', fontSize: 15 },
  regionNote: { color: P.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },

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
