import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import { colors, radius, shadow, BRAND } from '../lib/theme';
import { Footer } from '../components/Footer';
import { Container, SectionTitle, Button, Card } from '../components/ui';
import { FadeInUp, Reveal } from '../components/Motion';

type Ion = keyof typeof Ionicons.glyphMap;

const STATS: { icon: Ion; value: string; label: string }[] = [
  { icon: 'cube-outline', value: '100+', label: 'Products' },
  { icon: 'grid-outline', value: '11', label: 'Categories' },
  { icon: 'earth-outline', value: '20+', label: 'Countries served' },
  { icon: 'business-outline', value: 'Dubai', label: 'UAE headquarters' },
];

const OFFERINGS: { icon: Ion; title: string; text: string }[] = [
  { icon: 'storefront-outline', title: 'Wholesale & Retail', text: 'Bulk supply for businesses and everyday packs for households — same trusted quality.' },
  { icon: 'globe-outline', title: 'Import & Export', text: 'We trade food and groceries across borders, partnering with importers and exporters worldwide from Dubai.' },
  { icon: 'basket-outline', title: 'Full Grocery Range', text: 'Rice, flour, spices & masala, pulses, oils & ghee, nuts, sauces, beverages and more — all under one roof.' },
  { icon: 'shield-checkmark-outline', title: 'Quality You Can Trust', text: 'Carefully sourced brands and fresh stock, with consistent quality on every order.' },
];

const VALUES: { icon: Ion; title: string; text: string }[] = [
  { icon: 'time-outline', title: 'Reliability', text: 'On-time supply and dependable stock for our partners.' },
  { icon: 'pricetags-outline', title: 'Fair Pricing', text: 'Competitive wholesale rates with transparent dealing.' },
  { icon: 'navigate-outline', title: 'Global Reach', text: 'A Dubai base connecting suppliers and buyers across continents.' },
];

function IconBadge({ name, size = 22 }: { name: Ion; size?: number }) {
  return (
    <View style={styles.iconBadge}>
      <Ionicons name={name} size={size} color={colors.orange} />
    </View>
  );
}

// Card that lifts and highlights on hover (web) — gives the page life.
function HoverCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <Pressable style={({ hovered }: any) => [styles.hoverCard, style, hovered && styles.hoverCardOn]}>
      {children}
    </Pressable>
  );
}

