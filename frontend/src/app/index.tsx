import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { api, Category, Product } from '../lib/api';
import { colors, radius, BRAND } from '../lib/theme';
import { HeroVideo } from '../components/HeroVideo';
import { ProductCard } from '../components/ProductCard';
import { CategoryCarousel } from '../components/CategoryCarousel';
import { Footer } from '../components/Footer';
import { Container, SectionTitle, Button } from '../components/ui';
import { FadeInUp, Reveal, CountUp, LetterReveal } from '../components/Motion';

const CHILI = require('../../assets/images/chili.png');

const HEADER_H = 66;

export default function Home() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [countries, setCountries] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.categories(), api.products()])
      .then(([c, p]) => {
        setCategories(c);
        setProducts(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // partner-country count (distinct approved import/export countries)
    api.stats().then((s) => setCountries(s.countries)).catch(() => {});
  }, []);

  // Full-screen hero (fills the viewport below the header).
  const heroHeight = Math.max(520, height - HEADER_H);
  const cols = width < 560 ? 2 : width < 900 ? 3 : width < 1100 ? 4 : width < 1500 ? 5 : 6;
  const gap = 16;
  const contentW = Math.min(width, 1600) - 36;
  const cardW = (contentW - gap * (cols - 1)) / cols;
  // single-line category carousel: ~2.4 tiles visible at once so one sits centred
  const carouselItemW = Math.min(320, Math.max(220, Math.round(contentW / (width < 560 ? 1.4 : 2.6))));

  // Group products by category, preserving category order.
  const grouped = useMemo(() => {
    return categories
      .map((c) => ({ category: c, items: products.filter((p) => p.category_name === c.name) }))
      .filter((g) => g.items.length > 0);
  }, [categories, products]);

  // Only categories that actually have products show on the storefront, so an
  // emptied/removed category disappears from "Shop by Category" too.
  const activeCategories = useMemo(() => grouped.map((g) => g.category), [grouped]);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* HERO */}
      <HeroVideo height={heroHeight}>
        <View style={{ maxWidth: 780, alignItems: 'center' }}>
          <FadeInUp delay={100}>
            <View style={styles.pill}>
              <Image source={CHILI} style={styles.pillChili} contentFit="contain" />
              <Text style={styles.pillText}>Dubai · Worldwide Import & Export</Text>
            </View>
          </FadeInUp>
          <View style={{ marginBottom: 14 }}>
            <LetterReveal
              text="Quality Groceries & Food, Traded Worldwide"
              delay={200}
              duration={1700}
              style={[styles.heroTitle, { fontSize: width < 600 ? 32 : 52, marginBottom: 0 }]}
            />
          </View>
          <FadeInUp delay={340}>
            <Text style={styles.heroSub}>
              From premium basmati and bold spices to oils, pulses and beverages — sourced and supplied by{' '}
              {BRAND.legal}.
            </Text>
          </FadeInUp>
          <FadeInUp delay={460}>
            <View style={styles.heroBtns}>
              <Button label="Shop Products" onPress={() => router.push('/products')} />
              <Button label="Import / Export" variant="outline" onPress={() => router.push('/import-export')} style={styles.outlineOnDark} />
            </View>
          </FadeInUp>
          <FadeInUp delay={600}>
            <View style={styles.trustRow}>
              <Trust n={`${products.length || '70'}+`} l="Products" />
              <Trust n={`${activeCategories.length || categories.length || '11'}`} l="Categories" />
              <Trust n={`${Math.max(countries, 20)}`} l="Countries" />
            </View>
          </FadeInUp>
        </View>
      </HeroVideo>

      {/* CATEGORIES */}
      <Container style={{ marginTop: 40 }}>
        <Reveal>
          <SectionTitle title="Shop by Category" subtitle="Browse our full grocery & food range" />
          {loading ? (
            <ActivityIndicator color={colors.red} />
          ) : (
            <CategoryCarousel categories={activeCategories} itemW={carouselItemW} viewportW={contentW} gap={22} />
          )}
        </Reveal>
      </Container>

      {/* ALL PRODUCTS — CATEGORY WISE (soft band gives depth) */}
      <View style={styles.productsBand}>
        <Container>
          <Reveal>
            <SectionTitle title="Our Products" subtitle="Everything we stock, organised by category" />
          </Reveal>
        </Container>
        {loading ? (
          <ActivityIndicator color={colors.red} style={{ marginTop: 20 }} />
        ) : (
          grouped.map((g) => (
            <Container key={g.category.id} style={{ marginTop: 30 }}>
              <Reveal>
                <View style={styles.catHead}>
                  <View style={styles.catHeadLeft}>
                    <View style={styles.accentDot} />
                    <Text style={styles.catHeadTitle}>{g.category.name}</Text>
                    <Text style={styles.catHeadCount}>{g.items.length}</Text>
                  </View>
                  <Button label="View all" variant="ghost" onPress={() => router.push(`/products?category=${g.category.slug}`)} style={styles.viewAll} />
                </View>
                <View style={[styles.grid, { gap }]}>
                  {g.items.slice(0, 6).map((p) => (
                    <ProductCard key={p.id} product={p} width={cardW} />
                  ))}
                </View>
              </Reveal>
            </Container>
          ))
        )}
      </View>

      <Footer />
    </ScrollView>
  );
}

function Trust({ n, l }: { n: string; l: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <CountUp value={n} duration={3200} style={styles.trustNum} />
      <Text style={styles.trustLabel}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginBottom: 16 },
  pillChili: { width: 26, height: 14 },
  pillText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  heroTitle: { color: colors.white, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  heroSub: { color: '#F3E7E5', fontSize: 16, textAlign: 'center', lineHeight: 24, maxWidth: 640, marginBottom: 22 },
  heroBtns: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  outlineOnDark: { borderColor: colors.white, backgroundColor: 'rgba(255,255,255,0.08)' },
  trustRow: { flexDirection: 'row', gap: 36, marginTop: 28 },
  trustNum: { color: colors.white, fontWeight: '900', fontSize: 24 },
  trustLabel: { color: '#EAD9D7', fontSize: 12, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  banner: {
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  bannerKicker: { color: colors.red, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  bannerTitle: { color: colors.ink, fontWeight: '900', fontSize: 26 },
  bannerText: { color: colors.text, fontSize: 15, lineHeight: 23, maxWidth: 620 },
  catHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  catHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accentDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: colors.red },
  catHeadTitle: { fontSize: 19, fontWeight: '900', color: colors.ink },
  catHeadCount: { fontSize: 12, fontWeight: '800', color: colors.muted, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  viewAll: { paddingHorizontal: 14, paddingVertical: 8 },
  productsBand: { backgroundColor: colors.soft, paddingTop: 44, paddingBottom: 52, marginTop: 52, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
});
