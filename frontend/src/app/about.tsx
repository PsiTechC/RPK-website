import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable, Linking, Animated, Platform } from 'react-native';
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

const IMG = (id: string, w = 500) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

// Company / operations / transport photography (verified — no grocery products).
const PIC = {
  heroShip: IMG('1578575437130-527eed3abbec', 1100), // cargo ship at port
  warehouse: IMG('1553413077-190dd305871c', 900), // warehouse aisle
  trucks: IMG('1565891741441-64926e441838', 1000), // distribution centre + trucks
  team: IMG('1600880292203-757bb62b4baf', 900), // team at work
  port: IMG('1494412574643-ff11b0a5c1c3', 1100), // container port (import/export)
};

const STATS = [
  { num: '100+', label: 'Grocery products' },
  { num: '500+', label: 'Business clients' },
  { num: '15+', label: 'Countries served' },
  { num: '10+', label: 'Years of trust' },
];

// What we trade — icon cards (no photos).
const TRADE: { icon: Ion; name: string }[] = [
  { icon: 'nutrition-outline', name: 'Rice & Grains' },
  { icon: 'flame-outline', name: 'Spices & Masala' },
  { icon: 'ellipse-outline', name: 'Pulses & Lentils' },
  { icon: 'leaf-outline', name: 'Dry Fruits & Nuts' },
  { icon: 'water-outline', name: 'Cooking Oils & Ghee' },
  { icon: 'cube-outline', name: 'Flour & Atta' },
  { icon: 'flower-outline', name: 'Sweeteners & Honey' },
  { icon: 'flask-outline', name: 'Sauces & Condiments' },
  { icon: 'cafe-outline', name: 'Beverages' },
  { icon: 'snow-outline', name: 'Salt' },
  { icon: 'basket-outline', name: 'Pantry & Others' },
];

const FACTS: { icon: Ion; label: string; value: string }[] = [
  { icon: 'business-outline', label: 'Legal entity', value: 'RPK For Food Trading Co. L.L.C' },
  { icon: 'location-outline', label: 'Headquarters', value: 'Al Mankhool, Dubai — UAE' },
  { icon: 'cube-outline', label: 'Product range', value: '100+ grocery & food lines' },
  { icon: 'earth-outline', label: 'Markets served', value: '15+ countries worldwide' },
  { icon: 'swap-horizontal-outline', label: 'Trade model', value: 'Import · Export · Wholesale & Retail' },
  { icon: 'shield-checkmark-outline', label: 'Quality', value: 'Inspected & graded consignments' },
];

// Milestone timeline (editorial — adjust years/copy to the real history).
const MILESTONES: { year: string; title: string; desc: string }[] = [
  { year: '2014', title: 'Founded in Dubai', desc: 'RPK For Food Trading begins sourcing and supplying quality groceries from Al Mankhool, Dubai.' },
  { year: '2016', title: 'First exports', desc: 'Expanded beyond the UAE — shipping rice, spices and pulses to neighbouring GCC markets.' },
  { year: '2019', title: 'A wider range', desc: 'Grew the catalogue to 100+ grocery and food lines across 11 categories.' },
  { year: '2022', title: 'Global reach', desc: 'Trusted supply to 15+ countries with reliable sea and air logistics.' },
  { year: 'Today', title: 'Wholesale & retail', desc: 'Serving businesses and retail markets worldwide with quality you can rely on.' },
];

const PROCESS: { n: string; icon: Ion; title: string; desc: string }[] = [
  { n: '01', icon: 'chatbubbles-outline', title: 'Enquiry & requirements', desc: 'Tell us the product, grade, quantity and destination. Our team replies fast with the right options.' },
  { n: '02', icon: 'pricetags-outline', title: 'Sourcing & quotation', desc: 'We source from trusted growers and mills and send a clear, competitive quotation.' },
  { n: '03', icon: 'document-text-outline', title: 'Quality check & documents', desc: 'Every consignment is inspected and graded; export paperwork and certificates are prepared.' },
  { n: '04', icon: 'boat-outline', title: 'Shipping & logistics', desc: 'Sea or air freight arranged from Dubai, with tracking and reliable timelines.' },
  { n: '05', icon: 'checkmark-done-outline', title: 'Delivery & support', desc: 'Goods delivered to your market — with ongoing support for repeat and bulk orders.' },
];