export default function About() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const gap = 16;
  // Percentage widths keep cards on the same row without scrollbar/rounding
  // overflow (which pushed cards onto their own line on mobile).
  const PCT: Record<number, string> = { 1: '100%', 2: '47%', 3: '31%', 4: '23%' };
  const offerW = PCT[width < 560 ? 1 : width < 900 ? 2 : width < 1180 ? 3 : 4];
  const valueW = PCT[width < 720 ? 1 : 3];
  const statW = PCT[width < 560 ? 2 : 4];
  const halfW = width < 760 ? '100%' : '48%';

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* Gradient hero */}
      <View style={styles.hero}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill as any} preserveAspectRatio="none">
          <Defs>
            <SvgGradient id="aboutHero" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#201A14" />
              <Stop offset="0.5" stopColor="#3E150E" />
              <Stop offset="1" stopColor="#8A1610" />
            </SvgGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#aboutHero)" />
        </Svg>

        <Container style={{ maxWidth: 1100, zIndex: 1 }}>
          <FadeInUp delay={60}>
            <View style={styles.kickerRow}>
              <Ionicons name="ellipse" size={8} color={colors.orange} />
              <Text style={styles.kicker}>ABOUT US</Text>
            </View>
          </FadeInUp>
          <FadeInUp delay={160}>
            <Text style={styles.h1}>{BRAND.name}</Text>
          </FadeInUp>
          <FadeInUp delay={280}>
            <Text style={styles.lead}>{BRAND.tagline}</Text>
          </FadeInUp>
          <FadeInUp delay={400}>
            <View style={styles.heroBtns}>
              <Button label="Shop Products" icon="bag-handle" onPress={() => router.push('/products')} />
              <Button label="Import / Export" variant="navy" icon="globe" onPress={() => router.push('/import-export')} />
            </View>
          </FadeInUp>
        </Container>
      </View>

      <Container style={{ marginTop: 24, maxWidth: 1100 }}>
        {/* Stats strip */}
        <Reveal>
          <View style={styles.grid}>
            {STATS.map((s, i) => (
              <HoverCard key={s.label} style={[styles.statCard, { width: statW }]}>
                <Ionicons name={s.icon} size={24} color={colors.navy} />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </HoverCard>
            ))}
          </View>
        </Reveal>

        {/* Who we are */}
        <Reveal style={{ marginTop: 32 }}>
          <SectionTitle title="Who we are" subtitle={BRAND.legal} />
          <Card style={{ gap: 12 }}>
            <Text style={styles.body}>
              RPK For Food Trading is a Dubai-based food & grocery trading company supplying quality
              products to retailers, wholesalers and households across the region — and to import/export
              partners worldwide. From premium basmati rice and bold spices to cooking oils, pulses, nuts
              and beverages, we bring a complete pantry under one trusted name.
            </Text>
            <Text style={styles.body}>
              Operating from Al Mankhool, Dubai, we combine competitive bulk pricing with consistent
              quality and dependable supply — making us a reliable partner whether you're stocking a shop,
              running a kitchen, or importing groceries to another country.
            </Text>
          </Card>
        </Reveal>

        {/* What we offer */}
        <Reveal style={{ marginTop: 32 }}>
          <SectionTitle title="What we offer" subtitle="Everything a food business needs" />
          <View style={styles.grid}>
            {OFFERINGS.map((o) => (
              <HoverCard key={o.title} style={[styles.offer, { width: offerW }]}>
                <IconBadge name={o.icon} />
                <Text style={styles.offerTitle}>{o.title}</Text>
                <Text style={styles.offerText}>{o.text}</Text>
              </HoverCard>
            ))}
          </View>
        </Reveal>

        {/* Why choose us */}
        <Reveal style={{ marginTop: 32 }}>
          <SectionTitle title="Why choose us" subtitle="What our partners count on" />
          <View style={styles.grid}>
            {VALUES.map((v) => (
              <HoverCard key={v.title} style={[styles.value, { width: valueW }]}>
                <View style={styles.valueHead}>
                  <IconBadge name={v.icon} size={20} />
                  <Text style={styles.offerTitle}>{v.title}</Text>
                </View>
                <Text style={styles.offerText}>{v.text}</Text>
              </HoverCard>
            ))}
          </View>
        </Reveal>

        {/* Visit / contact */}
        <Reveal style={{ marginTop: 32 }}>
          <SectionTitle title="Visit us" subtitle="We're based in the heart of Dubai" />
          <View style={styles.grid}>
            <ContactRow icon="location-outline" label="Address" value={BRAND.address} width={halfW} onPress={() => {}} />
            <View style={{ width: halfW, gap }}>
              <ContactRow icon="call-outline" label="Call us" value={BRAND.phone} onPress={() => router.push('/contact')} />
              <ContactRow icon="mail-outline" label="Email" value={BRAND.email} onPress={() => router.push('/contact')} />
            </View>
          </View>
        </Reveal>

        {/* CTA */}
        <Reveal style={{ marginTop: 32 }}>
          <View style={styles.ctaWrap}>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill as any} preserveAspectRatio="none">
              <Defs>
                <SvgGradient id="aboutCta" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#E2231A" />
                  <Stop offset="1" stopColor="#A8160F" />
                </SvgGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#aboutCta)" />
            </Svg>
            <View style={[styles.ctaInner, width < 760 && { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.ctaTitle}>Ready to work with us?</Text>
                <Text style={styles.ctaText}>Browse our catalogue or register your business for import/export.</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <Button label="Shop Products" variant="navy" onPress={() => router.push('/products')} />
                <Button label="Register" variant="outline" onPress={() => router.push('/import-export')} />
              </View>
            </View>
          </View>
        </Reveal>
      </Container>
      <View style={{ height: 56 }} />
      <Footer />
    </ScrollView>
  );
}

function ContactRow({ icon, label, value, width, onPress }: { icon: Ion; label: string; value: string; width?: any; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [styles.contactRow, width ? { width } : { flex: 1 }, hovered && styles.hoverCardOn]}>
      <IconBadge name={icon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: 56, overflow: 'hidden', position: 'relative', backgroundColor: '#201A14' },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: { color: colors.orange, fontWeight: '800', letterSpacing: 1.5, fontSize: 12 },
  h1: { color: colors.white, fontWeight: '900', fontSize: 36, marginTop: 10, lineHeight: 42 },
  lead: { color: '#F0E2E0', fontSize: 16, marginTop: 10, maxWidth: 640, lineHeight: 24 },
  heroBtns: { flexDirection: 'row', gap: 12, marginTop: 22, flexWrap: 'wrap' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },

  // hover-lift card base (used for stats / offerings / values)
  hoverCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 18, ...shadow.soft, transitionDuration: '160ms' as any },
  hoverCardOn: { borderColor: colors.orange, transform: [{ translateY: -4 }], ...shadow.card },

  statCard: { alignItems: 'center', gap: 6, paddingVertical: 20 },
  statValue: { fontWeight: '900', fontSize: 24, color: colors.ink },
  statLabel: { color: colors.muted, fontSize: 13, textAlign: 'center' },

  body: { color: colors.text, fontSize: 15, lineHeight: 24 },

  iconBadge: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  offer: { gap: 10 },
  offerTitle: { fontWeight: '900', fontSize: 16, color: colors.ink },
  offerText: { color: colors.muted, fontSize: 14, lineHeight: 21 },

  value: { gap: 10 },
  valueHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow.soft, transitionDuration: '160ms' as any },
  contactLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  contactValue: { color: colors.ink, fontSize: 15, fontWeight: '700', marginTop: 2 },

  ctaWrap: { borderRadius: radius.lg, overflow: 'hidden', position: 'relative', backgroundColor: colors.orange },
  ctaInner: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 24 },
  ctaTitle: { fontWeight: '900', fontSize: 22, color: colors.white },
  ctaText: { color: '#FFE3E1', fontSize: 14, lineHeight: 21 },
});
