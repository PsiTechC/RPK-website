import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { colors, radius, shadow } from '../lib/theme';

type Activity = {
  id: string;
  title: string;
  subtitle: string;
  time: number; // epoch ms (0 if unknown)
  tab: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
};

const SEEN_KEY = 'rpk_notif_seen';
function readSeen(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(SEEN_KEY);
      return v ? Number(v) : 0;
    }
  } catch {
    /* ignore */
  }
  return 0;
}
function writeSeen(t: number) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SEEN_KEY, String(t));
  } catch {
    /* ignore */
  }
}

const DISMISS_KEY = 'rpk_notif_dismissed';
function readDismissed(): string[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(DISMISS_KEY);
      return v ? JSON.parse(v) : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}
function writeDismissed(ids: string[]) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(DISMISS_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}
function timeAgo(t: number): string {
  if (!t) return '';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Admin-only activity bell for the navbar — recent orders / registrations /
// inquiries / customers. Returns null for non-admins.
export function NotificationBell() {
  const { user, token } = useApp();
  const router = useRouter();
  const [items, setItems] = useState<Activity[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<number>(readSeen());
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set(readDismissed()));
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin || !token) return;
    let cancelled = false;
    (async () => {
      const acts: Activity[] = [];
      const orders = await api.admin.orders(token).catch(() => []);
      orders.slice(0, 12).forEach((o) =>
        acts.push({ id: 'o' + o.id, title: `New order #${o.id}`, subtitle: `${o.customer_name} · ${o.status}`, time: Date.parse(o.created_at) || 0, tab: 'orders', icon: 'receipt-outline', tone: colors.navy })
      );
      const regs = await api.admin.registrations(token).catch(() => []);
      regs.slice(0, 12).forEach((r) =>
        acts.push({ id: 'r' + r.id, title: 'New registration', subtitle: `${r.company_name} · ${r.status}`, time: Date.parse(r.created_at) || 0, tab: 'registrations', icon: 'document-text-outline', tone: colors.orange })
      );
      const inq = await api.admin.inquiries(token).catch(() => []);
      inq.slice(0, 12).forEach((q: any) =>
        acts.push({ id: 'i' + q.id, title: 'New inquiry', subtitle: `${q.name} · ${q.status || 'new'}`, time: Date.parse(q.created_at) || 0, tab: 'inquiries', icon: 'chatbubbles-outline', tone: colors.red })
      );
      const cust = await api.admin.customers(token).catch(() => []);
      cust.slice(0, 12).forEach((u) =>
        acts.push({ id: 'c' + u.id, title: 'New customer', subtitle: `${u.name} · ${u.email}`, time: u.created_at ? Date.parse(u.created_at) : 0, tab: 'customers', icon: 'person-add-outline', tone: colors.green })
      );
      acts.sort((a, b) => b.time - a.time);
      if (!cancelled) setItems(acts.slice(0, 15));
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, token]);

  if (!isAdmin) return null;

  const visible = items.filter((a) => !dismissed.has(a.id));
  const unread = visible.filter((a) => a.time > seen).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && visible.length) {
      writeSeen(visible[0].time);
      setSeen(visible[0].time);
    }
  }

  function openItem(a: Activity) {
    setOpen(false);
    router.push(`/admin?tab=${a.tab}` as any);
  }

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeDismissed(Array.from(next));
      return next;
    });
  }

  function dismissAll() {
    setDismissed((prev) => {
      const next = new Set(prev);
      visible.forEach((a) => next.add(a.id));
      writeDismissed(Array.from(next));
      return next;
    });
  }

  return (
    <>
      <Pressable style={styles.bell} onPress={toggle} accessibilityLabel="Notifications">
        <Ionicons name={open ? 'notifications' : 'notifications-outline'} size={24} color={colors.ink} />
        {unread > 0 && (
          <View style={styles.dot}>
            <Text style={styles.dotText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </Pressable>

      {open && (
        <>
          <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
          <View style={styles.panel}>
            <View style={styles.head}>
              <Text style={styles.headTitle}>Notifications</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={styles.headMeta}>{visible.length} update{visible.length === 1 ? '' : 's'}</Text>
                {visible.length > 0 && (
                  <Pressable onPress={dismissAll} hitSlop={6} accessibilityLabel="Clear all notifications">
                    <Text style={styles.clearAll}>Clear all</Text>
                  </Pressable>
                )}
              </View>
            </View>
            {visible.length === 0 ? (
              <Text style={styles.empty}>No recent activity.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {visible.map((a) => (
                  <View key={a.id} style={styles.item}>
                    <Pressable style={styles.itemMain} onPress={() => openItem(a)}>
                      <View style={[styles.icon, { backgroundColor: a.tone + '1A' }]}>
                        <Ionicons name={a.icon} size={16} color={a.tone} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{a.title}{a.time > seen ? '  •' : ''}</Text>
                        <Text style={styles.itemSub} numberOfLines={1}>{a.subtitle}</Text>
                      </View>
                      <Text style={styles.itemTime}>{timeAgo(a.time)}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.del}
                      hitSlop={6}
                      onPress={(e) => { (e as any)?.stopPropagation?.(); dismiss(a.id); }}
                      accessibilityLabel="Remove notification"
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.muted} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bell: { padding: 6 },
  dot: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.red, borderRadius: 999, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  dotText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  scrim: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 },
  panel: {
    position: 'fixed' as any, top: 64, right: 18, width: 360, maxWidth: '92vw' as any, backgroundColor: colors.white,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', zIndex: 120, ...shadow.card,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  headTitle: { fontWeight: '900', fontSize: 15, color: colors.ink },
  headMeta: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  clearAll: { color: colors.red, fontSize: 12, fontWeight: '800' },
  empty: { color: colors.muted, fontSize: 13, padding: 18 },
  item: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingRight: 6 },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  del: { padding: 8, borderRadius: 8 },
  icon: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontWeight: '800', color: colors.ink, fontSize: 13.5 },
  itemSub: { color: colors.muted, fontSize: 12, marginTop: 1, textTransform: 'capitalize' },
  itemTime: { color: colors.muted, fontSize: 11, fontWeight: '600' },
});
