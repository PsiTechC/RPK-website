import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, BRAND } from '../lib/theme';
import { Footer } from '../components/Footer';
import { Container, SectionTitle, Button, Card } from '../components/ui';

const OFFERINGS = [
  { icon: '🛒', title: 'Wholesale & Retail', text: 'Bulk supply for businesses and everyday packs for households — same trusted quality.' },
  { icon: '🌍', title: 'Import & Export', text: 'We trade food and groceries across borders, partnering with importers and exporters worldwide from Dubai.' },
  { icon: '🌶️', title: 'Full Grocery Range', text: 'Rice, flour, spices & masala, pulses, oils & ghee, nuts, sauces, beverages and more — all under one roof.' },
  { icon: '✅', title: 'Quality You Can Trust', text: 'Carefully sourced brands and fresh stock, with consistent quality on every order.' },
];

const VALUES = [
  { title: 'Reliability', text: 'On-time supply and dependable stock for our partners.' },
  { title: 'Fair Pricing', text: 'Competitive wholesale rates with transparent dealing.' },
  { title: 'Global Reach', text: 'A Dubai base connecting suppliers and buyers across continents.' },
];

export default function About() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cols = width < 720 ? 1 : 2;
  const gap = 16;
  const contentW = Math.min(width, 1100) - 36;
  const cardW = (contentW - gap * (cols - 1)) / cols;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* Intro band */}
      <View style={styles.band}>
        <Container>
          <Text style={styles.kicker}>ABOUT US</Text>
          <Text style={styles.h1}>{BRAND.legal}</Text>
          <Text style={styles.lead}>{BRAND.tagline}</Text>
        </Container>
      </View>

      <Container style={{ marginTop: 28, maxWidth: 1100 }}>
        {/* Story */}
        <Card style={{ gap: 12 }}>
          <Text style={styles.sectionH}>Who we are</Text>
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

        {/* What we offer */}
        <View style={{ marginTop: 28 }}>
          <SectionTitle title="What we offer" subtitle="Everything a food business needs" />
          <View style={styles.grid}>
            {OFFERINGS.map((o) => (
              <Card key={o.title} style={[styles.offer, { width: cardW }]}>
                <Text style={{ fontSize: 30 }}>{o.icon}</Text>
                <Text style={styles.offerTitle}>{o.title}</Text>
                <Text style={styles.offerText}>{o.text}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Values */}
        <View style={{ marginTop: 28 }}>
          <SectionTitle title="Our values" />
          <View style={styles.grid}>
            {VALUES.map((v) => (
              <Card key={v.title} style={[styles.value, { width: width < 720 ? '100%' : (contentW - gap * 2) / 3 }]}>
                <View style={styles.valueDot} />
                <Text style={styles.offerTitle}>{v.title}</Text>
                <Text style={styles.offerText}>{v.text}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* CTA */}
        <Card style={[styles.cta, width < 760 && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.ctaTitle}>Ready to work with us?</Text>
            <Text style={styles.offerText}>Browse our catalogue or register your business for import/export.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Button label="Shop Products" onPress={() => router.push('/products')} />
            <Button label="Import / Export" variant="navy" onPress={() => router.push('/import-export')} />
            <Button label="Contact Us" variant="outline" onPress={() => router.push('/contact')} />
          </View>
        </Card>
      </Container>
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: colors.navyDark, paddingVertical: 40 },
  kicker: { color: colors.orange, fontWeight: '800', letterSpacing: 1.5, fontSize: 12 },
  h1: { color: colors.white, fontWeight: '900', fontSize: 30, marginTop: 8 },
  lead: { color: '#E7DAD8', fontSize: 16, marginTop: 8, maxWidth: 640, lineHeight: 23 },
  sectionH: { fontWeight: '900', fontSize: 18, color: colors.ink },
  body: { color: colors.text, fontSize: 15, lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  offer: { gap: 8 },
  offerTitle: { fontWeight: '900', fontSize: 16, color: colors.ink },
  offerText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  value: { gap: 8 },
  valueDot: { width: 12, height: 12, borderRadius: 999, backgroundColor: colors.red },
  cta: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: colors.cream,
    borderColor: colors.border,
  },
  ctaTitle: { fontWeight: '900', fontSize: 20, color: colors.ink },
});
