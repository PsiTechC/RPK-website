import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { api, Product, Category } from '../../lib/api';
import { colors, radius, shadow } from '../../lib/theme';
import { Button, Field } from '../ui';

const UNITS = ['KG', 'BAG', 'PKT', 'CAT', 'PC', 'TIN'];

export function ProductForm({
  token,
  product,
  categories,
  onClose,
  onSaved,
}: {
  token: string;
  product: Product | null; // null = create
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    category_id: product?.category_id ?? (categories[0]?.id ?? null),
    unit: product?.unit || 'PC',
    price: String(product?.price ?? ''),
    stock: String(product?.stock ?? '100'),
    image_url: product?.image_url || '',
    description: product?.description || '',
    is_active: product?.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError('');
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    const body = {
      name: form.name.trim(),
      category_id: form.category_id,
      unit: form.unit,
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock, 10) || 0,
      image_url: form.image_url.trim(),
      description: form.description,
      is_active: form.is_active,
    };
    try {
      if (product) await api.admin.updateProduct(product.id, body, token);
      else await api.admin.createProduct(body, token);
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.head}>
          <Text style={styles.title}>{product ? 'Edit product' : 'New product'}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
          <Field label="Name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Product name" />

          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.chip, form.category_id === c.id && styles.chipActive]}
                  onPress={() => setForm({ ...form, category_id: c.id })}
                >
                  <Text style={[styles.chipText, form.category_id === c.id && { color: colors.white }]}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Unit</Text>
            <View style={styles.chips}>
              {UNITS.map((u) => (
                <Pressable key={u} style={[styles.chip, form.unit === u && styles.chipActive]} onPress={() => setForm({ ...form, unit: u })}>
                  <Text style={[styles.chipText, form.unit === u && { color: colors.white }]}>{u}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Field style={{ flex: 1 }} label="Price (AED)" value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} placeholder="0.00" keyboardType="decimal-pad" />
            <Field style={{ flex: 1 }} label="Stock" value={form.stock} onChangeText={(t) => setForm({ ...form, stock: t })} placeholder="100" keyboardType="number-pad" />
          </View>

          <Field label="Image URL" value={form.image_url} onChangeText={(t) => setForm({ ...form, image_url: t })} placeholder="https://…" />
          <Field label="Description" value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} placeholder="Description" multiline />

          <Pressable style={styles.toggle} onPress={() => setForm({ ...form, is_active: !form.is_active })}>
            <View style={[styles.checkbox, form.is_active && styles.checkboxOn]}>{form.is_active && <Text style={styles.check}>✓</Text>}</View>
            <Text style={styles.toggleText}>Active (visible in store)</Text>
          </Pressable>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>

        <View style={styles.foot}>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button label={busy ? 'Saving…' : 'Save product'} onPress={save} disabled={busy} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,28,66,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 200,
  },
  modal: { width: '100%', maxWidth: 560, maxHeight: '88vh' as any, backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', ...shadow.card },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.navy },
  title: { color: colors.white, fontWeight: '900', fontSize: 17 },
  close: { color: colors.white, fontSize: 18, fontWeight: '700' },
  label: { color: colors.text, fontWeight: '700', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#F1F2F5' },
  chipActive: { backgroundColor: colors.orange },
  chipText: { fontWeight: '700', color: colors.text, fontSize: 13 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.green, borderColor: colors.green },
  check: { color: colors.white, fontWeight: '900' },
  toggleText: { color: colors.text, fontWeight: '600' },
  error: { color: colors.red, fontSize: 13 },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
