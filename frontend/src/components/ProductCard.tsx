import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Linking } from 'react-native';
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
const IMG_OUT = { filter: 'blur(2.5px) grayscale(0.6)', opacity: 0.55 } as any;

export function ProductCard({ product, width = 220 }: { product: Product; width?: number | string }) {
  const router = useRouter();
  const { addToCart } = useApp();
  const toast = useToast();
  const v = visualByName(product.category_name);
  const usePhoto = !isPlaceholder(product.image_url);
  const out = product.stock <= 0; // out of stock → blur image + disable cart
  const hover = useHoverScale(1.035);

  function openWhatsApp() {
    const text = encodeURIComponent(`Hello RPK, I'd like to inquire about "${product.name}".`);
    Linking.openURL(`https://wa.me/${WHATSAPP}?text=${text}`);
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
      <View style={[styles.imgWrap, { backgroundColor: usePhoto || v.photo ? colors.cream : v.from }]}>
        {usePhoto ? (
          <Image source={{ uri: imageUri(product.image_url) }} style={[styles.img, out && IMG_OUT]} contentFit="cover" transition={200} />
        ) : v.photo ? (
          // No product image — show the category's real photo instead of the emoji.
          <Image source={{ uri: v.photo }} style={[styles.img, out && IMG_OUT]} contentFit="cover" transition={200} />
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
        {out && (
          <View pointerEvents="none" style={styles.outOverlay}>
            <Text style={styles.outText}>Out of Stock</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {product.review_count > 0 ? (
          <Stars value={product.rating} size={14} count={product.review_count} />
        ) : (
          <Text style={styles.noRating}>No reviews yet</Text>
        )}
        <View style={styles.actions}>
          <View style={styles.contactRow}>
            <Pressable
              style={styles.inquiry}
              onPress={(e) => {
                // @ts-ignore stop card navigation on web
                e.stopPropagation?.();
                router.push(`/contact?product=${encodeURIComponent(product.name)}`);
              }}
            >
              <Ionicons name="call" size={13} color={colors.white} />
              <Text style={styles.inquiryText}>Call to Inquiry</Text>
            </Pressable>
            <Pressable
              style={styles.wa}
              onPress={(e) => {
                // @ts-ignore stop card navigation on web
                e.stopPropagation?.();
                openWhatsApp();
              }}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </Pressable>
          </View>
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
            <Text style={[styles.addText, out && styles.addDisabledText]}>{out ? 'Out of stock' : '+ Add to cart'}</Text>
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
  name: { color: colors.text, fontSize: 14, fontWeight: '700', minHeight: 38 },
  noRating: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  actions: { gap: 8, marginTop: 8 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inquiry: { flex: 1, backgroundColor: colors.orange, paddingVertical: 7, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  inquiryText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  wa: { width: 36, height: 36, borderRadius: 999, backgroundColor: '#25D3661A', borderWidth: 1, borderColor: '#25D36640', alignItems: 'center', justifyContent: 'center' },
  add: { borderWidth: 1.5, borderColor: colors.border, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  addText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  addDisabled: { backgroundColor: colors.offWhite, borderColor: colors.border, opacity: 0.7 },
  addDisabledText: { color: colors.muted },
  brandMark: { position: 'absolute', right: 8, top: 8 },
  outOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  outText: { backgroundColor: 'rgba(20,20,20,0.78)', color: colors.white, fontWeight: '900', fontSize: 12, letterSpacing: 0.5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
});
