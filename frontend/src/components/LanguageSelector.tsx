import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, radius, shadow } from '../lib/theme';

// A broad set of world languages (Google Translate supports 100+; this list
// covers the major ones — the search box lets users find any of them). Each
// carries a representative ISO country code (`cc`) used to show its flag.
const LANGS: { code: string; label: string; cc: string }[] = [
  { code: 'en', label: 'English', cc: 'gb' },
  { code: 'ar', label: 'العربية (Arabic)', cc: 'sa' },
  { code: 'hi', label: 'हिन्दी (Hindi)', cc: 'in' },
  { code: 'ur', label: 'اردو (Urdu)', cc: 'pk' },
  { code: 'bn', label: 'বাংলা (Bengali)', cc: 'bd' },
  { code: 'ta', label: 'தமிழ் (Tamil)', cc: 'in' },
  { code: 'te', label: 'తెలుగు (Telugu)', cc: 'in' },
  { code: 'ml', label: 'മലയാളം (Malayalam)', cc: 'in' },
  { code: 'mr', label: 'मराठी (Marathi)', cc: 'in' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)', cc: 'in' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)', cc: 'in' },
  { code: 'fr', label: 'Français (French)', cc: 'fr' },
  { code: 'es', label: 'Español (Spanish)', cc: 'es' },
  { code: 'de', label: 'Deutsch (German)', cc: 'de' },
  { code: 'it', label: 'Italiano (Italian)', cc: 'it' },
  { code: 'pt', label: 'Português (Portuguese)', cc: 'pt' },
  { code: 'ru', label: 'Русский (Russian)', cc: 'ru' },
  { code: 'tr', label: 'Türkçe (Turkish)', cc: 'tr' },
  { code: 'fa', label: 'فارسی (Persian)', cc: 'ir' },
  { code: 'zh-CN', label: '中文 (Chinese, Simplified)', cc: 'cn' },
  { code: 'zh-TW', label: '中文 (Chinese, Traditional)', cc: 'tw' },
  { code: 'ja', label: '日本語 (Japanese)', cc: 'jp' },
  { code: 'ko', label: '한국어 (Korean)', cc: 'kr' },
  { code: 'id', label: 'Bahasa Indonesia', cc: 'id' },
  { code: 'ms', label: 'Bahasa Melayu (Malay)', cc: 'my' },
  { code: 'th', label: 'ไทย (Thai)', cc: 'th' },
  { code: 'vi', label: 'Tiếng Việt (Vietnamese)', cc: 'vn' },
  { code: 'nl', label: 'Nederlands (Dutch)', cc: 'nl' },
  { code: 'pl', label: 'Polski (Polish)', cc: 'pl' },
  { code: 'uk', label: 'Українська (Ukrainian)', cc: 'ua' },
  { code: 'ro', label: 'Română (Romanian)', cc: 'ro' },
  { code: 'el', label: 'Ελληνικά (Greek)', cc: 'gr' },
  { code: 'he', label: 'עברית (Hebrew)', cc: 'il' },
  { code: 'sw', label: 'Kiswahili (Swahili)', cc: 'ke' },
  { code: 'am', label: 'አማርኛ (Amharic)', cc: 'et' },
  { code: 'so', label: 'Soomaali (Somali)', cc: 'so' },
  { code: 'ha', label: 'Hausa', cc: 'ng' },
  { code: 'yo', label: 'Yorùbá', cc: 'ng' },
  { code: 'fil', label: 'Filipino', cc: 'ph' },
  { code: 'my', label: 'မြန်မာ (Burmese)', cc: 'mm' },
  { code: 'km', label: 'ខ្មែរ (Khmer)', cc: 'kh' },
  { code: 'si', label: 'සිංහල (Sinhala)', cc: 'lk' },
  { code: 'ne', label: 'नेपाली (Nepali)', cc: 'np' },
  { code: 'ps', label: 'پښتو (Pashto)', cc: 'af' },
  { code: 'sv', label: 'Svenska (Swedish)', cc: 'se' },
  { code: 'da', label: 'Dansk (Danish)', cc: 'dk' },
  { code: 'no', label: 'Norsk (Norwegian)', cc: 'no' },
  { code: 'fi', label: 'Suomi (Finnish)', cc: 'fi' },
  { code: 'cs', label: 'Čeština (Czech)', cc: 'cz' },
  { code: 'hu', label: 'Magyar (Hungarian)', cc: 'hu' },
  { code: 'bg', label: 'Български (Bulgarian)', cc: 'bg' },
  { code: 'sr', label: 'Српски (Serbian)', cc: 'rs' },
  { code: 'hr', label: 'Hrvatski (Croatian)', cc: 'hr' },
  { code: 'af', label: 'Afrikaans', cc: 'za' },
  { code: 'zu', label: 'isiZulu (Zulu)', cc: 'za' },
].filter((l) => l.label);

const isWeb = Platform.OS === 'web' && typeof document !== 'undefined';

// Flag image (flagcdn) — renders a real flag on every platform, unlike flag
// emoji which Windows shows as plain letter codes. Falls back silently if a
// flag can't load.
function Flag({ cc, size = 20 }: { cc: string; size?: number }) {
  return (
    <Image
      source={{ uri: `https://flagcdn.com/w40/${cc}.png` }}
      style={{ width: size, height: Math.round(size * 0.72), borderRadius: 3, backgroundColor: colors.offWhite }}
      contentFit="cover"
      transition={120}
    />
  );
}

