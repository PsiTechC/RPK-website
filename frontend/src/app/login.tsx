import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius } from '../lib/theme';
import { useApp } from '../lib/store';
import { Footer } from '../components/Footer';
import { Container, Button, Field, Card } from '../components/ui';

export default function Login() {
  const router = useRouter();
  const { login, register } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'customer' | 'business'>('customer');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({ name: form.name, email: form.email, password: form.password, phone: form.phone, role });
      }
      router.replace('/account');
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }}>
      <Container style={{ marginTop: 40, maxWidth: 460 }}>
        <Card style={{ gap: 16 }}>
          <Text style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
          <Text style={styles.sub}>
            {mode === 'login' ? 'Log in to track orders and registrations.' : 'Join RPK to shop and trade with us.'}
          </Text>

          <View style={styles.toggle}>
            <Pressable style={[styles.toggleBtn, mode === 'login' && styles.toggleActive]} onPress={() => setMode('login')}>
              <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>Login</Text>
            </Pressable>
            <Pressable style={[styles.toggleBtn, mode === 'register' && styles.toggleActive]} onPress={() => setMode('register')}>
              <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>Register</Text>
            </Pressable>
          </View>

          {mode === 'register' && (
            <>
              <Field label="Full name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Your name" />
              <Field label="Phone" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} placeholder="+971 …" />
              <View style={{ gap: 6 }}>
                <Text style={styles.label}>Account type</Text>
                <View style={styles.roleRow}>
                  <RolePick label="Customer" desc="Shop groceries" active={role === 'customer'} onPress={() => setRole('customer')} />
                  <RolePick label="Business" desc="Import / Export" active={role === 'business'} onPress={() => setRole('business')} />
                </View>
              </View>
            </>
          )}

          <Field label="Email" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} placeholder="you@email.com" keyboardType="email-address" />
          <Field label="Password" value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} placeholder="••••••" secureTextEntry />

          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button label={busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'} onPress={submit} disabled={busy} />

          <Text style={styles.alt}>
            {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
            <Text style={styles.altLink} onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Register' : 'Log in'}
            </Text>
          </Text>
        </Card>
      </Container>
      <Footer />
    </ScrollView>
  );
}

function RolePick({ label, desc, active, onPress }: { label: string; desc: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.role, active && styles.roleActive]} onPress={onPress}>
      <Text style={[styles.roleLabel, active && { color: colors.navy }]}>{label}</Text>
      <Text style={styles.roleDesc}>{desc}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '900', color: colors.ink },
  sub: { color: colors.muted, fontSize: 14 },
  toggle: { flexDirection: 'row', backgroundColor: '#F1F2F5', borderRadius: 999, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 999 },
  toggleActive: { backgroundColor: colors.white },
  toggleText: { fontWeight: '800', color: colors.muted },
  toggleTextActive: { color: colors.navy },
  label: { color: colors.text, fontWeight: '700', fontSize: 13 },
  roleRow: { flexDirection: 'row', gap: 10 },
  role: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  roleActive: { borderColor: colors.orange, backgroundColor: colors.cream },
  roleLabel: { fontWeight: '800', color: colors.text },
  roleDesc: { color: colors.muted, fontSize: 12, marginTop: 2 },
  error: { color: colors.red, fontSize: 13 },
  alt: { textAlign: 'center', color: colors.muted, fontSize: 13 },
  altLink: { color: colors.navy, fontWeight: '800' },
});
