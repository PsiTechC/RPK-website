import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Link, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../lib/theme';
import { useApp } from '../lib/store';
import { Logo } from './Logo';

const NAV = [
  { href: '/', label: 'Home', icon: 'home-outline' },
  { href: '/products', label: 'Shop', icon: 'bag-handle-outline' },
  { href: '/import-export', label: 'Import / Export', icon: 'globe-outline' },
  { href: '/about', label: 'About Us', icon: 'information-circle-outline' },
  { href: '/contact', label: 'Contact Us', icon: 'mail-outline' },
] as const;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, cartCount, logout } = useApp();
  const { width } = useWindowDimensions();
  const compact = width < 1024;

  const [menuOpen, setMenuOpen] = useState(false); // mobile nav
  const [profileOpen, setProfileOpen] = useState(false); // account dropdown

  const go = (href: string) => {
    setMenuOpen(false);
    setProfileOpen(false);
    router.push(href as any);
  };
  const doLogout = () => {
    setMenuOpen(false);
    setProfileOpen(false);
    logout();
    router.replace('/');
  };

  return (
    <View style={styles.bar}>
      <View style={styles.accent} />
      <View style={styles.inner}>
        {/* Left — logo */}
        <Link href="/" asChild>
          <Pressable style={styles.logoWrap} onPress={() => setMenuOpen(false)}>
            <Logo size={compact ? 30 : 38} />
          </Pressable>
        </Link>

        {/* Center — nav (desktop, icon + label pill) */}
        {!compact && (
          <View style={styles.nav}>
            {NAV.map((n) => (
              <NavItem key={n.href} icon={n.icon} label={n.label} active={pathname === n.href} onPress={() => go(n.href)} />
            ))}
          </View>
        )}

        {/* Right — actions */}
        <View style={styles.actions}>
          <Pressable style={styles.cartBtn} onPress={() => go('/cart')}>
            <Ionicons name="cart-outline" size={25} color={colors.ink} />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </Pressable>

          {!compact && user && (
            <Pressable style={styles.profileBtn} onPress={() => setProfileOpen((o) => !o)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              <Text style={styles.profileName} numberOfLines={1}>{user.name.split(' ')[0]}</Text>
              <Text style={styles.chevron}>{profileOpen ? '▴' : '▾'}</Text>
            </Pressable>
          )}

          {!compact && !user && (
            <View style={styles.authRow}>
              <Pressable style={styles.ghostBtn} onPress={() => go('/login')}>
                <Text style={styles.ghostText}>Log in</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={() => go('/login?mode=register')}>
                <Text style={styles.primaryText}>Sign up</Text>
              </Pressable>
            </View>
          )}

          {compact && (
            <Pressable style={styles.hamburger} onPress={() => setMenuOpen((o) => !o)} accessibilityLabel="Menu">
              <View style={[styles.hLine, menuOpen && styles.hLine1]} />
              <View style={[styles.hLine, menuOpen && styles.hLineHide]} />
              <View style={[styles.hLine, menuOpen && styles.hLine3]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Desktop account dropdown */}
      {!compact && profileOpen && user && (
        <>
          <Pressable style={styles.scrim} onPress={() => setProfileOpen(false)} />
          <View style={styles.dropdown}>
            <View style={styles.ddHead}>
              <View style={styles.ddAvatar}>
                <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ddName} numberOfLines={1}>{user.name}</Text>
                <Text style={styles.ddEmail} numberOfLines={1}>{user.email}</Text>
              </View>
            </View>
            <View style={styles.roleChip}><Text style={styles.roleChipText}>{user.role}</Text></View>
            <View style={styles.ddDivider} />
            <DDItem icon="person-outline" label="My account" onPress={() => go('/account')} />
            {user.role === 'admin' && <DDItem icon="construct-outline" label="Admin dashboard" onPress={() => go('/admin')} />}
            <DDItem icon="cart-outline" label="My cart" onPress={() => go('/cart')} />
            <View style={styles.ddDivider} />
            <DDItem icon="log-out-outline" label="Log out" danger onPress={doLogout} />
          </View>
        </>
      )}

      {/* Mobile dropdown panel */}
      {compact && menuOpen && (
        <>
          <Pressable style={styles.scrim} onPress={() => setMenuOpen(false)} />
          <View style={styles.mobilePanel}>
            {NAV.map((n) => {
              const active = pathname === n.href;
              return (
                <Pressable key={n.href} style={[styles.mItem, styles.mItemRow]} onPress={() => go(n.href)}>
                  <Ionicons name={n.icon as any} size={20} color={active ? colors.red : colors.text} />
                  <Text style={[styles.mItemText, active && styles.navTextActive]}>{n.label}</Text>
                </Pressable>
              );
            })}
            <View style={styles.ddDivider} />
            {user ? (
              <>
                <View style={styles.mUser}>
                  <View style={styles.ddAvatar}><Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase() || '?'}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ddName} numberOfLines={1}>{user.name}</Text>
                    <Text style={styles.ddEmail} numberOfLines={1}>{user.email}</Text>
                  </View>
                </View>
                <Pressable style={[styles.mItem, styles.mItemRow]} onPress={() => go('/account')}>
                  <Ionicons name="person-outline" size={20} color={colors.text} /><Text style={styles.mItemText}>My account</Text>
                </Pressable>
                {user.role === 'admin' && (
                  <Pressable style={[styles.mItem, styles.mItemRow]} onPress={() => go('/admin')}>
                    <Ionicons name="construct-outline" size={20} color={colors.text} /><Text style={styles.mItemText}>Admin dashboard</Text>
                  </Pressable>
                )}
                <Pressable style={[styles.mItem, styles.mItemRow]} onPress={doLogout}>
                  <Ionicons name="log-out-outline" size={20} color={colors.red} /><Text style={[styles.mItemText, { color: colors.red }]}>Log out</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.mAuth}>
                <Pressable style={[styles.ghostBtn, { flex: 1, alignItems: 'center' }]} onPress={() => go('/login')}>
                  <Text style={styles.ghostText}>Log in</Text>
                </Pressable>
                <Pressable style={[styles.primaryBtn, { flex: 1, alignItems: 'center' }]} onPress={() => go('/login?mode=register')}>
                  <Text style={styles.primaryText}>Sign up</Text>
                </Pressable>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

function NavItem({ icon, label, active, onPress }: { icon: string; label: string; active: boolean; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = active ? colors.red : hovered ? colors.ink : colors.muted;
  // Use the filled icon variant on the active page for extra emphasis.
  const iconName = active ? icon.replace('-outline', '') : icon;
  return (
    <Pressable
      style={[styles.navItem, hovered && styles.navItemHover, active && styles.navItemActive]}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityLabel={label}
    >
      <Ionicons name={iconName as any} size={18} color={color} />
      <Text style={[styles.navItemText, { color }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function DDItem({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={({ hovered }: any) => [styles.ddItem, hovered && styles.ddItemHover]} onPress={onPress}>
      <Ionicons name={icon as any} size={17} color={danger ? colors.red : colors.muted} style={{ width: 20, textAlign: 'center' }} />
      <Text style={[styles.ddItemText, danger && { color: colors.red }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.white, ...shadow.soft, zIndex: 100, borderBottomWidth: 1, borderBottomColor: colors.border },
  accent: { height: 3, backgroundColor: colors.red, width: '100%' },
  inner: {
    maxWidth: 1600,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 12,
  },
  logoWrap: { flexShrink: 0, marginRight: 4 },
  nav: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  navTextActive: { color: colors.red },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: 'transparent',
  },
  navItemHover: { backgroundColor: colors.offWhite },
  navItemActive: { backgroundColor: 'rgba(226,35,26,0.08)', borderColor: 'rgba(226,35,26,0.18)' },
  navItemText: { fontWeight: '800', fontSize: 14.5, letterSpacing: 0.1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  cartBtn: { padding: 6 },
  cartIcon: { fontSize: 22 },
  badge: {
    position: 'absolute', top: -2, right: -4, backgroundColor: colors.red, borderRadius: 999,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },

  // logged-out buttons
  authRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ghostBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  ghostText: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  primaryBtn: { backgroundColor: colors.red, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: 14 },

  // profile button (logged in)
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 30, height: 30, borderRadius: 999, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '900', fontSize: 14 },
  profileName: { color: colors.ink, fontWeight: '800', fontSize: 14, maxWidth: 110 },
  chevron: { color: colors.muted, fontSize: 12, fontWeight: '900' },

  // dropdown
  scrim: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 },
  dropdown: {
    position: 'absolute' as any, top: 64, right: 18, width: 248, backgroundColor: colors.white,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, zIndex: 110, ...shadow.card,
  },
  ddHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
  ddAvatar: { width: 38, height: 38, borderRadius: 999, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  ddName: { color: colors.ink, fontWeight: '900', fontSize: 14 },
  ddEmail: { color: colors.muted, fontSize: 12 },
  roleChip: { alignSelf: 'flex-start', marginLeft: 12, marginBottom: 6, backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  roleChipText: { color: colors.orangeDark, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  ddDivider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  ddItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginHorizontal: 6 },
  ddItemHover: { backgroundColor: '#F7F3F2' },
  ddIcon: { fontSize: 15, width: 20, textAlign: 'center' },
  ddItemText: { color: colors.text, fontWeight: '700', fontSize: 14 },

  // mobile
  hamburger: { width: 42, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
  hLine: { width: 20, height: 2.4, borderRadius: 2, backgroundColor: colors.ink },
  hLine1: { transform: [{ translateY: 6.4 }, { rotate: '45deg' }] },
  hLineHide: { opacity: 0 },
  hLine3: { transform: [{ translateY: -6.4 }, { rotate: '-45deg' }] },
  mobilePanel: {
    position: 'absolute' as any, top: 60, left: 0, right: 0, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, paddingHorizontal: 12, zIndex: 110, ...shadow.card,
  },
  mItem: { paddingVertical: 12, paddingHorizontal: 8 },
  mItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mItemText: { color: colors.text, fontWeight: '800', fontSize: 16 },
  mUser: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 8 },
  mAuth: { flexDirection: 'row', gap: 10, paddingVertical: 8, paddingHorizontal: 4 },
});
