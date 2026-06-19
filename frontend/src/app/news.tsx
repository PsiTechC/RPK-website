import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { api, News as NewsItem } from '../lib/api';
import { colors, radius, shadow } from '../lib/theme';
import { Footer } from '../components/Footer';
import { Container, Badge } from '../components/ui';
import { FadeInUp } from '../components/Motion';
import { fmtDate } from '../lib/date';

const HERO = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1700&q=75';
const FALLBACK = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=75';

export default function News() {
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.news().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cols = width < 700 ? 1 : width < 1100 ? 2 : 3;
  const cardW = cols === 1 ? '100%' : cols === 2 ? '48.5%' : '31.8%';

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* Hero */}
      <View style={[styles.hero, { paddingVertical: width < 700 ? 48 : 80 }]}>
        <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <View style={styles.scrim} />
        <FadeInUp delay={80} distance={26} style={styles.heroInner}>
          <Text style={styles.eyebrow}>NEWSROOM</Text>
          <Text style={[styles.h1, { fontSize: width < 700 ? 36 : 52 }]}>News & Updates</Text>
          <Text style={styles.heroSub}>The latest from RPK Food Trading — exports, quality, partnerships and more.</Text>
        </FadeInUp>
      </View>

      {/* List */}
      <Container style={{ marginTop: 30, marginBottom: 44 }}>
        {loading ? (
          <ActivityIndicator color={colors.red} style={{ marginTop: 30 }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>No news yet — check back soon.</Text>
        ) : (
          <View style={styles.grid}>
            {items.map((n, i) => (
              <FadeInUp key={n.id} delay={i * 70} distance={22} style={[styles.cardWrap, { width: cardW as any }]}>
                <View style={styles.card}>
                  <Image source={{ uri: n.image_url || FALLBACK }} style={styles.cardImg} contentFit="cover" transition={250} />
                  <View style={styles.cardBody}>
                    <View style={styles.metaRow}>
                      {!!n.tag && <Badge text={n.tag} tone="orange" />}
                      <Text style={styles.date}>{fmtDate(n.created_at)}</Text>
                    </View>
                    <Text style={styles.title} numberOfLines={2}>{n.title}</Text>
                    <Text style={styles.body} numberOfLines={5}>{n.body}</Text>
                  </View>
                </View>
              </FadeInUp>
            ))}
          </View>
        )}
      </Container>
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'relative', overflow: 'hidden', backgroundColor: colors.navyDark, paddingHorizontal: 18, alignItems: 'center' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,12,26,0.7)' },
  heroInner: { width: '100%', maxWidth: 760, alignItems: 'center', zIndex: 2 },
  eyebrow: { color: colors.orange, fontWeight: '900', fontSize: 12, letterSpacing: 2.5 },
  h1: { color: colors.white, fontWeight: '900', textAlign: 'center', marginTop: 10, letterSpacing: -0.5 },
  heroSub: { color: '#E7E3DF', fontSize: 15.5, lineHeight: 24, textAlign: 'center', maxWidth: 560, marginTop: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'flex-start' },
  cardWrap: {},
  card: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadow.card },
  cardImg: { width: '100%', height: 180, backgroundColor: colors.cream },
  cardBody: { padding: 16, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { color: colors.muted, fontSize: 12.5, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900', lineHeight: 23 },
  body: { color: colors.text, fontSize: 14, lineHeight: 22 },
  empty: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 30 },
});
