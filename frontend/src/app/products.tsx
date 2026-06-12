import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, Category, Product } from '../lib/api';
import { colors, radius } from '../lib/theme';
import { ProductCard } from '../components/ProductCard';
import { Footer } from '../components/Footer';
import { Container, SectionTitle } from '../components/ui';

export default function Products() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ category?: string }>();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string>(params.category || 'all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setActive(params.category || 'all');
  }, [params.category]);

  useEffect(() => {
    setLoading(true);
    api
      .products({ category: active === 'all' ? undefined : active })
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [active]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const cols = width < 560 ? 2 : width < 900 ? 3 : width < 1100 ? 4 : width < 1500 ? 5 : 6;
  const gap = 16;
  const contentW = Math.min(width, 1600) - 36;
  const cardW = (contentW - gap * (cols - 1)) / cols;

  const activeName = active === 'all' ? 'All Products' : categories.find((c) => c.slug === active)?.name || 'Products';

  function selectCat(slug: string) {
    setActive(slug);
    router.setParams({ category: slug === 'all' ? undefined : slug });
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Container style={{ marginTop: 26 }}>
        <SectionTitle title={activeName} subtitle={`${filtered.length} item${filtered.length === 1 ? '' : 's'}`} />

        <View style={styles.searchWrap}>
          <Text style={{ fontSize: 16 }}>🔎</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products…"
            placeholderTextColor={colors.muted}
            style={styles.search}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All" active={active === 'all'} onPress={() => selectCat('all')} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} active={active === c.slug} onPress={() => selectCat(c.slug)} />
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.orange} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>No products found.</Text>
        ) : (
          <View style={[styles.grid, { gap, marginTop: 18 }]}>
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} width={cardW} />
            ))}
          </View>
        )}
      </Container>
      <Footer />
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 14,
  },
  search: { flex: 1, paddingVertical: 10, color: colors.text, fontSize: 15, outlineStyle: 'none' as any },
  chips: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F1F2F5', borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: colors.navy },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: { color: colors.muted, marginTop: 40, textAlign: 'center', fontSize: 15 },
});
