import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors, radius, shadow } from '../lib/theme';
import { Category } from '../lib/api';
import { categoryVisual } from '../lib/foodVisuals';
import { useHoverScale } from './Motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CategoryTile({ category, width }: { category: Category; width: number }) {
  const router = useRouter();
  const v = categoryVisual(category.slug);
  const hover = useHoverScale(1.05);

  return (
    <AnimatedPressable
      style={[styles.card, { width, backgroundColor: v.from, transform: [{ scale: hover.scale }] }]}
      onPress={() => router.push(`/products?category=${category.slug}`)}
      onHoverIn={hover.onHoverIn}
      onHoverOut={hover.onHoverOut}
      onPressIn={hover.onPressIn}
      onPressOut={hover.onPressOut}
    >
      {/* gradient-ish darken at the bottom */}
      <View style={[styles.toShade, { backgroundColor: v.to }]} />
      {/* emoji fallback (shows if photo fails / is absent) */}
      <Text style={styles.emoji}>{v.emoji}</Text>
      {/* real food photo */}
      {!!v.photo && (
        <Image source={{ uri: v.photo }} style={StyleSheet.absoluteFill as any} contentFit="cover" transition={200} />
      )}
      <View style={styles.overlay} />
      <View style={styles.label}>
        <Text style={styles.name}>{category.name}</Text>
        <Text style={styles.cta}>Shop now →</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: { aspectRatio: 1.5, borderRadius: radius.md, overflow: 'hidden', justifyContent: 'flex-end', ...shadow.card },
  toShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', opacity: 0.55 },
  emoji: { position: 'absolute', top: '18%', alignSelf: 'center', fontSize: 60, opacity: 0.9 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,10,10,0.34)' },
  label: { padding: 12 },
  name: { color: colors.white, fontWeight: '900', fontSize: 15 },
  cta: { color: '#FFE3DF', fontWeight: '700', fontSize: 12, marginTop: 2 },
});
