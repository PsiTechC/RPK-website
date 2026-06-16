import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors, radius, shadow } from '../lib/theme';
import { Category } from '../lib/api';
import { categoryVisual } from '../lib/foodVisuals';
import { useHoverScale } from './Motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// A continuously sliding row of category tiles. The whole row glides in one
// direction at a steady, slow pace and loops seamlessly (the list is duplicated
// so when the first copy scrolls off, the identical second copy is already in
// place). Even gaps between tiles; each tile gently pops on hover.
export function CategoryCarousel({
  categories,
  itemW,
  viewportW,
  gap = 20,
}: {
  categories: Category[];
  itemW: number;
  viewportW: number;
  gap?: number;
}) {
  const stride = itemW + gap; // tile + trailing gap
  const oneSet = categories.length * stride; // width of a single copy of the list
  const tileH = itemW / 1.5;

  // Repeat the list enough times to always cover the viewport, even mid-loop.
  const repeat = Math.max(2, Math.ceil((viewportW * 2) / Math.max(oneSet, 1)) + 1);
  const tiles = useMemo(
    () => Array.from({ length: repeat }, () => categories).flat(),
    [categories, repeat],
  );

  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (oneSet <= 0) return;
    const SPEED = 26; // px per second — slow enough to read every category
    const duration = (oneSet / SPEED) * 1000;
    // Animate the row from -oneSet to 0 (content drifts left → right), then loop.
    // The reset is invisible because the next copy is pixel-identical.
    x.setValue(-oneSet);
    const anim = Animated.loop(
      Animated.timing(x, {
        toValue: 0,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [oneSet]);

  return (
    <View style={{ overflow: 'hidden', paddingVertical: 12 }}>
      <Animated.View style={[styles.row, { transform: [{ translateX: x }] }]}>
        {tiles.map((c, i) => (
          <CarouselTile key={`${c.id}-${i}`} category={c} width={itemW} height={tileH} marginRight={gap} />
        ))}
      </Animated.View>
    </View>
  );
}

function CarouselTile({
  category,
  width,
  height,
  marginRight,
}: {
  category: Category;
  width: number;
  height: number;
  marginRight: number;
}) {
  const router = useRouter();
  const v = categoryVisual(category.slug);
  const hover = useHoverScale(1.05);
  return (
    <AnimatedPressable
      style={[styles.card, { width, height, marginRight, backgroundColor: v.from, transform: [{ scale: hover.scale }] }]}
      onPress={() => router.push(`/products?category=${category.slug}`)}
      onHoverIn={hover.onHoverIn}
      onHoverOut={hover.onHoverOut}
      onPressIn={hover.onPressIn}
      onPressOut={hover.onPressOut}
    >
      <View style={[styles.toShade, { backgroundColor: v.to }]} />
      <Text style={styles.emoji}>{v.emoji}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { borderRadius: radius.md, overflow: 'hidden', justifyContent: 'flex-end', ...shadow.card },
  toShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', opacity: 0.55 },
  emoji: { position: 'absolute', top: '18%', alignSelf: 'center', fontSize: 60, opacity: 0.9 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,10,10,0.34)' },
  label: { padding: 12 },
  name: { color: colors.white, fontWeight: '900', fontSize: 15 },
  cta: { color: '#FFE3DF', fontWeight: '700', fontSize: 12, marginTop: 2 },
});
