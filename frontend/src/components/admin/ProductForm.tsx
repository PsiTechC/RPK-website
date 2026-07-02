import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { api, Product, Category, imageUri } from '../../lib/api';
import { colors, radius, shadow } from '../../lib/theme';
import { Button, Field } from '../ui';
import { useToast } from '../Toast';
import { vProductName, vPrice, vStock, vImageUrl, isClean } from '../../lib/validate';
import { PRODUCT_IMAGE, isProductImageSize, measureImage } from '../../lib/productImage';

const UNITS = ['KG', 'GM', 'LTR', 'ML', 'BAG', 'PKT', 'BOX', 'DOZEN', 'CAT', 'PC', 'TIN'];

export function ProductForm({
  token,
  product,
  categories: initialCategories,
  onClose,
  onSaved,
}: {
  token: string;
  product: Product | null; // null = create
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // Local copy so a category created inline appears immediately and stays
  // selectable without closing the modal.
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || '',
    category_id: product?.category_id ?? (categories[0]?.id ?? null),
    unit: product?.unit || 'PC',
    price: String(product?.price ?? '0'),
    stock: String(product?.stock ?? '0'),
    image_url: product?.image_url || '',
    description: product?.description || '',
    nutrition: product?.nutrition || '',
    seller: product?.seller || '',
    is_active: product?.is_active ?? true,
  });
  const [highlights, setHighlights] = useState<{ label: string; value: string }[]>(product?.highlights ?? []);
  const addHl = () => setHighlights((h) => [...h, { label: '', value: '' }]);
  const removeHl = (i: number) => setHighlights((h) => h.filter((_, idx) => idx !== i));
  const updateHl = (i: number, k: 'label' | 'value', v: string) =>
    setHighlights((h) => h.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  // Natural pixel size of the current image, measured so we can warn when it
  // isn't the standard product-image size. null = none / not yet measured.
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const toast = useToast();

  // Whenever the image changes (upload, pasted URL, or editing an existing
  // product), measure it and flag a mismatch against the standard size.
  useEffect(() => {
    const src = form.image_url ? imageUri(form.image_url) : '';
    if (!src) { setImgDims(null); return; }
    let cancelled = false;
    measureImage(src).then((d) => { if (!cancelled) setImgDims(d); });
    return () => { cancelled = true; };
  }, [form.image_url]);

  const imgSizeOk = !imgDims || isProductImageSize(imgDims.w, imgDims.h);

  const set = (k: keyof typeof form) => (t: string) => {
    setForm((f) => ({ ...f, [k]: t }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  // Price: digits + a single decimal point only. Stock: digits only.
  const setPrice = (t: string) => {
    const clean = t.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/^0+(?=\d)/, '');
    setForm((f) => ({ ...f, price: clean }));
    setErrors((e) => (e.price ? { ...e, price: undefined } : e));
  };
  const setStock = (t: string) => {
    const clean = t.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    setForm((f) => ({ ...f, stock: clean }));
    setErrors((e) => (e.stock ? { ...e, stock: undefined } : e));
  };

  // Create a category inline, then select it for this product.
  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setForm((f) => ({ ...f, category_id: existing.id }));
      setAddingCat(false);
      setNewCat('');
      return;
    }
    setSavingCat(true);
    try {
      const cat = await api.admin.createCategory({ name }, token);
      setCategories((cs) => [...cs, cat]);
      setForm((f) => ({ ...f, category_id: cat.id }));
      setErrors((e) => ({ ...e, category_id: undefined }));
      setAddingCat(false);
      setNewCat('');
      toast(`Category “${cat.name}” added`, 'success');
    } catch (e: any) {
      toast(e.message || 'Could not add category', 'error');
    } finally {
      setSavingCat(false);
    }
  }

  function validate(): boolean {
    const e: Record<string, string | null> = {
      name: vProductName(form.name),
      price: vPrice(form.price),
      stock: vStock(form.stock),
      image_url: vImageUrl(form.image_url),
      category_id: form.category_id == null ? 'Please choose a category' : null,
    };
    setErrors(e);
    return isClean(e);
  }

  // Web file picker: open the native dialog, upload the chosen image to the
  // backend, then store the returned URL as the product image.
  function pickFile() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      setError('');
      setUploading(true);
      try {
        const { url } = await api.admin.uploadImage(file, token);
        setForm((f) => ({ ...f, image_url: url }));
      } catch (e: any) {
        setError(e.message || 'Upload failed.');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }

  async function save() {
    setError('');
    if (!validate()) return;
    setBusy(true);
    const body = {
      name: form.name.trim(),
      category_id: form.category_id,
      unit: form.unit,
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock, 10) || 0,
      image_url: form.image_url.trim(),
      description: form.description,
      nutrition: form.nutrition,
      seller: form.seller,
      highlights: highlights.filter((h) => h.label.trim() || h.value.trim()),
      is_active: form.is_active,
    };
    try {
      if (product) {
        await api.admin.updateProduct(product.id, body, token);
        toast(`“${body.name}” updated`, 'success');
      } else {
        await api.admin.createProduct(body, token);
        toast(`“${body.name}” added`, 'success');
      }
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Save failed.');
      toast('Could not save product', 'error');
    } finally {
      setBusy(false);
    }
  }

  const content = (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.head}>
          <Text style={styles.title}>{product ? 'Edit product' : 'New product'}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, gap: 14 }}>
          <Field label="Name" value={form.name} onChangeText={set('name')} placeholder="Product name" error={errors.name} />

          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.chip, form.category_id === c.id && styles.chipActive]}
                  onPress={() => { setForm({ ...form, category_id: c.id }); setErrors((e) => ({ ...e, category_id: undefined })); }}
                >
                  <Text style={[styles.chipText, form.category_id === c.id && { color: colors.white }]}>{c.name}</Text>
                </Pressable>
              ))}
              {/* + New category — reveals an inline name input */}
              <Pressable style={[styles.chip, styles.chipAdd]} onPress={() => setAddingCat((v) => !v)}>
                <Text style={[styles.chipText, { color: colors.orange }]}>{addingCat ? '✕ Cancel' : '+ New category'}</Text>
              </Pressable>
            </View>

            {addingCat && (
              <View style={styles.newCatRow}>
                <Field
                  style={{ flex: 1 }}
                  value={newCat}
                  onChangeText={setNewCat}
                  placeholder="New category name"
                />
                <Button
                  label={savingCat ? 'Adding…' : 'Add'}
                  onPress={addCategory}
                  disabled={savingCat || !newCat.trim()}
                  style={{ paddingVertical: 9, paddingHorizontal: 18 }}
                />
              </View>
            )}

            {!!errors.category_id && <Text style={styles.fieldError}>{errors.category_id}</Text>}
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
            <Field style={{ flex: 1 }} label="Price (AED)" value={form.price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" error={errors.price} />
            <Field style={{ flex: 1 }} label="Stock" value={form.stock} onChangeText={setStock} placeholder="100" keyboardType="number-pad" error={errors.stock} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.label}>Product image</Text>
            <View style={styles.uploadRow}>
              <View style={styles.preview}>
                {form.image_url ? (
                  <Image source={{ uri: imageUri(form.image_url) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <Text style={styles.previewEmpty}>No{'\n'}image</Text>
                )}
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Button label={uploading ? 'Uploading…' : '⬆ Choose file'} variant="navy" onPress={pickFile} disabled={uploading} style={{ paddingVertical: 9 }} />
                {!!form.image_url && (
                  <Button label="Remove image" variant="ghost" onPress={() => setForm({ ...form, image_url: '' })} style={{ paddingVertical: 9 }} />
                )}
                <Text style={styles.hint}>Required size {PRODUCT_IMAGE.width}×{PRODUCT_IMAGE.height}px (4:3) · JPG, PNG, GIF, WebP or SVG · up to 8MB</Text>
              </View>
            </View>
            {/* Size warning — shown when the chosen image isn't the standard size.
                Non-blocking: the product still saves, the card just normalises it. */}
            {imgDims && !imgSizeOk && (
              <View style={styles.warnBox}>
                <Text style={styles.warnIcon}>⚠</Text>
                <Text style={styles.warnText}>
                  This image is {imgDims.w}×{imgDims.h}px, not the standard {PRODUCT_IMAGE.width}×{PRODUCT_IMAGE.height}px (4:3).
                  It may look cropped or letter-boxed on the product card — please resize it for a consistent look.
                </Text>
              </View>
            )}
            {imgDims && imgSizeOk && (
              <Text style={styles.okText}>✓ Image is the correct {PRODUCT_IMAGE.width}×{PRODUCT_IMAGE.height}px size.</Text>
            )}
            <Field label="…or paste an image URL" value={form.image_url} onChangeText={set('image_url')} placeholder="https://…" error={errors.image_url} />
          </View>
          <Field label="Description" value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} placeholder="Description" multiline />

          {/* Highlights — key/value detail rows */}
          <View style={{ gap: 8 }}>
            <Text style={styles.label}>Highlights (key details shown as a table)</Text>
            {highlights.map((h, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Field style={{ flex: 1 }} value={h.label} onChangeText={(t) => updateHl(i, 'label', t)} placeholder="Label (e.g. Pack Size)" />
                <Field style={{ flex: 1 }} value={h.value} onChangeText={(t) => updateHl(i, 'value', t)} placeholder="Value (e.g. 5 kg)" />
                <Pressable style={styles.hlDel} onPress={() => removeHl(i)}>
                  <Text style={styles.hlDelText}>✕</Text>
                </Pressable>
              </View>
            ))}
            <Button label="+ Add highlight" variant="ghost" onPress={addHl} style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14 }} />
          </View>

          <Field label="Nutritional information (one item per line)" value={form.nutrition} onChangeText={(t) => setForm({ ...form, nutrition: t })} placeholder={'Serving Size: 100g\nCalories: 350\nProtein: 7g'} multiline />
          <Field label="Seller details" value={form.seller} onChangeText={(t) => setForm({ ...form, seller: t })} placeholder="Seller name, address, customer care…" multiline />

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

  // Render through a portal on web so the fixed overlay escapes the admin
  // page's scroll container and always centres in the viewport (no matter how
  // far the product list is scrolled), while keeping the original card look.
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return require('react-dom').createPortal(content, document.body);
  }
  return content;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(24,21,18,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modal: { width: '100%', maxWidth: 560, maxHeight: '88vh' as any, backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadow.card },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.ink, fontWeight: '900', fontSize: 17 },
  close: { color: colors.muted, fontSize: 17, fontWeight: '800' },
  label: { color: colors.text, fontWeight: '700', fontSize: 13 },
  hlDel: { width: 40, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  hlDelText: { color: colors.red, fontWeight: '900', fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.orange },
  chipText: { fontWeight: '700', color: colors.text, fontSize: 13 },
  chipAdd: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.orange, borderStyle: 'dashed' },
  newCatRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 4 },
  uploadRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  preview: { width: 92, height: 92, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cream, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  previewEmpty: { color: colors.muted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  hint: { color: colors.muted, fontSize: 12 },
  warnBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#F4C77B', borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  warnIcon: { fontSize: 15, lineHeight: 19, color: colors.orangeDark },
  warnText: { flex: 1, color: colors.orangeDark, fontSize: 12.5, fontWeight: '600', lineHeight: 18 },
  okText: { color: colors.green, fontSize: 12.5, fontWeight: '700' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.green, borderColor: colors.green },
  check: { color: colors.white, fontWeight: '900' },
  toggleText: { color: colors.text, fontWeight: '600' },
  error: { color: colors.red, fontSize: 13 },
  fieldError: { color: colors.red, fontSize: 12, fontWeight: '600' },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
