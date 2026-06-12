import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, ActivityIndicator, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, Product, imageUri } from '../../lib/api';
import { colors, radius } from '../../lib/theme';
import { useApp, money } from '../../lib/store';
import { useToast } from '../../components/Toast';
import { visualByName, isPlaceholder } from '../../lib/foodVisuals';
import { Footer } from '../../components/Footer';
import { Container, Button, Badge } from '../../components/ui';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { addToCart } = useApp();
  const toast = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .product(id)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const stacked = width < 820;

  if (loading) return <ActivityIndicator color={colors.orange} style={{ marginTop: 60 }} />;
  if (!product)
    return (
      <Container style={{ marginTop: 60 }}>
        <Text style={{ color: colors.muted }}>Product not found.</Text>
        <Button label="Back to shop" variant="ghost" onPress={() => router.push('/products')} style={{ marginTop: 16, alignSelf: 'flex-start' }} />
      </Container>
    );

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      <Container style={{ marginTop: 22 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 14 }}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <View style={[styles.row, stacked && { flexDirection: 'column' }]}>
          <View style={[styles.imageBox, stacked ? { width: '100%' } : { width: '46%' }]}>
            {!isPlaceholder(product.image_url) ? (
              <Image source={{ uri: imageUri(product.image_url) }} style={styles.image} contentFit="cover" transition={200} />
            ) : visualByName(product.category_name).photo ? (
              <Image source={{ uri: visualByName(product.category_name).photo }} style={styles.image} contentFit="cover" transition={200} />
            ) : (
              <View style={[styles.emojiTile, { backgroundColor: visualByName(product.category_name).from }]}>
                <Text style={{ fontSize: 110 }}>{visualByName(product.category_name).emoji}</Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1, gap: 14 }}>
            {!!product.category_name && <Badge text={product.category_name} tone="orange" />}
            <Text style={styles.name}>{product.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={styles.price}>{money(product.price, product.currency)}</Text>
              <Text style={styles.perUnit}>per {product.unit}</Text>
            </View>
            <Badge text={product.stock > 0 ? 'In stock' : 'Out of stock'} tone={product.stock > 0 ? 'green' : 'red'} />
            <Text style={styles.desc}>{product.description}</Text>

            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>Quantity</Text>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Text style={styles.qtyVal}>{qty}</Text>
                <Pressable style={styles.stepBtn} onPress={() => setQty((q) => q + 1)}>
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
              <Button
                label={added ? '✓ Added to cart' : `Add to cart · ${money(product.price * qty, product.currency)}`}
                variant={added ? 'navy' : 'primary'}
                onPress={() => {
                  addToCart(product, qty);
                  setAdded(true);
                  toast(`“${product.name}” added to cart`, 'success');
                  setTimeout(() => setAdded(false), 1500);
                }}
              />
              <Button label="Go to cart" variant="outline" onPress={() => router.push('/cart')} />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>📦 Wholesale & retail · Sold per {product.unit}</Text>
              <Text style={styles.infoText}>🌍 Available for import/export — register your business to order in bulk.</Text>
            </View>
          </View>
        </View>
      </Container>
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.navy, fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', gap: 28 },
  imageBox: { aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border },
  image: { width: '100%', height: '100%' },
  emojiTile: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 28, fontWeight: '900', color: colors.ink },
  price: { fontSize: 26, fontWeight: '900', color: colors.orange },
  perUnit: { color: colors.muted, fontSize: 15 },
  desc: { color: colors.text, fontSize: 15, lineHeight: 24 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  qtyLabel: { fontWeight: '700', color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 999, overflow: 'hidden' },
  stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.offWhite },
  stepText: { fontSize: 22, fontWeight: '800', color: colors.navy },
  qtyVal: { width: 44, textAlign: 'center', fontWeight: '800', fontSize: 16, color: colors.ink },
  infoBox: { backgroundColor: colors.cream, borderRadius: radius.md, padding: 14, gap: 6, marginTop: 8 },
  infoText: { color: colors.text, fontSize: 13 },
});
