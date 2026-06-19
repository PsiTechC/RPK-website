import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors } from '../lib/theme';

// Rotating, cinematic hero showing RPK's actual product range (rice, spices,
// dry fruits, oils, pulses, flour) with a slow Ken-Burns zoom + cross-fade and
// clickable dots. No video by default; set EXPO_PUBLIC_HERO_VIDEO to a grocery
// MP4 URL to add a video scene at the front.
const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=70`;

const VIDEO_URL = (process.env.EXPO_PUBLIC_HERO_VIDEO as string) || '';
const HAS_VIDEO = VIDEO_URL.length > 0;

// Verified product photos that match the catalogue (no vegetables/fruits).
const PHOTOS = [
  U('1596040033229-a9821ebd058d'), // spices & masala
  U('1516684732162-798a0062be99'), // rice — clean bowl of cooked rice
  U('1508061253366-f7da158b6d46'), // almonds / dry fruits & nuts
  U('1474979266404-7eaacbcd87c5'), // cooking oil
  U('1610725664285-7c57e6eeac3f'), // pulses / lentils sack
  U('1509440159596-0249088772ff'), // flour / atta & grains
];

const SCENES = PHOTOS.length + (HAS_VIDEO ? 1 : 0);
const HOLD_MS = 5500;

export function HeroVideo({
  children,
  height,
  showDots = true,
}: {
  children?: React.ReactNode;
  height?: number;
  showDots?: boolean;
}) {
  const [active, setActive] = useState(0);

  const player = useVideoPlayer(HAS_VIDEO ? VIDEO_URL : null, (p) => {
    if (!HAS_VIDEO) return;
    p.loop = true;
    p.muted = true;
    try {
      p.play();
    } catch {}
  });

  const opacities = useRef(Array.from({ length: SCENES }, (_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const kb = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % SCENES), HOLD_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Animated.parallel(
      opacities.map((o, i) =>
        Animated.timing(o, {
          toValue: i === active ? 1 : 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [active]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(kb, { toValue: 1, duration: 13000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(kb, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const scale = kb.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const photoBase = HAS_VIDEO ? 1 : 0;

  return (
    <View style={[styles.wrap, height != null ? { height } : StyleSheet.absoluteFill]}>
      <View style={styles.base} />

      {/* Optional video scene */}
      {HAS_VIDEO && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacities[0] }]} pointerEvents="none">
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
        </Animated.View>
      )}

      {/* Grocery product photos with slow zoom */}
      {PHOTOS.map((uri, i) => (
        <Animated.View
          key={uri}
          style={[StyleSheet.absoluteFill, { opacity: opacities[i + photoBase], transform: [{ scale }] }]}
          pointerEvents="none"
        >
          <Image source={{ uri }} style={StyleSheet.absoluteFill as any} contentFit="cover" transition={300} />
        </Animated.View>
      ))}

      <View style={styles.overlay} />

      <View style={styles.content}>{children}</View>

      {showDots && (
        <View style={styles.dots}>
          {Array.from({ length: SCENES }).map((_, i) => (
            <Pressable key={i} onPress={() => setActive(i)} hitSlop={6}>
              <View style={[styles.dot, i === active && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden', backgroundColor: colors.navyDark },
  base: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.navyDark },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,10,10,0.55)' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dots: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: colors.white, width: 22 },
});
