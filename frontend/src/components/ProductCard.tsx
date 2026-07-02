import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors, radius, shadow, BRAND } from '../lib/theme';
import { Product, imageUri } from '../lib/api';
import { useApp } from '../lib/store';
import { visualByName, isPlaceholder } from '../lib/foodVisuals';
import { useHoverScale } from './Motion';
import { useToast } from './Toast';
import { Stars } from './Stars';
import { Logo } from './Logo';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const WHATSAPP = BRAND.phone.replace(/[^\d]/g, '');
// Out-of-stock image treatment: blur+grey on web; opacity dims on native too.
// Frosted blur over the whole card when out of stock (web; native dims only).
const OUT_FROST = Platform.OS === 'web' ? ({ backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' } as any) : null;

export function ProductCard({ product, width = 220 }: { product: Product; width?: number | string }) {
  const router = useRouter();
  const { addToCart } = useApp();
  const toast = useToast();
  const v = visualByName(product.category_name);
  const usePhoto = !isPlaceholder(product.image_url);
  const out = product.stock <= 0; // out of stock → blur image + disable cart
  const hover = useHoverScale(1.035);
  // Call icon opens a small modal: "Call for Inquiry" or "Register as Partner".
  const [callOpen, setCallOpen] = useState(false);
  // Many seeded image URLs are unreliable (search-cache links). If the photo
  // fails to load, fall back to the category's visual so no card looks broken.
  const [imgError, setImgError] = useState(false);
  const showPhoto = usePhoto && !imgError;

  function openWhatsApp() {
    const text = encodeURIComponent(`Hello RPK, I'd like to inquire about "${product.name}".`);
    Linking.openURL(`https://wa.me/${WHATSAPP}?text=${text}`);
  }
  function goInquiry() {
    setCallOpen(false);
    router.push(`/contact?product=${encodeURIComponent(product.name)}`);
  }
  function goPartner() {
    setCallOpen(false);
    router.push('/import-export?register=1');
  }

  return (
    <AnimatedPressable
      style={[styles.card, { width, transform: [{ scale: hover.scale }] }]}
      onPress={() => router.push(`/product/${product.id}`)}
      onHoverIn={hover.onHoverIn}
      onHoverOut={hover.onHoverOut}
      onPressIn={hover.onPressIn}
      onPressOut={hover.onPressOut}
    >
      <View style={[styles.imgWrap, { backgroundColor: showPhoto ? colors.white : v.photo ? colors.cream : v.from }]}>
        {showPhoto ? (
          // Blurred copy of the same photo fills the 4:3 box edge-to-edge so
          // portrait / off-size images never leave bare side bars, then the
          // sharp "contain" copy shows the whole pack on top without cropping.
          <>
            <Image source={{ uri: imageUri(product.image_url) }} style={styles.imgBlurFill} contentFit="cover" blurRadius={22} transition={200} />
            <View pointerEvents="none" style={styles.imgFillScrim} />
            <Image source={{ uri: imageUri(product.image_url) }} style={styles.imgContain} contentFit="contain" transition={200} onError={() => setImgError(true)} />
          </>
        ) : v.photo ? (
          // No / broken product image — show the category's real photo instead of the emoji.
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
        <View pointerEvents="none" style={styles.brandMark}>
          <Logo size={22} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {!!product.description?.trim() && (
          <Text style={styles.desc} numberOfLines={2}>{product.description.trim()}</Text>
        )}
        {product.review_count > 0 ? (
          <Stars value={product.rating} size={14} count={product.review_count} />
        ) : (
          <Text style={styles.noRating}>No reviews yet</Text>
        )}
        {/* Action row: Add to cart (primary) → Call icon → WhatsApp icon */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.add, out && styles.addDisabled]}
            disabled={out}
            onPress={(e) => {
              // @ts-ignore stop card navigation on web
              e.stopPropagation?.();
              if (out) return;
              addToCart(product);
              toast(`“${product.name}” added to cart`, 'success');
            }}
          >
            <Ionicons name="cart-outline" size={16} color={out ? colors.muted : colors.white} />
            <Text numberOfLines={1} style={[styles.addText, out && styles.addDisabledText]}>{out ? 'Out of stock' : 'Add to cart'}</Text>
          </Pressable>
          <Pressable
            style={styles.callBtn}
            accessibilityLabel="Call options"
            onPress={(e) => {
              // @ts-ignore stop card navigation on web
              e.stopPropagation?.();
              setCallOpen(true);
            }}
          >
            <Ionicons name="call" size={18} color={colors.red} />
          </Pressable>
          <Pressable
            style={styles.wa}
            accessibilityLabel="Chat on WhatsApp"
            onPress={(e) => {
              // @ts-ignore stop card navigation on web
              e.stopPropagation?.();
              openWhatsApp();
            }}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </Pressable>
        </View>
      </View>
      {out && (
        <View pointerEvents="none" style={[styles.outOverlay, OUT_FROST]}>
          <Text style={styles.outText}>Out of Stock</Text>
        </View>
      )}
      {callOpen && (
        <CallInquiryModal productName={product.name} onClose={() => setCallOpen(false)} onInquiry={goInquiry} onPartner={goPartner} />
      )}
    </AnimatedPressable>
  );
}

// Small modal shown when the call icon is tapped — routes to the product
// inquiry (Contact) page or the import/export partner registration.
function CallInquiryModal({
  productName, onClose, onInquiry, onPartner,
}: { productName: string; onClose: () => void; onInquiry: () => void; onPartner: () => void }) {
  // 0 → hidden, 1 → shown. Animates in on mount; `close` plays it out first.
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 240, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const close = () => {
    Animated.timing(a, { toValue: 0, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onClose());
  };
  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });

  const content = (
    <View style={styles.overlay}>
      <Animated.View style={[StyleSheet.absoluteFill as any, styles.backdrop, { opacity: a }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>
      <Animated.View style={[styles.modal, { opacity: a, transform: [{ translateY }, { scale }] }]}>
        <View style={styles.modalIcon}>
          <Ionicons name="call" size={24} color={colors.red} />
        </View>
        <Text style={styles.modalTitle} numberOfLines={2}>Get in touch about “{productName}”</Text>
        <Text style={styles.modalSub}>How would you like to proceed?</Text>

        <Pressable style={styles.modalPrimary} onPress={onInquiry}>
          <Ionicons name="chatbubbles-outline" size={18} color={colors.white} />
          <Text style={styles.modalPrimaryText}>Call for Inquiry</Text>
        </Pressable>
        <Pressable style={styles.modalSecondary} onPress={onPartner}>
          <Ionicons name="people-outline" size={18} color={colors.red} />
          <Text style={styles.modalSecondaryText}>Register as Partner</Text>
        </Pressable>

        <Pressable style={styles.modalCancel} onPress={close}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return require('react-dom').createPortal(content, document.body);
  }
  return content;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadow.card },
  imgWrap: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  imgContain: { width: '100%', height: '100%', padding: 10 },
  // Blurred backdrop layer: scaled up so the blur's soft edge is pushed off the
  // frame, leaving a clean full-bleed fill behind the sharp product image.
  imgBlurFill: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', transform: [{ scale: 1.18 }] },
  imgFillScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.5)' },
  toShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', opacity: 0.5 },
  emoji: { fontSize: 56 },
  unit: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.navy, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  unitText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  body: { padding: 12, gap: 4 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700', minHeight: 38 },
  desc: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  noRating: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
  // Primary "Add to cart" — filled brand red. Grows to fill the row; on a narrow
  // (2-col mobile) card it can't fit beside both icons, so it takes the full width
  // and the call/WhatsApp icons wrap to the line below instead of squishing the text.
  add: { flexGrow: 1, flexBasis: 120, minWidth: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.red, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 999 },
  addText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  addDisabled: { backgroundColor: colors.offWhite, borderWidth: 1.5, borderColor: colors.border, opacity: 0.85 },
  addDisabledText: { color: colors.muted },
  // Call icon — brand-red tinted circle, matches the WhatsApp pill's footprint.
  callBtn: { width: 38, height: 38, borderRadius: 999, backgroundColor: colors.redSoft, borderWidth: 1, borderColor: '#D9241940', alignItems: 'center', justifyContent: 'center' },
  wa: { width: 38, height: 38, borderRadius: 999, backgroundColor: '#25D3661A', borderWidth: 1, borderColor: '#25D36640', alignItems: 'center', justifyContent: 'center' },

  // Call-for-inquiry modal
  overlay: { ...StyleSheet.absoluteFillObject, ...(Platform.OS === 'web' ? ({ position: 'fixed' } as any) : null), alignItems: 'center', justifyContent: 'center', padding: 22, zIndex: 1000 },
  backdrop: { backgroundColor: 'rgba(15,12,10,0.55)' },
  modal: { width: '100%', maxWidth: 360, backgroundColor: colors.white, borderRadius: radius.lg, padding: 22, alignItems: 'center', gap: 8, ...shadow.card },
  modalIcon: { width: 56, height: 56, borderRadius: 999, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  modalTitle: { color: colors.ink, fontWeight: '900', fontSize: 16.5, textAlign: 'center', letterSpacing: -0.2 },
  modalSub: { color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  modalPrimary: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: colors.red, paddingVertical: 13, borderRadius: 999 },
  modalPrimaryText: { color: colors.white, fontWeight: '800', fontSize: 14.5 },
  modalSecondary: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.red, paddingVertical: 12, borderRadius: 999 },
  modalSecondaryText: { color: colors.red, fontWeight: '800', fontSize: 14.5 },
  modalCancel: { paddingVertical: 8, paddingHorizontal: 16, marginTop: 2 },
  modalCancelText: { color: colors.muted, fontWeight: '700', fontSize: 13.5 },
  brandMark: { position: 'absolute', right: 8, top: 8 },
  outOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244,244,244,0.42)', zIndex: 5 },
  outText: { backgroundColor: 'rgba(20,20,20,0.78)', color: colors.white, fontWeight: '900', fontSize: 12, letterSpacing: 0.5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
});
