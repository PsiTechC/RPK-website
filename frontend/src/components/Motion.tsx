import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View, ViewStyle } from 'react-native';

// Mount entrance: fade + slide up. Use for above-the-fold content (hero).
export function FadeInUp({
  children,
  delay = 0,
  distance = 18,
  duration = 600,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: ViewStyle;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

// Scroll-reveal: fades/slides up the first time it scrolls into view (web).
// On native it simply renders (no IntersectionObserver), so it's a safe no-op.
export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  const isWeb = Platform.OS === 'web';
  const [shown, setShown] = useState(!isWeb);
  const ref = useRef<any>(null);
  const v = useRef(new Animated.Value(isWeb ? 0 : 1)).current;

  useEffect(() => {
    if (!isWeb) return;
    const node = ref.current as unknown as Element | null;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (shown) {
      Animated.timing(v, { toValue: 1, duration: 650, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [shown]);

  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });
  return (
    <View ref={ref} style={style}>
      <Animated.View style={{ opacity: v, transform: [{ translateY }] }}>{children}</Animated.View>
    </View>
  );
}

// Hook that returns an animated scale + hover handlers for web hover-lift.
export function useHoverScale(to = 1.04) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (val: number) =>
    Animated.spring(scale, { toValue: val, useNativeDriver: true, friction: 7, tension: 120 }).start();
  return {
    scale,
    onHoverIn: () => animate(to),
    onHoverOut: () => animate(1),
    onPressIn: () => animate(0.98),
    onPressOut: () => animate(to),
  };
}
