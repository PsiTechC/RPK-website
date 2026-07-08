import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, Category, Product } from '../lib/api';
import { colors, radius, shadow } from '../lib/theme';
import { ProductCard } from '../components/ProductCard';
import { Footer } from '../components/Footer';
import { Container, SectionTitle } from '../components/ui';

export default function Products() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ category?: string; view?: string }>();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string>(params.category || 'all');
  const [search, setSearch] = useState('');
  const [nonEmptyCats, setNonEmptyCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    api
      .products()
      .then((all) => setNonEmptyCats(new Set(all.map((p) => p.category_name).filter(Boolean) as string[])))
      .catch(() => {});
  }, []);

  const visibleCats = nonEmptyCats.size ? categories.filter((c) => nonEmptyCats.has(c.name)) : categories;

  useEffect(() => { setActive(params.category || 'all'); }, [params.category]);

  useEffect(() => {
    setLoading(true);
    api.products({ category: active === 'all' ? undefined : active })
      .then(setProducts).catch(() => {}).finally(() => setLoading(false));
  }, [active]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  // Category page (reached via the Categories nav) shows the left sidebar.
  // The plain Shop page does not.
  const catMode = params.view === 'categories';
  const stacked = width < 900;
  const useSidebar = catMode && !stacked;

  const gap = 16;
  // Category page is full-width & left-aligned (small left padding); Shop page
  // uses the centered Container (18px both sides).
  const contentW = useSidebar ? Math.min(width, 1480) - 30 : Math.min(width, 1400) - 36;
  const sidebarW = 234;
  const mainGap = 26;
  const mainW = useSidebar ? contentW - sidebarW - mainGap : contentW;
  // Phones show one full-width card per row (cleaner than two cramped columns).
  const cols = width < 560 ? 1 : width < 860 ? 3 : useSidebar ? (mainW >= 900 ? 5 : 4) : width < 1180 ? 4 : 5;
  // Percentage widths (like the home page) keep exactly N cards per row regardless
  // of scrollbar width or sub-pixel rounding — fixed-pixel widths dropped mobile to
  // one card per row once the vertical scrollbar appeared.
  const cardW = ({ 1: '100%', 2: '47%', 3: '31%', 4: '23%', 5: '18%' } as Record<number, string>)[cols] ?? '47%';

  const activeName =
    active !== 'all'
      ? categories.find((c) => c.slug === active)?.name || 'Products'
      : params.category === 'all'
      ? 'All Categories'
      : 'All Products';

  function selectCat(slug: string) {
    setActive(slug);
    if (catMode) router.setParams({ category: slug, view: 'categories' });
    else router.setParams({ category: slug === 'all' ? undefined : slug });
  }

  const grid = loading ? (
    <ActivityIndicator color={colors.orange} style={{ marginTop: 40 }} />
  ) : filtered.length === 0 ? (
    <Text style={styles.empty}>No products found.</Text>
  ) : (
    <View style={[styles.grid, { gap, marginTop: useSidebar ? 0 : 16 }]}>
      {filtered.map((p) => (
        <ProductCard key={p.id} product={p} width={cardW} />
      ))}
    </View>
  );

  const searchBar = (
    <View style={styles.searchWrap}>
      <Ionicons name="search-outline" size={18} color={colors.muted} />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search products…"
        placeholderTextColor={colors.muted}
        style={styles.search}
      />
    </View>
  );

  const chips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      <Chip label="All" active={active === 'all'} onPress={() => selectCat('all')} />
      {visibleCats.map((c) => (
        <Chip key={c.id} label={c.name} active={active === c.slug} onPress={() => selectCat(c.slug)} />
      ))}
    </ScrollView>
  );

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      {useSidebar ? (
        // CATEGORY PAGE — full-width, flush-left sidebar + grid, no heading
        <View style={styles.catPage}>
          {searchBar}
          <View style={styles.layout}>
            <View style={styles.sidebar}>
              <Text style={styles.sideTitle}>CATEGORIES</Text>
              <SideItem label="All Products" active={active === 'all'} onPress={() => selectCat('all')} />
              {visibleCats.map((c) => (
                <SideItem key={c.id} label={c.name} active={active === c.slug} onPress={() => selectCat(c.slug)} />
              ))}
            </View>
            <View style={{ flex: 1, minWidth: 0 as any }}>{grid}</View>
          </View>
        </View>
      ) : (
        // SHOP PAGE — centered container, chips, no sidebar
        <Container max={1400} style={{ marginTop: 24 }}>
          <SectionTitle title={activeName} subtitle={`${filtered.length} item${filtered.length === 1 ? '' : 's'}`} />
          {searchBar}
          {chips}
          {grid}
        </Container>
      )}
      <View style={{ height: 48 }} />
      <Footer />
    </ScrollView>
  );
}

function SideItem({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [styles.sideItem, hovered && !active && styles.sideItemHover, active && styles.sideItemActive]}>
      {active && <View style={styles.sideBar} />}
      <Text style={[styles.sideText, active && styles.sideTextActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
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
  catPage: { width: '100%', maxWidth: 1480, alignSelf: 'center', paddingLeft: 12, paddingRight: 16, paddingTop: 8 },
  layout: { flexDirection: 'row', alignItems: 'flex-start', gap: 26, marginTop: 0 },
  sidebar: {
    width: 234, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: 12, gap: 2, ...shadow.soft,
    ...(Platform.OS === 'web' ? ({ position: 'sticky', top: 8 } as any) : {}),
  },
  sideTitle: { color: colors.muted, fontWeight: '900', fontSize: 11.5, letterSpacing: 1.5, paddingHorizontal: 10, paddingVertical: 8 },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: radius.md, position: 'relative' },
  sideItemHover: { backgroundColor: colors.offWhite },
  sideItemActive: { backgroundColor: 'rgba(226,35,26,0.08)' },
  sideBar: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, backgroundColor: colors.red },
  sideText: { color: colors.text, fontWeight: '700', fontSize: 14, flex: 1 },
  sideTextActive: { color: colors.red },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 4, marginTop: 0, marginBottom: 10,
  },
  search: { flex: 1, paddingVertical: 10, color: colors.text, fontSize: 15, outlineStyle: 'none' as any },
  chips: { gap: 8, paddingVertical: 4, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F1F2F5', borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: colors.navy },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: { color: colors.muted, marginTop: 40, textAlign: 'center', fontSize: 15 },
});
