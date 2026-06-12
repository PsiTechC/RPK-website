import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '../lib/theme';

type ToastType = 'success' | 'error' | 'info';
type ToastT = { id: number; message: string; type: ToastType };

const ToastCtx = createContext<(message: string, type?: ToastType) => void>(() => {});

// useToast() → show('Saved!', 'success'). Renders themed, auto-dismissing toasts.
export function useToast() {
  return useContext(ToastCtx);
}

let _id = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const remove = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = _id++;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => remove(id), 2800);
    },
    [remove],
  );

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <View style={styles.viewport} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </View>
    </ToastCtx.Provider>
  );
}

const TONES: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: colors.green, icon: '✓' },
  error: { bg: colors.red, icon: '✕' },
  info: { bg: colors.navy, icon: 'ℹ' },
};

function ToastItem({ toast }: { toast: ToastT }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
    const id = setTimeout(() => {
      Animated.timing(v, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
    }, 2560);
    return () => clearTimeout(id);
  }, []);
  const tone = TONES[toast.type];
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] });
  return (
    <Animated.View style={[styles.toast, { opacity: v, transform: [{ translateY }] }]}>
      <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
        <Text style={styles.icon}>{tone.icon}</Text>
      </View>
      <Text style={styles.msg} numberOfLines={2}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any,
    top: 18,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 10,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 18,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 420,
    ...shadow.card,
  },
  iconWrap: { width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  icon: { color: colors.white, fontWeight: '900', fontSize: 14 },
  msg: { color: colors.ink, fontWeight: '700', fontSize: 14, flexShrink: 1 },
});
