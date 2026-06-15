import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';
import { api, Category, Product } from '../lib/api';
import { colors, radius, shadow } from '../lib/theme';

export type ReqItem = { product_id: number; name: string; unit: string; qty: number };

// Lets a buyer pick multiple categories, choose products and set quantities —
// the whole requirement goes out in one inquiry.
export function RequirementBuilder({ items, onChange }: { items: ReqItem[]; onChange: (i: ReqItem[]) => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // category names
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    api.products().then(setProducts).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let ps = products;
    if (selected.size) ps = ps.filter((p) => p.category_name && selected.has(p.category_name));
    const s = q.trim().toLowerCase();
    if (s) ps = ps.filter((p) => p.name.toLowerCase().includes(s));
    return ps.slice(0, 60);
  }, [products, selected, q]);

  const toggleCat = (name: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });

  const addProduct = (p: Product) => {
    if (!items.find((i) => i.product_id === p.id)) {
      onChange([...items, { product_id: p.id, name: p.name, unit: p.unit, qty: 1 }]);
    }
    setOpen(false);
    setQ('');
  };
  const setQty = (pid: number, qty: number) => onChange(items.map((i) => (i.product_id === pid ? { ...i, qty: Math.max(1, qty) } : i)));
  const remove = (pid: number) => onChange(items.filter((i) => i.product_id !== pid));

  return (
    <View style={{ gap: 10, zIndex: open ? 1000 : 1, position: 'relative' }}>
      <Text style={styles.label}>Build your requirement (select products & quantities)</Text>

      {/* category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {categories.map((c) => {
          const on = selected.has(c.name);
          return (
            <Pressable key={c.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleCat(c.name)}>
              <Text style={[styles.chipText, on && { color: colors.white }]}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* product picker */}
      <View style={{ zIndex: open ? 50 : 1 }}>
        <Pressable style={styles.pickBtn} onPress={() => setOpen((o) => !o)}>
          <Text style={styles.pickText}>+ Add a product{selected.size ? ` from ${selected.size} categor${selected.size === 1 ? 'y' : 'ies'}` : ''}</Text>
          <Text style={styles.chev}>▾</Text>
        </Pressable>
        {open && (
          <>
            <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
            <View style={styles.dropdown}>
              <TextInput value={q} onChangeText={setQ} placeholder="Search products…" placeholderTextColor={colors.muted} style={styles.search} autoFocus />
              <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
                {filtered.map((p) => (
                  <Pressable key={p.id} style={({ hovered }: any) => [styles.opt, hovered && styles.optHover]} onPress={() => addProduct(p)}>
                    <Text style={styles.optName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.optUnit}>{p.unit}</Text>
                  </Pressable>
                ))}
                {filtered.length === 0 && <Text style={styles.noMatch}>No products match</Text>}
              </ScrollView>
            </View>
          </>
        )}
      </View>

      {/* selected items */}
      {items.length > 0 && (
        <View style={{ gap: 8 }}>
          {items.map((it) => (
            <View key={it.product_id} style={styles.item}>
              <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => setQty(it.product_id, it.qty - 1)}><Text style={styles.stepText}>−</Text></Pressable>
                <Text style={styles.qty}>{it.qty}</Text>
                <Pressable style={styles.stepBtn} onPress={() => setQty(it.product_id, it.qty + 1)}><Text style={styles.stepText}>+</Text></Pressable>
              </View>
              <Text style={styles.itemUnit}>{it.unit}</Text>
              <Pressable onPress={() => remove(it.product_id)} hitSlop={8}><Text style={styles.remove}>✕</Text></Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontWeight: '700', fontSize: 13 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#F1F2F5' },
  chipOn: { backgroundColor: colors.navy },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: colors.orange, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  pickText: { color: colors.orangeDark, fontWeight: '800', fontSize: 14 },
  chev: { color: colors.orangeDark, fontSize: 12, fontWeight: '900' },
  scrim: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 },
  dropdown: { position: 'absolute' as any, top: 52, left: 0, right: 0, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 6, zIndex: 100, ...shadow.card },
  search: { marginHorizontal: 8, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.offWhite, borderRadius: radius.sm, color: colors.text, fontSize: 14, outlineStyle: 'none' as any },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  optHover: { backgroundColor: colors.offWhite },
  optName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  optUnit: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  noMatch: { color: colors.muted, fontSize: 13, padding: 12, textAlign: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.offWhite, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  itemName: { flex: 1, color: colors.ink, fontWeight: '700', fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 999, backgroundColor: colors.white },
  stepBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 18, fontWeight: '800', color: colors.navy },
  qty: { width: 30, textAlign: 'center', fontWeight: '800', color: colors.ink },
  itemUnit: { color: colors.muted, fontWeight: '700', fontSize: 12, width: 40 },
  remove: { color: colors.red, fontWeight: '900', fontSize: 15 },
});
