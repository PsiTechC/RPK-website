import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, useWindowDimensions } from 'react-native';
import { api, Category, Product } from '../lib/api';
import { colors, radius, shadow } from '../lib/theme';

export type ReqItem = { product_id: number; name: string; unit: string; qty: number };

type Opt = { key: string; label: string; right?: string; raw: any };

// Generic dropdown select (category / product).
function Select({
  placeholder,
  value,
  options,
  onSelect,
  disabled,
}: {
  placeholder: string;
  value?: string;
  options: Opt[];
  onSelect: (raw: any) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1, minWidth: 150, zIndex: open ? 1000 : 1, position: 'relative' }}>
      <Pressable style={[styles.select, disabled && styles.selectDisabled]} onPress={() => !disabled && setOpen((o) => !o)}>
        <Text style={[styles.selectText, !value && { color: colors.muted }]} numberOfLines={1}>{value || placeholder}</Text>
        <Text style={styles.chev}>▾</Text>
      </Pressable>
      {open && (
        <>
          <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
          <View style={styles.dropdown}>
            <ScrollView style={{ maxHeight: 240 }} keyboardShouldPersistTaps="handled">
              {options.map((o) => (
                <Pressable key={o.key} style={({ hovered }: any) => [styles.opt, hovered && styles.optHover]} onPress={() => { onSelect(o.raw); setOpen(false); }}>
                  <Text style={styles.optName} numberOfLines={1}>{o.label}</Text>
                  {!!o.right && <Text style={styles.optUnit}>{o.right}</Text>}
                </Pressable>
              ))}
              {options.length === 0 && <Text style={styles.noMatch}>No options</Text>}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

// Cascading requirement builder: pick a Category → pick a Product → set Quantity
// → Add. Selected items are listed with editable quantities. Shared by the
// Contact and Import/Export forms.
export function RequirementBuilder({ items, onChange }: { items: ReqItem[]; onChange: (i: ReqItem[]) => void }) {
  const { width } = useWindowDimensions();
  const stacked = width < 620;
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cat, setCat] = useState<Category | null>(null);
  const [prod, setProd] = useState<Product | null>(null);
  const [qty, setQty] = useState('1');
  const [picking, setPicking] = useState(false);
  const showPicker = picking || items.length === 0;

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    api.products().then(setProducts).catch(() => {});
  }, []);

  const catOpts: Opt[] = useMemo(
    () => categories.map((c) => ({ key: String(c.id), label: c.name, raw: c })),
    [categories]
  );
  const prodOpts: Opt[] = useMemo(
    () =>
      products
        .filter((p) => cat && p.category_name === cat.name)
        .map((p) => ({ key: String(p.id), label: p.name, right: p.unit, raw: p })),
    [products, cat]
  );

  function add() {
    if (!prod) return;
    const n = Math.max(1, parseInt(qty.replace(/[^\d]/g, '') || '1', 10));
    const existing = items.find((i) => i.product_id === prod.id);
    if (existing) onChange(items.map((i) => (i.product_id === prod.id ? { ...i, qty: i.qty + n } : i)));
    else onChange([...items, { product_id: prod.id, name: prod.name, unit: prod.unit, qty: n }]);
    setProd(null);
    setQty('1');
    setPicking(false); // collapse the pickers after adding
  }

  const setItemQty = (pid: number, q: number) => onChange(items.map((i) => (i.product_id === pid ? { ...i, qty: Math.max(1, q) } : i)));
  const remove = (pid: number) => onChange(items.filter((i) => i.product_id !== pid));

  return (
    <View style={{ gap: 10, position: 'relative', zIndex: 5 }}>
      <Text style={styles.label}>Build your requirement (select products & quantities)</Text>

      {/* Selected items */}
      {items.length > 0 && (
        <View style={{ gap: 8 }}>
          {items.map((it) => (
            <View key={it.product_id} style={styles.item}>
              <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => setItemQty(it.product_id, it.qty - 1)}><Text style={styles.stepText}>−</Text></Pressable>
                <TextInput
                  value={String(it.qty)}
                  onChangeText={(t) => setItemQty(it.product_id, parseInt(t.replace(/[^\d]/g, '') || '1', 10))}
                  keyboardType="number-pad"
                  style={styles.qtyInput}
                />
                <Pressable style={styles.stepBtn} onPress={() => setItemQty(it.product_id, it.qty + 1)}><Text style={styles.stepText}>+</Text></Pressable>
              </View>
              <Text style={styles.itemUnit}>{it.unit}</Text>
              <Pressable onPress={() => remove(it.product_id)} hitSlop={8}><Text style={styles.remove}>✕</Text></Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Cascading pickers — shown initially or when "Add more" is tapped */}
      {showPicker ? (
        <View style={[styles.row, stacked && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <Select
            placeholder="Select category"
            value={cat?.name}
            options={catOpts}
            onSelect={(c: Category) => { setCat(c); setProd(null); }}
          />
          <Select
            placeholder={cat ? 'Select product' : 'Select category first'}
            value={prod?.name}
            options={prodOpts}
            onSelect={(p: Product) => setProd(p)}
            disabled={!cat}
          />
          <View style={[styles.qtyBox, stacked && { width: '100%' }]}>
            <TextInput
              value={qty}
              onChangeText={(t) => setQty(t.replace(/[^\d]/g, ''))}
              keyboardType="number-pad"
              placeholder="Qty"
              placeholderTextColor={colors.muted}
              style={styles.qtyField}
            />
          </View>
          <Pressable style={[styles.addBtn, (!prod) && { opacity: 0.5 }, stacked && { width: '100%' }]} onPress={add} disabled={!prod}>
            <Text style={styles.addText}>+ Add</Text>
          </Pressable>
          {items.length > 0 && (
            <Pressable style={styles.cancelBtn} onPress={() => setPicking(false)} hitSlop={6}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable style={styles.addMore} onPress={() => setPicking(true)}>
          <Text style={styles.addMoreText}>+ Add more</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.ink, fontWeight: '900', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },

  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11 },
  selectDisabled: { backgroundColor: colors.offWhite },
  selectText: { flex: 1, color: colors.text, fontWeight: '600', fontSize: 14 },
  chev: { color: colors.muted, fontSize: 12, fontWeight: '900' },

  scrim: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 },
  dropdown: { position: 'absolute' as any, top: 50, left: 0, right: 0, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 6, zIndex: 100, ...shadow.card },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  optHover: { backgroundColor: colors.offWhite },
  optName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  optUnit: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  noMatch: { color: colors.muted, fontSize: 13, padding: 12, textAlign: 'center' },

  qtyBox: { width: 84, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  qtyField: { paddingHorizontal: 12, paddingVertical: 11, textAlign: 'center', fontWeight: '800', color: colors.ink, fontSize: 14, outlineStyle: 'none' as any },
  addBtn: { backgroundColor: colors.orange, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  addText: { color: colors.white, fontWeight: '900', fontSize: 14 },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  addMore: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.orange, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  addMoreText: { color: colors.orangeDark, fontWeight: '800', fontSize: 14 },

  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.offWhite, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  itemName: { flex: 1, color: colors.ink, fontWeight: '700', fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 999, backgroundColor: colors.white },
  stepBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 18, fontWeight: '800', color: colors.navy },
  qtyInput: { width: 40, height: 30, textAlign: 'center', fontWeight: '800', color: colors.ink, fontSize: 14, outlineStyle: 'none' as any },
  itemUnit: { color: colors.muted, fontWeight: '700', fontSize: 12, width: 40 },
  remove: { color: colors.red, fontWeight: '900', fontSize: 15 },
});