const MARKETS: { icon: Ion; region: string; note: string }[] = [
  { icon: 'business-outline', region: 'GCC & Middle East', note: 'UAE, KSA, Oman, Qatar, Bahrain, Kuwait' },
  { icon: 'restaurant-outline', region: 'Indian Subcontinent', note: 'India, Pakistan, Sri Lanka' },
  { icon: 'leaf-outline', region: 'Africa', note: 'East & West African markets' },
  { icon: 'globe-outline', region: 'Europe', note: 'Selected EU importers' },
  { icon: 'navigate-outline', region: 'Asia Pacific', note: 'Southeast Asian markets' },
  { icon: 'earth-outline', region: 'Worldwide', note: 'Project & bulk orders on request' },
];

// TODO: replace with real team members & photos.
const TEAM: { name: string; role: string; photo: string }[] = [
  { name: 'Managing Director', role: 'Founder & Strategy', photo: IMG('1500648767791-00dcc994a43e') },
  { name: 'Head of Operations', role: 'Sourcing & Quality', photo: IMG('1573496359142-b8d87734a5a2') },
  { name: 'Import / Export Manager', role: 'Logistics & Trade', photo: IMG('1507003211169-0a1dd7228f2d') },
  { name: 'Client Relations', role: 'Sales & Support', photo: IMG('1494790108377-be9c29b29330') },
];

