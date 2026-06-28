import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../lib/theme';
import { api, Category } from '../lib/api';
import { categoryVisual } from '../lib/foodVisuals';
import { useApp } from '../lib/store';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { LanguageSelector } from './LanguageSelector';

const NAV = [
  { href: '/', label: 'Home', icon: 'home-outline' },
  { href: '/products', label: 'Shop', icon: 'bag-handle-outline' },
  { href: '/products', label: 'Categories', icon: 'grid-outline', dropdown: true },
  { href: '/import-export', label: 'Import / Export', icon: 'globe-outline' },
  { href: '/about', label: 'About Us', icon: 'information-circle-outline' },
  { href: '/contact', label: 'Contact Us', icon: 'mail-outline' },
] as const;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, cartCount, logout } = useApp();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets(); // keep the header clear of the notch / status bar
  const compact = width < 1024;
  // Narrow-desktop range: nav still horizontal, but space is tight — pull in the
  // padding and collapse the language pill to an icon so items don't overlap.
  const tight = !compact && width < 1200;

  const [menuOpen, setMenuOpen] = useState(false); // mobile nav
  const [profileOpen, setProfileOpen] = useState(false); // account dropdown
  const [catOpen, setCatOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  const go = (href: string) => {
    setMenuOpen(false);
    setProfileOpen(false);
    setCatOpen(false);
    router.push(href as any);
  };
  const goCategory = (slug: string) => {
    setMenuOpen(false);
    setProfileOpen(false);
    setCatOpen(false);
    router.push(`/products?category=${slug}&view=categories`);
  };
  const doLogout = () => {
    setMenuOpen(false);
    setProfileOpen(false);
    setCatOpen(false);
    logout();
    router.replace('/');
  };

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.accent} />
      <View style={[styles.inner, tight && styles.innerTight]}>
        {/* Left — logo */}
        <Link href="/" asChild>
          <Pressable style={styles.logoWrap} onPress={() => setMenuOpen(false)}>
            <Logo size={compact ? 30 : 38} />
          </Pressable>
        </Link>

        {/* Center — nav (desktop, icon + label pill) */}
        {!compact && (
          <View style={styles.nav}>
            {NAV.map((n) =>
              'dropdown' in n && n.dropdown ? (
                <CategoryNavItem
                  key={n.label}
                  icon={n.icon}
                  label={n.label}
                  open={catOpen}
                  active={pathname === '/products'}
                  categories={categories}
                  onToggle={() => setCatOpen((o) => !o)}
                  onOpen={() => setCatOpen(true)}
                  onClose={() => setCatOpen(false)}
                  onOpenAll={() => goCategory('all')}
                  onSelect={goCategory}
                />
              ) : (
                <NavItem key={n.href} icon={n.icon} label={n.label} active={pathname === n.href} onPress={() => go(n.href)} />
              )
            )}
          </View>
        )}

        {/* Right — actions */}
        <View style={styles.actions}>
          <LanguageSelector compact={compact || tight} />
          <NotificationBell />
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
          <Pop style={[styles.dropdown, { top: insets.top + 64 }]}>
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
            {user.role !== 'admin' && <DDItem icon="person-outline" label="My account" onPress={() => go('/account')} />}
            {user.role === 'admin' && <DDItem icon="construct-outline" label="Admin dashboard" onPress={() => go('/admin')} />}
            <DDItem icon="cart-outline" label="My cart" onPress={() => go('/cart')} />
            <View style={styles.ddDivider} />
            <DDItem icon="log-out-outline" label="Log out" danger onPress={doLogout} />
          </Pop>
        </>
      )}

      {/* Mobile dropdown panel */}
      {compact && menuOpen && (
        <>
          <Pressable style={styles.scrim} onPress={() => { setMenuOpen(false); setCatOpen(false); }} />
          <View style={[styles.mobilePanel, { top: insets.top + 60 }]}>
            {NAV.map((n) => {
              const active = pathname === n.href;
              if ('dropdown' in n && n.dropdown) {
                return (
                  <View key={n.label}>
                    <Pressable style={[styles.mItem, styles.mItemRow]} onPress={() => setCatOpen((o) => !o)}>
                      <Ionicons name={n.icon as any} size={20} color={active ? colors.red : colors.text} />
                      <Text style={[styles.mItemText, active && styles.navTextActive]}>{n.label}</Text>
                      <Text style={styles.chevron}>{catOpen ? '▴' : '▾'}</Text>
                    </Pressable>
                    {catOpen && (
                      <View style={styles.mobileCats}>
                        <Pressable style={styles.mobileCatItem} onPress={() => goCategory('all')}>
                          <Text style={styles.mobileCatText}>All Categories</Text>
                        </Pressable>
                        {categories.map((c) => (
                          <Pressable key={c.id} style={styles.mobileCatItem} onPress={() => goCategory(c.slug)}>
                            <Text style={styles.mobileCatText}>{c.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                );
              }
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
                {user.role !== 'admin' && (
                  <Pressable style={[styles.mItem, styles.mItemRow]} onPress={() => go('/account')}>
                    <Ionicons name="person-outline" size={20} color={colors.text} /><Text style={styles.mItemText}>My account</Text>
                  </Pressable>
                )}
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

function CategoryNavItem({
  icon,
  label,
  active,
  open,
  categories,
  onToggle,
  onOpen,
  onClose,
  onOpenAll,
  onSelect,
}: {
  icon: string;
  label: string;
  active: boolean;
  open: boolean;
  categories: Category[];
  onToggle: () => void;
  onOpen: () => void;
  onClose: () => void;
  onOpenAll: () => void;
  onSelect: (slug: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = active || hovered || open ? colors.red : colors.muted;
  // Open the category menu on hover; close when the pointer leaves the whole
  // wrapper (the dropdown is a descendant, so moving onto it keeps it open).
  // The wrapper MUST stay a plain View — wrapping it in a Pressable nests the
  // dropdown's Pressable items inside another pressable, which swallows their
  // clicks on react-native-web (you can't select a category). pointerEnter /
  // pointerLeave don't fire on child transitions, so they're safe here.
  //
  // Close on a short delay (hover intent): tiny pointer transitions between the
  // label, the chevron and the menu briefly fire pointerLeave, and closing
  // immediately would make the dropdown blink. The timer is cancelled the moment
  // the pointer returns, so the menu only closes once the cursor has truly left.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openNow = () => {
    cancelClose();
    onOpen();
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      onClose();
    }, 120);
  };
  useEffect(() => cancelClose, []); // clear any pending timer on unmount
  return (
    <View style={styles.navItemWrap} onPointerEnter={openNow} onPointerLeave={closeSoon}>
      <View style={[styles.navItem, hovered && styles.navItemHover, open && styles.navItemActive]}>
        {/* Click the label -> open the "All Categories" page */}
        <Pressable
          style={styles.catLabelBtn}
          onPress={onOpenAll}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          accessibilityLabel={label}
        >
          <Ionicons name={icon as any} size={18} color={color} />
          <Text style={[styles.navItemText, { color }]} numberOfLines={1}>{label}</Text>
        </Pressable>
        {/* Click the chevron -> toggle the quick category dropdown (touch fallback) */}
        <Pressable onPress={onToggle} hitSlop={8} accessibilityLabel="Show categories">
          <Text style={[styles.chevron, { color }]}>{open ? '▴' : '▾'}</Text>
        </Pressable>
      </View>
      {open && <MegaMenu categories={categories} onSelect={onSelect} onOpenAll={onOpenAll} />}
    </View>
  );
}

const FEATURE_IMG = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=520&q=70';

// SAFCO-style mega-menu: a featured image panel + a multi-column category grid,
// with a smooth fade/slide-in on open.
function MegaMenu({
  categories,
  onSelect,
  onOpenAll,
}: {
  categories: Category[];
  onSelect: (slug: string) => void;
  onOpenAll: () => void;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });

  return (
    <View style={styles.megaWrap}>
      <Animated.View style={[styles.mega, { opacity: v, transform: [{ translateY }] }]}>
        {/* Featured panel */}
        <Pressable style={styles.megaFeature} onPress={onOpenAll}>
          <Image source={{ uri: FEATURE_IMG }} style={StyleSheet.absoluteFill as any} contentFit="cover" />
          <View style={styles.megaFeatureOverlay} />
          <View style={styles.megaFeatureBody}>
            <Text style={styles.megaKicker}>EXPLORE</Text>
            <Text style={styles.megaTitle}>Shop by Category</Text>
            <View style={styles.megaBtn}><Text style={styles.megaBtnText}>View all products →</Text></View>
          </View>
        </Pressable>

        {/* Category grid */}
        <View style={styles.megaGrid}>
          {categories.map((c) => {
            const vis = categoryVisual(c.slug);
            return (
              <Pressable key={c.id} style={({ hovered }: any) => [styles.megaItem, hovered && styles.megaItemHover]} onPress={() => onSelect(c.slug)}>
                <Text style={styles.megaEmoji}>{vis.emoji}</Text>
                <Text style={styles.megaItemText} numberOfLines={1}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

// Shared entrance for header dropdowns: fade + slide-down on mount.
function Pop({ style, children }: { style?: any; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
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
  innerTight: { paddingHorizontal: 10, gap: 6 },
  logoWrap: { flexShrink: 0, marginRight: 4 },
  nav: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  navTextActive: { color: colors.red },
  navItemWrap: { position: 'relative' },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 8, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: 'transparent',
  },
  navItemHover: { backgroundColor: colors.offWhite },
  navItemActive: { backgroundColor: 'rgba(226,35,26,0.08)', borderColor: 'rgba(226,35,26,0.18)' },
  navItemText: { fontWeight: '800', fontSize: 13.5, letterSpacing: 0.1 },
  catLabelBtn: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  // Mega-menu. The wrapper keeps a transparent top band so the hover bridge from
  // the nav item to the panel is unbroken; the panel itself is the animated card.
  megaWrap: { position: 'absolute' as any, top: '100%', left: 0, paddingTop: 10, zIndex: 220 },
  mega: {
    flexDirection: 'row',
    width: 700,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  megaFeature: { width: 212, justifyContent: 'flex-end', backgroundColor: colors.navy },
  megaFeatureOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,14,11,0.46)' },
  megaFeatureBody: { padding: 16, gap: 6 },
  megaKicker: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 10, letterSpacing: 1.4 },
  megaTitle: { color: colors.white, fontWeight: '900', fontSize: 18, lineHeight: 22 },
  megaBtn: { alignSelf: 'flex-start', backgroundColor: colors.red, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginTop: 6 },
  megaBtnText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  megaGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 10, alignContent: 'flex-start' },
  megaItem: { width: '33.33%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 11, borderRadius: 10 },
  megaItemHover: { backgroundColor: colors.offWhite },
  megaEmoji: { fontSize: 17 },
  megaItemText: { color: colors.text, fontWeight: '700', fontSize: 13, flex: 1 },
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
  // Full-screen tap-catcher to dismiss menus. 'fixed' covers the viewport on web;
  // native has no 'fixed', so use absolute with a tall height to cover the screen.
  scrim: Platform.OS === 'web'
    ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 } as any)
    : { position: 'absolute', top: 0, left: 0, right: 0, height: 2000, zIndex: 90 },
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
  mobileCats: { paddingLeft: 30, paddingBottom: 6 },
  mobileCatItem: { paddingVertical: 8 },
  mobileCatText: { color: colors.muted, fontWeight: '700', fontSize: 14 },
  mUser: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 8 },
  mAuth: { flexDirection: 'row', gap: 10, paddingVertical: 8, paddingHorizontal: 4 },
});
