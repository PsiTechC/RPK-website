import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { colors, radius, shadow } from '../lib/theme';
import { api } from '../lib/api';

type Msg = { role: 'user' | 'assistant'; content: string };

const GREETING: Msg = {
  role: 'assistant',
  content:
    "Hi! I'm the RPK Assistant 🌶️ Ask me about our groceries, how to order, or about import/export registration.",
};

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const { reply } = await api.chat(next.map((m) => ({ role: m.role, content: m.content })));
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Sorry, I had trouble responding. Please call us at +971 583072132.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <View style={styles.root} pointerEvents="box-none">
      {open && (
        <View style={styles.panel}>
          <View style={styles.head}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.dot} />
              <Text style={styles.headTitle}>RPK Assistant</Text>
            </View>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={{ padding: 12, gap: 8 }}>
            {messages.map((m, i) => (
              <View key={i} style={[styles.bubble, m.role === 'user' ? styles.user : styles.bot]}>
                <Text style={[styles.bubbleText, m.role === 'user' && { color: colors.white }]}>{m.content}</Text>
              </View>
            ))}
            {loading && (
              <View style={[styles.bubble, styles.bot, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
                <ActivityIndicator size="small" color={colors.orange} />
                <Text style={styles.bubbleText}>Typing…</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message…"
              placeholderTextColor={colors.muted}
              style={styles.input}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <Pressable style={styles.sendBtn} onPress={send}>
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Pressable style={styles.fab} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.fabIcon}>{open ? '✕' : '💬'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', right: 18, bottom: 18, alignItems: 'flex-end', gap: 12, zIndex: 100 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  fabIcon: { fontSize: 26 },
  panel: {
    width: 340,
    maxWidth: '92vw' as any,
    height: 460,
    maxHeight: '70vh' as any,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  head: {
    backgroundColor: colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dot: { width: 9, height: 9, borderRadius: 999, backgroundColor: colors.green },
  headTitle: { color: colors.white, fontWeight: '800', fontSize: 15 },
  close: { color: colors.white, fontSize: 16, fontWeight: '700' },
  body: { flex: 1, backgroundColor: colors.offWhite },
  bubble: { maxWidth: '85%', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 },
  user: { backgroundColor: colors.navy, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bot: { backgroundColor: colors.white, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  inputRow: { flexDirection: 'row', padding: 8, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.offWhite,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    outlineStyle: 'none' as any,
  },
  sendBtn: { backgroundColor: colors.orange, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  sendText: { color: colors.white, fontWeight: '800' },
});