export default function About() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const narrow = width < 860;
  const tight = width < 600;
  const display = tight ? 30 : width < 980 ? 42 : 52;

  return (
    <ScrollView style={{ backgroundColor: P.cream }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* ───────── 1 · HERO (dark) ───────── */}
      <View style={styles.hero}>
        <Container max={1180} style={{ paddingVertical: tight ? 52 : 80 }}>
          <View style={[styles.heroRow, narrow && { flexDirection: 'column', gap: 28, alignItems: 'stretch' }]}>
            <View style={{ flex: narrow ? undefined : 1.1 }}>
              <FadeInUp delay={40}>
                <View style={styles.kickerRow}>
                  <Text style={styles.kickerOnDark}>DUBAI · WORLDWIDE FOOD TRADE</Text>
                  <View style={styles.kickerLineLight} />
                </View>
              </FadeInUp>
              <FadeInUp delay={120}>
                <Text style={[styles.displayOnDark, { fontSize: display, lineHeight: display * 1.05 }]}>
                  We trade <Text style={styles.displayItalic}>good food</Text> worldwide.
                </Text>
              </FadeInUp>
              <FadeInUp delay={210}>
                <Text style={styles.introOnDark}>
                  {BRAND.legal} is a Dubai-based importer and exporter of premium groceries — from aromatic
                  basmati and spices to oils, pulses and beverages — supplying wholesale and retail markets worldwide.
                </Text>
              </FadeInUp>
              <FadeInUp delay={290}>
                <View style={styles.chipRow}>
                  <Chip icon="location-outline" label="Al Mankhool, Dubai" />
                  <Chip icon="globe-outline" label="15+ countries" />
                  <Chip icon="cube-outline" label="100+ products" />
                </View>
              </FadeInUp>
            </View>

            <FadeInUp delay={220} style={{ flex: narrow ? undefined : 0.92, width: narrow ? '100%' : undefined, alignSelf: 'stretch' }}>
              <ImageTile uri={PIC.port} caption="Trusted worldwide logistics" style={[styles.heroImg, narrow ? { height: tight ? 260 : 320 } : { flex: 1, minHeight: 440 }]} />
            </FadeInUp>
          </View>

          {/* Stats */}
          <FadeInUp delay={360}>
            <View style={[styles.statsRow, narrow && { flexWrap: 'wrap', marginTop: 36 }]}>
              {STATS.map((s, i) => (
                <View key={s.label} style={[styles.statItem, narrow ? { flexBasis: '50%', paddingVertical: 14 } : i > 0 && styles.statDivider]}>
                  <CountUp value={s.num} duration={1800} style={[styles.statNum, { fontSize: tight ? 30 : 38 }] as any} />
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </FadeInUp>
        </Container>
      </View>

      {/* ───────── 2 · WHO WE ARE ───────── */}
      <Container max={1000} style={{ paddingVertical: tight ? 48 : 80, alignItems: 'center' }}>
        <Reveal style={{ alignItems: 'center', gap: 12 }}>
          <Text style={styles.sectionKicker}>WHO WE ARE</Text>
          <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 32, textAlign: 'center' }]}>
            A Dubai trading house built on <Text style={styles.displayItalic}>trust</Text>
          </Text>
          <Text style={[styles.intro, { textAlign: 'center', maxWidth: 720 }]}>
            We bring dependable groceries from source to shelf — combining careful sourcing, honest pricing and
            reliable logistics so businesses everywhere can stock quality food with confidence. From our base in
            Al Mankhool, Dubai, we serve wholesale and retail markets across the globe.
          </Text>
        </Reveal>
        <View style={[styles.factGrid, { marginTop: tight ? 28 : 40 }]}>
          {FACTS.map((f, i) => (
            <FactCard key={f.label} icon={f.icon} label={f.label} value={f.value} i={i} width={narrow ? (tight ? '100%' : '48%') : '31.5%'} />
          ))}
        </View>
      </Container>

      {/* ───────── OUR OPERATIONS (company photos) ───────── */}
      <Container max={1180} style={{ paddingBottom: tight ? 48 : 80 }}>
        <Reveal style={{ alignItems: 'center', gap: 10, marginBottom: tight ? 24 : 36 }}>
          <Text style={styles.sectionKicker}>OUR OPERATIONS</Text>
          <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 32, textAlign: 'center' }]}>
            From our Dubai base to <Text style={styles.displayItalic}>your market</Text>
          </Text>
        </Reveal>
        <View style={[styles.opsGrid, narrow && { flexDirection: 'column' }]}>
          <Reveal delay={0} style={{ flex: narrow ? undefined : 1, width: narrow ? '100%' : undefined }}>
            <ImageTile uri={PIC.warehouse} caption="Warehousing in Dubai" style={{ height: tight ? 220 : 300 }} />
          </Reveal>
          <Reveal delay={90} style={{ flex: narrow ? undefined : 1, width: narrow ? '100%' : undefined }}>
            <ImageTile uri={PIC.trucks} caption="Logistics & transport" style={{ height: tight ? 220 : 300 }} />
          </Reveal>
          <Reveal delay={180} style={{ flex: narrow ? undefined : 1, width: narrow ? '100%' : undefined }}>
            <ImageTile uri={PIC.team} caption="Our team at work" style={{ height: tight ? 220 : 300 }} />
          </Reveal>
        </View>
      </Container>

      {/* ───────── 3 · WHAT WE TRADE (icon cards) ───────── */}
      <View style={styles.bandSoft}>
        <Container max={1180} style={{ paddingVertical: tight ? 48 : 80 }}>
          <Reveal style={{ alignItems: 'center', gap: 10, marginBottom: tight ? 26 : 40 }}>
            <Text style={styles.sectionKicker}>WHAT WE TRADE</Text>
            <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 32, textAlign: 'center' }]}>
              Our grocery <Text style={styles.displayItalic}>range</Text>
            </Text>
          </Reveal>
          <View style={styles.tradeGrid}>
            {TRADE.map((t, i) => (
              <TradeCard key={t.name} icon={t.icon} name={t.name} i={i} width={narrow ? (tight ? '48%' : '31%') : '23%'} />
            ))}
          </View>
        </Container>
      </View>

      {/* ───────── 4 · OUR STORY (timeline) ───────── */}
      <Container max={820} style={{ paddingVertical: tight ? 48 : 84 }}>
        <Reveal style={{ alignItems: 'center', gap: 10, marginBottom: tight ? 26 : 40 }}>
          <Text style={styles.sectionKicker}>OUR STORY</Text>
          <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 32, textAlign: 'center' }]}>
            From a Dubai warehouse to <Text style={styles.displayItalic}>markets worldwide</Text>
          </Text>
        </Reveal>
        <View>
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
      </Container>

      {/* ───────── 5 · HOW IMPORT / EXPORT WORKS ───────── */}
      <View style={styles.bandSoft}>
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
            <Reveal style={{ flex: narrow ? undefined : 1, width: narrow ? '100%' : undefined }}>
              <ImageTile uri={PIC.heroShip} caption="Container shipping, worldwide" style={{ height: tight ? 300 : 470 }} />
            </Reveal>
            <View style={{ flex: narrow ? undefined : 1.05, gap: 12 }}>
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

      {/* ───────── 6 · MARKETS WE SERVE ───────── */}
      <Container max={1180} style={{ paddingVertical: tight ? 48 : 84 }}>
        <Reveal style={{ alignItems: 'center', gap: 10, marginBottom: tight ? 26 : 40 }}>
          <Text style={styles.sectionKicker}>GLOBAL REACH</Text>
          <Text style={[styles.sectionHead, { fontSize: tight ? 24 : 32, textAlign: 'center' }]}>
            Markets we <Text style={styles.displayItalic}>serve</Text>
          </Text>
        </Reveal>
        <View style={styles.marketGrid}>
          {MARKETS.map((m, i) => (
            <RegionCard key={m.region} icon={m.icon} region={m.region} note={m.note} i={i} width={narrow ? (tight ? '100%' : '47%') : '31%'} />
          ))}
        </View>
      </Container>

      {/* ───────── 7 · VISION · PURPOSE · FOUNDER QUOTE ───────── */}
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

      {/* ───────── 8 · MEET THE TEAM ───────── */}
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

      {/* ───────── 9 · CTA ───────── */}
      <View style={styles.bandSoft}>
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
      </View>

      <Footer />
    </ScrollView>
  );
}

