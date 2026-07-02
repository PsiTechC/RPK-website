import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radius, shadow } from '../lib/theme';
import { Category } from '../lib/api';
import { categoryVisual } from '../lib/foodVisuals';

// Redesigned category carousel: gradient scrim, "Shop now" pill, pause-on-hover.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedImage = Animated.createAnimatedComponent(Image);
const webGradient = (css: string) => (Platform.OS === 'web' ? ({ backgroundImage: css } as any) : null);

// A continuously sliding row of category tiles. The whole row glides at a steady
// pace and loops seamlessly (the list is duplicated so the identical second copy
// is already in place when the first scrolls off). Hovering the row pauses the
// drift so a tile can be read and clicked; each tile lifts and its photo zooms.
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
  const tileH = Math.round(itemW / 1.35);

  // Repeat the list enough times to always cover the viewport, even mid-loop.
  const repeat = Math.max(2, Math.ceil((viewportW * 2) / Math.max(oneSet, 1)) + 1);
  const tiles = useMemo(
    () => Array.from({ length: repeat }, () => categories).flat(),
    [categories, repeat],
  );

  const x = useRef(new Animated.Value(0)).current;
  const pausedAt = useRef(-1); // last value captured when paused
  const SPEED = 26; // px per second — slow enough to read every category

  // Drift the row toward 0; on arrival, snap back a full set and continue. This
  // recursive form (vs Animated.loop) lets us pause/resume from any offset.
  function run(from: number) {
    if (oneSet <= 0) return;
    const duration = (Math.abs(0 - from) / SPEED) * 1000;
    x.setValue(from);
    Animated.timing(x, { toValue: 0, duration, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
      if (finished) run(-oneSet);
    });
  }

  useEffect(() => {
    run(-oneSet);
    return () => x.stopAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oneSet]);

  function pause() {
    x.stopAnimation((val) => { pausedAt.current = val; });
  }
  function resume() {
    run(pausedAt.current < 0 ? -oneSet : pausedAt.current);
  }

  return (
    <Pressable onHoverIn={pause} onHoverOut={resume} style={{ overflow: 'hidden', paddingVertical: 14 }}>
      <Animated.View style={[styles.row, { transform: [{ translateX: x }] }]}>
        {tiles.map((c, i) => (
          <CarouselTile key={`${c.id}-${i}`} category={c} width={itemW} height={tileH} marginRight={gap} />
        ))}
      </Animated.View>
    </Pressable>
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
  const [hovered, setHovered] = useState(false);
  const a = useRef(new Animated.Value(0)).current; // 0 → rest, 1 → hovered

  useEffect(() => {
    Animated.timing(a, { toValue: hovered ? 1 : 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [hovered]);

  const lift = a.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const imgScale = a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const ctaShift = a.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });

  return (
    <AnimatedPressable
      style={[styles.card, { width, height, marginRight, backgroundColor: v.from, transform: [{ translateY: lift }, { scale }] }]}
      onPress={() => router.push(`/products?category=${category.slug}`)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => setHovered(true)}
      onPressOut={() => setHovered(false)}
    >
      {/* photo (zooms on hover) with emoji fallback underneath */}
      <View style={[styles.toShade, { backgroundColor: v.to }]} />
      <Text style={styles.emoji}>{v.emoji}</Text>
      {!!v.photo && (
        <AnimatedImage source={{ uri: v.photo }} style={[StyleSheet.absoluteFill as any, { transform: [{ scale: imgScale }] }]} contentFit="cover" transition={200} />
      )}

      {/* legibility gradient anchored to the bottom */}
      <View pointerEvents="none" style={styles.scrim} />

      {/* label + Shop-now pill */}
      <View style={styles.label}>
        <Text style={styles.name} numberOfLines={2}>{category.name}</Text>
        <Animated.View style={[styles.cta, { transform: [{ translateX: ctaShift }] }]}>
          <Text style={styles.ctaText}>Shop now</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.white} />
        </Animated.View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', ...shadow.card },
  toShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', opacity: 0.55 },
  emoji: { position: 'absolute', top: '16%', alignSelf: 'center', fontSize: 56, opacity: 0.9 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web'
      ? webGradient('linear-gradient(180deg, rgba(15,10,10,0) 38%, rgba(15,10,10,0.45) 68%, rgba(15,10,10,0.86) 100%)')
      : { backgroundColor: 'rgba(15,10,10,0.4)' }),
  },
  label: { padding: 14, gap: 9 },
  name: { color: colors.white, fontWeight: '900', fontSize: 16.5, letterSpacing: -0.2, ...(Platform.OS === 'web' ? ({ textShadow: '0 1px 6px rgba(0,0,0,0.45)' } as any) : null) },
  cta: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.red, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999,
    ...shadow.soft, shadowColor: colors.red, shadowOpacity: 0.4,
  },
  ctaText: { color: colors.white, fontWeight: '800', fontSize: 12.5, letterSpacing: 0.2 },
});