const ccFor = (code: string) => LANGS.find((l) => l.code === code)?.cc || 'gb';

// Short language letters shown on the button instead of a flag, e.g. "EN".
// Takes the part before any region suffix and upper-cases it.
const lettersFor = (code: string) => code.split('-')[0].toUpperCase();

function loadGoogleTranslate() {
  if (!isWeb) return;
  if (document.getElementById('google-translate-script')) return;

  if (!document.getElementById('google_translate_element')) {
    const el = document.createElement('div');
    el.id = 'google_translate_element';
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  (window as any).googleTranslateElementInit = () => {
    try {
      new (window as any).google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
    } catch {}
  };
  const s = document.createElement('script');
  s.id = 'google-translate-script';
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.body.appendChild(s);

  // Hide Google's top banner / branding so it blends with our header.
  const style = document.createElement('style');
  style.textContent =
    '.goog-te-banner-frame,.skiptranslate{display:none!important}body{top:0!important}#goog-gt-tt,.goog-te-balloon-frame{display:none!important}font{background:transparent!important;box-shadow:none!important}';
  document.head.appendChild(style);
}

function applyLanguage(code: string) {
  if (!isWeb) return;
  const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (combo) {
    combo.value = code;
    combo.dispatchEvent(new Event('change'));
    return;
  }
  // Fallback: set Google's cookie and reload so the widget applies on load.
  const host = location.hostname;
  const val = `/en/${code}`;
  document.cookie = `googtrans=${val};path=/`;
  document.cookie = `googtrans=${val};path=/;domain=${host}`;
  document.cookie = `googtrans=${val};path=/;domain=.${host}`;
  location.reload();
}

export function LanguageSelector({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [current, setCurrent] = useState('English');
  const [currentCode, setCurrentCode] = useState('en');
  const { width } = useWindowDimensions();
  // On phones the button isn't at the screen edge, so a fixed-width right-aligned
  // panel spills off the left. Pin it to the viewport instead.
  const narrow = width < 480;

  useEffect(() => {
    loadGoogleTranslate();
  }, []);

  if (!isWeb) return null; // translation engine is web-only

  const filtered = q.trim()
    ? LANGS.filter((l) => l.label.toLowerCase().includes(q.trim().toLowerCase()))
    : LANGS;

  const pick = (l: { code: string; label: string }) => {
    setCurrent(l.label.split(' (')[0]);
    setCurrentCode(l.code);
    setOpen(false);
    setQ('');
    applyLanguage(l.code);
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.btn} onPress={() => setOpen((o) => !o)} accessibilityLabel="Select language">
        <Text style={styles.langCode}>{lettersFor(currentCode)}</Text>
        {!compact && <Text style={styles.btnText} numberOfLines={1}>{current}</Text>}
        <Text style={styles.chev}>▾</Text>
      </Pressable>
      {open && (
        <>
          <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
          <View style={[styles.dropdown, narrow && styles.dropdownNarrow]}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={15} color={colors.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search language…"
                placeholderTextColor={colors.muted}
                style={styles.search}
                autoFocus
              />
            </View>
            <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
              {filtered.map((l) => {
                const on = l.code === currentCode;
                return (
                  <Pressable key={l.code} style={({ hovered }: any) => [styles.item, hovered && styles.itemHover, on && styles.itemActive]} onPress={() => pick(l)}>
                    <Flag cc={l.cc} size={22} />
                    <Text style={[styles.itemText, on && styles.itemTextActive]} numberOfLines={1}>{l.label}</Text>
                    {on && <Ionicons name="checkmark" size={16} color={colors.red} />}
                  </Pressable>
                );
              })}
              {filtered.length === 0 && <Text style={styles.noMatch}>No match</Text>}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 60 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  btnText: { color: colors.ink, fontWeight: '800', fontSize: 13, maxWidth: 84 },
  langCode: { color: colors.ink, fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  chev: { color: colors.muted, fontSize: 11, fontWeight: '900' },
  scrim: Platform.OS === 'web'
    ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 } as any)
    : { position: 'absolute', top: 0, left: 0, right: 0, height: 2000, zIndex: 50 },
  dropdown: {
    position: 'absolute' as any, top: 46, right: 0, width: 272, backgroundColor: colors.white,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 6, zIndex: 70, ...shadow.card,
  },
  // Phone: pin to the viewport so the panel never runs off either edge.
  dropdownNarrow: Platform.OS === 'web'
    ? ({ position: 'fixed', top: 60, left: 12, right: 12, width: 'auto' } as any)
    : { left: 0, right: 0, width: 'auto' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.offWhite, borderRadius: radius.sm },
  search: { flex: 1, color: colors.text, fontSize: 14, outlineStyle: 'none' as any },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  itemHover: { backgroundColor: colors.offWhite },
  itemActive: { backgroundColor: 'rgba(226,35,26,0.07)' },
  itemText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  itemTextActive: { color: colors.red, fontWeight: '800' },
  noMatch: { color: colors.muted, fontSize: 13, padding: 12, textAlign: 'center' },
});