// ── pieces ─────────────────────────────────────────────────────────────────────
function Chip({ icon, label }: { icon: Ion; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={15} color="#E7C277" />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function TradeCard({ icon, name, i, width }: { icon: Ion; name: string; i: number; width: number | string }) {
  const { scale, onHoverIn, onHoverOut } = useHoverScale(1.04);
  return (
    <Reveal delay={i * 50} style={{ width: width as any }}>
      <Pressable onHoverIn={onHoverIn} onHoverOut={onHoverOut}>
        <Animated.View style={[styles.tradeCard, { transform: [{ scale }] }]}>
          <View style={styles.tradeIcon}><Ionicons name={icon} size={22} color={P.red} /></View>
          <Text style={styles.tradeName}>{name}</Text>
        </Animated.View>
      </Pressable>
    </Reveal>
  );
}

function FactCard({ icon, label, value, i, width }: { icon: Ion; label: string; value: string; i: number; width: number | string }) {
  const { scale, onHoverIn, onHoverOut } = useHoverScale(1.03);
  return (
    <Reveal delay={i * 60} style={{ width: width as any }}>
      <Pressable onHoverIn={onHoverIn} onHoverOut={onHoverOut}>
        <Animated.View style={[styles.factCard, { transform: [{ scale }] }]}>
          <View style={styles.factIcon}><Ionicons name={icon} size={18} color={P.red} /></View>
          <Text style={styles.factLabel}>{label}</Text>
          <Text style={styles.factValue}>{value}</Text>
        </Animated.View>
      </Pressable>
    </Reveal>
  );
}

// Company/operations photo tile with soft hover zoom + optional caption pill.
function ImageTile({ uri, caption, style, children }: { uri: string; caption?: string; style?: any; children?: React.ReactNode }) {
  const { scale, onHoverIn, onHoverOut } = useHoverScale(1.05);
  return (
    <Pressable style={[styles.imgTile, style]} onHoverIn={onHoverIn} onHoverOut={onHoverOut}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      </Animated.View>
      <View style={styles.imgShade} />
      {children}
      {caption ? (
        <View style={styles.imgCap}>
          <View style={styles.imgCapDot} />
          <Text style={styles.imgCapText}>{caption}</Text>
        </View>
      ) : null}
    </Pressable>
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

function MV({ icon, title, body }: { icon: Ion; title: string; body: string }) {
  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={styles.mvIcon}><Ionicons name={icon} size={24} color={P.gold} /></View>
      <Text style={styles.mvTitle}>{title}</Text>
      <Text style={styles.mvBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  displayItalic: { color: P.red, fontWeight: '900' },
  intro: { color: P.muted, fontSize: 16, lineHeight: 26 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sectionKicker: { color: P.red, fontWeight: '800', fontSize: 12, letterSpacing: 2 },
  sectionHead: { color: P.espresso, fontWeight: '900', letterSpacing: -0.3 },

  /* HERO */
  hero: { backgroundColor: P.espresso },
  kickerOnDark: { color: '#E7C277', fontWeight: '800', fontSize: 12, letterSpacing: 2 },
  kickerLineLight: { height: 1.5, width: 56, backgroundColor: '#E7C277', opacity: 0.7 },
  displayOnDark: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -0.5, maxWidth: 760, marginTop: 22 },
  introOnDark: { color: 'rgba(255,255,255,0.88)', fontSize: 16, lineHeight: 26, maxWidth: 620, marginTop: 18 },
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 22 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13.5 },

  /* STATS (on dark hero) */
  statsRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: 44, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 28 },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 6 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)' },
  statNum: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { color: 'rgba(255,255,255,0.62)', fontSize: 13, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },

  /* BANDS */
  bandSoft: { backgroundColor: P.band },

  /* FACTS */
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, alignSelf: 'stretch' },
  factCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#ECE3D4', padding: 18, gap: 8, minHeight: 120 },
  factIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FBEAE8', alignItems: 'center', justifyContent: 'center' },
  factLabel: { color: P.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  factValue: { color: P.espresso, fontSize: 14.5, fontWeight: '800', lineHeight: 20 },

  /* TRADE */
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  tradeCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#ECE3D4', paddingVertical: 20, paddingHorizontal: 14, alignItems: 'center', gap: 12 },
  tradeIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FBEAE8', alignItems: 'center', justifyContent: 'center' },
  tradeName: { color: P.espresso, fontWeight: '800', fontSize: 14, textAlign: 'center' },

  /* TIMELINE */
  tlRow: { flexDirection: 'row', gap: 16 },
  tlRail: { width: 18, alignItems: 'center' },
  tlDot: { width: 16, height: 16, borderRadius: 999, backgroundColor: P.red, borderWidth: 3, borderColor: P.cream, marginTop: 4 },
  tlLine: { width: 2, flex: 1, backgroundColor: '#E2D6C2', marginTop: 4 },
  tlBody: { flex: 1, paddingBottom: 22 },
  tlYear: { color: P.gold, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  tlTitle: { color: P.espresso, fontWeight: '800', fontSize: 16, marginTop: 2 },
  tlDesc: { color: P.muted, fontSize: 14, lineHeight: 21, marginTop: 3 },

  /* HERO IMAGE */
  heroRow: { flexDirection: 'row', alignItems: 'stretch', gap: 44 },
  heroImg: { width: '100%' },

  /* IMAGE TILES (operations / features) */
  imgTile: { borderRadius: 20, overflow: 'hidden', backgroundColor: P.band, justifyContent: 'flex-end' },
  imgShade: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web'
      ? ({ backgroundImage: 'linear-gradient(180deg, rgba(16,11,8,0) 40%, rgba(16,11,8,0.7) 100%)' } as any)
      : { backgroundColor: 'rgba(16,11,8,0.28)' }),
  },
  imgCap: { position: 'absolute', left: 14, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  imgCapDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: P.red },
  imgCapText: { color: P.espresso, fontWeight: '800', fontSize: 12.5 },
  opsGrid: { flexDirection: 'row', gap: 16, alignItems: 'stretch' },

  /* PROCESS (steps beside feature image) */
  procRow: { flexDirection: 'row', alignItems: 'stretch', gap: 44 },
  pstep: { flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#ECE3D4', padding: 16 },
  pstepIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: P.red, alignItems: 'center', justifyContent: 'center' },
  pstepHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  pstepN: { color: P.gold, fontWeight: '900', fontSize: 15 },
  pstepTitle: { color: P.espresso, fontWeight: '800', fontSize: 16, flexShrink: 1 },
  pstepDesc: { color: P.muted, fontSize: 13.5, lineHeight: 20 },

  /* MARKETS */
  marketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  regionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#ECE3D4', padding: 16 },
  regionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FBEAE8', alignItems: 'center', justifyContent: 'center' },
  regionTitle: { color: P.espresso, fontWeight: '900', fontSize: 15 },
  regionNote: { color: P.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },

  /* VISION / PURPOSE / QUOTE */
  darkBand: { backgroundColor: P.espresso },
  mvRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 56 },
  mvDividerV: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.12)' },
  mvDividerH: { height: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.12)' },
  mvIcon: { width: 54, height: 54, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(193,154,75,0.5)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(193,154,75,0.08)' },
  mvTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 22 },
  mvBody: { color: '#D6D3D1', fontSize: 15, lineHeight: 24 },
  quoteWrap: { alignItems: 'center', gap: 12, marginTop: 44, paddingTop: 40, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  quoteText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center', maxWidth: 760, letterSpacing: -0.2 },
  quoteAttr: { color: P.gold, fontWeight: '700', fontSize: 14 },

  /* TEAM */
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'center' },
  teamCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#ECE3D4', padding: 14, alignItems: 'center', gap: 4 },
  teamPhoto: { width: '100%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: P.band, marginBottom: 10 },
  teamName: { color: P.espresso, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  teamRole: { color: P.red, fontWeight: '700', fontSize: 13, textAlign: 'center' },

  /* CTA */
  ctaHead: { color: P.espresso, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },
  ctaSub: { color: P.muted, fontSize: 16, lineHeight: 25, textAlign: 'center', maxWidth: 540, marginTop: 16 },
  ctaBtns: { flexDirection: 'row', gap: 14, marginTop: 30 },
  btnRed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: P.red, paddingHorizontal: 26, paddingVertical: 15, borderRadius: 999 },
  btnRedText: { color: P.cream, fontWeight: '800', fontSize: 15 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1.5, borderColor: P.gold, paddingHorizontal: 26, paddingVertical: 15, borderRadius: 999 },
  btnOutlineText: { color: P.espresso, fontWeight: '800', fontSize: 15 },
});
