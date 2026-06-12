import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Text, TextStyle, View, ViewStyle } from 'react-native';

// Mount entrance: fade + slide up (+ optional subtle scale). Use for
// above-the-fold content (hero).
export function FadeInUp({
  children,
  delay = 0,
  distance = 18,
  duration = 600,
  scaleFrom,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  scaleFrom?: number;
  style?: ViewStyle;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  const transform: any[] = [{ translateY }];
  if (scaleFrom != null) {
    transform.push({ scale: v.interpolate({ inputRange: [0, 1], outputRange: [scaleFrom, 1] }) });
  }
  return <Animated.View style={[style, { opacity: v, transform }]}>{children}</Animated.View>;
}

// Headline that reveals letter-by-letter: each character fades in, in sequence,
// while the whole line gently rises into place. Wraps cleanly at word
// boundaries. Pass the same text style you'd give a <Text>.
export function LetterReveal({
  text,
  duration = 1500,
  delay = 0,
  style,
}: {
  text: string;
  duration?: number;
  delay?: number;
  style?: TextStyle | TextStyle[];
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  const words = text.split(' ');
  const totalLetters = text.replace(/\s/g, '').length;
  const tail = 7; // letters fading at once (controls overlap of the stagger)
  const denom = totalLetters + tail;
  const rise = progress.interpolate({ inputRange: [0, 0.4], outputRange: [22, 0], extrapolate: 'clamp' });

  let gi = 0;
  return (
    <Animated.View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', transform: [{ translateY: rise }] }}>
      {words.map((w, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {w.split('').map((ch, ci) => {
            const i = gi++;
            const opacity = progress.interpolate({ inputRange: [i / denom, (i + tail) / denom], outputRange: [0, 1], extrapolate: 'clamp' });
            return (
              <Animated.Text key={ci} style={[style, { opacity }]}>
                {ch}
              </Animated.Text>
            );
          })}
          {wi < words.length - 1 && <Text style={style}>{' '}</Text>}
        </View>
      ))}
    </Animated.View>
  );
}

// Animated number that counts up to its target on mount (and re-counts if the
// target changes), e.g. "77+" → ticks 0…77+. Non-numeric values ("Bulk") render
// unchanged. Web-only easing; native shows the final value immediately.
export function CountUp({
  value,
  duration = 1400,
  style,
}: {
  value: string;
  duration?: number;
  style?: TextStyle | TextStyle[];
}) {
  const match = /^(\d[\d,]*)(.*)$/.exec(value.trim());
  const target = match ? parseInt(match[1].replace(/,/g, ''), 10) : null;
  const suffix = match ? match[2] : '';
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (target == null) return;
    if (Platform.OS !== 'web' || typeof requestAnimationFrame === 'undefined') {
      setDisplay(target);
      return;
    }
    const from = fromRef.current;
    let raf = 0;
    let startT = 0;
    const tick = (t: number) => {
      if (!startT) startT = t;
      const p = Math.min(1, (t - startT) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const val = Math.round(from + (target - from) * eased);
      setDisplay(val);
      fromRef.current = val;
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  if (target == null) return <Text style={style}>{value}</Text>;
  return <Text style={style}>{display}{suffix}</Text>;
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
