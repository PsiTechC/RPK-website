import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { Link, usePathname, useRouter } from 'expo-router';
import { colors, shadow } from '../lib/theme';
import { useApp } from '../lib/store';
import { Logo } from './Logo';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/import-export', label: 'Import / Export' },
] as const;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, cartCount, logout } = useApp();
  const { width } = useWindowDimensions();
  const compact = width < 760;

  return (
    <View style={styles.bar}>
      <View style={styles.accent} />
      <View style={styles.inner}>
        <Link href="/" asChild>
          <Pressable>
            <Logo size={compact ? 32 : 40} />
          </Pressable>
        </Link>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nav}>
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href as any} asChild>
                <Pressable style={styles.navItem}>
                  <Text style={[styles.navText, active && styles.navTextActive]}>{n.label}</Text>
                  {active && <View style={styles.activeBar} />}
                </Pressable>
              </Link>
            );
          })}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable style={styles.cartBtn} onPress={() => router.push('/cart')}>
            <Text style={styles.cartIcon}>🛒</Text>
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </Pressable>

          {user ? (
            <View style={styles.userWrap}>
              {user.role === 'admin' && (
                <Pressable style={styles.adminBtn} onPress={() => router.push('/admin')}>
                  <Text style={styles.adminText}>Admin</Text>
                </Pressable>
              )}
              <Pressable style={styles.ghostBtn} onPress={() => router.push('/account')}>
                <Text style={styles.ghostText}>{compact ? '👤' : user.name.split(' ')[0]}</Text>
              </Pressable>
              {!compact && (
                <Pressable onPress={logout} style={styles.logoutBtn}>
                  <Text style={styles.logoutText}>Logout</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <Pressable style={styles.loginBtn} onPress={() => router.push('/login')}>
              <Text style={styles.loginText}>Login</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.white, ...shadow.soft, zIndex: 50, borderBottomWidth: 1, borderBottomColor: colors.border },
  accent: { height: 3, backgroundColor: colors.red, width: '100%' },
  inner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 12,
  },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 6, flexGrow: 1, justifyContent: 'center' },
  navItem: { paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  navText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  navTextActive: { color: colors.red },
  activeBar: { height: 3, width: 22, backgroundColor: colors.red, borderRadius: 2, marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartBtn: { padding: 6 },
  cartIcon: { fontSize: 22 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: colors.red,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  userWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loginBtn: { backgroundColor: colors.red, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  loginText: { color: colors.white, fontWeight: '800' },
  ghostBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  ghostText: { color: colors.ink, fontWeight: '700' },
  logoutBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  logoutText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  adminBtn: { backgroundColor: colors.ink, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  adminText: { color: colors.white, fontWeight: '800', fontSize: 13 },
});
