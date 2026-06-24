import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../lib/theme';

// A broad set of world languages (Google Translate supports 100+; this list
// covers the major ones — the search box lets users find any of them).
const LANGS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'ur', label: 'اردو (Urdu)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'fr', label: 'Français (French)' },
  { code: 'es', label: 'Español (Spanish)' },
  { code: 'de', label: 'Deutsch (German)' },
  { code: 'it', label: 'Italiano (Italian)' },
  { code: 'pt', label: 'Português (Portuguese)' },
  { code: 'ru', label: 'Русский (Russian)' },
  { code: 'tr', label: 'Türkçe (Turkish)' },
  { code: 'fa', label: 'فارسی (Persian)' },
  { code: 'zh-CN', label: '中文 (Chinese, Simplified)' },
  { code: 'zh-TW', label: '中文 (Chinese, Traditional)' },
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'ko', label: '한국어 (Korean)' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Bahasa Melayu (Malay)' },
  { code: 'th', label: 'ไทย (Thai)' },
  { code: 'vi', label: 'Tiếng Việt (Vietnamese)' },
  { code: 'nl', label: 'Nederlands (Dutch)' },
  { code: 'pl', label: 'Polski (Polish)' },
  { code: 'uk', label: 'Українська (Ukrainian)' },
  { code: 'ro', label: 'Română (Romanian)' },
  { code: 'el', label: 'Ελληνικά (Greek)' },
  { code: 'he', label: 'עברית (Hebrew)' },
  { code: 'sw', label: 'Kiswahili (Swahili)' },
  { code: 'am', label: 'አማርኛ (Amharic)' },
  { code: 'so', label: 'Soomaali (Somali)' },
  { code: 'ha', label: 'Hausa' },
  { code: 'yo', label: 'Yorùbá' },
  { code: 'sw2', label: '' },
  { code: 'fil', label: 'Filipino' },
  { code: 'my', label: 'မြန်မာ (Burmese)' },
  { code: 'km', label: 'ខ្មែរ (Khmer)' },
  { code: 'si', label: 'සිංහල (Sinhala)' },
  { code: 'ne', label: 'नेपाली (Nepali)' },
  { code: 'ps', label: 'پښتو (Pashto)' },
  { code: 'sv', label: 'Svenska (Swedish)' },
  { code: 'da', label: 'Dansk (Danish)' },
  { code: 'no', label: 'Norsk (Norwegian)' },
  { code: 'fi', label: 'Suomi (Finnish)' },
  { code: 'cs', label: 'Čeština (Czech)' },
  { code: 'hu', label: 'Magyar (Hungarian)' },
  { code: 'bg', label: 'Български (Bulgarian)' },
  { code: 'sr', label: 'Српски (Serbian)' },
  { code: 'hr', label: 'Hrvatski (Croatian)' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'zu', label: 'isiZulu (Zulu)' },
].filter((l) => l.label);

const isWeb = Platform.OS === 'web' && typeof document !== 'undefined';

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
        <Ionicons name="language" size={18} color={colors.ink} />
        {!compact && <Text style={styles.btnText} numberOfLines={1}>{current}</Text>}
        <Text style={styles.chev}>▾</Text>
      </Pressable>
      {open && (
        <>
          <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
          <View style={styles.dropdown}>
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
  chev: { color: colors.muted, fontSize: 11, fontWeight: '900' },
  scrim: Platform.OS === 'web'
    ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 } as any)
    : { position: 'absolute', top: 0, left: 0, right: 0, height: 2000, zIndex: 50 },
  dropdown: {
    position: 'absolute' as any, top: 46, right: 0, width: 272, backgroundColor: colors.white,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 6, zIndex: 70, ...shadow.card,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.offWhite, borderRadius: radius.sm },
  search: { flex: 1, color: colors.text, fontSize: 14, outlineStyle: 'none' as any },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  itemHover: { backgroundColor: colors.offWhite },
  itemActive: { backgroundColor: 'rgba(226,35,26,0.07)' },
  itemText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  itemTextActive: { color: colors.red, fontWeight: '800' },
  noMatch: { color: colors.muted, fontSize: 13, padding: 12, textAlign: 'center' },
});
