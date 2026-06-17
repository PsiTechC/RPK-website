import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors, radius, shadow } from '../lib/theme';
import { Product, imageUri } from '../lib/api';
import { useApp } from '../lib/store';
import { visualByName, isPlaceholder } from '../lib/foodVisuals';
import { useHoverScale } from './Motion';
import { useToast } from './Toast';
import { Stars } from './Stars';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ProductCard({ product, width = 220 }: { product: Product; width?: number | string }) {
  const router = useRouter();
  const { addToCart } = useApp();
  const toast = useToast();
  const v = visualByName(product.category_name);
  const usePhoto = !isPlaceholder(product.image_url);
  const hover = useHoverScale(1.035);

  return (
    <AnimatedPressable
      style={[styles.card, { width, transform: [{ scale: hover.scale }] }]}
      onPress={() => router.push(`/product/${product.id}`)}
      onHoverIn={hover.onHoverIn}
      onHoverOut={hover.onHoverOut}
      onPressIn={hover.onPressIn}
      onPressOut={hover.onPressOut}
    >
      <View style={[styles.imgWrap, { backgroundColor: usePhoto || v.photo ? colors.cream : v.from }]}>
        {usePhoto ? (
          <Image source={{ uri: imageUri(product.image_url) }} style={styles.img} contentFit="cover" transition={200} />
        ) : v.photo ? (
          // No product image — show the category's real photo instead of the emoji.
          <Image source={{ uri: v.photo }} style={styles.img} contentFit="cover" transition={200} />
        ) : (
          <>
            <View style={[styles.toShade, { backgroundColor: v.to }]} />
            <Text style={styles.emoji}>{v.emoji}</Text>
          </>
        )}
        <View style={styles.unit}>
          <Text style={styles.unitText}>{product.unit}</Text>
        </View>
      </View>
      <View style={styles.body}>
        {!!product.category_name && <Text style={styles.cat} numberOfLines={1}>{product.category_name}</Text>}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {product.review_count > 0 ? (
          <Stars value={product.rating} size={14} count={product.review_count} />
        ) : (
          <Text style={styles.noRating}>No reviews yet</Text>
        )}
        <View style={styles.actions}>
          <Pressable
            style={styles.inquiry}
            onPress={(e) => {
              // @ts-ignore stop card navigation on web
              e.stopPropagation?.();
              router.push(`/contact?product=${encodeURIComponent(product.name)}`);
            }}
          >
            <Ionicons name="call" size={15} color={colors.white} />
            <Text style={styles.inquiryText}>Call to Inquiry</Text>
          </Pressable>
          <Pressable
            style={styles.add}
            onPress={(e) => {
              // @ts-ignore stop card navigation on web
              e.stopPropagation?.();
              addToCart(product);
              toast(`“${product.name}” added to cart`, 'success');
            }}
          >
            <Text style={styles.addText}>+ Add to cart</Text>
          </Pressable>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadow.card },
  imgWrap: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  toShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', opacity: 0.5 },
  emoji: { fontSize: 56 },
  unit: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.navy, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  unitText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  body: { padding: 12, gap: 4 },
  cat: { color: colors.orange, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700', minHeight: 38 },
  noRating: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  actions: { gap: 8, marginTop: 8 },
  inquiry: { backgroundColor: colors.orange, paddingVertical: 9, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  inquiryText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  add: { borderWidth: 1.5, borderColor: colors.border, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  addText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
});
