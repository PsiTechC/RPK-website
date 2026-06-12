import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors, radius, shadow } from '../lib/theme';
import { Product } from '../lib/api';
import { useApp, money } from '../lib/store';
import { visualByName, isPlaceholder } from '../lib/foodVisuals';
import { useHoverScale } from './Motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ProductCard({ product, width = 220 }: { product: Product; width?: number }) {
  const router = useRouter();
  const { addToCart } = useApp();
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
      <View style={[styles.imgWrap, { backgroundColor: usePhoto ? colors.cream : v.from }]}>
        {usePhoto ? (
          <Image source={{ uri: product.image_url }} style={styles.img} contentFit="cover" transition={200} />
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
        <View style={styles.row}>
          <Text style={styles.price}>{money(product.price, product.currency)}</Text>
          <Pressable
            style={styles.add}
            onPress={(e) => {
              // @ts-ignore stop card navigation on web
              e.stopPropagation?.();
              addToCart(product);
            }}
          >
            <Text style={styles.addText}>+ Add</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  price: { color: colors.navy, fontWeight: '900', fontSize: 15 },
  add: { backgroundColor: colors.orange, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  addText: { color: colors.white, fontWeight: '800', fontSize: 13 },
});
