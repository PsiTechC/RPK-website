import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, ActivityIndicator, Pressable, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, Product, Review, imageUri } from '../../lib/api';
import { colors, radius, shadow, BRAND } from '../../lib/theme';
import { useApp } from '../../lib/store';
import { fmtDate } from '../../lib/date';
import { useToast } from '../../components/Toast';
import { visualByName, isPlaceholder } from '../../lib/foodVisuals';
import { Footer } from '../../components/Footer';
import { ProductCard } from '../../components/ProductCard';
import { Stars } from '../../components/Stars';
import { Container, SectionTitle, Button, Badge, Field, Card } from '../../components/ui';
import { Logo } from '../../components/Logo';

const WHATSAPP = BRAND.phone.replace(/[^\d]/g, '');

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { addToCart, user, token } = useApp();
  const toast = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [more, setMore] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [reviewErr, setReviewErr] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSimilar([]);
    setMore([]);
    setReviews([]);
    setMyRating(0);
    setMyComment('');
    api
      .product(id)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
    api.reviews(id).then(setReviews).catch(() => {});
  }, [id]);

  async function submitReview() {
    setReviewErr('');
    if (myRating < 1) {
      setReviewErr('Please select a star rating.');
      return;
    }
    if (!product || !token) return;
    setPosting(true);
    try {
      await api.createReview(product.id, { rating: myRating, comment: myComment.trim() }, token);
      const [fresh, p] = await Promise.all([api.reviews(product.id), api.product(product.id)]);
      setReviews(fresh);
      setProduct(p);
      setMyComment('');
      toast('Thanks for your review!', 'success');
    } catch (e: any) {
      setReviewErr(e.message || 'Could not save your review.');
    } finally {
      setPosting(false);
    }
  }

  // Similar products (same category) + everything else, like Amazon/Flipkart.
  useEffect(() => {
    if (!product) return;
    api
      .products()
      .then((all) => {
        const sim = all.filter((p) => p.category_name === product.category_name && p.id !== product.id).slice(0, 6);
        setSimilar(sim);
        const shownIds = new Set([product.id, ...sim.map((p) => p.id)]);
        setMore(all.filter((p) => !shownIds.has(p.id)));
      })
      .catch(() => {});
  }, [product?.id]);

  const stacked = width < 900;
  const cols = width < 560 ? 2 : width < 900 ? 3 : width < 1100 ? 4 : 5;
  const gap = 16;
  const contentW = Math.min(width, 1200) - 36;
  const cardW = ({ 2: '47%', 3: '31%', 4: '23%', 5: '18%' } as Record<number, string>)[cols];

  function openWhatsApp() {
    const text = encodeURIComponent(`Hello RPK, I'd like to inquire about "${product?.name ?? ''}".`);
    Linking.openURL(`https://wa.me/${WHATSAPP}?text=${text}`);
  }

  if (loading) return <ActivityIndicator color={colors.orange} style={{ marginTop: 60 }} />;
  if (!product)
    return (
      <Container style={{ marginTop: 60 }}>
        <Text style={{ color: colors.muted }}>Product not found.</Text>
        <Button label="Back to shop" variant="ghost" onPress={() => router.push('/products')} style={{ marginTop: 16, alignSelf: 'flex-start' }} />
      </Container>
    );

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Container style={{ marginTop: 22 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 14 }}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <View style={[styles.row, stacked && { flexDirection: 'column' }]}>
          <View style={[styles.imageBox, stacked ? { width: '100%', maxWidth: 420, alignSelf: 'center', aspectRatio: 1 } : { width: 420 }]}>
            {!isPlaceholder(product.image_url) ? (
              <Image source={{ uri: imageUri(product.image_url) }} style={styles.image} contentFit="contain" transition={200} />
            ) : visualByName(product.category_name).photo ? (
              <Image source={{ uri: visualByName(product.category_name).photo }} style={styles.image} contentFit="cover" transition={200} />
            ) : (
              <View style={[styles.emojiTile, { backgroundColor: visualByName(product.category_name).from }]}>
                <Text style={{ fontSize: 110 }}>{visualByName(product.category_name).emoji}</Text>
              </View>
            )}
            <View pointerEvents="none" style={styles.brandMark}>
              <Logo size={38} />
            </View>
          </View>

          <View style={[styles.buyBox, { flex: 1 }]}>
            {!!product.category_name && <Badge text={product.category_name} tone="orange" />}
            <Text style={styles.name}>{product.name}</Text>
            {product.review_count > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Stars value={product.rating} size={18} />
                <Text style={styles.ratingText}>
                  {product.rating.toFixed(1)} · {product.review_count} review{product.review_count === 1 ? '' : 's'}
                </Text>
              </View>
            ) : (
              <Text style={styles.muted}>No reviews yet</Text>
            )}
            <Badge text={product.stock > 0 ? 'In stock' : 'Out of stock'} tone={product.stock > 0 ? 'green' : 'red'} />

            {!!product.description?.trim() && <Text style={styles.desc}>{product.description.trim()}</Text>}

            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>Quantity</Text>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <TextInput
                  value={String(qty)}
                  onChangeText={(t) => setQty(parseInt(t.replace(/[^\d]/g, '') || '1', 10))}
                  keyboardType="number-pad"
                  style={styles.qtyInput}
                />
                <Pressable style={styles.stepBtn} onPress={() => setQty((q) => q + 1)}>
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
              <View style={styles.unitChip}>
                <Text style={styles.unitChipText}>{product.unit}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
              <View style={styles.contactRow}>
                <Button
                  label="Call to Inquiry"
                  icon="call"
                  variant="primary"
                  style={styles.inquiryBtn}
                  textStyle={styles.inquiryText}
                  onPress={() => router.push(`/contact?product=${encodeURIComponent(product.name)}`)}
                />
                <Pressable style={styles.waBtn} onPress={openWhatsApp}>
                  <Ionicons name="logo-whatsapp" size={19} color={colors.white} />
                </Pressable>
              </View>
              <Button
                label={added ? '✓ Added to cart' : 'Add to cart'}
                variant={added ? 'navy' : 'outline'}
                onPress={() => {
                  addToCart(product, qty);
                  setAdded(true);
                  toast(`“${product.name}” added to cart`, 'success');
                  setTimeout(() => setAdded(false), 1500);
                }}
              />
              <Button label="Go to cart" variant="ghost" onPress={() => router.push('/cart')} />
            </View>
          </View>
        </View>
      </Container>

      {/* Below hero: left = Nutrition/Highlights/Seller · right = Ratings & Reviews */}
      <Container style={{ marginTop: 22 }}>
        <View style={[styles.infoRow, stacked && { flexDirection: 'column' }]}>
          {/* LEFT column */}
          {(product.highlights?.length > 0 || !!product.nutrition?.trim() || !!product.seller?.trim()) && (
            <View style={styles.infoCol}>
              {!!product.nutrition?.trim() && (
                <Card style={{ flex: 1 }}>
                  <Text style={styles.detailHead2}>Nutritional Information</Text>
                  <View style={styles.nutriGrid}>
                    {product.nutrition.split('\n').filter((l) => l.trim()).map((l, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.bulletText}>{l.trim()}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              )}
              {product.highlights?.length > 0 && (
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  <Text style={styles.detailHead}>Highlights</Text>
                  {product.highlights.map((h, i) => (
                    <View key={i} style={[styles.hlRow, i % 2 === 1 && { backgroundColor: colors.offWhite }]}>
                      <Text style={styles.hlLabel}>{h.label}</Text>
                      <Text style={styles.hlValue}>{h.value}</Text>
                    </View>
                  ))}
                </Card>
              )}
              {!!product.seller?.trim() && (
                <Card>
                  <Text style={styles.detailHead2}>Seller Details</Text>
                  <Text style={styles.sellerText}>{product.seller}</Text>
                </Card>
              )}
            </View>
          )}

          {/* RIGHT column — Ratings & Reviews */}
          <View style={styles.infoCol}>
            <Card style={{ gap: 12, flex: 1 }}>
              <View>
                <Text style={styles.detailHead2}>Ratings & Reviews</Text>
                <Text style={[styles.muted, { marginTop: 2 }]}>
                  {product.review_count > 0
                    ? `${product.rating.toFixed(1)} out of 5 · ${product.review_count} review${product.review_count === 1 ? '' : 's'}`
                    : 'Be the first to review this product'}
                </Text>
              </View>

              <View style={styles.reviewDivider} />

              {user ? (
                <View style={{ gap: 10 }}>
                  <Text style={styles.writeTitle}>Write a review</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={styles.qtyLabel}>Your rating</Text>
                    <Stars value={myRating} size={26} onRate={setMyRating} />
                  </View>
                  <Field label="Comment (optional)" value={myComment} onChangeText={setMyComment} placeholder="Share your experience…" multiline />
                  {!!reviewErr && <Text style={styles.error}>{reviewErr}</Text>}
                  <Button label={posting ? 'Saving…' : 'Submit review'} onPress={submitReview} disabled={posting} style={{ alignSelf: 'flex-start' }} />
                </View>
              ) : (
                <View style={styles.loginRow}>
                  <Text style={styles.muted}>Log in to leave a rating and review.</Text>
                  <Button label="Log in" onPress={() => router.push('/login')} />
                </View>
              )}

              {reviews.length > 0 && (
                <>
                  <View style={styles.reviewDivider} />
                  <View style={{ gap: 14 }}>
                    {reviews.map((r) => (
                      <View key={r.id} style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.reviewAuthor}>{r.author_name || 'Customer'}</Text>
                          <Stars value={r.rating} size={15} />
                        </View>
                        {!!r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                        <Text style={styles.reviewDate}>{fmtDate(r.created_at)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </Card>
          </View>
        </View>
      </Container>

      {similar.length > 0 && (
        <Container style={{ marginTop: 40 }}>
          <SectionTitle title="Similar Products" subtitle={`More from ${product.category_name}`} />
          <View style={[styles.grid, { gap }]}>
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} width={cardW} />
            ))}
          </View>
        </Container>
      )}

      {more.length > 0 && (
        <Container style={{ marginTop: 40 }}>
          <SectionTitle title="Explore More Products" subtitle="Everything else in our store" />
          <View style={[styles.grid, { gap }]}>
            {more.map((p) => (
              <ProductCard key={p.id} product={p} width={cardW} />
            ))}
          </View>
        </Container>
      )}

      <View style={{ height: 56 }} />
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.navy, fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', gap: 28, alignItems: 'stretch' },
  imageBox: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, padding: 16, ...shadow.soft },
  image: { width: '100%', height: '100%' },
  brandMark: { position: 'absolute', right: 12, top: 12 },
  buyBox: { gap: 14, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 24, ...shadow.soft },
  detailsRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' },
  detailCard: { flex: 1, minWidth: 240 },
  infoRow: { flexDirection: 'row', gap: 16, alignItems: 'stretch' },
  infoCol: { flex: 1, gap: 14, minWidth: 300 },
  reviewDivider: { height: 1, backgroundColor: colors.border },
  emojiTile: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 28, fontWeight: '900', color: colors.ink },
  price: { fontSize: 26, fontWeight: '900', color: colors.orange },
  perUnit: { color: colors.muted, fontSize: 15 },
  desc: { color: colors.text, fontSize: 15, lineHeight: 24 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4, flexWrap: 'wrap' },
  qtyLabel: { fontWeight: '700', color: colors.text },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inquiryBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  inquiryText: { fontSize: 13 },
  waBtn: { width: 42, height: 42, borderRadius: 999, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  unitChip: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  unitChipText: { color: colors.orangeDark, fontWeight: '800', fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 999, overflow: 'hidden' },
  stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.offWhite },
  stepText: { fontSize: 22, fontWeight: '800', color: colors.navy },
  qtyVal: { width: 44, textAlign: 'center', fontWeight: '800', fontSize: 16, color: colors.ink },
  qtyInput: { width: 50, height: 40, textAlign: 'center', fontWeight: '800', fontSize: 16, color: colors.ink, outlineStyle: 'none' as any },
  infoBox: { backgroundColor: colors.cream, borderRadius: radius.md, padding: 14, gap: 8, marginTop: 8 },
  infoLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  ratingText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  muted: { color: colors.muted, fontSize: 14 },
  writeTitle: { fontWeight: '900', fontSize: 16, color: colors.ink },
  error: { color: colors.red, fontSize: 13 },
  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  reviewAuthor: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  reviewComment: { color: colors.text, fontSize: 14, lineHeight: 21 },
  reviewDate: { color: colors.muted, fontSize: 12 },
  detailHead: { fontWeight: '900', fontSize: 17, color: colors.ink, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4 },
  detailHead2: { fontWeight: '900', fontSize: 16, color: colors.ink },
  nutriGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 8, marginTop: 10 },
  hlRow: { flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  hlLabel: { width: 150, color: colors.muted, fontWeight: '700', fontSize: 14 },
  hlValue: { flex: 1, color: colors.ink, fontWeight: '600', fontSize: 14 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flexBasis: '44%', flexGrow: 1, minWidth: 150 },
  bullet: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.red, marginTop: 7 },
  bulletText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 21 },
  sellerText: { color: colors.text, fontSize: 14, lineHeight: 22, marginTop: 8 },
});


