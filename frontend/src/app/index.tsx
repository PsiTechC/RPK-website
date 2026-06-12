import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api, Category, Product } from '../lib/api';
import { colors, radius, BRAND } from '../lib/theme';
import { HeroVideo } from '../components/HeroVideo';
import { ProductCard } from '../components/ProductCard';
import { CategoryTile } from '../components/CategoryTile';
import { Footer } from '../components/Footer';
import { Container, SectionTitle, Button } from '../components/ui';
import { FadeInUp, Reveal } from '../components/Motion';

const HEADER_H = 66;

export default function Home() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.categories(), api.products()])
      .then(([c, p]) => {
        setCategories(c);
        setProducts(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Full-screen hero (fills the viewport below the header).
  const heroHeight = Math.max(520, height - HEADER_H);
  const cols = width < 560 ? 2 : width < 900 ? 3 : width < 1100 ? 4 : 5;
  const gap = 16;
  const contentW = Math.min(width, 1200) - 36;
  const cardW = (contentW - gap * (cols - 1)) / cols;

  // Group products by category, preserving category order.
  const grouped = useMemo(() => {
    return categories
      .map((c) => ({ category: c, items: products.filter((p) => p.category_name === c.name) }))
      .filter((g) => g.items.length > 0);
  }, [categories, products]);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      {/* HERO */}
      <HeroVideo height={heroHeight}>
        <View style={{ maxWidth: 780, alignItems: 'center' }}>
          <FadeInUp delay={100}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>🌶️ Dubai · Worldwide Import & Export</Text>
            </View>
          </FadeInUp>
          <FadeInUp delay={220}>
            <Text style={[styles.heroTitle, { fontSize: width < 600 ? 32 : 52 }]}>
              Quality Groceries & Food, Traded Worldwide
            </Text>
          </FadeInUp>
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
              <Trust n={`${categories.length || '11'}`} l="Categories" />
              <Trust n="Bulk" l="Wholesale & Retail" />
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
            <View style={[styles.grid, { gap }]}>
              {categories.map((c) => (
                <CategoryTile key={c.id} category={c} width={cardW} />
              ))}
            </View>
          )}
        </Reveal>
      </Container>

      {/* IMPORT / EXPORT BANNER */}
      <Container style={{ marginTop: 44 }}>
        <Reveal>
          <View style={[styles.banner, width < 760 && { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={styles.bannerKicker}>FOR INTERNATIONAL BUYERS & SELLERS</Text>
              <Text style={styles.bannerTitle}>Import & Export with RPK</Text>
              <Text style={styles.bannerText}>
                Register your company to trade with us across borders. Our team reviews every application and
                partners with importers and exporters worldwide — directly from Dubai.
              </Text>
            </View>
            <Button label="Register your business →" variant="navy" onPress={() => router.push('/import-export')} />
          </View>
        </Reveal>
      </Container>

      {/* ALL PRODUCTS — CATEGORY WISE */}
      <Container style={{ marginTop: 44 }}>
        <SectionTitle title="Our Products" subtitle="Everything we stock, organised by category" />
      </Container>
      {loading ? (
        <ActivityIndicator color={colors.red} style={{ marginTop: 20 }} />
      ) : (
        grouped.map((g) => (
          <Container key={g.category.id} style={{ marginTop: 26 }}>
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
                {g.items.map((p) => (
                  <ProductCard key={p.id} product={p} width={cardW} />
                ))}
              </View>
            </Reveal>
          </Container>
        ))
      )}

      <Footer />
    </ScrollView>
  );
}

function Trust({ n, l }: { n: string; l: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.trustNum}>{n}</Text>
      <Text style={styles.trustLabel}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginBottom: 16 },
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
  catHeadCount: { fontSize: 12, fontWeight: '800', color: colors.muted, backgroundColor: '#F1F2F5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  viewAll: { paddingHorizontal: 14, paddingVertical: 8 },
});
